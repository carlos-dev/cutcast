import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { VideoJob } from '../types';
import { jobs } from '../storage/jobs';

export async function videosRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Endpoint POST /videos
  fastify.post('/videos', {
    schema: {
      tags: ['videos'],
      summary: 'Criar job de processamento de vídeo',
      description: 'Cria um job de processamento de vídeo a partir de uma URL. Envie um JSON com o campo "videoUrl".',
      body: {
        type: 'object',
        required: ['videoUrl'],
        properties: {
          videoUrl: {
            type: 'string',
            format: 'uri',
            description: 'URL do vídeo a ser processado'
          }
        }
      },
      response: {
        201: {
          description: 'Job criado com sucesso',
          type: 'object',
          properties: {
            job_id: { type: 'string', format: 'uuid', description: 'ID único do job' },
            status: { type: 'string', enum: ['UPLOADED'], description: 'Status do job' }
          }
        },
        400: {
          description: 'Requisição inválida',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          description: 'Erro interno do servidor',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Recebe o body com videoUrl
      const body = request.body as { videoUrl?: string };
      
      if (!body || !body.videoUrl) {
        return reply.code(400).send({
          error: 'O campo videoUrl é obrigatório'
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

      // Gera um ID único para o job
      const jobId = uuidv4();

      // Extrai o nome do arquivo da URL ou usa um nome padrão
      const urlPath = new URL(body.videoUrl).pathname;
      const filename = urlPath.split('/').pop() || 'video';

      // Cria o objeto do job com status UPLOADED
      const job: VideoJob = {
        id: jobId,
        status: 'UPLOADED',
        originalFilename: filename,
        createdAt: new Date()
      };

      // Salva o job em memória
      jobs.set(jobId, job);

      // Envia requisição para o webhook do n8n
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
      
      if (n8nWebhookUrl) {
        try {
          const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoUrl: body.videoUrl,
              jobId
            })
          });

          if (!response.ok) {
            fastify.log.warn(`Webhook n8n retornou status ${response.status}`);
          } else {
            fastify.log.info(`Webhook n8n chamado com sucesso para job ${jobId}`);
          }
        } catch (error) {
          // Log do erro mas não falha a requisição
          fastify.log.error(`Erro ao chamar webhook n8n: ${error}`);
        }
      } else {
        fastify.log.warn('N8N_WEBHOOK_URL não configurada no .env');
      }

      // Retorna os dados do job criado
      return reply.code(201).send({
        job_id: job.id,
        status: job.status
      });

    } catch (error) {
      fastify.log.error(error as Error);
      return reply.code(500).send({
        error: 'Erro ao processar requisição'
      });
    }
  });

  // Endpoint GET /videos/:id para consultar status
  fastify.get('/videos/:id', {
    schema: {
      tags: ['videos'],
      summary: 'Consultar status do job',
      description: 'Retorna informações sobre um job de processamento de vídeo',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID do job'
          }
        }
      },
      response: {
        200: {
          description: 'Job encontrado',
          type: 'object',
          properties: {
            job_id: { type: 'string', format: 'uuid', description: 'ID do job' },
            status: {
              type: 'string',
              enum: ['UPLOADED', 'PROCESSING', 'DONE', 'FAILED'],
              description: 'Status atual do job'
            },
            originalFilename: { type: 'string', description: 'Nome original do arquivo' },
            createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' }
          }
        },
        404: {
          description: 'Job não encontrado',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const job = jobs.get(id);

    if (!job) {
      return reply.code(404).send({
        error: 'Job não encontrado'
      });
    }

    return reply.send({
      job_id: job.id,
      status: job.status,
      originalFilename: job.originalFilename,
      createdAt: job.createdAt
    });
  });
}

