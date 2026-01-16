/**
 * Schemas para endpoints de callbacks
 */

import { errorResponses, videoResultSchema } from './common.schemas';

// POST /jobs/:job_id/callback - Receber callback do n8n
export const jobCallbackSchema = {
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
        description: 'Array com URLs dos vídeos processados (DEPRECATED - use results)'
      },
      results: {
        type: 'array',
        items: videoResultSchema,
        description: 'Array com vídeos e metadados completos (NOVO FORMATO - preferencial)'
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
    400: errorResponses[400],
    404: errorResponses[404],
    500: errorResponses[500]
  }
};
