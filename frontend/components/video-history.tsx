"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getJobs, Job } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function VideoHistory() {
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
    refetchInterval: 5000, // Refetch a cada 5 segundos para atualizar status
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando histórico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive">Erro ao carregar histórico de vídeos</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifique sua conexão e tente novamente
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum vídeo processado ainda</p>
          <p className="text-sm text-muted-foreground mt-2">
            Envie seu primeiro vídeo acima para começar!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job, index) => (
        <JobCard key={job.id || job.job_id} job={job} index={index} />
      ))}
    </div>
  );
}

interface JobCardProps {
  job: Job;
  index: number;
}

function JobCard({ job, index }: JobCardProps) {
  const getStatusBadge = (status: Job["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            Aguardando
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processando
          </Badge>
        );
      case "DONE":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="outline" className="border-destructive text-destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const isProcessing = job.status === "PENDING" || job.status === "PROCESSING";
  const canDownload = job.status === "DONE" && job.outputUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className={`card-glow ${isProcessing ? "border-primary/50" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">
                Vídeo {job.id?.slice(0, 8) || job.job_id?.slice(0, 8)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {job.createdAt
                  ? format(new Date(job.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                  : "Data não disponível"}
              </p>
            </div>
            {getStatusBadge(job.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* URL do vídeo original */}
          {job.inputUrl && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Vídeo Original:</p>
              <a
                href={job.inputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate block"
              >
                {job.inputUrl}
              </a>
            </div>
          )}

          {/* Mensagem de erro */}
          {job.status === "FAILED" && job.errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">{job.errorMessage}</p>
            </div>
          )}

          {/* Loading/Processing */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Processando vídeo... Isso pode levar alguns minutos.</span>
            </div>
          )}

          {/* Botão de Download */}
          {canDownload && (
            <Button
              asChild
              size="sm"
              className="w-full glow-primary"
            >
              <a href={job.outputUrl!} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4 mr-2" />
                Baixar Vídeo Processado
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
