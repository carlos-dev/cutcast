import { FastifyInstance } from 'fastify';
import { videosRoutes } from './videos';

export async function registerRoutes(fastify: FastifyInstance) {
  // Endpoint GET / para informações sobre a API
  fastify.get('/', async (request, reply) => {
    return reply.send({
      message: 'CutCast API',
      version: '1.0.0',
      endpoints: {
        'POST /videos': 'Criar job de processamento de vídeo',
        'GET /videos/:id': 'Consultar status do job',
        'GET /docs': 'Documentação Swagger'
      },
      note: 'Para acessar via ngrok sem o aviso, adicione o header: ngrok-skip-browser-warning: true'
    });
  });

  // Registra todas as rotas
  await fastify.register(videosRoutes);
}

