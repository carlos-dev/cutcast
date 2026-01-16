/**
 * Schemas para endpoints de vídeos/jobs
 */

import { errorResponses, uuidParamSchema, jobSchema, videoResultSchema } from './common.schemas';

// POST /videos - Criar job de processamento
export const createVideoJobSchema = {
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
        status: { type: 'string', enum: ['PENDING'], description: 'Status do job' },
        videoUrl: { type: 'string', format: 'uri', description: 'URL do vídeo no R2' }
      }
    },
    400: errorResponses[400],
    401: errorResponses[401],
    500: errorResponses[500],
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
};

// GET /jobs - Listar jobs do usuário
export const listJobsSchema = {
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
          items: jobSchema
        }
      }
    },
    401: errorResponses[401]
  }
};

// DELETE /videos/:id - Deletar job e vídeo
export const deleteVideoJobSchema = {
  tags: ['videos'],
  summary: 'Deletar job e vídeo',
  description: 'Deleta um job e remove o arquivo do R2. Requer autenticação. Apenas o dono do job pode deletá-lo.',
  security: [{ bearerAuth: [] }],
  params: uuidParamSchema,
  response: {
    200: {
      description: 'Job e vídeo deletados com sucesso',
      type: 'object',
      properties: {
        message: { type: 'string' },
        jobId: { type: 'string', format: 'uuid' }
      }
    },
    401: errorResponses[401],
    403: {
      description: 'Acesso negado - Você não pode deletar jobs de outros usuários',
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    },
    404: errorResponses[404],
    500: {
      description: 'Erro ao deletar job',
      type: 'object',
      properties: {
        error: { type: 'string' }
      }
    }
  }
};

// GET /videos/:id - Consultar status do job
export const getVideoJobSchema = {
  tags: ['videos'],
  summary: 'Consultar status do job',
  description: 'Retorna informações sobre um job de processamento de vídeo',
  params: uuidParamSchema,
  response: {
    200: {
      description: 'Job encontrado',
      type: 'object',
      properties: {
        jobId: { type: 'string', format: 'uuid', description: 'ID do job' },
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'DONE', 'FAILED'],
          description: 'Status atual do job'
        },
        inputUrl: { type: 'string', format: 'uri', description: 'URL do vídeo original' },
        outputUrls: {
          type: 'array',
          items: { type: 'string', format: 'uri' },
          description: 'URLs dos vídeos processados (DEPRECATED - use results)'
        },
        results: {
          type: 'array',
          items: videoResultSchema,
          description: 'Vídeos com metadados completos (NOVO FORMATO)'
        },
        errorMessage: { type: 'string', description: 'Mensagem de erro (se houver)' },
        createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' },
        updatedAt: { type: 'string', format: 'date-time', description: 'Data de atualização' }
      }
    },
    404: errorResponses[404]
  }
};
