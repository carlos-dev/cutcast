"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Video, X, Clock, Zap, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface VideoDurationInfo {
  duration: number; // em segundos
  cost: number; // créditos necessários
}

interface FileUploadProps {
  onFileSelect: (file: File, durationInfo?: VideoDurationInfo) => void;
  disabled?: boolean;
  userCredits?: number;
}

export function FileUpload({ onFileSelect, disabled, userCredits }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [durationInfo, setDurationInfo] = useState<VideoDurationInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calcula custo baseado na duração (1 crédito por hora ou fração)
  const calculateCost = (durationSeconds: number): number => {
    return Math.ceil(durationSeconds / 3600);
  };

  // Formata duração em minutos e segundos
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Extrai duração do vídeo usando elemento HTML5
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Não foi possível ler o vídeo'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        setIsAnalyzing(true);
        setDurationInfo(null);

        try {
          const duration = await getVideoDuration(file);
          const cost = calculateCost(duration);
          const info: VideoDurationInfo = { duration, cost };
          setDurationInfo(info);
          onFileSelect(file, info);
        } catch {
          // Se não conseguir ler a duração, assume custo mínimo de 1
          const info: VideoDurationInfo = { duration: 0, cost: 1 };
          setDurationInfo(info);
          onFileSelect(file, info);
        } finally {
          setIsAnalyzing(false);
        }
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
    },
    maxFiles: 1,
    disabled,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setDurationInfo(null);
  };

  const hasInsufficientCredits = userCredits !== undefined && durationInfo && userCredits < durationInfo.cost;

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "relative cursor-pointer overflow-hidden border-2 border-dashed transition-all duration-300",
        isDragActive && "border-primary bg-primary/10 scale-[1.02] shadow-[0_0_30px_hsl(270_100%_70%_/_0.2)]",
        disabled && "cursor-not-allowed opacity-50",
        !selectedFile && "hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      <input {...getInputProps()} />
      <div className="p-12 text-center">
        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-3">
                <Video className="h-8 w-8 text-primary" />
                <span className="text-lg font-medium">{selectedFile.name}</span>
                <button
                  onClick={handleRemove}
                  disabled={disabled}
                  className="rounded-full p-1 hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-5 w-5 text-destructive" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>

                {isAnalyzing ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 animate-pulse" />
                    Analisando...
                  </span>
                ) : durationInfo && durationInfo.duration > 0 ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(durationInfo.duration)}
                    </span>
                    <span className={cn(
                      "flex items-center gap-1 font-medium",
                      hasInsufficientCredits ? "text-destructive" : "text-amber-600"
                    )}>
                      <Zap className="h-4 w-4" />
                      {durationInfo.cost} crédito{durationInfo.cost > 1 ? 's' : ''}
                    </span>
                  </>
                ) : null}
              </div>

              {hasInsufficientCredits && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Créditos insuficientes! Você tem {userCredits}, precisa de {durationInfo?.cost}.</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              <motion.div
                animate={{
                  y: isDragActive ? -10 : 0,
                  scale: isDragActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="flex justify-center"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
              </motion.div>
              <div>
                <p className="text-lg font-semibold">
                  {isDragActive
                    ? "Solte o arquivo aqui"
                    : "Arraste um vídeo ou clique para selecionar"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  MP4, MOV, AVI, MKV ou WEBM (máx. 500MB)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
