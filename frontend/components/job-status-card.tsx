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
import type { Job } from "@/lib/api";

interface JobStatusCardProps {
  job: Job;
}

export function JobStatusCard({ job }: JobStatusCardProps) {
  const getStatusIcon = () => {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {isProcessing && (
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
        </CardContent>
      </Card>

      {/* Gallery de vídeos processados */}
      {job.status === "DONE" && (
        <div className="mt-6">
          <VideoGallery job={job} />
        </div>
      )}
    </motion.div>
  );
}
