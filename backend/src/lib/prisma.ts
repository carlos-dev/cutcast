import { PrismaClient } from '@prisma/client';

// Cria uma instância única do PrismaClient
// Em desenvolvimento, evita criar múltiplas conexões devido ao hot-reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Função helper para garantir que existe um usuário "system" no banco
// Como o MVP não tem autenticação, usamos um usuário padrão para todos os jobs
export async function ensureSystemUser() {
  const systemEmail = 'system@cutcast.internal';

  let user = await prisma.user.findUnique({
    where: { email: systemEmail }
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email: systemEmail }
    });
  }

  return user;
}
