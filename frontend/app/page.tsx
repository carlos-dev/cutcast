"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link2, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { JobStatusCard } from "@/components/job-status-card";
import { useToast } from "@/hooks/use-toast";
import { createJobWithUrl, createJobWithFile, getJobStatus } from "@/lib/api";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  // Mutation para criar job via URL
  const urlMutation = useMutation({
    mutationFn: createJobWithUrl,
    onSuccess: (data) => {
      setCurrentJobId(data.job_id);
      toast({
        title: "Job criado!",
        description: "Processamento iniciado. Aguarde alguns minutos.",
      });
      setVideoUrl("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao criar job",
        description: "Verifique a URL e tente novamente.",
      });
    },
  });

  // Mutation para criar job via upload
  const fileMutation = useMutation({
    mutationFn: createJobWithFile,
    onSuccess: (data) => {
      setCurrentJobId(data.job_id);
      toast({
        title: "Upload concluído!",
        description: "Processamento iniciado. Aguarde alguns minutos.",
      });
      setSelectedFile(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao fazer upload",
        description: "Tente novamente ou use uma URL.",
      });
    },
  });

  // Query para polling do status do job
  const { data: jobData } = useQuery({
    queryKey: ["job", currentJobId],
    queryFn: () => getJobStatus(currentJobId!),
    enabled: !!currentJobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      // Se status for PENDING ou PROCESSING, refetch a cada 3 segundos
      if (job?.status === "PENDING" || job?.status === "PROCESSING") {
        return 3000;
      }
      // Caso contrário, para de refetch
      return false;
    },
  });

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    urlMutation.mutate(videoUrl);
  };

  const handleFileSubmit = () => {
    if (!selectedFile) return;
    fileMutation.mutate(selectedFile);
  };

  const isLoading = urlMutation.isPending || fileMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6 max-w-3xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Transforme seus vídeos em
            <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              {" "}
              Clipes Virais
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            IA de ponta para converter vídeos longos em clipes verticais perfeitos para
            TikTok, Reels e Shorts. Automático, rápido e profissional.
          </p>
        </motion.div>
      </section>

      {/* Input Section */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="p-6 backdrop-blur-sm bg-card/50 border-2">
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="url" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Colar Link
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4">
                <form onSubmit={handleUrlSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="url"
                      placeholder="Cole aqui o link do YouTube, Vimeo ou qualquer vídeo..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      disabled={isLoading}
                      className="h-12 text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isLoading || !videoUrl.trim()}
                  >
                    {isLoading ? "Processando..." : "Gerar Cortes"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <FileUpload
                  onFileSelect={setSelectedFile}
                  disabled={isLoading}
                />
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleFileSubmit}
                  disabled={isLoading || !selectedFile}
                >
                  {isLoading ? "Fazendo Upload..." : "Processar Vídeo"}
                </Button>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </section>

      {/* Job Status Section */}
      {jobData && (
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <JobStatusCard job={jobData} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
        <p>© 2026 CutCast. Transformando conteúdo em viralidade.</p>
      </footer>
    </div>
  );
}
