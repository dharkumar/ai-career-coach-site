'use client';

import { cn } from "@/lib/utils";

interface MiniProgressProps {
  step: number;
  total?: number;
  className?: string;
}

export function MiniProgress({ step, total = 4, className = "" }: MiniProgressProps) {
  return (
    <div data-testid="mini-progress" className={cn("flex gap-[4px] w-[108px]", className)}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          data-testid={`mini-progress-step-${i}`}
          className={cn(
            "flex-1 h-2 rounded-full transition-colors duration-300",
            i <= step ? "bg-[var(--accent-strong)]" : "bg-[var(--surface-muted)]"
          )}
        />
      ))}
    </div>
  );
}
