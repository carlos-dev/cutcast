"use client";

import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold mb-2">Termos de Uso - CutCast</h1>
            <p className="text-muted-foreground mb-8">
              Última atualização: 28 de Janeiro de 2026
            </p>

            <div className="space-y-8 text-sm leading-relaxed">
              {/* 1. Aceitação */}
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
                <p className="text-muted-foreground">
                  Ao acessar e usar o CutCast (&quot;Serviço&quot;), você concorda em cumprir estes Termos de Uso.
                  Se você não concordar com algum destes termos, não deverá usar o serviço.
                </p>
              </section>

              {/* 2. Descrição */}
              <section>
                <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
                <p className="text-muted-foreground">
                  O CutCast é uma ferramenta SaaS que utiliza Inteligência Artificial para processar vídeos longos
                  e gerar clipes curtos verticais otimizados para redes sociais. O serviço inclui transcrição
                  automática, análise de conteúdo por IA e edição automatizada de vídeos.
                </p>
              </section>

              {/* 3. Conteúdo */}
              <section>
                <h2 className="text-xl font-semibold mb-3">3. Conteúdo do Usuário e Direitos Autorais</h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Propriedade</h3>
                    <p>
                      Você mantém todos os direitos de propriedade sobre os vídeos que envia (&quot;Conteúdo do Usuário&quot;).
                      O CutCast não reivindica propriedade sobre seu conteúdo.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Licença</h3>
                    <p>
                      Ao enviar vídeos, você concede ao CutCast uma licença mundial, não exclusiva e isenta de royalties
                      apenas para hospedar, processar, modificar e criar obras derivadas (os cortes) conforme solicitado
                      por você através da funcionalidade da plataforma. Esta licença é encerrada quando você exclui seu conteúdo.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Responsabilidade</h3>
                    <p>
                      Você declara e garante que possui todos os direitos necessários sobre o conteúdo enviado e que ele
                      não viola direitos autorais, marcas registradas ou direitos de imagem de terceiros. Você é o único
                      responsável pelo conteúdo que processa através do serviço.
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. Uso Aceitável */}
              <section>
                <h2 className="text-xl font-semibold mb-3">4. Uso Aceitável</h2>
                <p className="text-muted-foreground mb-3">Você concorda em não usar o CutCast para:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                  <li>
                    Processar conteúdo ilegal, pornográfico, violento, de ódio ou que viole as diretrizes de
                    comunidade de plataformas como YouTube, TikTok ou Instagram.
                  </li>
                  <li>Fazer engenharia reversa, descompilar ou tentar extrair o código-fonte do software.</li>
                  <li>Enviar vídeos contendo malware, vírus ou qualquer código malicioso.</li>
                  <li>Usar o serviço para fins de spam, fraude ou atividades ilegais.</li>
                  <li>Sobrecarregar intencionalmente os servidores ou interferir na operação do serviço.</li>
                </ul>
              </section>

              {/* 5. Armazenamento */}
              <section>
                <h2 className="text-xl font-semibold mb-3">5. Armazenamento e Retenção de Dados</h2>
                <p className="text-muted-foreground">
                  Os vídeos enviados e os cortes gerados são armazenados em nossos servidores pelo período necessário
                  para fornecer o serviço. Você pode solicitar a exclusão de seus dados a qualquer momento. Após a
                  exclusão da conta, seus dados serão removidos em até 30 dias, exceto quando a retenção for exigida
                  por lei.
                </p>
              </section>

              {/* 6. Integrações */}
              <section>
                <h2 className="text-xl font-semibold mb-3">6. Integrações de Terceiros</h2>
                <p className="text-muted-foreground">
                  O serviço pode permitir a publicação direta em plataformas de terceiros (ex: TikTok, YouTube, Instagram).
                  Ao usar esses recursos, você concorda em cumprir os Termos de Serviço dessas plataformas. O CutCast
                  não se responsabiliza por conteúdos removidos, monetização negada ou contas banidas nessas plataformas.
                </p>
              </section>

              {/* 7. Pagamentos */}
              <section>
                <h2 className="text-xl font-semibold mb-3">7. Pagamentos e Reembolsos</h2>
                <p className="text-muted-foreground">
                  Os planos pagos são cobrados de forma recorrente conforme o período selecionado. Você pode cancelar
                  sua assinatura a qualquer momento, mantendo acesso até o final do período pago. Reembolsos podem ser
                  solicitados em até 7 dias após a primeira compra, desde que o serviço não tenha sido utilizado
                  substancialmente.
                </p>
              </section>

              {/* 8. Limitação */}
              <section>
                <h2 className="text-xl font-semibold mb-3">8. Limitação de Responsabilidade</h2>
                <p className="text-muted-foreground">
                  O CutCast é fornecido &quot;como está&quot; e &quot;conforme disponível&quot;. Não garantimos que a IA
                  gerará resultados perfeitos, livres de erros ou adequados para qualquer finalidade específica.
                  Em nenhuma circunstância o CutCast, seus diretores, funcionários ou parceiros serão responsáveis
                  por danos indiretos, incidentais, especiais, punitivos, perda de dados, lucros cessantes ou
                  interrupção de negócios decorrentes do uso ou incapacidade de usar o serviço.
                </p>
              </section>

              {/* 9. Cancelamento */}
              <section>
                <h2 className="text-xl font-semibold mb-3">9. Cancelamento e Suspensão</h2>
                <p className="text-muted-foreground">
                  Reservamo-nos o direito de suspender ou encerrar sua conta, sem aviso prévio, se você violar estes
                  Termos, especialmente no que tange ao envio de conteúdo proibido ou uso abusivo do serviço. Você
                  também pode encerrar sua conta a qualquer momento através das configurações.
                </p>
              </section>

              {/* 10. Alterações */}
              <section>
                <h2 className="text-xl font-semibold mb-3">10. Alterações nos Termos</h2>
                <p className="text-muted-foreground">
                  Podemos atualizar estes Termos periodicamente. Alterações significativas serão notificadas por
                  e-mail ou através de aviso na plataforma. O uso continuado do serviço após as alterações constitui
                  aceitação dos novos termos.
                </p>
              </section>

              {/* 11. Contato */}
              <section>
                <h2 className="text-xl font-semibold mb-3">11. Contato</h2>
                <p className="text-muted-foreground">
                  Para dúvidas sobre estes Termos de Uso, entre em contato através do e-mail de suporte
                  disponível na plataforma.
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
