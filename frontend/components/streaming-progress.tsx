"use client";

import { motion } from "framer-motion";
import { Loader2, Download, Brain, Scissors, Upload, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { StreamingProgress, StreamingStatus } from "@/lib/api";

interface StreamingProgressBarProps {
  progress: StreamingProgress | null;
  isConnecting?: boolean;
}

const statusConfig: Record<StreamingStatus, { icon: React.ReactNode; color: string }> = {
  downloading: {
    icon: <Download className="h-5 w-5" />,
    color: "text-blue-500"
  },
  transcribing: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    color: "text-purple-500"
  },
  analyzing: {
    icon: <Brain className="h-5 w-5" />,
    color: "text-pink-500"
  },
  rendering: {
    icon: <Scissors className="h-5 w-5" />,
    color: "text-orange-500"
  },
  uploading: {
    icon: <Upload className="h-5 w-5" />,
    color: "text-cyan-500"
  },
  completed: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-green-500"
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    color: "text-red-500"
  }
};

function getProgressMessage(status: StreamingStatus, clipIndex?: number, totalClips?: number): string {
  switch (status) {
    case 'downloading':
      return 'Baixando vídeo...';
    case 'transcribing':
      return 'Transcrevendo áudio com IA...';
    case 'analyzing':
      return 'Analisando momentos virais...';
    case 'rendering':
      if (clipIndex && totalClips) {
        return `Renderizando corte ${clipIndex} de ${totalClips}...`;
      }
      return 'Renderizando vídeo...';
    case 'uploading':
      return 'Enviando para a nuvem...';
    case 'completed':
      return 'Processamento concluído!';
    case 'error':
      return 'Erro no processamento';
    default:
      return 'Processando...';
  }
}

export function StreamingProgressBar({ progress, isConnecting }: StreamingProgressBarProps) {
  if (isConnecting) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Conectando ao servidor...</span>
        </div>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const config = statusConfig[progress.status] || statusConfig.downloading;
  const message = progress.message || getProgressMessage(
    progress.status,
    progress.clipIndex,
    progress.totalClips
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Status e Mensagem */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            key={progress.status}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={config.color}
          >
            {config.icon}
          </motion.div>
          <span className="text-sm font-medium">{message}</span>
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {progress.progress}%
        </span>
      </div>

      {/* Barra de Progresso */}
      <div className="relative">
        <Progress value={progress.progress} className="h-2" />

        {/* Indicador de clip atual */}
        {progress.clipIndex && progress.totalClips && (
          <div className="flex justify-between mt-1">
            {Array.from({ length: progress.totalClips }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 mx-0.5 rounded-full transition-colors ${
                  i < progress.clipIndex!
                    ? 'bg-green-500'
                    : i === progress.clipIndex! - 1
                    ? 'bg-primary animate-pulse'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Etapas do processo */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <StepIndicator
          label="Download"
          isActive={progress.status === 'downloading'}
          isComplete={['transcribing', 'analyzing', 'rendering', 'uploading', 'completed'].includes(progress.status)}
        />
        <StepIndicator
          label="Transcrição"
          isActive={progress.status === 'transcribing'}
          isComplete={['analyzing', 'rendering', 'uploading', 'completed'].includes(progress.status)}
        />
        <StepIndicator
          label="Análise IA"
          isActive={progress.status === 'analyzing'}
          isComplete={['rendering', 'uploading', 'completed'].includes(progress.status)}
        />
        <StepIndicator
          label="Renderização"
          isActive={progress.status === 'rendering'}
          isComplete={['uploading', 'completed'].includes(progress.status)}
        />
        <StepIndicator
          label="Upload"
          isActive={progress.status === 'uploading'}
          isComplete={progress.status === 'completed'}
        />
      </div>
    </motion.div>
  );
}

interface StepIndicatorProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function StepIndicator({ label, isActive, isComplete }: StepIndicatorProps) {
  return (
    <div className={`flex flex-col items-center gap-1 ${
      isActive ? 'text-primary font-medium' : isComplete ? 'text-green-500' : ''
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isComplete ? 'bg-green-500' : isActive ? 'bg-primary animate-pulse' : 'bg-muted'
      }`} />
      <span>{label}</span>
    </div>
  );
}
