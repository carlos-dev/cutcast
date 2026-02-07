import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../lib/prisma';
import { supabase } from '../lib/supabase';
import Stripe from 'stripe';

// Inicializa o Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Preços em centavos (BRL) - Pacotes fixos
const PRICING_BRL: Record<number, number> = {
  5: 1000,   // R$ 10,00 por 5 créditos
  15: 2500,  // R$ 25,00 por 15 créditos
  40: 5000,  // R$ 50,00 por 40 créditos
};
const DEFAULT_PRICE_PER_CREDIT_BRL = 250; // R$ 2,50 por crédito (fallback)

// URL do frontend para redirecionamento
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cutcast.com.br';

interface CheckoutBody {
  userId: string;
  quantity: number;
}

export async function paymentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  /**
   * POST /payment/checkout
   * Cria uma sessão de checkout do Stripe para compra de créditos
   * Body: { userId, quantity }
   */
  fastify.post('/payment/checkout', async (request, reply) => {
    const { userId, quantity } = request.body as CheckoutBody;

    // Validação básica
    if (!userId) {
      return reply.code(400).send({
        error: 'userId é obrigatório'
      });
    }

    if (!quantity || quantity < 1) {
      return reply.code(400).send({
        error: 'quantity deve ser pelo menos 1'
      });
    }

    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return reply.code(404).send({
        error: 'Usuário não encontrado'
      });
    }

    try {
      // Cria ou obtém o Stripe Customer ID
      let stripeCustomerId = user.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id
          }
        });

        stripeCustomerId = customer.id;

        // Salva o Stripe Customer ID no banco
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId }
        });
      }

      // Calcula o preço total baseado no pacote ou fallback
      const totalPriceCents = PRICING_BRL[quantity] || (quantity * DEFAULT_PRICE_PER_CREDIT_BRL);

      // Cria a sessão de checkout
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Créditos CutCast',
                description: `${quantity} crédito${quantity > 1 ? 's' : ''} para gerar cortes de vídeo`
              },
              unit_amount: totalPriceCents
            },
            quantity: 1 // Preço total já calculado, quantidade é 1
          }
        ],
        metadata: {
          userId: user.id,
          credits: quantity.toString()
        },
        success_url: `${FRONTEND_URL}/dashboard/?success=true`,
        cancel_url: `${FRONTEND_URL}/dashboard/?canceled=true`
      });

      return reply.send({
        url: session.url
      });

    } catch (error) {
      fastify.log.error({ err: error }, 'Erro ao criar sessão de checkout');
      return reply.code(500).send({
        error: 'Erro ao criar sessão de pagamento'
      });
    }
  });

  /**
   * POST /payment/webhook
   * Recebe webhooks do Stripe
   * Importante: Este endpoint precisa do body raw para validar a assinatura
   */
  fastify.post('/payment/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      fastify.log.error('STRIPE_WEBHOOK_SECRET não configurado');
      return reply.code(500).send({ error: 'Webhook não configurado' });
    }

    if (!sig) {
      fastify.log.error('Header stripe-signature não encontrado');
      return reply.code(400).send({ error: 'Assinatura não encontrada' });
    }

    let event: Stripe.Event;

    try {
      // Obtém o raw body preservado pelo content type parser
      const rawBody = (request as any).rawBody as string;

      if (!rawBody) {
        throw new Error('Raw body não disponível');
      }

      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      fastify.log.error(`Erro ao validar webhook: ${message}`);
      return reply.code(400).send({ error: `Webhook Error: ${message}` });
    }

    // Processa o evento
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || '0', 10);

      if (!userId || credits <= 0) {
        fastify.log.error({ metadata: session.metadata }, 'Metadata inválido no webhook');
        return reply.code(400).send({ error: 'Metadata inválido' });
      }

      try {
        // Adiciona os créditos ao usuário
        await prisma.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: credits
            }
          }
        });

        fastify.log.info(`Créditos adicionados: ${credits} para usuário ${userId}`);
      } catch (error) {
        fastify.log.error({ err: error }, 'Erro ao adicionar créditos');
        return reply.code(500).send({ error: 'Erro ao processar pagamento' });
      }
    }

    // Retorna 200 para confirmar recebimento
    return reply.send({ received: true });
  });

  /**
   * GET /payment/credits
   * Retorna o saldo de créditos do usuário
   * Se o user não existir no banco, consulta o Supabase para pegar o email e cria com trial check
   */
  fastify.get('/payment/credits', async (request, reply) => {
    const { userId } = request.query as { userId?: string };

    if (!userId) {
      return reply.code(400).send({ error: 'userId é obrigatório' });
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    });

    if (!user) {
      // User não existe no banco ainda - busca email no Supabase e cria com trial check
      const { data: supabaseUser, error } = await supabase.auth.admin.getUserById(userId);

      if (error || !supabaseUser?.user?.email) {
        return reply.code(404).send({ error: 'Usuário não encontrado' });
      }

      const email = supabaseUser.user.email;
      const alreadyUsedTrial = await prisma.trialUsage.findUnique({ where: { email } });
      const initialCredits = alreadyUsedTrial ? 0 : 3;

      user = await prisma.user.create({
        data: { id: userId, email, credits: initialCredits },
        select: { credits: true }
      });

      if (!alreadyUsedTrial) {
        await prisma.trialUsage.create({
          data: { email, ipAddress: request.ip },
        });
      }

      request.log.info(`Novo usuário criado via /credits: ${email} | Créditos: ${initialCredits}${alreadyUsedTrial ? ' (trial já usado)' : ''}`);
    }

    return reply.send({ credits: user.credits });
  });
}
