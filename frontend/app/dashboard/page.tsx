"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link2, Upload, Captions } from "lucide-react";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUpload, type VideoDurationInfo } from "@/components/file-upload";
import { JobStatusCard } from "@/components/job-status-card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  createJobWithUrl,
  createJobWithFile,
  getJobStatus,
  getJobs,
  setAuthToken,
  consumeProgressStream,
  buyCredits,
  getCredits,
  type StreamingProgress,
  type Job
} from "@/lib/api";
import { AxiosError } from "axios";
import { createClient } from "@/lib/supabase/client";

export default function Dashboard() {
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [withSubtitles, setWithSubtitles] = useState(true);

  // Estado do streaming de progresso
  const [streamingProgress, setStreamingProgress] = useState<StreamingProgress | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Estado de créditos e custo do vídeo
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [videoCost, setVideoCost] = useState<number>(1);

  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Query para buscar todos os jobs (para estatísticas)
  const { data: allJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
    enabled: !!user,
  });

  // Redireciona para landing se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Busca créditos do usuário
  useEffect(() => {
    const fetchCredits = async () => {
      if (user?.id) {
        try {
          const credits = await getCredits(user.id);
          setUserCredits(credits);
        } catch (error) {
          console.error("Erro ao buscar créditos:", error);
        }
      }
    };
    fetchCredits();
  }, [user?.id]);

  // Configura o token de autenticação quando o usuário estiver logado
  useEffect(() => {
    const setupAuth = async () => {
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setAuthToken(session.access_token);
        }
      } else {
        setAuthToken(null);
      }
    };

    setupAuth();
  }, [user, supabase.auth]);

  // Função para iniciar o streaming de progresso
  const startProgressStream = useCallback((jobId: string) => {
    // Cancela qualquer stream anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setStreamingProgress(null);

    consumeProgressStream(jobId, {
      onProgress: (data) => {
        setStreamingProgress(data);
      },
      onComplete: (data) => {
        setStreamingProgress(data);
        setIsStreaming(false);
        // Invalida queries para atualizar dados
        queryClient.invalidateQueries({ queryKey: ["job", jobId] });
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        // Dispara evento para atualizar créditos no header
        window.dispatchEvent(new CustomEvent('refresh-credits'));
        // Reseta o formulário para permitir novo upload
        setSelectedFile(null);
        setCurrentJobId(null);
        setVideoCost(1);
        toast({
          title: "Processamento concluído!",
          description: "Seus cortes estão prontos. Redirecionando...",
        });
        // Redireciona para histórico com o job expandido
        router.push(`/history?completed=${jobId}`);
      },
      onError: (error) => {
        setStreamingProgress({
          status: 'error',
          progress: 0,
          error: error
        });
        setIsStreaming(false);
        // Reseta o formulário para permitir nova tentativa
        setSelectedFile(null);
        setCurrentJobId(null);
        setVideoCost(1);
        toast({
          variant: "destructive",
          title: "Erro no processamento",
          description: error,
        });
      }
    }, controller);
  }, [queryClient, toast, router]);

  // Cleanup do stream quando componente desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Verifica se há jobs em andamento ao carregar a página (reconexão após reload)
  useEffect(() => {
    const checkPendingJobs = async () => {
      // Espera o token estar configurado
      if (!user) return;

      // Garante que o token está configurado antes de fazer a requisição
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      setAuthToken(session.access_token);

      try {
        const jobs = await getJobs();

        // Encontra o job mais recente que está em processamento
        const pendingJob = jobs?.find(
          (job: Job) => job.status === 'PENDING' || job.status === 'PROCESSING'
        );

        if (pendingJob && !isStreaming && !currentJobId) {
          const jobId = pendingJob.id || pendingJob.job_id;
          if (jobId) {
            setCurrentJobId(jobId);
            startProgressStream(jobId);
          }
        }
      } catch (_) {}
    };

    checkPendingJobs();
  }, [user, supabase.auth, isStreaming, currentJobId, startProgressStream]);

  // Mutation para criar job via URL
  const urlMutation = useMutation({
    mutationFn: ({ videoUrl, withSubtitles }: { videoUrl: string; withSubtitles: boolean }) =>
      createJobWithUrl(videoUrl, withSubtitles),
    onSuccess: (data) => {
      setCurrentJobId(data.job_id);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({
        title: "Job criado!",
        description: "Conectando ao stream de progresso...",
      });
      setVideoUrl("");
      // Inicia o streaming de progresso
      startProgressStream(data.job_id);
    },
    onError: (error: AxiosError<{ error?: string; message?: string }>) => {
      // Verifica se é erro de créditos insuficientes (402)
      if (error.response?.status === 402) {
        toast({
          variant: "destructive",
          title: "Créditos Insuficientes",
          description: "Você não tem créditos suficientes. Recarregue para continuar.",
          action: user?.id ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => buyCredits(user.id, 10)}
            >
              Comprar Créditos
            </Button>
          ) : undefined,
        });
        return;
      }

      toast({
        variant: "destructive",
        title: "Erro ao criar job",
        description: "Verifique a URL e tente novamente.",
      });
    },
  });

  // Mutation para criar job via upload
  const fileMutation = useMutation({
    mutationFn: ({ file, withSubtitles }: { file: File; withSubtitles: boolean }) =>
      createJobWithFile(file, withSubtitles),
    onSuccess: (data) => {
      setCurrentJobId(data.job_id);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({
        title: "Upload concluído!",
        description: "Conectando ao stream de progresso...",
      });
      setSelectedFile(null);
      // Inicia o streaming de progresso
      startProgressStream(data.job_id);
    },
    onError: (error: AxiosError<{ error?: string; message?: string }>) => {
      // Verifica se é erro de créditos insuficientes (402)
      if (error.response?.status === 402) {
        toast({
          variant: "destructive",
          title: "Créditos Insuficientes",
          description: "Você não tem créditos suficientes. Recarregue para continuar.",
          action: user?.id ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => buyCredits(user.id, 10)}
            >
              Comprar Créditos
            </Button>
          ) : undefined,
        });
        return;
      }

      toast({
        variant: "destructive",
        title: "Erro ao fazer upload",
        description: "Tente novamente ou use uma URL.",
      });
    },
  });

  // Define isLoading baseado no status das mutations
  const isLoading = urlMutation.isPending || fileMutation.isPending;

  // Query para polling do status do job (fallback quando streaming não está ativo)
  const { data: jobData } = useQuery({
    queryKey: ["job", currentJobId],
    queryFn: () => getJobStatus(currentJobId!),
    enabled: !!currentJobId && !isStreaming, // Desabilita polling durante streaming
    refetchInterval: (query) => {
      const job = query.state.data;
      // Se status for PENDING ou PROCESSING e não estiver streaming, refetch a cada 5 segundos
      if (!isStreaming && (job?.status === "PENDING" || job?.status === "PROCESSING")) {
        return 5000;
      }
      return false;
    },
  });

  // Texto do botão baseado no estado
  const getButtonText = () => {
    if (isLoading) {
      return "Enviando...";
    }
    if (isStreaming && streamingProgress) {
      return `${streamingProgress.progress}% - ${getStatusLabel(streamingProgress.status)}`;
    }
    return "Gerar Cortes";
  };

  const getStatusLabel = (status: StreamingProgress['status']) => {
    switch (status) {
      case 'downloading': return 'Baixando';
      case 'transcribing': return 'Transcrevendo áudio';
      case 'analyzing': return 'IA analisando';
      case 'rendering': return 'Gerando cortes';
      case 'uploading': return 'Finalizando';
      case 'completed': return 'Concluído';
      default: return 'Processando';
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    urlMutation.mutate({ videoUrl, withSubtitles });
  };

  const handleFileSubmit = () => {
    if (!selectedFile) return;
    fileMutation.mutate({ file: selectedFile, withSubtitles });
  };

  const isDisabled = isLoading || isStreaming;

  // Mostra loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Não renderiza nada se não estiver logado (vai redirecionar)
  if (!user) {
    return null;
  }

  // Calcula Quick Stats
  const stats = {
    totalProcessed: allJobs?.filter((j: Job) => j.status === "DONE").length || 0,
    totalClips: allJobs?.reduce((acc: number, j: Job) => {
      if (j.status === "DONE") {
        return acc + (j.results?.length || j.outputUrls?.length || 1);
      }
      return acc;
    }, 0) || 0,
    inProgress: allJobs?.filter((j: Job) => j.status === "PENDING" || j.status === "PROCESSING").length || 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50">
      <Header />

      {/* Quick Stats */}
      <section className="container mx-auto px-4 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalProcessed}</p>
              <p className="text-sm text-muted-foreground">Vídeos Processados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.totalClips}</p>
              <p className="text-sm text-muted-foreground">Clipes Gerados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">Em Processamento</p>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* Input Section */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          <Card className="p-6 backdrop-blur-sm bg-card/80 border-2 card-glow">
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

              {/* Toggle de Legendas */}
              <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Captions className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Gerar Legendas</p>
                      <p className="text-xs text-muted-foreground">
                        Adicionar legendas automáticas aos cortes
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={withSubtitles}
                    onClick={() => setWithSubtitles(!withSubtitles)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      ${withSubtitles ? 'bg-primary' : 'bg-input'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-background transition-transform
                        ${withSubtitles ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </label>
              </div>

              <TabsContent value="url" className="space-y-4">
                <form onSubmit={handleUrlSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="url"
                      placeholder="Cole aqui o link do YouTube, Vimeo ou qualquer vídeo..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      disabled={isDisabled}
                      className="h-12 text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full glow-primary transition-all hover:scale-[1.02]"
                    disabled={isDisabled || !videoUrl.trim()}
                  >
                    {getButtonText()}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <FileUpload
                  file={selectedFile}
                  onFileSelect={(file, durationInfo) => {
                    setSelectedFile(file);
                    if (durationInfo) {
                      setVideoCost(durationInfo.cost);
                    }
                  }}
                  disabled={isDisabled}
                  userCredits={userCredits ?? undefined}
                />
                <Button
                  size="lg"
                  className="w-full glow-primary transition-all hover:scale-[1.02]"
                  onClick={handleFileSubmit}
                  disabled={isDisabled || !selectedFile || (userCredits !== null && userCredits < videoCost)}
                >
                  {isLoading ? "Enviando..." : `Processar Vídeo (${videoCost} crédito${videoCost > 1 ? 's' : ''})`}
                </Button>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </section>

      {/* Job Status Section */}
      {(jobData || (isStreaming && streamingProgress)) && (
        <section className="w-full px-4 py-12">
          <div className="mx-auto" style={{ maxWidth: "1600px" }}>
            <JobStatusCard
              job={jobData || { status: "PROCESSING" }}
              streamingProgress={streamingProgress}
              isStreaming={isStreaming}
            />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
        <p>© 2026 CutCast. Transformando conteúdo em viralidade.</p>
        <div className="mt-2 space-x-4">
          <a href="/terms" className="hover:text-foreground transition-colors">
            Termos de Uso
          </a>
          <a href="/privacy" className="hover:text-foreground transition-colors">
            Privacidade
          </a>
        </div>
      </footer>
    </div>
  );
}
