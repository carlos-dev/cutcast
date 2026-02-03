"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FloatingIconProps {
  icon: ReactNode;
  bgColor: string;
  className: string;
  rotation?: number;
  delay?: number;
  direction?: "up" | "down";
}

export function FloatingIcon({
  icon,
  bgColor,
  className,
  rotation = 0,
  delay = 0,
  direction = "up"
}: FloatingIconProps) {
  const yAnimation = direction === "up" ? [0, -8, 0] : [0, 8, 0];

  return (
    <motion.div
      animate={{ y: yAnimation }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute rounded-xl flex items-center justify-center ${bgColor} ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {icon}
    </motion.div>
  );
}

interface DecorativeDotsProps {
  dots: Array<{
    color: string;
    position: string;
    size: string;
  }>;
}

export function DecorativeDots({ dots }: DecorativeDotsProps) {
  return (
    <>
      {dots.map((dot, i) => (
        <div
          key={i}
          className={`absolute ${dot.position} ${dot.size} rounded-full ${dot.color}`}
        />
      ))}
    </>
  );
}

interface DecorativeRingsProps {
  rings: Array<{
    color: string;
    position: string;
    size: string;
  }>;
}

export function DecorativeRings({ rings }: DecorativeRingsProps) {
  return (
    <>
      {rings.map((ring, i) => (
        <div
          key={i}
          className={`absolute ${ring.position} ${ring.size} rounded-full border ${ring.color}`}
        />
      ))}
    </>
  );
}

interface DecorativeLinesProps {
  lines: Array<{
    gradient: string;
    position: string;
    width: string;
  }>;
}

export function DecorativeLines({ lines }: DecorativeLinesProps) {
  return (
    <>
      {lines.map((line, i) => (
        <div
          key={i}
          className={`absolute ${line.position} ${line.width} h-0.5 bg-gradient-to-r ${line.gradient}`}
        />
      ))}
    </>
  );
}

interface CrossProps {
  color: string;
  position: string;
}

export function Cross({ color, position }: CrossProps) {
  return (
    <div className={`absolute ${position} opacity-30`}>
      <div className={`w-0.5 h-4 ${color}`} />
      <div className={`w-4 h-0.5 ${color} -mt-2 -ml-[7px]`} />
    </div>
  );
}

interface GlowProps {
  color: string;
  position: string;
  size?: string;
  opacity?: string;
}

export function Glow({ color, position, size = "w-[400px] h-[400px]", opacity = "opacity-40" }: GlowProps) {
  return (
    <div className={`absolute ${position} ${size} ${color} rounded-full blur-[150px] ${opacity}`} />
  );
}

