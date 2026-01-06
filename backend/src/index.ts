import 'dotenv/config';
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
            videoUrl: body.videoUrl
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
    console.error('❌ Erro ao iniciar servidor:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

start().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
