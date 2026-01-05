import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { v4 as uuidv4 } from 'uuid';
import { VideoJob } from './types';

const fastify = Fastify({
  logger: true
});

// Armazenamento em memória dos jobs
const jobs = new Map<string, VideoJob>();

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
      { name: 'videos', description: 'Endpoints relacionados ao processamento de vídeos' }
    ]
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

// Registra o plugin de multipart para aceitar upload de arquivos
fastify.register(multipart);

// Registra as rotas
fastify.register(async function routes(fastify) {
  // Endpoint POST /videos
  fastify.post('/videos', {
  schema: {
    tags: ['videos'],
    summary: 'Upload de vídeo',
    description: 'Faz upload de um vídeo e cria um job de processamento',
    consumes: ['multipart/form-data'],
    body: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo de vídeo (mp4, mov, etc.)'
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
    // Recebe o arquivo enviado via multipart/form-data
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({
        error: 'Nenhum arquivo enviado'
      });
    }

    // Gera um ID único para o job
    const jobId = uuidv4();

    // Cria o objeto do job com status UPLOADED
    const job: VideoJob = {
      id: jobId,
      status: 'UPLOADED',
      originalFilename: data.filename,
      createdAt: new Date()
    };

    // Salva o job em memória
    jobs.set(jobId, job);

    // Descarta o conteúdo do arquivo (não estamos salvando ainda)
    await data.file.resume();

    // Retorna os dados do job criado
    return reply.code(201).send({
      job_id: job.id,
      status: job.status
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      error: 'Erro ao processar upload'
    });
  }
});

// Endpoint GET /videos/:id para consultar status (útil para debug)
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
});

// Inicia o servidor
const start = async () => {
  try {
    await fastify.ready(); // Garante que todos os plugins estão carregados
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Servidor rodando em http://localhost:3000');
    console.log('📚 Documentação Swagger em http://localhost:3000/docs');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
