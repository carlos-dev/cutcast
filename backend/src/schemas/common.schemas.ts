/**
 * Schemas comuns reutilizáveis para toda a API
 */

// Schema para VideoResult (item com metadados completos)
export const videoResultSchema = {
  type: 'object',
  properties: {
    videoUrl: { type: 'string', format: 'uri' },
    titulo_viral: { type: 'string' },
    legenda_post: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    titulo_tecnico: { type: 'string' }
  }
};

// Schemas de erro reutilizáveis
export const errorResponses = {
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
  403: {
    description: 'Acesso negado',
    type: 'object',
    properties: {
      error: { type: 'string' }
    }
  },
  404: {
    description: 'Recurso não encontrado',
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
};

// Schema de parâmetro UUID comum
export const uuidParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'ID do job'
    }
  }
};

// Schema de Job completo (usado em respostas)
export const jobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] },
    inputUrl: { type: 'string', format: 'uri' },
    outputUrls: {
      type: 'array',
      items: { type: 'string', format: 'uri' },
      description: 'URLs dos vídeos processados (DEPRECATED)'
    },
    results: {
      type: 'array',
      items: videoResultSchema,
      description: 'Vídeos com metadados completos (NOVO FORMATO)'
    },
    errorMessage: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};
