"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, LogIn, UserPlus, Video } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  // Estado do formulário de login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Estado do formulário de cadastro
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
      });
    } else {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta ao CutCast.",
      });
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de senha
    if (signupPassword !== signupConfirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(signupEmail, signupPassword, signupName);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde.",
      });
    } else {
      toast({
        title: "Conta criada!",
        description: "Bem-vindo ao CutCast! Você já pode começar a usar.",
      });
      // Limpa o formulário
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-primary/10 via-background to-accent/10 overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-12 max-w-lg"
          >
            {/* Logo & Title */}
            <div className="text-center space-y-4">
              <motion.div
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl mb-4"
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Video className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-4xl font-bold">
                <span className="text-primary drop-shadow-[0_0_8px_hsl(270_100%_70%)]">CutCast</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Transforme vídeos longos em clipes virais com IA
              </p>
            </div>

            {/* Illustration - Video Processing Flow */}
            <div className="relative mx-auto flex justify-between items-center">
              {/* Large Video (Input) */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="left-0 top-8"
              >
                <div className="w-48 h-32 rounded-xl border-2 border-primary/40 bg-card/50 backdrop-blur-sm p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-primary" />
                    <div className="text-xs text-muted-foreground">Video.mp4</div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-primary/20 rounded-full" />
                    <div className="h-2 bg-primary/20 rounded-full w-3/4" />
                    <div className="h-2 bg-primary/20 rounded-full w-1/2" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">2:45:30</div>
                </div>
              </motion.div>

              {/* Arrow with AI Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="-translate-x-1/2 -translate-y-1/2 z-10"
              >
                <div className="relative">
                  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" className="text-primary">
                    <motion.path
                      d="M15 30 L45 30 M45 30 L35 20 M45 30 L35 40"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.8, repeat: Infinity, repeatDelay: 2 }}
                    />
                  </svg>
                </div>
              </motion.div>

              {/* Small Clips (Output) - Stacked Vertical Videos */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className=""
              >
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 1.1 + i * 0.15 }}
                      whileHover={{ scale: 1.05 }}
                      className="w-24 h-20 rounded-lg border-2 border-accent/40 bg-card/50 backdrop-blur-sm p-2 shadow-md"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <div className="text-[10px] text-muted-foreground">Clip {i + 1}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-accent/30 rounded-full" />
                        <div className="h-1 bg-accent/30 rounded-full w-2/3" />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">00:{15 + i * 10}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: "🎬", text: "Cortes automáticos" },
                { icon: "⚡", text: "Processamento rápido" },
                { icon: "📱", text: "Formato vertical" },
                { icon: "🚀", text: "Pronto para redes" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-lg">{feature.icon}</span>
                  <span>{feature.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-4 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile Logo (Shown only on mobile) */}
          <div className="lg:hidden text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">CutCast</span>
            </motion.div>
          </div>

          <Card className="card-glow border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Bem-vindo</CardTitle>
              <CardDescription>
                Faça login ou crie uma conta para começar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Cadastrar
                  </TabsTrigger>
                </TabsList>

                {/* Tab de Login */}
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-password" className="text-sm font-medium">
                          Senha
                        </label>
                        <a
                          href="/forgot-password"
                          className="text-xs text-primary hover:underline"
                        >
                          Esqueceu a senha?
                        </a>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full glow-primary transition-all hover:scale-[1.02]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Entrar
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Tab de Cadastro */}
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="signup-name" className="text-sm font-medium">
                        Nome
                      </label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="signup-email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="signup-password" className="text-sm font-medium">
                        Senha
                      </label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        disabled={isLoading}
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="signup-confirm-password"
                        className="text-sm font-medium"
                      >
                        Confirmar Senha
                      </label>
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        required
                        minLength={6}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Ao criar sua conta, você concorda com nossos{" "}
                      <a href="/terms" className="text-primary hover:underline">
                        Termos de Uso
                      </a>{" "}
                      e{" "}
                      <a href="/privacy" className="text-primary hover:underline">
                        Política de Privacidade
                      </a>
                      .
                    </p>

                    <Button
                      type="submit"
                      className="w-full glow-primary transition-all hover:scale-[1.02]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Criar Conta
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-foreground transition-colors">
              Termos de Uso
            </a>
            {" · "}
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacidade
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
