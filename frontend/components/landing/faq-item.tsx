"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

export function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div
      className="bg-[#1A1A1E] border border-[#2A2A30] rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[#3A3A40]"
      onClick={onClick}
    >
      <div className="p-6 flex items-center justify-between">
        <h3 className="font-semibold text-white">{question}</h3>
        <ChevronDown
          className={`h-5 w-5 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-6 text-muted-foreground leading-relaxed">
          {answer}
        </p>
      </motion.div>
    </div>
  );
}
