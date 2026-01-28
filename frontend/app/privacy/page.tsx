"use client";

import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50">
      <Header />

      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="p-8 backdrop-blur-sm bg-card/80 border-2">
            <h1 className="text-3xl font-bold mb-2">Política de Privacidade - CutCast</h1>
            <p className="text-muted-foreground mb-8">
              Última atualização: 28 de Janeiro de 2026
            </p>

            <div className="space-y-8 text-sm leading-relaxed">
              {/* 1. Introdução */}
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
                <p className="text-muted-foreground">
                  O CutCast (&quot;nós&quot;, &quot;nosso&quot; ou &quot;Serviço&quot;) respeita sua privacidade e está comprometido
                  em proteger seus dados pessoais. Esta Política de Privacidade explica como coletamos, usamos,
                  armazenamos e protegemos suas informações quando você usa nosso serviço.
                </p>
              </section>

              {/* 2. Dados Coletados */}
              <section>
                <h2 className="text-xl font-semibold mb-3">2. Dados que Coletamos</h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Dados de Conta</h3>
                    <p>
                      Quando você cria uma conta, coletamos seu e-mail e nome. Se você fizer login via provedores
                      externos (Google, etc.), recebemos informações básicas do perfil.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Conteúdo de Vídeo</h3>
                    <p>
                      Os vídeos que você envia são armazenados temporariamente em nossos servidores para processamento.
                      A transcrição e os metadados são usados apenas para gerar os cortes solicitados.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Dados de Uso</h3>
                    <p>
                      Coletamos informações sobre como você usa o serviço, incluindo páginas visitadas, recursos
                      utilizados, horários de acesso e dados de desempenho para melhorar a experiência.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Dados Técnicos</h3>
                    <p>
                      Endereço IP, tipo de navegador, sistema operacional, informações do dispositivo e cookies
                      essenciais para o funcionamento do serviço.
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Como Usamos */}
              <section>
                <h2 className="text-xl font-semibold mb-3">3. Como Usamos Seus Dados</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                  <li>Fornecer e manter o serviço de processamento de vídeos</li>
                  <li>Processar suas solicitações e gerar os cortes de vídeo</li>
                  <li>Enviar comunicações sobre sua conta e atualizações do serviço</li>
                  <li>Melhorar e personalizar a experiência do usuário</li>
                  <li>Detectar e prevenir fraudes, abusos e problemas técnicos</li>
                  <li>Cumprir obrigações legais</li>
                </ul>
              </section>

              {/* 4. Compartilhamento */}
              <section>
                <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
                <p className="text-muted-foreground mb-3">
                  Não vendemos seus dados pessoais. Podemos compartilhar informações apenas com:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                  <li>
                    <strong>Provedores de Serviço:</strong> Empresas que nos ajudam a operar (hospedagem, processamento
                    de pagamentos, análise), sob contratos de confidencialidade.
                  </li>
                  <li>
                    <strong>APIs de IA:</strong> Usamos serviços de terceiros para transcrição e análise. Apenas os
                    dados necessários são enviados, sem identificação pessoal.
                  </li>
                  <li>
                    <strong>Requisitos Legais:</strong> Quando exigido por lei, ordem judicial ou para proteger nossos
                    direitos e segurança.
                  </li>
                </ul>
              </section>

              {/* 5. Armazenamento */}
              <section>
                <h2 className="text-xl font-semibold mb-3">5. Armazenamento e Segurança</h2>
                <p className="text-muted-foreground">
                  Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS) e em repouso.
                  Implementamos medidas de segurança técnicas e organizacionais para proteger contra acesso não
                  autorizado, alteração ou destruição de dados. Os vídeos processados são armazenados por até 30 dias
                  após o processamento, a menos que você solicite a exclusão antecipada.
                </p>
              </section>

              {/* 6. Seus Direitos */}
              <section>
                <h2 className="text-xl font-semibold mb-3">6. Seus Direitos (LGPD/GDPR)</h2>
                <p className="text-muted-foreground">
                  Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento.
                  Para exercer esses direitos, entre em contato conosco através do e-mail de suporte disponível
                  na plataforma.
                </p>
              </section>

              {/* 7. Cookies */}
              <section>
                <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
                <p className="text-muted-foreground">
                  Usamos cookies essenciais para manter sua sessão ativa e preferências. Cookies de análise podem ser
                  usados para entender como o serviço é utilizado. Você pode configurar seu navegador para recusar
                  cookies, mas isso pode afetar a funcionalidade do serviço.
                </p>
              </section>

              {/* 8. Menores */}
              <section>
                <h2 className="text-xl font-semibold mb-3">8. Menores de Idade</h2>
                <p className="text-muted-foreground">
                  O CutCast não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de crianças.
                  Se tomarmos conhecimento de que coletamos dados de um menor, tomaremos medidas para excluí-los.
                </p>
              </section>

              {/* 9. Alterações */}
              <section>
                <h2 className="text-xl font-semibold mb-3">9. Alterações nesta Política</h2>
                <p className="text-muted-foreground">
                  Podemos atualizar esta Política de Privacidade periodicamente. Alterações significativas serão
                  notificadas por e-mail ou através de aviso na plataforma. Recomendamos revisar esta página
                  regularmente.
                </p>
              </section>

              {/* 10. Contato */}
              <section>
                <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
                <p className="text-muted-foreground">
                  Para dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados,
                  entre em contato através do e-mail de suporte disponível na plataforma.
                </p>
              </section>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
        <p>© 2026 CutCast. Transformando conteúdo em viralidade.</p>
        <div className="mt-2 space-x-4">
          <a href="/terms" className="hover:text-foreground transition-colors">
            Termos de Uso
          </a>
          <a href="/privacy" className="hover:text-foreground transition-colors">
            Privacidade
          </a>
        </div>
      </footer>
    </div>
  );
}
