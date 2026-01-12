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
        401: {
          description: 'Não autenticado',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          description: 'Erro interno do servidor',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        502: {
          description: 'Webhook n8n retornou erro (workflow pode estar inativo)',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        503: {
          description: 'Serviço de processamento indisponível (n8n offline ou webhook inativo)',
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

      // Tenta chamar o webhook do n8n ANTES de criar o job no banco
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
                  outputUrls: {
                    type: 'array',
                    items: { type: 'string', format: 'uri' },
                    description: 'URLs dos vídeos processados'
                  },
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
        outputUrls: job.outputUrls,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }))
    });
  });

  // Endpoint DELETE /videos/:id para deletar job e arquivo
  fastify.delete('/videos/:id', {
    preHandler: requireAuth, // Middleware de autenticação
    schema: {
      tags: ['videos'],
      summary: 'Deletar job e vídeo',
      description: 'Deleta um job e remove o arquivo do Supabase Storage. Requer autenticação. Apenas o dono do job pode deletá-lo.',
      security: [{ bearerAuth: [] }],
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
          description: 'Job e vídeo deletados com sucesso',
          type: 'object',
          properties: {
            message: { type: 'string' },
            jobId: { type: 'string', format: 'uuid' }
          }
        },
        401: {
          description: 'Não autenticado',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        403: {
          description: 'Acesso negado - Você não pode deletar jobs de outros usuários',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        404: {
          description: 'Job não encontrado',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          description: 'Erro ao deletar job',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
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

      // Extrai o nome do arquivo da URL do Supabase
      // Formato da URL: https://PROJETO.supabase.co/storage/v1/object/public/videos/NOME_ARQUIVO.mp4
      if (job.inputUrl) {
        try {
          const url = new URL(job.inputUrl);
          const pathParts = url.pathname.split('/');
          // Pega a última parte do path (nome do arquivo)
          const fileName = pathParts[pathParts.length - 1];

          // Se o arquivo está no bucket 'videos', tenta deletar
          if (url.pathname.includes('/videos/')) {
            const { error: deleteError } = await supabase.storage
              .from('videos')
              .remove([fileName]);

            if (deleteError) {
              fastify.log.warn(`Erro ao deletar arquivo do Storage: ${deleteError.message}`);
              // Continua mesmo se falhar ao deletar do storage
            } else {
              fastify.log.info(`Arquivo ${fileName} deletado do Storage`);
            }
          }
        } catch (error) {
          fastify.log.warn(`Erro ao processar URL do vídeo: ${error}`);
          // Continua mesmo se falhar ao processar a URL
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
            outputUrls: {
              type: 'array',
              items: { type: 'string', format: 'uri' },
              description: 'URLs dos vídeos processados (se concluído)'
            },
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
      outputUrls: job.outputUrls,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  });
}

