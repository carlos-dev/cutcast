"use client";

import { ResultsGallery } from "@/components/results-gallery";
import type { ResultItem } from "@/lib/api";

/**
 * Componente de exemplo para testar o ResultsGallery
 * Use este componente temporariamente para visualizar o design
 */
export function ResultsGalleryExample() {
  // Dados mockados para teste
  const mockResults: ResultItem[] = [
    {
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      title: "A verdade sobre o açúcar 🍬",
      caption: "Pare de comer isso agora! 🚨\n\nEstudos mostram que o açúcar refinado pode ser mais viciante que cocaína. Veja como substituir na sua dieta.",
      hashtags: ["#saude", "#nutricao", "#bemestar", "#dieta"]
    },
    {
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      title: "Como dormir melhor em 3 passos 😴",
      caption: "Seu sono nunca mais será o mesmo depois dessas dicas!\n\n✅ Desligue telas 1h antes\n✅ Temperatura ideal: 18-20°C\n✅ Meditação de 5 minutos",
      hashtags: ["#sono", "#saude", "#produtividade", "#dicas"]
    },
    {
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      title: "O segredo dos bilionários 💰",
      caption: "Warren Buffett faz isso todos os dias e você também pode!\n\nDescubra o hábito matinal que mudou tudo.",
      hashtags: ["#empreendedorismo", "#sucesso", "#motivacao", "#dinheiro"]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <ResultsGallery results={mockResults} />
    </div>
  );
}
