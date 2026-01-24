import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerRoutes } from './routes';

const fastify = Fastify({
  logger: true
});

// Configura Swagger
fastify.register(swagger, {
  openapi: {
    info: {
      title: 'CutCast API',
      description: 'API para geração automática de cortes verticais de vídeos',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desenvolvimento'
      }
    ],
    tags: [
      { name: 'videos', description: 'Endpoints relacionados ao processamento de vídeos' },
      { name: 'jobs', description: 'Endpoints para consulta de jobs' },
      { name: 'callbacks', description: 'Endpoints relacionados a callbacks do webhook n8n' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT do Supabase Auth. Obtenha fazendo login no frontend.'
        }
      }
    }
  }
});

// Configura Swagger UI
fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
});

// Registra CORS para permitir requisições do frontend
fastify.register(cors, {
  origin: true, // Permite todas as origens (em produção, especifique os domínios)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Registra o plugin de multipart para aceitar upload de arquivos
fastify.register(multipart, {
  limits: {
    fileSize: 1 * 1024 * 1024 * 1024, // 1GB (em bytes)
    files: 1 // Apenas 1 arquivo por vez
  }
});


// Hook para adicionar header que evita o aviso do ngrok
fastify.addHook('onRequest', async (request) => {
  // Adiciona header para pular o aviso do ngrok se não estiver presente
  if (!request.headers['ngrok-skip-browser-warning']) {
    request.headers['ngrok-skip-browser-warning'] = 'true';
  }
});

// Registra as rotas
fastify.register(registerRoutes);

// Inicia o servidor
const start = async () => {
  try {
    await fastify.ready(); // Garante que todos os plugins estão carregados
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Servidor rodando em http://localhost:3000 test');
    console.log('📚 Documentação Swagger em http://localhost:3000/docs');
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

start().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
