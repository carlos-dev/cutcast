"use client";

import { motion } from "framer-motion";
import {
  Wand2,
  Zap,
  Smartphone,
  TrendingUp,
  Scissors,
  CreditCard,
  Mail
} from "lucide-react";
import { FloatingIcon, DecorativeDots, DecorativeRings, DecorativeLines, Cross, Glow } from "./decorative-elements";

export function HeroDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Floating Icons */}
      <FloatingIcon
        icon={<Wand2 className="h-6 w-6 text-primary" />}
        bgColor="bg-primary/10"
        className="left-[5%] top-24 w-12 h-12 opacity-70"
        rotation={-15}
        delay={0}
        direction="up"
      />
      <FloatingIcon
        icon={<Zap className="h-5 w-5 text-amber-500" />}
        bgColor="bg-amber-500/10"
        className="right-[8%] top-28 w-11 h-11 opacity-60"
        rotation={12}
        delay={0.5}
        direction="down"
      />
      <FloatingIcon
        icon={<Smartphone className="h-5 w-5 text-green-500" />}
        bgColor="bg-green-500/10"
        className="left-[6%] bottom-[30%] w-10 h-10 opacity-50"
        rotation={8}
        delay={1}
        direction="up"
      />
      <FloatingIcon
        icon={<TrendingUp className="h-5 w-5 text-pink-500" />}
        bgColor="bg-pink-500/10"
        className="right-[6%] bottom-[25%] w-10 h-10 opacity-60"
        rotation={-10}
        delay={0.3}
        direction="down"
      />

      {/* Dots */}
      <DecorativeDots dots={[
        { color: "bg-primary opacity-50", position: "left-[10%] top-[35%]", size: "w-2.5 h-2.5" },
        { color: "bg-indigo-500 opacity-40", position: "right-[5%] top-[40%]", size: "w-2 h-2" },
        { color: "bg-green-500 opacity-40", position: "left-[4%] top-[55%]", size: "w-1.5 h-1.5" },
        { color: "bg-amber-500 opacity-50", position: "right-[4%] top-[60%]", size: "w-2 h-2" },
      ]} />

      {/* Rings */}
      <DecorativeRings rings={[
        { color: "border-primary/20 opacity-40", position: "left-[3%] top-[45%]", size: "w-16 h-16" },
        { color: "border-indigo-500/20 opacity-30", position: "right-[5%] top-[50%]", size: "w-12 h-12" },
      ]} />

      {/* Lines */}
      <DecorativeLines lines={[
        { gradient: "from-transparent via-primary/30 to-transparent opacity-50", position: "left-[2%] bottom-[15%]", width: "w-24" },
        { gradient: "from-transparent via-indigo-500/30 to-transparent opacity-40", position: "right-[3%] bottom-[12%]", width: "w-20" },
      ]} />

      {/* Cross */}
      <Cross color="bg-primary" position="left-[12%] bottom-[20%]" />
    </div>
  );
}

export function FeaturesDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Glow */}
      <Glow
        color="bg-primary/10"
        position="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        size="w-[800px] h-[400px]"
        opacity="opacity-30"
      />

      {/* Floating Icons */}
      <FloatingIcon
        icon={<Scissors className="h-5 w-5 text-green-500" />}
        bgColor="bg-green-500/10"
        className="left-[3%] top-[20%] w-10 h-10 opacity-50"
        rotation={12}
        delay={0}
        direction="up"
      />
      <FloatingIcon
        icon={<Zap className="h-5 w-5 text-amber-500" />}
        bgColor="bg-amber-500/10"
        className="right-[4%] top-[25%] w-10 h-10 opacity-60"
        rotation={-8}
        delay={0.5}
        direction="down"
      />
      <FloatingIcon
        icon={<CreditCard className="h-5 w-5 text-pink-500" />}
        bgColor="bg-pink-500/10"
        className="right-[5%] bottom-[20%] w-10 h-10 opacity-50"
        rotation={15}
        delay={1}
        direction="up"
      />

      {/* Dots */}
      <DecorativeDots dots={[
        { color: "bg-primary opacity-40", position: "left-[8%] top-[40%]", size: "w-2 h-2" },
        { color: "bg-green-500 opacity-50", position: "right-[10%] top-[35%]", size: "w-1.5 h-1.5" },
        { color: "bg-amber-500 opacity-40", position: "left-[6%] bottom-[30%]", size: "w-2 h-2" },
        { color: "bg-indigo-500 opacity-50", position: "right-[7%] bottom-[35%]", size: "w-1.5 h-1.5" },
      ]} />

      {/* Rings */}
      <DecorativeRings rings={[
        { color: "border-primary/15 opacity-40", position: "left-[2%] top-[60%]", size: "w-14 h-14" },
        { color: "border-indigo-500/15 opacity-30", position: "right-[3%] top-[55%]", size: "w-10 h-10" },
      ]} />

      {/* Lines */}
      <DecorativeLines lines={[
        { gradient: "from-transparent via-primary/25 to-transparent opacity-50", position: "left-[1%] bottom-[15%]", width: "w-20" },
        { gradient: "from-transparent via-green-500/25 to-transparent opacity-40", position: "right-[2%] bottom-[20%]", width: "w-16" },
      ]} />
    </div>
  );
}

export function PricingDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Glows */}
      <Glow
        color="bg-primary/15"
        position="-left-[200px] top-[20%]"
        size="w-[500px] h-[500px]"
        opacity="opacity-40"
      />
      <Glow
        color="bg-green-500/15"
        position="-right-[150px] bottom-[10%]"
        size="w-[400px] h-[400px]"
        opacity="opacity-30"
      />

      {/* Floating Icons */}
      <FloatingIcon
        icon={<CreditCard className="h-5 w-5 text-green-500" />}
        bgColor="bg-green-500/10"
        className="left-[4%] top-[15%] w-10 h-10 opacity-60"
        rotation={-12}
        delay={0}
        direction="up"
      />
      <FloatingIcon
        icon={<Zap className="h-5 w-5 text-amber-500" />}
        bgColor="bg-amber-500/10"
        className="right-[5%] top-[20%] w-10 h-10 opacity-50"
        rotation={10}
        delay={0.3}
        direction="down"
      />
      <FloatingIcon
        icon={<Wand2 className="h-4 w-4 text-primary" />}
        bgColor="bg-primary/10"
        className="left-[6%] bottom-[25%] w-9 h-9 opacity-50"
        rotation={8}
        delay={0.8}
        direction="up"
      />
      <FloatingIcon
        icon={<TrendingUp className="h-5 w-5 text-pink-500" />}
        bgColor="bg-pink-500/10"
        className="right-[4%] bottom-[30%] w-10 h-10 opacity-60"
        rotation={-15}
        delay={1.2}
        direction="down"
      />

      {/* Dots */}
      <DecorativeDots dots={[
        { color: "bg-green-500 opacity-50", position: "left-[10%] top-[35%]", size: "w-2 h-2" },
        { color: "bg-primary opacity-40", position: "right-[8%] top-[40%]", size: "w-1.5 h-1.5" },
        { color: "bg-amber-500 opacity-50", position: "left-[7%] bottom-[40%]", size: "w-1.5 h-1.5" },
        { color: "bg-indigo-500 opacity-40", position: "right-[6%] bottom-[35%]", size: "w-2 h-2" },
      ]} />

      {/* Rings */}
      <DecorativeRings rings={[
        { color: "border-green-500/15 opacity-40", position: "left-[2%] top-[50%]", size: "w-12 h-12" },
        { color: "border-primary/15 opacity-30", position: "right-[3%] top-[45%]", size: "w-16 h-16" },
      ]} />

      {/* Lines */}
      <DecorativeLines lines={[
        { gradient: "from-transparent via-green-500/25 to-transparent opacity-50", position: "left-[1%] top-[70%]", width: "w-24" },
        { gradient: "from-transparent via-primary/25 to-transparent opacity-40", position: "right-[2%] top-[65%]", width: "w-20" },
      ]} />

      {/* Cross */}
      <Cross color="bg-green-500" position="left-[15%] bottom-[15%]" />
    </div>
  );
}

export function FAQDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Glows */}
      <Glow
        color="bg-indigo-500/15"
        position="left-1/4 top-[30%]"
        size="w-[400px] h-[400px]"
        opacity="opacity-50"
      />
      <Glow
        color="bg-primary/15"
        position="right-1/4 bottom-[20%]"
        size="w-[350px] h-[350px]"
        opacity="opacity-40"
      />

      {/* Floating Icons */}
      <FloatingIcon
        icon={<Mail className="h-5 w-5 text-indigo-500" />}
        bgColor="bg-indigo-500/10"
        className="left-[5%] top-[20%] w-10 h-10 opacity-60"
        rotation={12}
        delay={0}
        direction="up"
      />
      <FloatingIcon
        icon={<Zap className="h-4 w-4 text-primary" />}
        bgColor="bg-primary/10"
        className="right-[6%] top-[25%] w-9 h-9 opacity-50"
        rotation={-10}
        delay={0.5}
        direction="down"
      />
      <FloatingIcon
        icon={<CreditCard className="h-5 w-5 text-green-500" />}
        bgColor="bg-green-500/10"
        className="left-[4%] bottom-[30%] w-10 h-10 opacity-50"
        rotation={-8}
        delay={1}
        direction="up"
      />
      <FloatingIcon
        icon={<Wand2 className="h-4 w-4 text-amber-500" />}
        bgColor="bg-amber-500/10"
        className="right-[5%] bottom-[25%] w-9 h-9 opacity-60"
        rotation={15}
        delay={0.8}
        direction="down"
      />

      {/* Dots */}
      <DecorativeDots dots={[
        { color: "bg-indigo-500 opacity-50", position: "left-[8%] top-[40%]", size: "w-2 h-2" },
        { color: "bg-primary opacity-40", position: "right-[10%] top-[35%]", size: "w-1.5 h-1.5" },
        { color: "bg-green-500 opacity-50", position: "left-[6%] bottom-[40%]", size: "w-1.5 h-1.5" },
        { color: "bg-amber-500 opacity-40", position: "right-[7%] bottom-[45%]", size: "w-2 h-2" },
      ]} />

      {/* Rings */}
      <DecorativeRings rings={[
        { color: "border-indigo-500/20 opacity-40", position: "left-[2%] top-[55%]", size: "w-14 h-14" },
        { color: "border-primary/20 opacity-30", position: "right-[3%] top-[50%]", size: "w-10 h-10" },
      ]} />

      {/* Lines */}
      <DecorativeLines lines={[
        { gradient: "from-transparent via-indigo-500/30 to-transparent opacity-50", position: "left-[1%] bottom-[20%]", width: "w-20" },
        { gradient: "from-transparent via-primary/30 to-transparent opacity-40", position: "right-[2%] bottom-[15%]", width: "w-16" },
      ]} />

      {/* Cross */}
      <Cross color="bg-indigo-500" position="right-[12%] top-[60%]" />
    </div>
  );
}
