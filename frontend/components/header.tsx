"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { TikTokButton } from "./tiktok-button";
import { CreditsButton } from "./credits-button";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [showTikTokDropdown, setShowTikTokDropdown] = useState(false);
  const [showCreditsDropdown, setShowCreditsDropdown] = useState(false);

  const handleTikTokDropdownChange = useCallback((show: boolean) => {
    setShowTikTokDropdown(show);
  }, []);

  const handleCreditsDropdownChange = useCallback((show: boolean) => {
    setShowCreditsDropdown(show);
  }, []);

  if (!user) return null;

  const hasOpenDropdown = showTikTokDropdown || showCreditsDropdown;

  const navItems = [
    { href: "/dashboard", label: "Novo Corte", icon: Plus },
    { href: "/history", label: "Histórico", icon: Clock },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo / Avatar */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">
                {user.user_metadata?.name || "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Credits Display */}
          <CreditsButton 
            userId={user.id} 
            onShowDropdownChange={handleCreditsDropdownChange}
          />

          {/* TikTok Status/Connect Button */}
          <TikTokButton 
            userId={user.id}
            onShowDropdownChange={handleTikTokDropdownChange}
          />

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>

      {/* Overlay para fechar dropdowns */}
      {hasOpenDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            // Force re-render to close dropdowns by clicking outside
            window.dispatchEvent(new CustomEvent('close-header-dropdowns'));
          }}
        />
      )}
    </motion.header>
  );
}
