"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, Plus } from "lucide-react";
import { getCredits, buyCredits } from "@/lib/api";

interface CreditsButtonProps {
  userId: string;
  onShowDropdownChange?: (show: boolean) => void;
}

export function CreditsButton({ userId, onShowDropdownChange }: CreditsButtonProps) {
  const { toast } = useToast();
  const [credits, setCredits] = useState<number | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  // Busca créditos ao carregar
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const userCredits = await getCredits(userId);
        setCredits(userCredits);
      } catch (error) {
        console.error("Erro ao buscar créditos:", error);
      }
    };

    fetchCredits();
  }, [userId]);

  // Verifica parâmetros da URL (retorno do Stripe)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
      toast({
        title: "Pagamento Confirmado!",
        description: "Seus créditos foram adicionados à sua conta.",
      });
      // Atualiza o saldo de créditos
      getCredits(userId).then(setCredits).catch(console.error);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("canceled") === "true") {
      toast({
        variant: "destructive",
        title: "Pagamento Cancelado",
        description: "O pagamento foi cancelado.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast, userId]);

  // Notifica o parent quando o dropdown muda
  useEffect(() => {
    onShowDropdownChange?.(showBuyCredits);
  }, [showBuyCredits, onShowDropdownChange]);

  // Fecha o dropdown quando o evento customizado é disparado
  useEffect(() => {
    const handleClose = () => setShowBuyCredits(false);
    window.addEventListener('close-header-dropdowns', handleClose);
    return () => window.removeEventListener('close-header-dropdowns', handleClose);
  }, []);

  // Atualiza créditos quando o processamento de vídeo é concluído
  useEffect(() => {
    const handleRefreshCredits = () => {
      // Delay para garantir que o callback do backend já decrementou os créditos
      setTimeout(() => {
        getCredits(userId).then(setCredits).catch(console.error);
      }, 1500);
    };
    window.addEventListener('refresh-credits', handleRefreshCredits);
    return () => window.removeEventListener('refresh-credits', handleRefreshCredits);
  }, [userId]);

  if (credits === null) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-amber-600 hover:text-amber-700"
        onClick={() => setShowBuyCredits(!showBuyCredits)}
      >
        <Zap className="h-4 w-4 fill-current" />
        <span className="font-semibold">{credits}</span>
        <Plus className="h-3 w-3" />
      </Button>

      {/* Dropdown de compra de créditos */}
      {showBuyCredits && (
        <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg p-3 min-w-[220px] z-50">
          <p className="text-sm font-medium mb-2">Comprar Créditos</p>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => buyCredits(userId, 5)}
            >
              <span>5 créditos</span>
              <span className="text-muted-foreground">R$ 10,00</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="w-full justify-between relative"
              onClick={() => buyCredits(userId, 15)}
            >
              <span>15 créditos</span>
              <span>R$ 25,00</span>
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                Popular
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              onClick={() => buyCredits(userId, 40)}
            >
              <span>40 créditos</span>
              <span className="text-muted-foreground">R$ 50,00</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
