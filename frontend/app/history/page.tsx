"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Filter, ChevronDown } from "lucide-react";
import { Header } from "@/components/header";
import { Input } from "@/components/ui/input";
import { VideoHistory } from "@/components/video-history";
import { useAuth } from "@/hooks/use-auth";
import { getJobs, setAuthToken, type Job } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Pega o jobId da URL se existir (para expandir automaticamente)
  const justCompletedJobId = searchParams.get("completed");

  // Redireciona para landing se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Configura o token de autenticação
  useEffect(() => {
    const setupAuth = async () => {
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setAuthToken(session.access_token);
        }
      }
    };
    setupAuth();
  }, [user, supabase.auth]);

  // Query para buscar jobs com polling para jobs em processamento
  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: getJobs,
    enabled: !!user,
    refetchOnMount: 'always', // Sempre busca dados frescos ao montar
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      // Se tiver job processando, faz polling a cada 3s
      const isProcessing = data.some((job: Job) =>
        job.status === 'PENDING' || job.status === 'PROCESSING'
      );
      return isProcessing ? 3000 : false;
    },
  });

  // Filtra jobs baseado na pesquisa e status
  const filteredJobs = jobs?.filter((job: Job) => {
    const jobId = job.id || job.job_id || "";
    const matchesSearch = searchQuery === "" ||
      jobId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Mostra loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Não renderiza nada se não estiver logado
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50">
      <Header />

      {/* Page Header */}
      <section className="container mx-auto px-4 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto"
        >
          <h1 className="text-3xl font-bold">Histórico de cortes</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe todos os seus cortes processados
          </p>
        </motion.div>
      </section>

      {/* Search and Filters */}
      <section className="container mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-5xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID dos cortes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DONE">Concluídos</SelectItem>
                <SelectItem value="PROCESSING">Processando</SelectItem>
                <SelectItem value="PENDING">Aguardando</SelectItem>
                <SelectItem value="FAILED">Com Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </section>

      {/* Video History */}
      <section className="container mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <VideoHistory
            justCompletedJobId={justCompletedJobId}
            filteredJobs={filteredJobs}
          />
        </motion.div>
      </section>

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
