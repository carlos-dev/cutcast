import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma';

export async function jobsRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Endpoint GET /jobs/:id para consultar status do job
  fastify.get('/jobs/:id', {
    schema: {
      tags: ['jobs'],
      summary: 'Consultar status do job',
      description: 'Retorna informações detalhadas sobre um job de processamento de vídeo',
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
            jobId: { type: 'string', format: 'uuid', description: 'ID do job' },
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
