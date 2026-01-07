"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Job } from "@/lib/api";

interface JobStatusCardProps {
  job: Job;
}

export function JobStatusCard({ job }: JobStatusCardProps) {
  const getStatusIcon = () => {
    switch (job.status) {
      case "PENDING":
      case "PROCESSING":
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
      case "DONE":
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-6 w-6 text-destructive" />;
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
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </CardTitle>
          <CardDescription>Job ID: {job.job_id}</CardDescription>
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

          {job.status === "DONE" && job.outputUrl && (
            <div className="space-y-4">
              <video
                src={job.outputUrl}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: "400px" }}
              />
            </div>
          )}
        </CardContent>

        {job.status === "DONE" && job.outputUrl && (
          <CardFooter>
            <Button asChild className="w-full" size="lg">
              <a href={job.outputUrl} download>
                <Download className="mr-2 h-4 w-4" />
                Baixar Vídeo
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
