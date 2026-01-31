import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN, extractKeyFromUrl } from '../lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * Verifica se a URL é do R2 (domínio público configurado)
 */
function isR2Url(url: string): boolean {
  if (!R2_PUBLIC_DOMAIN) return false;
  try {
    const urlObj = new URL(url);
    const r2DomainObj = new URL(R2_PUBLIC_DOMAIN);
    return urlObj.hostname === r2DomainObj.hostname;
  } catch {
    return false;
  }
}

/**
 * Baixa um vídeo de uma URL externa
 */
async function downloadFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar vídeo: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// TikTok API URL
const TIKTOK_UPLOAD_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';

interface ShareTikTokBody {
  userId: string;
  videoUrl: string;
  title?: string;
}

interface TikTokUploadInitResponse {
  data?: {
    publish_id: string;
    upload_url: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Converte um ReadableStream para Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Atualiza o access token usando o refresh token
 */
async function refreshTikTokToken(
  userId: string,
  refreshToken: string,
  fastify: FastifyInstance
): Promise<string | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return null;
  }

  try {
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

    const data = await response.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (data.error || !data.access_token) {
      fastify.log.error(`Erro ao renovar token TikTok: ${data.error}`);
      return null;
    }

    // Atualiza o token no banco
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    await prisma.socialAccount.update({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'tiktok',
        },
      },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: expiresAt,
      },
    });

    return data.access_token;
  } catch (err) {
    fastify.log.error(`Erro ao renovar token TikTok: ${err}`);
    return null;
  }
}

export async function shareRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  /**
   * POST /share/tiktok
   * Compartilha um vídeo no TikTok
   * Body: { userId, videoUrl, title? }
   */
  fastify.post('/share/tiktok', async (request, reply) => {
    // title é opcional e será usado quando a API de publicação direta estiver disponível
    const { userId, videoUrl, title: _title } = request.body as ShareTikTokBody;

    // Validação básica
    if (!userId) {
      return reply.code(400).send({
        error: 'userId é obrigatório'
      });
    }

    if (!videoUrl) {
      return reply.code(400).send({
        error: 'videoUrl é obrigatório'
      });
    }

    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return reply.code(404).send({
        error: 'Usuário não encontrado'
      });
    }

    // Busca a conta TikTok vinculada
    fastify.log.info(`Buscando conta TikTok para userId: ${userId}`);

    const socialAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'tiktok',
        },
      },
    });

    // Se não tem conta vinculada, retorna 403 com código específico
    if (!socialAccount) {
      fastify.log.warn(`Conta TikTok não encontrada para userId: ${userId}`);

      // Lista todas as contas TikTok para debug
      const allTikTokAccounts = await prisma.socialAccount.findMany({
        where: { provider: 'tiktok' },
        select: { userId: true, createdAt: true }
      });
      fastify.log.info(`Contas TikTok existentes: ${JSON.stringify(allTikTokAccounts)}`);

      return reply.code(403).send({
        error: 'tiktok_not_connected',
        message: 'Conta TikTok não vinculada. Conecte sua conta para compartilhar vídeos.'
      });
    }

    fastify.log.info(`Conta TikTok encontrada: openId=${socialAccount.openId}`);

    // Verifica se o token está expirado e tenta renovar
    let accessToken = socialAccount.accessToken;
    const isExpired = socialAccount.expiresAt
      ? new Date() > socialAccount.expiresAt
      : false;

    if (isExpired && socialAccount.refreshToken) {
      fastify.log.info(`Token TikTok expirado para usuário ${userId}, renovando...`);
      const newToken = await refreshTikTokToken(userId, socialAccount.refreshToken, fastify);

      if (!newToken) {
        return reply.code(403).send({
          error: 'tiktok_token_expired',
          message: 'Token TikTok expirado. Por favor, reconecte sua conta.'
        });
      }

      accessToken = newToken;
    }

    try {
      // 1. Baixa o vídeo (do R2 ou de URL externa)
      let videoBuffer: Buffer;

      if (isR2Url(videoUrl)) {
        // URL é do R2, usa S3 client
        const fileName = extractKeyFromUrl(videoUrl);

        if (!fileName) {
          return reply.code(400).send({
            error: 'URL do vídeo inválida'
          });
        }

        fastify.log.info(`Baixando vídeo ${fileName} do R2...`);

        const getCommand = new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
        });

        const r2Response = await r2Client.send(getCommand);

        if (!r2Response.Body) {
          return reply.code(404).send({
            error: 'Vídeo não encontrado no storage'
          });
        }

        videoBuffer = await streamToBuffer(r2Response.Body as Readable);
      } else {
        // URL externa, usa fetch
        fastify.log.info(`Baixando vídeo de URL externa: ${videoUrl}`);
        videoBuffer = await downloadFromUrl(videoUrl);
      }

      const videoSize = videoBuffer.length;

      fastify.log.info(`Vídeo baixado: ${videoSize} bytes`);

      // 2. Inicia o upload no TikTok (Direct Post)
      // Usando o endpoint de inbox para apps em desenvolvimento
      const initResponse = await fetch(TIKTOK_UPLOAD_INIT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: videoSize, // Upload em um único chunk
            total_chunk_count: 1,
          },
        }),
      });

      const initData = await initResponse.json() as TikTokUploadInitResponse;

      if (initData.error) {
        fastify.log.error(`Erro ao iniciar upload TikTok: ${initData.error.code} - ${initData.error.message}`);
        return reply.code(500).send({
          error: 'tiktok_upload_failed',
          message: `Erro TikTok: ${initData.error.message}`
        });
      }

      if (!initData.data?.upload_url) {
        fastify.log.error('Resposta inválida do TikTok (sem upload_url)');
        return reply.code(500).send({
          error: 'tiktok_upload_failed',
          message: 'Resposta inválida do TikTok'
        });
      }

      const { publish_id, upload_url } = initData.data;

      fastify.log.info(`Upload iniciado, publish_id: ${publish_id}`);

      // 3. Faz upload do vídeo
      // Converte Buffer para Uint8Array para compatibilidade com fetch
      const videoUint8Array = new Uint8Array(videoBuffer);

      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoSize.toString(),
          'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
        },
        body: videoUint8Array,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        fastify.log.error(`Erro no upload do vídeo: ${uploadResponse.status} - ${errorText}`);
        return reply.code(500).send({
          error: 'tiktok_upload_failed',
          message: 'Erro ao fazer upload do vídeo para o TikTok'
        });
      }

      fastify.log.info(`Upload do vídeo concluído com sucesso`);

      // 4. Retorna sucesso
      // Para apps em sandbox, o vídeo vai para o inbox do criador
      return reply.send({
        success: true,
        message: 'Vídeo enviado para o TikTok! Verifique seu inbox no app TikTok para publicar.',
        publishId: publish_id,
      });

    } catch (err) {
      fastify.log.error(`Erro ao compartilhar no TikTok: ${err}`);
      return reply.code(500).send({
        error: 'server_error',
        message: 'Erro interno ao processar compartilhamento'
      });
    }
  });

  /**
   * GET /share/tiktok/status/:publishId
   * Verifica o status de um upload no TikTok
   */
  fastify.get('/share/tiktok/status/:publishId', async (request, reply) => {
    const { publishId } = request.params as { publishId: string };
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({
        error: 'userId é obrigatório'
      });
    }

    // Busca a conta TikTok vinculada
    const socialAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'tiktok',
        },
      },
    });

    if (!socialAccount) {
      return reply.code(403).send({
        error: 'tiktok_not_connected'
      });
    }

    try {
      const response = await fetch(
        `https://open.tiktokapis.com/v2/post/publish/status/fetch/?publish_id=${publishId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${socialAccount.accessToken}`,
          },
        }
      );

      const data = await response.json();

      return reply.send(data);
    } catch (err) {
      fastify.log.error(`Erro ao verificar status TikTok: ${err}`);
      return reply.code(500).send({
        error: 'server_error'
      });
    }
  });
}
