import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { JobCallback } from '../types';
import { prisma } from '../lib/prisma';
import { jobCallbackSchema } from '../schemas/callbacks.schemas';
import { sendVideoReadyEmail } from '../lib/mail';

export async function callbacksRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Endpoint POST /jobs/:job_id/callback
  fastify.post('/jobs/:job_id/callback', {
    schema: jobCallbackSchema
  }, async (request, reply) => {
    try {
      const body = request.body as JobCallback;
      const jobId = body.jobId;
      fastify.log.info(`Callback recebido para job ${jobId}: ${body}`);
      // Valida se o job existe
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        return reply.code(404).send({
          error: 'Job não encontrado'
        });
      }

      // Valida se o status foi enviado
      if (!body.status) {
        return reply.code(400).send({
          error: 'O campo status é obrigatório'
        });
      }

      // Valida se o status é válido
      if (body.status !== 'completed' && body.status !== 'error') {
        return reply.code(400).send({
          error: 'Status deve ser "completed" ou "error"'
        });
      }

      // Validações condicionais baseadas no status
      if (body.status === 'completed') {
        // Valida que pelo menos results OU outputUrls foi enviado
        if ((!body.results || !Array.isArray(body.results) || body.results.length === 0) &&
            (!body.outputUrls || !Array.isArray(body.outputUrls) || body.outputUrls.length === 0)) {
          return reply.code(400).send({
            error: 'results ou outputUrls é obrigatório e deve conter pelo menos um item quando status é "completed"'
          });
        }

        // Valida results se foi enviado
        if (body.results && Array.isArray(body.results)) {
          for (const result of body.results) {
            if (!result.videoUrl) {
              return reply.code(400).send({
                error: 'Cada item em results deve conter videoUrl'
              });
            }
            try {
              new URL(result.videoUrl);
            } catch {
              return reply.code(400).send({
                error: `URL inválida em results: ${result.videoUrl}`
              });
            }
          }
        }

        // Valida outputUrls se foi enviado (retrocompatibilidade)
        if (body.outputUrls && Array.isArray(body.outputUrls)) {
          for (const url of body.outputUrls) {
            try {
              new URL(url);
            } catch {
              return reply.code(400).send({
                error: `URL inválida no array outputUrls: ${url}`
              });
            }
          }
        }
      }

      if (body.status === 'error' && !body.errorMessage) {
        return reply.code(400).send({
          error: 'errorMessage é obrigatório quando status é "error"'
        });
      }

      // Salva o callback no banco de dados
      await prisma.callback.create({
        data: {
          jobId: jobId,
          status: body.status,
          outputUrls: body.outputUrls ? JSON.stringify(body.outputUrls) : null,
          results: body.results ? (body.results as any) : undefined, // Cast para JSON type do Prisma
          errorMessage: body.errorMessage
        }
      });

      // Atualiza o status do job no banco
      const newStatus = body.status === 'completed' ? 'DONE' : 'FAILED';
      const updateData: any = {
        status: newStatus
      };

      // Se completado, salva os dados
      if (body.status === 'completed') {
        // PRIORIZA results (novo formato) sobre outputUrls (formato antigo)
        if (body.results && body.results.length > 0) {
          updateData.results = body.results as any; // Cast para JSON type do Prisma
          // Extrai as URLs para manter compatibilidade com outputUrls
          updateData.outputUrls = body.results.map(r => r.videoUrl);
        } else if (body.outputUrls && body.outputUrls.length > 0) {
          // Fallback: se não houver results, usa outputUrls
          updateData.outputUrls = body.outputUrls;
        }

        // Decrementa créditos do usuário apenas quando processamento foi bem-sucedido
        await prisma.user.update({
          where: { id: job.userId },
          data: {
            credits: { decrement: job.creditCost }
          }
        });
      }

      // Se erro, salva a mensagem de erro
      if (body.status === 'error' && body.errorMessage) {
        updateData.errorMessage = body.errorMessage;
      }

      await prisma.job.update({
        where: { id: jobId },
        data: updateData
      });

      fastify.log.info(`Callback recebido para job ${jobId}: ${body.status}`);

      // Envia e-mail de notificação quando o processamento foi bem-sucedido
      if (body.status === 'completed') {
        try {
          const user = await prisma.user.findUnique({
            where: { id: job.userId },
            select: { email: true }
          });

          if (user?.email) {
            const videoTitle = job.inputUrl.split('/').pop() || 'seu vídeo';
            const projectUrl = `https://cutcast.com.br/history?completed=${jobId}`;
            await sendVideoReadyEmail(user.email, videoTitle, projectUrl);
            fastify.log.info(`E-mail de notificação enviado para ${user.email} (job ${jobId})`);
          }
        } catch (emailError) {
          fastify.log.error(`Erro ao enviar e-mail para job ${jobId}: ${emailError}`);
        }
      }

      // Retorna sucesso
      return reply.send({
        message: 'Callback recebido com sucesso',
        jobId
      });

    } catch (error) {
      fastify.log.error(error as Error);
      return reply.code(500).send({
        error: 'Erro ao processar callback'
      });
    }
  });
}

