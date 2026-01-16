import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma';
import { r2Client, R2_BUCKET_NAME, getPublicUrl, extractFileNameFromUrl } from '../lib/r2';
import { MultipartFile } from '@fastify/multipart';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createVideoJobSchema,
  listJobsSchema,
  deleteVideoJobSchema,
  getVideoJobSchema
} from '../schemas/videos.schemas';

export async function videosRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Endpoint POST /videos
  fastify.post('/videos', {
    preHandler: requireAuth,
    schema: createVideoJobSchema
  }, async (request, reply) => {
    try {
      let videoUrl: string;
      let withSubtitles: boolean = true; // Valor padrão

      // Verifica se a requisição é multipart (upload de arquivo)
      if (request.isMultipart()) {
        const parts = request.parts();
        let fileData: MultipartFile | undefined;

        // Processa todas as partes do multipart
        for await (const part of parts) {
          if (part.type === 'file') {
            fileData = part as MultipartFile;
          } else if (part.type === 'field') {
            // Captura o campo withSubtitles do FormData
            if (part.fieldname === 'withSubtitles') {
              withSubtitles = part.value === 'true';
            }
          }
        }

        if (!fileData) {
          return reply.code(400).send({
            error: 'Nenhum arquivo foi enviado'
          });
        }

        // Gera um nome único para o arquivo
        const fileExtension = fileData.filename.split('.').pop() || 'mp4';
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;

        try {
          // Converte o stream em Buffer
          const buffer = await fileData.toBuffer();

          // Faz upload para o Cloudflare R2 usando AWS SDK v3
          const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueFileName,
            Body: buffer,
            ContentType: fileData.mimetype,
          });

          await r2Client.send(putCommand);

          // Gera a URL pública do arquivo
          videoUrl = getPublicUrl(uniqueFileName);
          fastify.log.info(`Arquivo enviado com sucesso para R2: ${videoUrl}`);

        } catch (error) {
          fastify.log.error(`Erro ao fazer upload para R2: ${error}`);
          return reply.code(500).send({
            error: 'Erro ao processar upload do arquivo'
          });
        }

      } else {
        // Requisição JSON com videoUrl
        const body = request.body as { videoUrl?: string; withSubtitles?: boolean };

        if (!body || !body.videoUrl) {
          return reply.code(400).send({
            error: 'O campo videoUrl é obrigatório ou envie um arquivo via multipart/form-data'
          });
        }

        // Valida se é uma URL válida
        try {
          new URL(body.videoUrl);
        } catch {
          return reply.code(400).send({
            error: 'videoUrl deve ser uma URL válida'
          });
        }

        // Faz download da URL e upload para R2
        try {
          fastify.log.info(`Baixando vídeo de: ${body.videoUrl}`);

          // Faz download do vídeo
          const videoResponse = await fetch(body.videoUrl);

          if (!videoResponse.ok) {
            return reply.code(400).send({
              error: `Não foi possível baixar o vídeo da URL fornecida (status ${videoResponse.status})`
            });
          }

          // Converte para buffer
          const arrayBuffer = await videoResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          fastify.log.info(`Vídeo baixado com sucesso (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

          // Gera nome único para o arquivo
          const fileExtension = body.videoUrl.split('.').pop()?.split('?')[0] || 'mp4';
          const uniqueFileName = `${uuidv4()}.${fileExtension}`;

          // Faz upload para R2
          const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueFileName,
            Body: buffer,
            ContentType: videoResponse.headers.get('content-type') || 'video/mp4',
          });

          await r2Client.send(putCommand);

          // Gera URL pública do R2
          videoUrl = getPublicUrl(uniqueFileName);
          fastify.log.info(`Vídeo enviado para R2: ${videoUrl}`);

        } catch (error) {
          fastify.log.error(`Erro ao processar URL do vídeo: ${error}`);
          return reply.code(500).send({
            error: 'Erro ao baixar ou fazer upload do vídeo da URL fornecida'
          });
        }

        // Captura withSubtitles do body JSON (default true se não fornecido)
        withSubtitles = body.withSubtitles !== undefined ? body.withSubtitles : true;
      }

      // Verifica se o webhook do n8n está configurado
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

      if (!n8nWebhookUrl) {
        fastify.log.error('N8N_WEBHOOK_URL não configurada no .env');
        return reply.code(500).send({
          error: 'Serviço de processamento de vídeo não configurado. Configure N8N_WEBHOOK_URL no .env'
        });
      }

      // Pega o userId do token autenticado
      const { userId } = request as AuthenticatedRequest;

      // Gera um ID único para o job
      const jobId = uuidv4();

      // Log dos parâmetros que serão enviados ao n8n
      fastify.log.info(`Chamando webhook n8n - jobId: ${jobId}, withSubtitles: ${withSubtitles}`);

      // Tenta chamar o webhook do n8n ANTES de criar o job no banco
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl: videoUrl,
            jobId,
            withSubtitles
          })
        });

        if (!response.ok) {
          fastify.log.error(`Webhook n8n retornou status ${response.status}`);
          return reply.code(502).send({
            error: `Serviço de processamento indisponível (status ${response.status}). Verifique se o workflow do n8n está ativo.`
          });
        }

        fastify.log.info(`Webhook n8n chamado com sucesso para job ${jobId}`);
      } catch (error) {
        fastify.log.error(`Erro ao chamar webhook n8n: ${error}`);
        return reply.code(503).send({
          error: 'Serviço de processamento de vídeo indisponível. Verifique se o n8n está rodando e o webhook está ativo.'
        });
      }

      // Só cria o job no banco se o n8n respondeu com sucesso
      const job = await prisma.job.create({
        data: {
          id: jobId,
          userId: userId,
          inputUrl: videoUrl,
          status: 'PENDING'
        }
      });

      // Retorna os dados do job criado
      return reply.code(201).send({
        job_id: job.id,
        status: job.status,
        videoUrl: videoUrl
      });

    } catch (error) {
      fastify.log.error(error as Error);
      return reply.code(500).send({
        error: 'Erro ao processar requisição'
      });
    }
  });

  // Endpoint GET /jobs para listar jobs do usuário autenticado
  fastify.get('/jobs', {
    preHandler: requireAuth,
    schema: listJobsSchema
  }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;

    // Busca todos os jobs do usuário, ordenados por data de criação (mais recente primeiro)
    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        inputUrl: job.inputUrl,
        outputUrls: job.outputUrls,
        results: job.results,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
    });
  });

  // Endpoint DELETE /videos/:id para deletar job e arquivo
  fastify.delete('/videos/:id', {
    preHandler: requireAuth,
    schema: deleteVideoJobSchema
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request as AuthenticatedRequest;

    try {
      // Busca o job no banco
      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return reply.code(404).send({
          error: 'Job não encontrado'
        });
      }

      // Verifica se o usuário é o dono do job
      if (job.userId !== userId) {
        return reply.code(403).send({
          error: 'Acesso negado. Você não pode deletar jobs de outros usuários.'
        });
      }

      // Extrai o nome do arquivo da URL do R2 e deleta do storage
      if (job.inputUrl) {
        try {
          const fileName = extractFileNameFromUrl(job.inputUrl);

          if (fileName) {
            // Deleta o arquivo do Cloudflare R2
            const deleteCommand = new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: fileName,
            });

            await r2Client.send(deleteCommand);
            fastify.log.info(`Arquivo ${fileName} deletado do R2`);
          }
        } catch (error) {
          fastify.log.warn(`Erro ao deletar arquivo do R2: ${error}`);
          // Continua mesmo se falhar ao deletar do storage
        }
      }

      // Deleta o job do banco (CASCADE deleta callbacks relacionados)
      await prisma.job.delete({
        where: { id }
      });

      fastify.log.info(`Job ${id} deletado com sucesso pelo usuário ${userId}`);

      return reply.send({
        message: 'Job e vídeo deletados com sucesso',
        jobId: id
      });

    } catch (error) {
      fastify.log.error(error as Error);
      return reply.code(500).send({
        error: 'Erro ao deletar job'
      });
    }
  });

  // Endpoint GET /videos/:id para consultar status
  fastify.get('/videos/:id', {
    schema: getVideoJobSchema
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      return reply.code(404).send({
        error: 'Job não encontrado'
      });
    }

    return reply.send({
      jobId: job.id,
      status: job.status,
      inputUrl: job.inputUrl,
      outputUrls: job.outputUrls,
      results: job.results,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  });
}

