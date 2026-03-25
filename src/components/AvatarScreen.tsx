'use client';

import { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { QuestionBubble } from "./QuestionBubble";
import { MiniProgress } from "./MiniProgress";

/**
 * Lightweight content layer — renders progress bars, question bubble, and
 * children on top of the persistent BaseLayout background.
 *
 * Background, glow, gradient, and BottomNav all live in BaseLayout so they
 * never re-mount across template transitions. AvatarScreen is only responsible
 * for the content positioned within each template.
 *
 * The question text comes exclusively from template props — the AI provides it
 * via navigateToSection({ generativeSubsections: [{ templateId, props }] }).
 */

interface AvatarScreenProps {
  question?: string;
  /** Replaces the question string with arbitrary JSX (used for rich-text insight pill) */
  questionNode?: ReactNode;
  /** Makes the question pill full-width instead of hug-content — for insight screen */
  questionWide?: boolean;
  progressStep?: number;
  progressTotal?: number;
  showProgress?: boolean;
  children?: ReactNode;
  className?: string;
}

export function AvatarScreen({
  question,
  questionNode,
  questionWide = false,
  progressStep = 0,
  progressTotal = 4,
  showProgress = true,
  children,
  className = "",
}: AvatarScreenProps) {
  return (
    <div data-testid="avatar-screen" className={cn("relative w-full h-full", className)}>

      {/* ── Progress bars ──────────────────────────────────────────────────── */}
      {showProgress && (
        <div data-testid="avatar-screen-progress" className="absolute left-1/2 -translate-x-1/2" style={{ top: 20 }}>
          <MiniProgress step={progressStep} total={progressTotal} />
        </div>
      )}

      {/* ── Question pill ──────────────────────────────────────────────────── */}
      {(question || questionNode) && (
        <div data-testid="avatar-screen-question-container" className="absolute left-0 right-0 flex justify-center px-4" style={{ top: 96 }}>
          <AnimatePresence mode="wait">
            {questionNode ? (
              <motion.div
                key="questionNode"
                data-testid="avatar-screen-question-node"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "bg-[var(--surface-muted)]/60 text-[var(--text-secondary)] text-[16px] font-normal leading-5 rounded-[100px] px-4 py-3 text-center",
                  questionWide && "w-full"
                )}
              >
                {questionNode}
              </motion.div>
            ) : (
              <QuestionBubble key={question} text={question!} />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Children (bubbles, forms, overlays) ────────────────────────────── */}
      <div data-testid="avatar-screen-content" className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
