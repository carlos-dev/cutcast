"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { motion } from "framer-motion";

export function Header() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">
              {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">
              {user.user_metadata?.name || "Usuário"}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </motion.header>
  );
}
