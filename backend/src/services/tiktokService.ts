import { prisma } from '../lib/prisma';

// Margem de segurança: considera token expirado 5 minutos antes
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

interface TikTokTokenResponse {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * Erro customizado para quando o token não pode ser renovado
 * (refresh token expirado ou revogado)
 */
export class TikTokTokenError extends Error {
  constructor(
    message: string,
    public readonly code: 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' | 'NOT_CONNECTED' | 'REFRESH_FAILED'
  ) {
    super(message);
    this.name = 'TikTokTokenError';
  }
}

/**
 * Renova o access token usando o refresh token
 */
async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new TikTokTokenError('Configurações TikTok não encontradas', 'REFRESH_FAILED');
  }

  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  const data = await response.json() as TikTokTokenResponse;

  // Verifica erros na resposta
  if (data.error || !data.access_token) {
    console.error(`[TikTok] Erro ao renovar token para usuário ${userId}: ${data.error} - ${data.error_description}`);

    // Erros comuns que indicam que o refresh token expirou ou foi revogado
    if (
      data.error === 'invalid_grant' ||
      data.error === 'invalid_refresh_token' ||
      data.error_description?.includes('expired') ||
      data.error_description?.includes('revoked')
    ) {
      // Remove a conta vinculada pois o token não é mais válido
      await prisma.socialAccount.delete({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'tiktok',
          },
        },
      }).catch(() => {
        // Ignora erro se já não existir
      });

      throw new TikTokTokenError(
        'Seu acesso ao TikTok expirou. Por favor, reconecte sua conta.',
        'TOKEN_REVOKED'
      );
    }

    throw new TikTokTokenError(
      `Erro ao renovar token: ${data.error_description || data.error}`,
      'REFRESH_FAILED'
    );
  }

  // Calcula nova data de expiração
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: 24h

  // Atualiza os tokens no banco
  await prisma.socialAccount.update({
    where: {
      userId_provider: {
        userId: userId,
        provider: 'tiktok',
      },
    },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Usa o novo ou mantém o atual
      expiresAt: expiresAt,
      updatedAt: new Date(),
    },
  });

  console.log(`[TikTok] Token renovado com sucesso para usuário ${userId}. Expira em: ${expiresAt.toISOString()}`);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: expiresAt,
  };
}

/**
 * Obtém um token válido do TikTok para o usuário
 * Renova automaticamente se estiver expirado ou prestes a expirar
 *
 * @param userId - ID do usuário
 * @returns Access token válido
 * @throws TikTokTokenError se não conseguir obter um token válido
 */
export async function getValidTikTokToken(userId: string): Promise<string> {
  // Busca a conta TikTok vinculada
  const socialAccount = await prisma.socialAccount.findUnique({
    where: {
      userId_provider: {
        userId: userId,
        provider: 'tiktok',
      },
    },
  });

  // Se não tem conta vinculada
  if (!socialAccount) {
    throw new TikTokTokenError(
      'Conta TikTok não vinculada. Conecte sua conta para compartilhar vídeos.',
      'NOT_CONNECTED'
    );
  }

  // Verifica se o token está válido (com margem de segurança)
  const now = new Date();
  const expiresAt = socialAccount.expiresAt;
  const isExpired = expiresAt
    ? now.getTime() > expiresAt.getTime() - TOKEN_EXPIRY_MARGIN_MS
    : false;

  // Se não expirou, retorna o token atual
  if (!isExpired) {
    console.log(`[TikTok] Token válido para usuário ${userId}. Expira em: ${expiresAt?.toISOString()}`);
    return socialAccount.accessToken;
  }

  // Token expirado ou prestes a expirar - tenta renovar
  console.log(`[TikTok] Token expirado/expirando para usuário ${userId}. Renovando...`);

  if (!socialAccount.refreshToken) {
    // Sem refresh token, não é possível renovar
    // Remove a conta pois está em estado inválido
    await prisma.socialAccount.delete({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'tiktok',
        },
      },
    }).catch(() => {});

    throw new TikTokTokenError(
      'Token expirado e sem refresh token. Por favor, reconecte sua conta TikTok.',
      'TOKEN_EXPIRED'
    );
  }

  // Tenta renovar o token
  const { accessToken } = await refreshAccessToken(userId, socialAccount.refreshToken);
  return accessToken;
}

/**
 * Verifica se o usuário tem uma conta TikTok válida
 * (não verifica expiração, apenas se existe)
 */
export async function hasTikTokConnected(userId: string): Promise<boolean> {
  const count = await prisma.socialAccount.count({
    where: {
      userId: userId,
      provider: 'tiktok',
    },
  });
  return count > 0;
}
