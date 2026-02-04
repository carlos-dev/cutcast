"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Unlink } from "lucide-react";
import { getTikTokStatus, disconnectTikTok, getTikTokConnectUrl } from "@/lib/api";

// TikTok Icon SVG
export function TikTokIcon({ className }: { className?: string }) {
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

interface TikTokButtonProps {
  userId: string;
  onShowDropdownChange?: (show: boolean) => void;
}

export function TikTokButton({ userId, onShowDropdownChange }: TikTokButtonProps) {
  const { toast } = useToast();
  const [tiktokConnected, setTiktokConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);

  // Verifica status do TikTok ao carregar
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const tiktokStatus = await getTikTokStatus(userId);
        setTiktokConnected(tiktokStatus.connected && !tiktokStatus.isExpired);
      } catch (error) {
        console.error("Erro ao verificar status TikTok:", error);
        setTiktokConnected(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [userId]);

  // Escuta mensagem do popup de OAuth (pode vir do TikTokButton ou ResultsGallery)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIKTOK_CONNECTED' && event.data?.success) {
        setTiktokConnected(true);
        toast({
          title: "TikTok Conectado!",
          description: "Sua conta TikTok foi vinculada com sucesso.",
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

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

  // Notifica o parent quando o dropdown muda
  useEffect(() => {
    onShowDropdownChange?.(showDisconnect);
  }, [showDisconnect, onShowDropdownChange]);

  // Fecha o dropdown quando o evento customizado é disparado
  useEffect(() => {
    const handleClose = () => setShowDisconnect(false);
    window.addEventListener('close-header-dropdowns', handleClose);
    return () => window.removeEventListener('close-header-dropdowns', handleClose);
  }, []);

  const handleConnectTikTok = () => {
    // Abre em nova aba (mais confiável que popup)
    const newWindow = window.open(
      getTikTokConnectUrl(userId),
      "_blank"
    );

    // Se não conseguiu abrir (bloqueado), tenta redirect
    if (!newWindow) {
      window.location.href = getTikTokConnectUrl(userId);
      return;
    }

    // Polling para verificar quando a autenticação completar
    const checkInterval = setInterval(async () => {
      try {
        // Verifica se a janela foi fechada
        if (newWindow.closed) {
          clearInterval(checkInterval);
          // Verifica o status após fechar a janela
          const status = await getTikTokStatus(userId);
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
    setIsDisconnecting(true);
    try {
      await disconnectTikTok(userId);
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

  if (isChecking) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (tiktokConnected) {
    return (
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
          <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg p-1 min-w-[140px] z-50">
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
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleConnectTikTok}
    >
      <TikTokIcon className="h-4 w-4" />
      <span className="hidden sm:inline">Vincular TikTok</span>
    </Button>
  );
}

