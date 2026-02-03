"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingCardProps {
  title: string;
  price: string;
  credits: number;
  features: string[];
  highlighted?: boolean;
  onSelect: () => void;
}

export function PricingCard({
  title,
  price,
  credits,
  features,
  highlighted = false,
  onSelect
}: PricingCardProps) {
  const getDescription = () => {
    if (highlighted) return 'Para criadores de conteúdo regulares';
    if (title === 'Experimentar') return 'Para começar a usar a ferramenta';
    return 'Para quem produz muito conteúdo';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-2xl p-8 ${
        highlighted
          ? 'bg-gradient-to-b from-[#2D1B69] to-[#1A1A1E] border-2 border-primary'
          : 'bg-[#1A1A1E] border border-[#2A2A30]'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
          Mais Popular
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${highlighted ? 'text-primary' : 'text-white'}`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {getDescription()}
        </p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-sm text-muted-foreground">R$</span>
          <span className="text-4xl font-bold text-white">{price}</span>
        </div>
        <p className="text-primary font-medium mt-2">{credits} Créditos</p>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        className={`w-full ${highlighted ? 'glow-primary' : ''}`}
        variant={highlighted ? 'default' : 'outline'}
        onClick={onSelect}
      >
        {highlighted ? 'Escolher Plano' : 'Começar'}
      </Button>
    </motion.div>
  );
}
