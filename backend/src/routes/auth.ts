import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';

// URL base do frontend para redirecionamento
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cutcast.vercel.app';

export async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  /**
   * GET /auth/tiktok/connect
   * Inicia o fluxo OAuth para vincular conta TikTok
   * Query params: userId (obrigatório)
   */
  fastify.get('/auth/tiktok/connect', async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({
        error: 'userId é obrigatório'
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

    // Configurações do TikTok
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    if (!clientKey || !redirectUri) {
      fastify.log.error('TIKTOK_CLIENT_KEY ou TIKTOK_REDIRECT_URI não configurados');
      return reply.code(500).send({
        error: 'Configuração do TikTok incompleta'
      });
    }

    // Gera um CSRF token seguro e inclui o userId no state
    const csrfToken = randomBytes(16).toString('hex');
    const state = `${csrfToken}|${userId}`;

    // Escopos necessários para upload de vídeo
    const scopes = 'user.info.basic,video.upload';

    // Monta a URL de autorização do TikTok
    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.set('client_key', clientKey);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    fastify.log.info(`Redirecionando usuário ${userId} para autorização TikTok`);

    return reply.redirect(authUrl.toString());
  });

  /**
   * GET /auth/tiktok/callback
   * Callback do OAuth TikTok - recebe o code e troca por tokens
   */
  fastify.get('/auth/tiktok/callback', async (request, reply) => {
    const { code, state, error, error_description } = request.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    // Verifica se houve erro na autorização
    if (error) {
      fastify.log.error(`Erro na autorização TikTok: ${error} - ${error_description}`);
      return reply.redirect(`${FRONTEND_URL}/?tiktok_error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      fastify.log.error('Callback TikTok sem code ou state');
      return reply.redirect(`${FRONTEND_URL}/?tiktok_error=missing_params`);
    }

    // Extrai o userId do state
    const stateParts = state.split('|');
    if (stateParts.length !== 2) {
      fastify.log.error('State inválido no callback TikTok');
      return reply.redirect(`${FRONTEND_URL}/?tiktok_error=invalid_state`);
    }

    const userId = stateParts[1];

    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      fastify.log.error(`Usuário ${userId} não encontrado no callback TikTok`);
      return reply.redirect(`${FRONTEND_URL}/?tiktok_error=user_not_found`);
    }

    // Configurações do TikTok
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    if (!clientKey || !clientSecret || !redirectUri) {
      fastify.log.error('Configurações TikTok incompletas');
      return reply.redirect(`${FRONTEND_URL}/?tiktok_error=config_error`);
    }

    try {
      // Troca o code por tokens
      const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });

      const tokenData = await tokenResponse.json() as {
        access_token?: string;
        refresh_token?: string;
        open_id?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (tokenData.error || !tokenData.access_token) {
        fastify.log.error(`Erro ao obter tokens TikTok: ${tokenData.error} - ${tokenData.error_description}`);
        return reply.redirect(`${FRONTEND_URL}/?tiktok_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'token_error')}`);
      }

      // Calcula a data de expiração
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      // Salva ou atualiza a conta social usando upsert
      await prisma.socialAccount.upsert({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'tiktok',
          },
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          openId: tokenData.open_id || null,
          expiresAt: expiresAt,
          updatedAt: new Date(),
        },
        create: {
          userId: userId,
          provider: 'tiktok',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          openId: tokenData.open_id || null,
          expiresAt: expiresAt,
        },
      });

      fastify.log.info(`Conta TikTok vinculada com sucesso para usuário ${userId}`);

      // Retorna HTML que fecha a aba e notifica a janela principal
      return reply
        .header('Content-Type', 'text/html')
        .send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>TikTok Conectado - CutCast</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: hsl(260 40% 6%);
                background-image:
                  radial-gradient(ellipse 80% 50% at 50% -20%, hsl(270 100% 30% / 0.15), transparent),
                  radial-gradient(ellipse 60% 40% at 90% 120%, hsl(195 100% 40% / 0.1), transparent);
                color: hsl(280 10% 95%);
                text-align: center;
              }
              .container {
                padding: 2.5rem;
                background: hsl(260 30% 10%);
                border-radius: 0.75rem;
                border: 1px solid hsl(265 20% 22%);
                box-shadow:
                  0 0 0 1px hsl(265 20% 22%),
                  0 0 40px -10px hsl(270 100% 70% / 0.3);
                animation: fadeIn 0.5s ease-out;
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95) translateY(10px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
              .icon-wrapper {
                width: 80px;
                height: 80px;
                margin: 0 auto 1.5rem;
                background: linear-gradient(135deg, hsl(270 100% 70%), hsl(195 100% 60%));
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 30px hsl(270 100% 70% / 0.4);
                animation: pulse 2s ease-in-out infinite;
              }
              @keyframes pulse {
                0%, 100% { box-shadow: 0 0 30px hsl(270 100% 70% / 0.4); }
                50% { box-shadow: 0 0 50px hsl(270 100% 70% / 0.6); }
              }
              .check-icon {
                width: 40px;
                height: 40px;
                stroke: hsl(260 40% 10%);
                stroke-width: 3;
                fill: none;
                animation: drawCheck 0.5s ease-out 0.3s forwards;
                stroke-dasharray: 50;
                stroke-dashoffset: 50;
              }
              @keyframes drawCheck {
                to { stroke-dashoffset: 0; }
              }
              h1 {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                background: linear-gradient(90deg, hsl(270 100% 70%), hsl(195 100% 60%), hsl(270 100% 70%));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              }
              p {
                color: hsl(260 10% 65%);
                font-size: 0.875rem;
              }
              .progress-bar {
                margin-top: 1.5rem;
                height: 4px;
                background: hsl(265 25% 18%);
                border-radius: 2px;
                overflow: hidden;
              }
              .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, hsl(270 100% 70%), hsl(195 100% 60%));
                animation: progress 2.5s ease-in-out forwards;
              }
              @keyframes progress {
                from { width: 0%; }
                to { width: 100%; }
              }
              .brand {
                margin-top: 1.5rem;
                font-size: 0.75rem;
                color: hsl(260 10% 45%);
                letter-spacing: 0.05em;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon-wrapper">
                <svg class="check-icon" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h1>TikTok Conectado!</h1>
              <p>Sua conta foi vinculada com sucesso</p>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <div class="brand">CUTCAST</div>
            </div>
            <script>
              // Notifica a janela pai que o TikTok foi conectado
              try {
                if (window.opener) {
                  window.opener.postMessage({ type: 'TIKTOK_CONNECTED', success: true }, '*');
                }
              } catch (e) {
                console.log('Could not notify opener:', e);
              }
              
              // Fecha a janela após a barra de progresso completar
              setTimeout(() => {
                window.close();
              }, 2800);
            </script>
          </body>
          </html>
        `);

    } catch (err) {
      fastify.log.error(`Erro ao processar callback TikTok: ${err}`);
      return reply.redirect(`${FRONTEND_URL}/?tiktok_error=server_error`);
    }
  });

  /**
   * GET /auth/tiktok/status
   * Verifica se um usuário tem conta TikTok vinculada
   */
  fastify.get('/auth/tiktok/status', async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({
        error: 'userId é obrigatório'
      });
    }

    const socialAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_provider: {
          userId: userId,
          provider: 'tiktok',
        },
      },
      select: {
        id: true,
        openId: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!socialAccount) {
      return reply.send({
        connected: false,
      });
    }

    // Verifica se o token expirou
    const isExpired = socialAccount.expiresAt
      ? new Date() > socialAccount.expiresAt
      : false;

    return reply.send({
      connected: true,
      isExpired,
      openId: socialAccount.openId,
      connectedAt: socialAccount.createdAt,
      updatedAt: socialAccount.updatedAt,
    });
  });

  /**
   * DELETE /auth/tiktok/disconnect
   * Remove a vinculação da conta TikTok
   */
  fastify.delete('/auth/tiktok/disconnect', async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({
        error: 'userId é obrigatório'
      });
    }

    try {
      await prisma.socialAccount.delete({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'tiktok',
          },
        },
      });

      fastify.log.info(`Conta TikTok desvinculada para usuário ${userId}`);

      return reply.send({
        success: true,
        message: 'Conta TikTok desvinculada com sucesso'
      });
    } catch {
      return reply.code(404).send({
        error: 'Conta TikTok não encontrada para este usuário'
      });
    }
  });
}
