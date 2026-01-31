"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Check, Loader2, Unlink } from "lucide-react";
import { motion } from "framer-motion";
import { getTikTokStatus, disconnectTikTok, getTikTokConnectUrl } from "@/lib/api";

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

  // Verifica status do TikTok ao carregar
  useEffect(() => {
    const checkTikTokStatus = async () => {
      if (!user?.id) {
        setIsChecking(false);
        return;
      }

      try {
        const status = await getTikTokStatus(user.id);
        setTiktokConnected(status.connected && !status.isExpired);
      } catch (error) {
        console.error("Erro ao verificar status TikTok:", error);
        setTiktokConnected(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkTikTokStatus();
  }, [user?.id]);

  // Verifica parâmetros da URL (retorno do OAuth)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("tiktok_connected") === "true") {
      setTiktokConnected(true);
      toast({
        title: "TikTok Conectado!",
        description: "Sua conta TikTok foi vinculada com sucesso.",
      });
      // Limpa os parâmetros da URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("tiktok_error")) {
      toast({
        variant: "destructive",
        title: "Erro ao conectar TikTok",
        description: params.get("tiktok_error") || "Tente novamente.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const handleConnectTikTok = () => {
    if (!user?.id) return;
    window.open(
      getTikTokConnectUrl(user.id),
      "tiktok-oauth",
      "width=600,height=700,scrollbars=yes"
    );
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

      {/* Overlay para fechar dropdown */}
      {showDisconnect && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDisconnect(false)}
        />
      )}
    </motion.header>
  );
}
