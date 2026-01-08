import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../lib/supabase';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  userEmail: string;
}

/**
 * Middleware para validar o JWT do Supabase e extrair o userId
 * Espera um header Authorization: Bearer <token>
 * Garante que o usuário existe na tabela users do banco de dados
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Token de autenticação não fornecido',
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    // Valida o token usando o Supabase Admin
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado',
      });
    }

    // Garante que o usuário existe na tabela users
    // Se não existir, cria automaticamente
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email || '',
      },
      create: {
        id: user.id,
        email: user.email || '',
      },
    });

    // Adiciona o userId e userEmail ao request para uso nas rotas
    (request as AuthenticatedRequest).userId = user.id;
    (request as AuthenticatedRequest).userEmail = user.email || '';
  } catch (err) {
    request.log.error(err, 'Erro ao validar token');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Erro ao validar token',
    });
  }
}
