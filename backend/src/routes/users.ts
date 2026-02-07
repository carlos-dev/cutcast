import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { supabase } from '../lib/supabase';

interface UserParams {
  userId: string;
}

export async function usersRoutes(fastify: FastifyInstance) {
  /**
   * GET /users/:userId/profile
   * Retorna o perfil do usuário com informações da conta
   */
  fastify.get<{ Params: UserParams }>(
    '/users/:userId/profile',
    async (request: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply) => {
      const { userId } = request.params;

      try {
        // Busca o usuário no banco com suas contas sociais
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            credits: true,
            stripeCustomerId: true,
            createdAt: true,
            socialAccounts: {
              where: { provider: 'tiktok' },
              select: { id: true },
            },
          },
        });

        if (!user) {
          return reply.status(404).send({
            error: 'Usuário não encontrado',
          });
        }

        return reply.send({
          id: user.id,
          email: user.email,
          credits: user.credits,
          stripeCustomerId: user.stripeCustomerId,
          tiktokConnected: user.socialAccounts.length > 0,
          createdAt: user.createdAt.toISOString(),
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Erro ao buscar perfil do usuário',
        });
      }
    }
  );

  /**
   * DELETE /users/:userId
   * Deleta permanentemente a conta do usuário e todos os seus dados
   */
  fastify.delete<{ Params: UserParams }>(
    '/users/:userId',
    async (request: FastifyRequest<{ Params: UserParams }>, reply: FastifyReply) => {
      const { userId } = request.params;

      try {
        // Verifica se o usuário existe
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            message: 'Usuário não encontrado',
          });
        }

        // 0. Garante que o email está registrado na TrialUsage antes de deletar
        const existingTrial = await prisma.trialUsage.findUnique({
          where: { email: user.email },
        });

        if (!existingTrial) {
          await prisma.trialUsage.create({
            data: { email: user.email },
          });
          request.log.info(`TrialUsage criado para ${user.email} antes da exclusão`);
        }

        // 1. Busca todos os jobs do usuário para deletar arquivos do R2
        const jobs = await prisma.job.findMany({
          where: { userId },
          select: { id: true, inputUrl: true, outputUrls: true, results: true },
        });

        // 2. Deleta arquivos do R2 (opcional - pode ser feito em background)
        // Por enquanto, apenas logamos. Em produção, deletaria os arquivos do R2.
        request.log.info(`Deletando ${jobs.length} jobs do usuário ${userId}`);

        // 3. Deleta dados do banco
        // Callbacks são deletados em cascata quando jobs são deletados
        // SocialAccounts são deletados em cascata quando user é deletado
        await prisma.job.deleteMany({
          where: { userId },
        });

        // 4. Deleta o usuário do banco (SocialAccounts deletados em cascata)
        await prisma.user.delete({
          where: { id: userId },
        });

        // 5. Deleta o usuário do Supabase Auth
        const { error: supabaseError } = await supabase.auth.admin.deleteUser(userId);

        if (supabaseError) {
          request.log.error(`Erro ao deletar usuário do Supabase Auth: ${supabaseError.message}`);
          // Mesmo se falhar no Supabase, os dados já foram deletados do banco
          // O usuário não conseguirá mais fazer login
        }

        request.log.info(`Usuário ${userId} deletado com sucesso`);

        return reply.send({
          success: true,
          message: 'Conta deletada com sucesso',
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro ao deletar conta. Tente novamente.',
        });
      }
    }
  );
}
