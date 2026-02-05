"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VideoGallery } from "@/components/video-gallery";
import { ResultsGallery } from "@/components/results-gallery";
import { StreamingProgressBar } from "@/components/streaming-progress";
import { normalizeResults } from "@/lib/api";
import type { Job, StreamingProgress, ResultItem } from "@/lib/api";

interface JobStatusCardProps {
  job: Job;
  streamingProgress?: StreamingProgress | null;
  isStreaming?: boolean;
}

export function JobStatusCard({ job, streamingProgress, isStreaming }: JobStatusCardProps) {
  const getStatusIcon = () => {
    // Se tiver streaming progress, usa o status do streaming
    if (isStreaming && streamingProgress) {
      if (streamingProgress.status === 'completed') {
        return <CheckCircle2 className="h-6 w-6 text-accent drop-shadow-[0_0_8px_hsl(195_100%_60%)]" />;
      }
      if (streamingProgress.status === 'error') {
        return <XCircle className="h-6 w-6 text-destructive drop-shadow-[0_0_8px_hsl(350_90%_60%)]" />;
      }
      return <Loader2 className="h-6 w-6 animate-spin text-primary drop-shadow-[0_0_8px_hsl(270_100%_70%)]" />;
    }

    switch (job.status) {
      case "PENDING":
      case "PROCESSING":
        return <Loader2 className="h-6 w-6 animate-spin text-primary drop-shadow-[0_0_8px_hsl(270_100%_70%)]" />;
      case "DONE":
        return <CheckCircle2 className="h-6 w-6 text-accent drop-shadow-[0_0_8px_hsl(195_100%_60%)]" />;
      case "FAILED":
        return <XCircle className="h-6 w-6 text-destructive drop-shadow-[0_0_8px_hsl(350_90%_60%)]" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    // Se tiver streaming progress, usa mensagem do streaming
    if (isStreaming && streamingProgress) {
      switch (streamingProgress.status) {
        case 'downloading':
          return 'Baixando vídeo...';
        case 'transcribing':
          return 'Transcrevendo áudio...';
        case 'analyzing':
          return 'IA analisando conteúdo...';
        case 'rendering':
          if (streamingProgress.clipIndex && streamingProgress.totalClips) {
            return `Renderizando corte ${streamingProgress.clipIndex}/${streamingProgress.totalClips}...`;
          }
          return 'Renderizando vídeo...';
        case 'uploading':
          return 'Enviando para a nuvem...';
        case 'completed':
          return 'Vídeo processado com sucesso!';
        case 'error':
          return 'Erro ao processar vídeo';
        default:
          return 'Processando...';
      }
    }

    switch (job.status) {
      case "PENDING":
        return "Aguardando processamento...";
      case "PROCESSING":
        return "Processando seu vídeo...";
      case "DONE":
        return "Vídeo processado com sucesso!";
      case "FAILED":
        return "Erro ao processar vídeo";
      default:
        return job.status;
    }
  };

  const isProcessing = job.status === "PENDING" || job.status === "PROCESSING";
  const showStreamingProgress = isStreaming && streamingProgress && streamingProgress.status !== 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4"
    >
      <Card className="border-2 card-glow max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Streaming Progress Bar */}
          {showStreamingProgress && (
            <StreamingProgressBar progress={streamingProgress} />
          )}

          {/* Fallback: Progress indeterminado quando não tem streaming */}
          {isProcessing && !showStreamingProgress && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Isso pode levar alguns minutos...
              </p>
            </div>
          )}

          {job.status === "FAILED" && job.errorMessage && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {job.errorMessage}
            </div>
          )}

          {/* Erro do streaming */}
          {streamingProgress?.status === 'error' && streamingProgress.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {streamingProgress.error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery de vídeos processados */}
      {job.status === "DONE" && (
        <div className="mt-6">
          {/* Usa ResultsGallery se houver dados no novo formato */}
          {job.results && job.results.length > 0 ? (
            <ResultsGallery results={normalizeResults(job.results as ResultItem[])} />
          ) : (
            /* Fallback para formato antigo (apenas URLs) */
            <VideoGallery job={job} />
          )}
        </div>
      )}
    </motion.div>
  );
}
