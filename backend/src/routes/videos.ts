import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { supabase } from '../lib/supabase';
import { MultipartFile } from '@fastify/multipart';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export async function videosRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Endpoint POST /videos
  fastify.post('/videos', {
    preHandler: requireAuth, // Middleware de autenticação
    schema: {
      tags: ['videos'],
      summary: 'Criar job de processamento de vídeo',
      description: 'Cria um job de processamento de vídeo. Aceita upload de arquivo (multipart/form-data) ou JSON com campo "videoUrl". Requer autenticação (Bearer token).',
      consumes: ['multipart/form-data', 'application/json'],
      security: [{ bearerAuth: [] }],
      response: {
        201: {
          description: 'Job criado com sucesso',
          type: 'object',
          properties: {
            job_id: { type: 'string', format: 'uuid', description: 'ID único do job' },
            status: { type: 'string', enum: ['UPLOADED'], description: 'Status do job' },
            videoUrl: { type: 'string', format: 'uri', description: 'URL do vídeo (Supabase ou URL fornecida)' }
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
      let videoUrl: string;

      // Verifica se a requisição é multipart (upload de arquivo)
      if (request.isMultipart()) {
        const data: MultipartFile | undefined = await request.file();

        if (!data) {
          return reply.code(400).send({
            error: 'Nenhum arquivo foi enviado'
          });
        }

        // Gera um nome único para o arquivo
        const fileExtension = data.filename.split('.').pop() || 'mp4';
        const uniqueFileName = `${uuidv4()}.${fileExtension}`;

        try {
          // Converte o stream em Buffer
          const buffer = await data.toBuffer();

          // Faz upload para o Supabase Storage no bucket 'videos'
          const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(uniqueFileName, buffer, {
              contentType: data.mimetype,
              upsert: false
            });

          if (uploadError) {
            fastify.log.error(`Erro ao fazer upload para Supabase: ${uploadError.message}`);
            return reply.code(500).send({
              error: `Erro ao fazer upload do arquivo: ${uploadError.message}`
            });
          }

          // Gera a URL pública do arquivo
          const { data: publicUrlData } = supabase.storage
            .from('videos')
            .getPublicUrl(uniqueFileName);

          videoUrl = publicUrlData.publicUrl;
          fastify.log.info(`Arquivo enviado com sucesso para Supabase: ${videoUrl}`);

        } catch (error) {
          fastify.log.error(`Erro ao processar upload: ${error}`);
          return reply.code(500).send({
            error: 'Erro ao processar upload do arquivo'
          });
        }

      } else {
        // Requisição JSON com videoUrl
        const body = request.body as { videoUrl?: string };

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

        videoUrl = body.videoUrl;
      }

      // Pega o userId do token autenticado
      const { userId } = request as AuthenticatedRequest;

      // Gera um ID único para o job
      const jobId = uuidv4();

      // Cria o job no banco de dados vinculado ao usuário autenticado
      const job = await prisma.job.create({
        data: {
          id: jobId,
          userId: userId,
          inputUrl: videoUrl,
          status: 'PENDING'
        }
      });

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
              videoUrl: videoUrl,
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
    preHandler: requireAuth, // Middleware de autenticação
    schema: {
      tags: ['jobs'],
      summary: 'Listar jobs do usuário',
      description: 'Retorna todos os jobs de processamento de vídeo do usuário autenticado, ordenados por data de criação (mais recente primeiro)',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Lista de jobs',
          type: 'object',
          properties: {
            jobs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] },
                  inputUrl: { type: 'string', format: 'uri' },
                  outputUrl: { type: 'string', format: 'uri', nullable: true },
                  errorMessage: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        401: {
          description: 'Não autenticado',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
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
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
    });
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
            inputUrl: { type: 'string', format: 'uri', description: 'URL do vídeo original' },
            outputUrl: { type: 'string', format: 'uri', description: 'URL do vídeo processado (se concluído)' },
            errorMessage: { type: 'string', description: 'Mensagem de erro (se houver)' },
            createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Data de atualização' }
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
      outputUrl: job.outputUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  });
}

