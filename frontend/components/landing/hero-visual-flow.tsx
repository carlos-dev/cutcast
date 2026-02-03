"use client";

import { motion } from "framer-motion";
import { Play, Brain, ChevronRight } from "lucide-react";

export function HeroVisualFlow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10"
    >
      {/* Input Mock - Video Player */}
      <VideoPlayerMock />

      {/* Arrow 1 */}
      <div className="hidden md:flex items-center justify-center">
        <ChevronRight className="h-8 w-8 text-primary" />
      </div>

      {/* AI Process Center */}
      <AIProcessCenter />

      {/* Arrow 2 */}
      <div className="hidden md:flex items-center justify-center">
        <ChevronRight className="h-8 w-8 text-primary" />
      </div>

      {/* Output - Phone Mockups */}
      <PhoneMockups />
    </motion.div>
  );
}

function VideoPlayerMock() {
  return (
    <div className="bg-[#111113] border border-[#2A2A2E] rounded-xl overflow-hidden w-full max-w-[380px]">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1D]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
      </div>
      {/* Video Area */}
      <div className="aspect-video bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
          <Play className="h-6 w-6 text-white/50 ml-1" />
        </div>
      </div>
      {/* Progress Bar */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 h-1 bg-[#2A2A2E] rounded-full overflow-hidden">
          <div className="w-1/3 h-full bg-primary rounded-full" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">01:30:00</span>
      </div>
    </div>
  );
}

function AIProcessCenter() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-primary/30 blur-[60px]" />
      <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-[0_4px_20px_rgba(139,92,246,0.5)]">
          <Brain className="h-10 w-10 md:h-12 md:w-12 text-white" />
        </div>
      </div>
    </div>
  );
}

function PhoneMockups() {
  const platforms = [
    { name: 'TikTok', color: 'bg-pink-500' },
    { name: 'Reels', color: 'bg-orange-500' },
    { name: 'Shorts', color: 'bg-red-500' }
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Platform Badges */}
      <div className="flex gap-2">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1D] border border-[#2A2A2E] rounded-full"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${platform.color}`} />
            <span className="text-xs text-muted-foreground">{platform.name}</span>
          </div>
        ))}
      </div>
      {/* Phones */}
      <div className="flex items-end">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`bg-[#111113] border rounded-2xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.3)] ${
              i === 2 ? 'w-[100px] h-[200px] border-primary/30 z-10 -mx-3' : 'w-[90px] h-[160px] border-[#2A2A2E]'
            }`}
          >
            <div className="h-full flex flex-col items-center justify-end p-3 gap-2">
              <Play className={`text-primary/50 ${i === 2 ? 'h-6 w-6' : 'h-4 w-4'}`} />
              <div className={`w-full h-1 bg-primary/30 rounded-full ${i === 2 ? '' : 'opacity-50'}`} />
              <span className="text-[10px] text-muted-foreground">00:{15 + i * 10}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
