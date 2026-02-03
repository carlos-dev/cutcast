"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Check, Loader2, Unlink } from "lucide-react";
import { motion } from "framer-motion";
import { getTikTokStatus, disconnectTikTok, getTikTokConnectUrl, getCredits, buyCredits } from "@/lib/api";
import { Zap, Plus } from "lucide-react";

// TikTok Icon SVG
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

export function Header() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [tiktokConnected, setTiktokConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  // Verifica status do TikTok e créditos ao carregar
  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.id) {
        setIsChecking(false);
        return;
      }

      try {
        // Busca status do TikTok e créditos em paralelo
        const [tiktokStatus, userCredits] = await Promise.all([
          getTikTokStatus(user.id),
          getCredits(user.id)
        ]);

        setTiktokConnected(tiktokStatus.connected && !tiktokStatus.isExpired);
        setCredits(userCredits);
      } catch (error) {
        console.error("Erro ao verificar status:", error);
        setTiktokConnected(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [user?.id]);

  // Verifica parâmetros da URL (retorno do OAuth e Stripe)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    // TikTok OAuth callback
    if (params.get("tiktok_connected") === "true") {
      setTiktokConnected(true);
      toast({
        title: "TikTok Conectado!",
        description: "Sua conta TikTok foi vinculada com sucesso.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("tiktok_error")) {
      toast({
        variant: "destructive",
        title: "Erro ao conectar TikTok",
        description: params.get("tiktok_error") || "Tente novamente.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Stripe payment callback
    if (params.get("success") === "true") {
      toast({
        title: "Pagamento Confirmado!",
        description: "Seus créditos foram adicionados à sua conta.",
      });
      // Atualiza o saldo de créditos
      if (user?.id) {
        getCredits(user.id).then(setCredits).catch(console.error);
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("canceled") === "true") {
      toast({
        variant: "destructive",
        title: "Pagamento Cancelado",
        description: "O pagamento foi cancelado.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast, user?.id]);

  const handleConnectTikTok = () => {
    if (!user?.id) return;

    // Abre em nova aba (mais confiável que popup)
    const newWindow = window.open(
      getTikTokConnectUrl(user.id),
      "_blank"
    );

    // Se não conseguiu abrir (bloqueado), tenta redirect
    if (!newWindow) {
      window.location.href = getTikTokConnectUrl(user.id);
      return;
    }

    // Polling para verificar quando a autenticação completar
    const checkInterval = setInterval(async () => {
      try {
        // Verifica se a janela foi fechada
        if (newWindow.closed) {
          clearInterval(checkInterval);
          // Verifica o status após fechar a janela
          const status = await getTikTokStatus(user.id);
          if (status.connected && !status.isExpired) {
            setTiktokConnected(true);
            toast({
              title: "TikTok Conectado!",
              description: "Sua conta TikTok foi vinculada com sucesso.",
            });
          }
        }
      } catch {
        // Ignora erros de cross-origin
      }
    }, 1000);

    // Limpa o intervalo após 5 minutos (timeout)
    setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
  };

  const handleDisconnectTikTok = async () => {
    if (!user?.id) return;

    setIsDisconnecting(true);
    try {
      await disconnectTikTok(user.id);
      setTiktokConnected(false);
      setShowDisconnect(false);
      toast({
        title: "TikTok Desconectado",
        description: "Sua conta TikTok foi desvinculada.",
      });
    } catch (error) {
      console.error("Erro ao desconectar TikTok:", error);
      toast({
        variant: "destructive",
        title: "Erro ao desconectar",
        description: "Tente novamente mais tarde.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!user) return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">
              {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">
              {user.user_metadata?.name || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Credits Display */}
          {credits !== null && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-amber-600 hover:text-amber-700"
                onClick={() => setShowBuyCredits(!showBuyCredits)}
              >
                <Zap className="h-4 w-4 fill-current" />
                <span className="font-semibold">{credits}</span>
                <Plus className="h-3 w-3" />
              </Button>

              {/* Dropdown de compra de créditos */}
              {showBuyCredits && (
                <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg p-3 min-w-[200px] z-50">
                  <p className="text-sm font-medium mb-2">Comprar Créditos</p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => {
                        if (user?.id) buyCredits(user.id, 5);
                      }}
                    >
                      <span>5 créditos</span>
                      <span className="text-muted-foreground">$5.00</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => {
                        if (user?.id) buyCredits(user.id, 10);
                      }}
                    >
                      <span>10 créditos</span>
                      <span className="text-muted-foreground">$10.00</span>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => {
                        if (user?.id) buyCredits(user.id, 20);
                      }}
                    >
                      <span>20 créditos</span>
                      <span>$20.00</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TikTok Status/Connect Button */}
          {isChecking ? (
            <Button variant="ghost" size="sm" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : tiktokConnected ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-green-600 hover:text-green-700"
                onClick={() => setShowDisconnect(!showDisconnect)}
              >
                <TikTokIcon className="h-4 w-4" />
                <Check className="h-3 w-3" />
                <span className="hidden sm:inline">Conectado</span>
              </Button>

              {/* Dropdown de desconectar */}
              {showDisconnect && (
                <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg p-1 min-w-[140px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={handleDisconnectTikTok}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                    Desconectar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleConnectTikTok}
            >
              <TikTokIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Vincular TikTok</span>
            </Button>
          )}

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>

      {/* Overlay para fechar dropdowns */}
      {(showDisconnect || showBuyCredits) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDisconnect(false);
            setShowBuyCredits(false);
          }}
        />
      )}
    </motion.header>
  );
}
