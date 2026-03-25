'use client';

import { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassmorphicCard({ children, className = "" }: GlassmorphicCardProps) {
  return (
    <motion.div
      data-testid="glassmorphic-card"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass-card rounded-t-3xl px-6 pt-6 pb-4",
        "border-t border-x border-white/10",
        className
      )}
    >
      {/* Handle bar */}
      <div data-testid="glassmorphic-card-handle" className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
      {children}
    </motion.div>
  );
}
