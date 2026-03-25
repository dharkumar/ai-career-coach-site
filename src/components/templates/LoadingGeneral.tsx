'use client';

import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface LoadingGeneralProps {
  /** Label shown below the spinner. */
  message?: string;
}

/**
 * General-purpose visual loading screen.
 *
 * Pure UI — no MCP calls. The Runtime Agent (LLM) calls backend tools
 * (register_candidate, get_jobs_by_skills) directly via the Mobeus console
 * MCP connection, then navigates to CardStack when done.
 *
 * This template is shown immediately after the user submits their email and
 * stays visible while the LLM's tool calls execute in the background.
 */
export function LoadingGeneral({ message }: LoadingGeneralProps) {
  return (
    <motion.div
      data-testid="loading-general"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex items-center justify-center"
      style={{ paddingBottom: 96 }}
    >
      <div data-testid="loading-general-content" className="flex flex-col items-center gap-4">
        <Loader2
          data-testid="loading-general-spinner"
          size={32}
          className="text-[var(--accent)] animate-spin"
        />
        {message && (
          <p
            data-testid="loading-general-message"
            className="text-[var(--text-subtle)] text-sm text-center px-8"
          >
            {message}
          </p>
        )}
      </div>
    </motion.div>
  );
}
