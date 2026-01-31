import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN, extractKeyFromUrl } from '../lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { getValidTikTokToken, TikTokTokenError } from '../services/tiktokService';

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

    // Obtém um token válido (renova automaticamente se necessário)
    let accessToken: string;
    try {
      fastify.log.info(`Obtendo token TikTok válido para userId: ${userId}`);
      accessToken = await getValidTikTokToken(userId);
      fastify.log.info(`Token TikTok obtido com sucesso para userId: ${userId}`);
    } catch (error) {
      if (error instanceof TikTokTokenError) {
        fastify.log.warn(`Erro de token TikTok [${error.code}]: ${error.message}`);

        const statusCode = error.code === 'NOT_CONNECTED' ? 403 : 401;
        const errorCode = error.code === 'NOT_CONNECTED'
          ? 'tiktok_not_connected'
          : 'tiktok_token_expired';

        return reply.code(statusCode).send({
          error: errorCode,
          message: error.message
        });
      }

      fastify.log.error(`Erro inesperado ao obter token TikTok: ${error}`);
      return reply.code(500).send({
        error: 'server_error',
        message: 'Erro ao verificar conexão com TikTok'
      });
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

      // Log da resposta completa para debug
      fastify.log.info(`Resposta TikTok init: ${JSON.stringify(initData)}`);

      // Na API do TikTok, error.code === "ok" significa SUCESSO
      // Verificamos se há erro real (código diferente de "ok")
      if (initData.error && initData.error.code !== 'ok') {
        fastify.log.error(`Erro ao iniciar upload TikTok: ${initData.error.code} - ${initData.error.message}`);
        return reply.code(500).send({
          error: 'tiktok_upload_failed',
          message: `Erro TikTok: ${initData.error.message}`
        });
      }

      if (!initData.data?.upload_url) {
        fastify.log.error(`Resposta inválida do TikTok (sem upload_url): ${JSON.stringify(initData)}`);
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

    // Obtém um token válido
    let accessToken: string;
    try {
      accessToken = await getValidTikTokToken(userId);
    } catch (error) {
      if (error instanceof TikTokTokenError) {
        return reply.code(403).send({
          error: error.code === 'NOT_CONNECTED' ? 'tiktok_not_connected' : 'tiktok_token_expired',
          message: error.message
        });
      }
      return reply.code(500).send({
        error: 'server_error'
      });
    }

    try {
      const response = await fetch(
        `https://open.tiktokapis.com/v2/post/publish/status/fetch/?publish_id=${publishId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
