import { FastifyInstance } from 'fastify';
import { videosRoutes } from './videos';
import { callbacksRoutes } from './callbacks';
import { jobsRoutes } from './jobs';

export async function registerRoutes(fastify: FastifyInstance) {
  // Endpoint GET / para informações sobre a API
  fastify.get('/', async (request, reply) => {
    return reply.send({
      message: 'CutCast API',
      version: '1.0.0',
      endpoints: {
        'POST /videos': 'Criar job de processamento de vídeo',
        'GET /videos/:id': 'Consultar status do job',
        'GET /jobs/:id': 'Consultar status do job (alternativo)',
        'POST /jobs/:job_id/callback': 'Receber callback do webhook n8n',
        'GET /docs': 'Documentação Swagger'
      },
      note: 'Para acessar via ngrok sem o aviso, adicione o header: ngrok-skip-browser-warning: true'
    });
  });

  // Registra todas as rotas
  fastify.register(videosRoutes);
  fastify.register(jobsRoutes);
  fastify.register(callbacksRoutes);
}

