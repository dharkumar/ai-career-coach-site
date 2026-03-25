'use client';

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBubbleLayout } from "@/hooks/useBubbleLayout";

export interface BubbleOption {
  label: string;
  value?: string;
  variant?: "default" | "green";
  showArrow?: boolean;
}

interface FloatingAnswerBubblesProps {
  options: BubbleOption[];
  onSelect: (option: BubbleOption) => void;
  highlightedText?: string;
  disabled?: boolean;
  verticalZone?: { minPct: number; maxPct: number };
}

export function FloatingAnswerBubbles({
  options,
  onSelect,
  highlightedText,
  disabled = false,
  verticalZone,
}: FloatingAnswerBubblesProps) {
  const labels = useMemo(() => options.map((o) => o.label), [options]);

  const { containerRef, setBubbleRef, positions, ready } = useBubbleLayout({
    labels,
    ...(verticalZone && { verticalZone }),
  });

  const originX = window.innerWidth / 2;
  const originY = window.innerHeight;

 

  return (
    <div ref={containerRef} data-testid="floating-answer-bubbles" className="absolute inset-0">
      <AnimatePresence>
        {options.map((option, i) => {
          const [leftPx, topPx] = positions[i] ?? [0, 0];
          const isHighlighted =
            highlightedText != null &&
            (highlightedText === option.label ||
              highlightedText === option.value);

          const offsetX = originX - leftPx;
          const offsetY = originY - topPx;

          return (
            <motion.button
              key={option.label}
              ref={(el: HTMLButtonElement | null) => setBubbleRef(option.label, el)}
              data-testid={`bubble-option-${(option.value ?? option.label).toLowerCase().replace(/\s+/g, "-")}`}
              initial={false}
              animate={
                ready
                  ? { opacity: 1, x: 0, y: 0, scale: 1 }
                  : { opacity: 0, x: offsetX, y: offsetY, scale: 0.6 }
              }
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                delay: ready ? i * 0.06 : 0,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => !disabled && onSelect(option)}
              disabled={disabled}
              style={{
                position: "absolute",
                left: leftPx,
                top: topPx,
                zIndex: 10,
                pointerEvents: "auto",
              }}
              className={cn(
                "relative px-4 py-3 rounded-full flex items-center justify-center gap-2 whitespace-nowrap",
                "transition-all duration-300 active:scale-95",
                isHighlighted || option.variant === "green"
                  ? "bg-[var(--accent)] shadow-[0_4px_4px_rgba(0,0,0,0.25)] text-[var(--accent-contrast)] text-base font-semibold"
                  : [
                      "glass-card top-sheen",
                      "text-[var(--text-secondary)] text-base font-normal leading-5",
                      "hover:opacity-90 hover:scale-105",
                    ],
              )}
            >
              <span className="relative z-10">{option.label}</span>
              {isHighlighted && option.showArrow && <ArrowRight size={16} className="relative z-10 text-[var(--accent-contrast)]" />}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
