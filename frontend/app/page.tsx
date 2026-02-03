"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Scissors,
  Zap,
  CreditCard,
  Play,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth-modal";
import {
  FAQItem,
  PricingCard,
  FeatureCard,
  HeroVisualFlow,
  HeroDecorations,
  FeaturesDecorations,
  PricingDecorations,
  FAQDecorations
} from "@/components/landing";

export default function LandingPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleCTAClick = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      setShowAuthModal(true);
    }
  };

  const features = [
    {
      icon: Scissors,
      title: "Zero Curva de Aprendizado",
      description: "Feito para quem não é editor. Interface limpa e direta ao ponto. Não perca tempo configurando mil parâmetros."
    },
    {
      icon: Zap,
      title: "Agilidade Real",
      description: "Do link ao rascunho do TikTok em poucos minutos. Integração direta que elimina o trabalho manual de baixar e subir arquivos."
    },
    {
      icon: CreditCard,
      title: "Preço Transparente",
      description: "Sem assinaturas mensais obrigatórias. Pague em Reais (R$) e apenas quando precisar usar. Simples assim."
    }
  ];

  const pricingPlans = [
    {
      title: "Experimentar",
      price: "10",
      credits: 5,
      features: ["5 Créditos", "~R$ 2,00 por vídeo", "Legendas automáticas"]
    },
    {
      title: "Criador Pro",
      price: "25",
      credits: 15,
      features: ["15 Créditos", "~R$ 1,67 por vídeo", "Legendas automáticas"],
      highlighted: true
    },
    {
      title: "Power User",
      price: "50",
      credits: 40,
      features: ["40 Créditos", "~R$ 1,25 por vídeo", "Legendas automáticas"]
    }
  ];

  const faqs = [
    {
      question: "Preciso pagar mensalidade?",
      answer: "Não! O CutCast é 100% pré-pago. Você compra créditos e usa quando quiser. Sem cobranças surpresa no cartão."
    },
    {
      question: "Como funciona o consumo de créditos?",
      answer: "O consumo é calculado a cada 30 minutos de vídeo. Cada crédito permite processar até 30 minutos do vídeo original. Exemplos: vídeo de 25min = 1 crédito, vídeo de 60min = 2 créditos, vídeo de 90min = 3 créditos."
    },
    {
      question: "Os créditos expiram?",
      answer: "Nunca. Seus créditos ficam na conta para sempre até você decidir usá-los."
    },
    {
      question: "Funciona com links do YouTube?",
      answer: "Sim! Você pode colar links do YouTube ou fazer upload de arquivos do seu computador (mp4, mov, avi, mkv, webm)."
    },
    {
      question: "Qual a política de reembolso?",
      answer: "Reembolso total em até 7 dias para créditos não utilizados. Se houve falha técnica, analisamos cada caso para estorno ou reposição."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white overflow-x-hidden">
      {/* Global Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[300px] -left-[200px] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] opacity-30" />
        <div className="absolute top-[200px] -right-[200px] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[150px] opacity-25" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-lg border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="CutCast" width={32} height={32} />
            <span className="font-bold text-lg">CutCast</span>
          </div>
          <Button onClick={handleCTAClick} size="sm">
            {user ? 'Ir para Dashboard' : 'Começar Agora'}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <HeroDecorations />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transforme Vídeos Longos em{' '}
              <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
                Cortes Virais com IA
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              A ferramenta mais simples para criar cortes virais. Sem editores complexos,
              sem botões desnecessários. Apenas cole o link e receba seus vídeos prontos para o TikTok.
            </p>
            <Button
              size="lg"
              className="glow-primary text-base px-8 py-6"
              onClick={handleCTAClick}
            >
              <Play className="h-5 w-5 mr-2" />
              Testar Grátis
            </Button>
          </motion.div>

          <HeroVisualFlow />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <FeaturesDecorations />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block bg-primary/10 border border-primary/30 text-primary text-sm font-medium px-4 py-2 rounded-full mb-4">
              Por que escolher o CutCast?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simplicidade que Converte</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A inteligência complexa fica com a nossa IA. Para você, sobra apenas o clique.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 relative bg-gradient-to-b from-[#0D0D0F] to-[#131316] overflow-hidden">
        <PricingDecorations />

        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium px-4 py-2 rounded-full mb-4">
              Transparência Total
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pague Apenas o que Usar</h2>
            <p className="text-muted-foreground">
              Sem mensalidades. Sem taxas ocultas. Créditos que nunca expiram.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              >
                <PricingCard {...plan} onSelect={handleCTAClick} />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-[#1A1A1E]/50 border border-[#2A2A30]/50 rounded-xl px-6 py-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">
                1 Crédito = até 30 min de vídeo • Ex: 25 min = 1 crédito • 45 min = 2 créditos • 90 min = 3 créditos
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        <FAQDecorations />

        <div className="container mx-auto max-w-3xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-medium px-4 py-2 rounded-full mb-4">
              Tire suas dúvidas
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">Perguntas Frequentes</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <a
              href="mailto:suporte@cutcast.com.br"
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors rounded-xl px-6 py-3"
            >
              <Mail className="h-4 w-4" />
              Precisa de ajuda? suporte@cutcast.com.br
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#08080A]">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="CutCast" width={32} height={32} />
              <span className="font-bold text-lg">CutCast</span>
            </div>
            <nav className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="/terms" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="/privacy" className="hover:text-white transition-colors">Política de Privacidade</a>
              <a href="mailto:suporte@cutcast.com.br" className="hover:text-white transition-colors">Suporte</a>
            </nav>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
            <p className="text-sm text-muted-foreground">
              © 2026 CutCast. Transformando conteúdo em viralidade.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
