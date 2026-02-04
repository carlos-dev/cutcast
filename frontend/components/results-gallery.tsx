"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Copy, Check, Hash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { shareToTikTok, getTikTokConnectUrl } from "@/lib/api";
import type { ResultItem } from "@/lib/api";
import { AxiosError } from "axios";

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

interface ResultsGalleryProps {
  results: ResultItem[];
}

export function ResultsGallery({ results }: ResultsGalleryProps) {
  const { user } = useAuth();

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold gradient-text">Cortes Virais Gerados</h2>
        <p className="text-muted-foreground mt-1">
          {results.length} {results.length === 1 ? "corte pronto" : "cortes prontos"} para publicar
        </p>
      </div>

      {/* Grid responsivo: 1 coluna no mobile, 3 colunas no desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.videoUrl}-${index}`}
            result={result}
            index={index}
            userId={user?.id}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface ResultCardProps {
  result: ResultItem;
  index: number;
  userId?: string;
}

function ResultCard({ result, index, userId }: ResultCardProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [pendingShare, setPendingShare] = useState(false);
  const { toast } = useToast();

  /**
   * Função para efetivamente compartilhar no TikTok
   */
  const doShareToTikTok = useCallback(async () => {
    if (!userId) return;

    setIsSharing(true);
    setPendingShare(false);

    try {
      const response = await shareToTikTok(userId, result.videoUrl, result.title);

      if (response.success) {
        toast({
          title: "Enviado para o TikTok!",
          description: response.message,
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string; message?: string }>;

      // Se ainda não estiver conectado, mostra erro
      if (axiosError.response?.status === 403) {
        toast({
          variant: "destructive",
          title: "Erro ao compartilhar",
          description: "Não foi possível conectar ao TikTok. Tente novamente.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao compartilhar",
          description: axiosError.response?.data?.message || "Tente novamente mais tarde.",
        });
      }
    } finally {
      setIsSharing(false);
    }
  }, [userId, result.videoUrl, result.title, toast]);

  /**
   * Escuta mensagem do popup de OAuth do TikTok
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TIKTOK_CONNECTED' && event.data?.success) {
        // Se havia um compartilhamento pendente, executa automaticamente
        if (pendingShare) {
          toast({
            title: "TikTok Conectado!",
            description: "Enviando seu vídeo...",
          });
          doShareToTikTok();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pendingShare, doShareToTikTok, toast]);

  /**
   * Copia a legenda completa (caption + hashtags) para a área de transferência
   */
  const handleCopyCaption = async () => {
    try {
      const fullCaption = `${result.caption}\n\n${result.hashtags.join(" ")}`;
      await navigator.clipboard.writeText(fullCaption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar legenda:", error);
    }
  };

  /**
   * Compartilha o vídeo no TikTok com Just-in-Time Auth
   */
  const handleShareToTikTok = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar logado para compartilhar.",
      });
      return;
    }

    setIsSharing(true);

    try {
      const response = await shareToTikTok(userId, result.videoUrl, result.title);

      if (response.success) {
        toast({
          title: "Enviado para o TikTok!",
          description: response.message,
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error: string; message?: string }>;

      // Se o erro for 403 com tiktok_not_connected, redireciona para OAuth
      if (axiosError.response?.status === 403) {
        const errorCode = axiosError.response.data?.error;

        if (errorCode === "tiktok_not_connected" || errorCode === "tiktok_token_expired") {
          toast({
            title: "Conecte sua conta TikTok",
            description: "Uma nova aba será aberta para autorizar o acesso.",
          });

          // Marca que há um compartilhamento pendente
          setPendingShare(true);

          // Abre OAuth em nova aba
          setTimeout(() => {
            window.open(getTikTokConnectUrl(userId), "_blank");
          }, 1000);
          return;
        }
      }

      toast({
        variant: "destructive",
        title: "Erro ao compartilhar",
        description: axiosError.response?.data?.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="h-full"
    >
      <Card className="overflow-hidden border-2 card-glow hover:border-primary/50 transition-all h-full flex flex-col">
        {/* Vídeo Player */}
        <div className="relative w-full bg-black aspect-[9/16]">
          <video
            src={result.videoUrl}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        </div>

        <CardHeader className="pb-4 px-5">
          {/* Título Viral */}
          <CardTitle className="text-xl font-bold leading-tight line-clamp-2">
            {result.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 flex-grow flex flex-col px-5">
          {/* Legenda do Post */}
          <div className="space-y-2 flex-grow">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Legenda do Post
            </label>
            <textarea
              readOnly
              value={result.caption}
              className="w-full min-h-[90px] max-h-[140px] p-3 text-sm rounded-lg border border-border bg-muted/30 resize-none focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
            />
          </div>

          {/* Hashtags */}
          {result.hashtags && result.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.hashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                >
                  <Hash className="h-3 w-3" />
                  {tag.replace("#", "")}
                </span>
              ))}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col gap-3 pt-3 mt-auto">
            {/* Botão Postar no TikTok */}
            <Button
              size="default"
              className="w-full bg-black hover:bg-gray-900 text-white transition-all hover:scale-[1.02]"
              onClick={handleShareToTikTok}
              disabled={isSharing}
            >
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <TikTokIcon className="h-4 w-4 mr-2" />
                  Postar no TikTok
                </>
              )}
            </Button>

            {/* Botão Copiar Legenda */}
            <Button
              variant="outline"
              size="default"
              className="w-full transition-all hover:scale-[1.02]"
              onClick={handleCopyCaption}
            >
              {copiedCaption ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Legenda
                </>
              )}
            </Button>

            {/* Botão Baixar Vídeo */}
            <Button
              asChild
              size="default"
              variant="outline"
              className="w-full transition-all hover:scale-[1.02]"
            >
              <a href={result.videoUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Baixar Vídeo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
