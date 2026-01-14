"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Copy, Check, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResultItem } from "@/lib/api";

interface ResultsGalleryProps {
  results: ResultItem[];
}

export function ResultsGallery({ results }: ResultsGalleryProps) {
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
          <ResultCard key={`${result.videoUrl}-${index}`} result={result} index={index} />
        ))}
      </div>
    </motion.div>
  );
}

interface ResultCardProps {
  result: ResultItem;
  index: number;
}

function ResultCard({ result, index }: ResultCardProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);

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
              className="w-full glow-primary transition-all hover:scale-[1.02]"
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
