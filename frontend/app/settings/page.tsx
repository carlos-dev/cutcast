"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Settings, Link as LinkIcon, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { TikTokIcon } from "@/components/tiktok-button";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { getUserProfile, deleteUserAccount, setAuthToken } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SettingsPage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("defaultSubtitles") !== "false";
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleSubtitlesChange = (checked: boolean) => {
    setSubtitlesEnabled(checked);
    localStorage.setItem("defaultSubtitles", String(checked));
  };

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

  // Query para buscar perfil do usuário
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: () => getUserProfile(user!.id),
    enabled: !!user,
  });

  // Mutation para deletar conta
  const deleteMutation = useMutation({
    mutationFn: () => deleteUserAccount(user!.id),
    onSuccess: async () => {
      toast({
        title: "Conta deletada",
        description: "Sua conta foi permanentemente removida.",
      });
      await signOut();
      router.push("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao deletar conta",
        description: error.message || "Não foi possível deletar sua conta. Tente novamente.",
      });
    },
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

  const isPaidUser = !!profile?.stripeCustomerId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/50">
      <Header />

      {/* Page Header */}
      <section className="container mx-auto px-4 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua conta e preferências
          </p>
        </motion.div>
      </section>

      {/* Settings Cards */}
      <section className="container mx-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Account Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Informações da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Plano</span>
                  <Badge variant={isPaidUser ? "default" : "secondary"}>
                    {isPaidUser ? "Premium" : "Gratuito"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Créditos disponíveis</span>
                  <span className="text-sm font-semibold text-green-500">
                    {profileLoading ? "..." : profile?.credits ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Membro desde</span>
                  <span className="text-sm">
                    {profile?.createdAt
                      ? format(new Date(profile.createdAt), "MMMM 'de' yyyy", { locale: ptBR })
                      : "..."}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Preferences Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Settings className="h-5 w-5 text-primary" />
                  Preferências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Legendas por padrão</span>
                  <Switch
                    checked={subtitlesEnabled}
                    onCheckedChange={handleSubtitlesChange}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Connected Accounts Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Contas Conectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-black flex items-center justify-center">
                      <TikTokIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">TikTok</p>
                      <p className="text-xs text-muted-foreground">
                        {profile?.tiktokConnected ? "Conectado" : "Não conectado"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={profile?.tiktokConnected ? "outline" : "default"}
                    size="sm"
                    onClick={() => {
                      if (!profile?.tiktokConnected) {
                        window.location.href = `/api/auth/tiktok?userId=${user.id}`;
                      }
                    }}
                  >
                    {profile?.tiktokConnected ? "Desconectar" : "Conectar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-destructive/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Zona de Perigo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 space-y-2">
                  <p className="text-sm font-semibold text-destructive">
                    Deletar sua conta
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ao deletar sua conta, todos os seus dados serão permanentemente removidos,
                    incluindo vídeos processados, histórico de cortes e créditos restantes.
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
                <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
                  setDeleteDialogOpen(open);
                  if (!open) setDeleteConfirmText("");
                }}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Deletar Minha Conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3">
                          <p>
                            Esta ação é irreversível. Todos os seus dados serão permanentemente
                            deletados, incluindo vídeos, histórico e créditos.
                          </p>
                          {(profile?.credits ?? 0) > 0 && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Você possui {profile?.credits} crédito{(profile?.credits ?? 0) !== 1 ? "s" : ""} na conta
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Ao excluir, você perderá esse saldo permanentemente. Não há reembolso.
                              </p>
                            </div>
                          )}
                          <div className="space-y-2 pt-1">
                            <p className="text-sm">
                              Digite <span className="font-mono font-bold">DELETAR</span> para confirmar:
                            </p>
                            <Input
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder="DELETAR"
                              className="font-mono"
                            />
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        disabled={deleteConfirmText !== "DELETAR" || deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate()}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Sim, deletar minha conta
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </motion.div>
        </div>
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
