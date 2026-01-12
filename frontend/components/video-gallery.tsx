"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Job } from "@/lib/api";

interface VideoGalleryProps {
  job: Job;
}

export function VideoGallery({ job }: VideoGalleryProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  /**
   * Normaliza os dados de saída do job para sempre retornar um array de URLs
   * Suporta:
   * - outputUrls (novo formato): array de strings
   * - outputUrl (formato antigo): string única ou array JSON stringificado
   */
  const getVideos = (): string[] => {
    // Primeiro verifica se existe outputUrls (novo formato)
    if (job.outputUrls && Array.isArray(job.outputUrls) && job.outputUrls.length > 0) {
      return job.outputUrls;
    }

    // Fallback para outputUrl (formato antigo)
    if (job.outputUrl) {
      try {
        // Tenta fazer parse caso seja um JSON array stringificado
        const parsed = JSON.parse(job.outputUrl);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // Se o parse retornou algo que não é array, trata como string única
        return [job.outputUrl];
      } catch {
        // Se falhou o parse, é uma string única
        return [job.outputUrl];
      }
    }

    return [];
  };

  const videos = getVideos();

  /**
   * Copia a URL do vídeo para a área de transferência
   * Mostra feedback visual por 2 segundos
   */
  const handleCopyLink = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("Erro ao copiar link:", error);
    }
  };

  if (videos.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
    >
      {/* Grid responsivo: 1 coluna no mobile, 3 colunas no desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {videos.map((videoUrl, index) => (
          <motion.div
            key={`${videoUrl}-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex flex-col gap-3"
          >
            {/* Card do vídeo com aspect ratio 9:16 */}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-lg bg-black aspect-[9/16]">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
                preload="metadata"
              />
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              {/* Botão de Download */}
              <Button
                asChild
                variant="default"
                size="sm"
                className="flex-1 transition-all hover:scale-[1.02]"
              >
                <a href={videoUrl} download>
                  <Download className="h-4 w-4" />
                  Baixar
                </a>
              </Button>

              {/* Botão de Copiar Link */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 transition-all hover:scale-[1.02]"
                onClick={() => handleCopyLink(videoUrl, index)}
              >
                {copiedIndex === index ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Link
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
