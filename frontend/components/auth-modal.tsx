"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, UserPlus } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Estado do formulário de login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Estado do formulário de cadastro
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const resetForms = () => {
    setLoginEmail("");
    setLoginPassword("");
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupConfirmPassword("");
  };

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
      resetForms();
      onClose();
      router.push("/dashboard");
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
      resetForms();
      onClose();
      router.push("/dashboard");
    }

    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForms();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0A0A0B] border-[#2A2A30]">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Bem-vindo ao CutCast</DialogTitle>
          <DialogDescription>
            Faça login ou crie uma conta para começar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#1A1A1E]">
            <TabsTrigger value="login" className="gap-2 data-[state=active]:bg-primary">
              <LogIn className="h-4 w-4" />
              Entrar
            </TabsTrigger>
            <TabsTrigger value="signup" className="gap-2 data-[state=active]:bg-primary">
              <UserPlus className="h-4 w-4" />
              Cadastrar
            </TabsTrigger>
          </TabsList>

          {/* Tab de Login */}
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="modal-login-email" className="text-sm font-medium text-white">
                  Email
                </label>
                <Input
                  id="modal-login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-[#1A1A1E] border-[#2A2A30]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="modal-login-password" className="text-sm font-medium text-white">
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
                  id="modal-login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-[#1A1A1E] border-[#2A2A30]"
                />
              </div>

              <Button
                type="submit"
                className="w-full glow-primary"
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
                <label htmlFor="modal-signup-name" className="text-sm font-medium text-white">
                  Nome
                </label>
                <Input
                  id="modal-signup-name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-[#1A1A1E] border-[#2A2A30]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="modal-signup-email" className="text-sm font-medium text-white">
                  Email
                </label>
                <Input
                  id="modal-signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-[#1A1A1E] border-[#2A2A30]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="modal-signup-password" className="text-sm font-medium text-white">
                  Senha
                </label>
                <Input
                  id="modal-signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                  className="bg-[#1A1A1E] border-[#2A2A30]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="modal-signup-confirm-password"
                  className="text-sm font-medium text-white"
                >
                  Confirmar Senha
                </label>
                <Input
                  id="modal-signup-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                  className="bg-[#1A1A1E] border-[#2A2A30]"
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
                className="w-full glow-primary"
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
      </DialogContent>
    </Dialog>
  );
}
