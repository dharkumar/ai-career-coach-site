'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { notifyTele } from "@/utils/teleUtils";
import { useSpeechGate } from "@/hooks/useSpeechGate";

interface TextInputProps {
  /** Placeholder text shown inside the input pill. */
  placeholder?: string;
}

/**
 * Floating text-input pill that pops up at the bottom of the screen.
 *
 * Respects the speech gate (waits for avatar silence) before appearing,
 * then auto-focuses to trigger the native keyboard on mobile.
 * On submit (tap arrow or press Enter), sends: "user typed: <value>"
 * and self-dismisses.
 */
export function TextInput({ placeholder = "Type your answer" }: TextInputProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { ready, dismissed, setDismissed } = useSpeechGate({
    hasInteracted: value.length > 0,
  });

  // Auto-focus after the reveal animation to open the native keyboard
  useEffect(() => {
    if (ready && !dismissed) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [ready, dismissed]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || submitted || dismissed) return;
    setSubmitted(true);
    setDismissed(true);
    await notifyTele(`user typed: ${trimmed}`);
  }, [value, submitted, dismissed, setDismissed]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit],
  );

  return (
    <AnimatePresence>
      {!dismissed && ready && (
        <motion.div
          key="text-input-overlay"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 pointer-events-none flex items-end justify-center"
          style={{ paddingBottom: 112 }}
        >
          <motion.div
            data-testid="text-input"
            className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-3 mx-6 w-full max-w-xs"
            style={{
              background: "rgba(24,24,27,0.72)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid var(--theme-card-border)",
            }}
          >
            <input
              data-testid="text-input-field"
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
              style={{ color: "#ffffff" }}
            />
            <AnimatePresence>
              {value.trim().length > 0 && (
                <motion.button
                  key="submit-btn"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  data-testid="text-input-submit-btn"
                  onClick={handleSubmit}
                  className="shrink-0 w-8 h-8 rounded-full btn-primary flex items-center justify-center active:scale-90 transition-transform"
                  style={{ pointerEvents: "auto" }}
                  aria-label="Submit"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="var(--accent-contrast)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
