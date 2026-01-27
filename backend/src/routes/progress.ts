import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

// Armazena conexões SSE ativas por jobId
const activeConnections = new Map<string, Set<(data: string) => void>>();

// Armazena o último progresso de cada job para evitar "vai e volta"
const lastProgress = new Map<string, number>();

// Função para enviar progresso para todas as conexões de um job
export function broadcastProgress(jobId: string, data: object) {
  const connections = activeConnections.get(jobId);
  if (connections) {
    const message = JSON.stringify(data) + '\n';
    connections.forEach(send => {
      try {
        send(message);
      } catch {
        // Conexão pode ter sido fechada
      }
    });
  }
}

export async function progressRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  // Handler para preflight CORS (OPTIONS)
  fastify.options('/jobs/:job_id/progress', async (request, reply) => {
    const origin = request.headers.origin || '*';
    return reply
      .header('Access-Control-Allow-Origin', origin)
      .header('Access-Control-Allow-Credentials', 'true')
      .header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
      .header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      .header('Access-Control-Max-Age', '86400')
      .code(204)
      .send();
  });
 
  // Endpoint GET /jobs/:job_id/progress - Stream de progresso NDJSON
  fastify.get('/jobs/:job_id/progress', {
    preHandler: requireAuth
  }, async (request, reply) => {
    const { job_id } = request.params as { job_id: string };
    const { userId } = request as AuthenticatedRequest;

    // Verifica se o job existe e pertence ao usuário
    const job = await prisma.job.findUnique({
      where: { id: job_id }
    });

    if (!job) {
      return reply.code(404).send({ error: 'Job não encontrado' });
    }

    if (job.userId !== userId) {
      return reply.code(403).send({ error: 'Acesso negado' });
    }

    // Se o job já está concluído, retorna o resultado imediatamente
    if (job.status === 'DONE') {
      reply.header('Content-Type', 'application/x-ndjson');
      return reply.send(JSON.stringify({
        status: 'completed',
        progress: 100,
        success: true
      }) + '\n');
    }

    if (job.status === 'FAILED') {
      reply.header('Content-Type', 'application/x-ndjson');
      return reply.send(JSON.stringify({
        status: 'error',
        progress: 0,
        error: job.errorMessage || 'Erro desconhecido'
      }) + '\n');
    }

    // Pega a origem da requisição para CORS
    const origin = request.headers.origin || '*';

    // Configura headers para streaming NDJSON com CORS
    reply.raw.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Desabilita buffering no nginx/proxy
      // Headers CORS necessários para streaming
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    });

    // Registra a conexão
    if (!activeConnections.has(job_id)) {
      activeConnections.set(job_id, new Set());
    }

    const sendData = (data: string) => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(data);
      }
    };

    activeConnections.get(job_id)!.add(sendData);
    const totalConnections = activeConnections.get(job_id)!.size;
    fastify.log.info(`[PROGRESS GET] Frontend conectou ao job=${job_id}. Total conexões: ${totalConnections}`);

    // Envia status inicial
    sendData(JSON.stringify({
      status: 'downloading',
      progress: 0,
      message: 'Conectado ao stream de progresso'
    }) + '\n');

    // Cleanup quando a conexão fechar
    request.raw.on('close', () => {
      fastify.log.info(`[PROGRESS GET] Frontend desconectou do job=${job_id}`);
      const connections = activeConnections.get(job_id);
      if (connections) {
        connections.delete(sendData);
        if (connections.size === 0) {
          activeConnections.delete(job_id);
        }
      }
    });

    // Mantém a conexão aberta - o progresso será enviado via broadcastProgress
    // Timeout de 10 minutos (o processamento pode demorar)
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!reply.raw.writableEnded) {
          sendData(JSON.stringify({
            status: 'error',
            progress: 0,
            error: 'Timeout - processamento demorou muito'
          }) + '\n');
          reply.raw.end();
        }
        resolve();
      }, 10 * 60 * 1000); // 10 minutos

      request.raw.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  });

  // Endpoint interno para receber progresso do n8n/Worker
  // POST /jobs/:job_id/progress (diferente do GET que é para o frontend)
  fastify.post('/jobs/:job_id/progress', async (request, reply) => {
    const { job_id } = request.params as { job_id: string };
    const body = request.body as {
      status: string;
      progress: number;
      message?: string;
      clipIndex?: number;
      totalClips?: number;
      url?: string;
      error?: string;
    };

    const connectionsCount = activeConnections.get(job_id)?.size || 0;
    const currentProgress = body.progress || 0;
    const previousProgress = lastProgress.get(job_id) || 0;

    fastify.log.info(`[PROGRESS POST] job=${job_id} status=${body.status} progress=${currentProgress}% (anterior=${previousProgress}%) conexões_ativas=${connectionsCount}`);

    // Só faz broadcast se o progresso for MAIOR que o anterior (evita "vai e volta")
    // Exceção: status 'completed' ou 'error' sempre passa
    if (currentProgress > previousProgress || body.status === 'completed' || body.status === 'error') {
      lastProgress.set(job_id, currentProgress);
      broadcastProgress(job_id, body);
      fastify.log.info(`[PROGRESS POST] Broadcast enviado para ${connectionsCount} conexões`);
    } else {
      fastify.log.info(`[PROGRESS POST] Ignorado (progresso menor ou igual ao anterior)`);
    }

    // Se completou ou deu erro, fecha as conexões e limpa o cache
    if (body.status === 'completed' || body.status === 'error') {
      lastProgress.delete(job_id); // Limpa cache de progresso
      const connections = activeConnections.get(job_id);
      if (connections) {
        const finalMessage = JSON.stringify(body) + '\n';
        connections.forEach(send => {
          try {
            send(finalMessage);
          } catch {
            // Ignora erros de conexão fechada
          }
        });
        activeConnections.delete(job_id);
      }
    }

    return reply.send({ success: true });
  });
}
