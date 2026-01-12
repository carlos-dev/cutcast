import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { JobCallback } from '../types';
import { prisma } from '../lib/prisma';

export async function callbacksRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Endpoint POST /jobs/:job_id/callback
  fastify.post('/jobs/:job_id/callback', {
    schema: {
      tags: ['callbacks'],
      summary: 'Receber callback do webhook n8n',
      description: 'Endpoint chamado pelo n8n ao final do processamento de vídeo',
      params: {
        type: 'object',
        required: ['job_id'],
        properties: {
          job_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID do job'
          }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['completed', 'error'],
            description: 'Status do processamento'
          },
          outputUrls: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri'
            },
            description: 'Array com URLs dos vídeos processados (obrigatório quando status é completed)'
          },
          errorMessage: {
            type: 'string',
            description: 'Mensagem de erro (opcional)'
          }
        }
      },
      response: {
        200: {
          description: 'Callback recebido com sucesso',
          type: 'object',
          properties: {
            message: { type: 'string' },
            jobId: { type: 'string', format: 'uuid' }
          }
        },
        400: {
          description: 'Requisição inválida',
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
      const body = request.body as JobCallback;
      const jobId = body.jobId;
      fastify.log.info(`Callback recebido para job ${jobId}: ${body}`);
      // Valida se o job existe
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        return reply.code(404).send({
          error: 'Job não encontrado'
        });
      }

      // Valida se o status foi enviado
      if (!body.status) {
        return reply.code(400).send({
          error: 'O campo status é obrigatório'
        });
      }

      // Valida se o status é válido
      if (body.status !== 'completed' && body.status !== 'error') {
        return reply.code(400).send({
          error: 'Status deve ser "completed" ou "error"'
        });
      }

      // Validações condicionais baseadas no status
      if (body.status === 'completed') {
        if (!body.outputUrls || !Array.isArray(body.outputUrls) || body.outputUrls.length === 0) {
          return reply.code(400).send({
            error: 'outputUrls é obrigatório e deve conter pelo menos uma URL quando status é "completed"'
          });
        }

        // Valida se cada URL no array é válida
        for (const url of body.outputUrls) {
          try {
            new URL(url);
          } catch {
            return reply.code(400).send({
              error: `URL inválida no array outputUrls: ${url}`
            });
          }
        }
      }

      if (body.status === 'error' && !body.errorMessage) {
        return reply.code(400).send({
          error: 'errorMessage é obrigatório quando status é "error"'
        });
      }

      // Salva o callback no banco de dados (outputUrls como JSON string)
      await prisma.callback.create({
        data: {
          jobId: jobId,
          status: body.status,
          outputUrls: body.outputUrls ? JSON.stringify(body.outputUrls) : null,
          errorMessage: body.errorMessage
        }
      });

      // Atualiza o status do job no banco
      const newStatus = body.status === 'completed' ? 'DONE' : 'FAILED';
      const updateData: any = {
        status: newStatus
      };

      // Se completado, salva o array de URLs de saída
      if (body.status === 'completed' && body.outputUrls.length) {
        updateData.outputUrls = body.outputUrls;
      }

      // Se erro, salva a mensagem de erro
      if (body.status === 'error' && body.errorMessage) {
        updateData.errorMessage = body.errorMessage;
      }

      await prisma.job.update({
        where: { id: jobId },
        data: updateData
      });

      fastify.log.info(`Callback recebido para job ${jobId}: ${body.status}`);

      // Retorna sucesso
      return reply.send({
        message: 'Callback recebido com sucesso',
        jobId
      });

    } catch (error) {
      fastify.log.error(error as Error);
      return reply.code(500).send({
        error: 'Erro ao processar callback'
      });
    }
  });
}

