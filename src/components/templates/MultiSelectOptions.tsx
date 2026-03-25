'use client';

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sendSelectionIntent } from "@/utils/teleIntent";
import { useSpeechGate } from "@/hooks/useSpeechGate";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useMicGate } from "@/hooks/useMicGate";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";
import { useTeleSpeechContext } from "@/contexts/TeleSpeechContext";
import { resolveBestVoiceMatch, normalizeVoiceText } from "@/utils/voiceMatch";
import { MiniProgress } from "@/components/MiniProgress";
import { FloatingAnswerBubbles } from "@/components/FloatingAnswerBubbles";
import type { BubbleOption } from "@/components/FloatingAnswerBubbles";

const CONTINUE_PHRASES = ["continue", "done", "submit", "thats all", "that is all", "im done"];

interface MultiSelectOptionsProps {
  /** Answer bubble options to choose from. Required. */
  bubbles: BubbleOption[];
  /** Whether to show the top progress bar. */
  showProgress?: boolean;
  progressStep?: number;
  progressTotal?: number;
}

/**
 * Multi-select option bubbles.
 *
 * Tapping a bubble adds it to a selected-chips row (shown below the speech
 * bubble). Tapping the x on a chip deselects it. A "Continue ->" button
 * appears once at least one item is selected. On Continue, sends:
 *   "user selected: <label1>, <label2>, ..."
 */
const CHIPS_GAP_BELOW_BUBBLE = 12;
const CHIPS_TOP_FALLBACK = 180;

export function MultiSelectOptions({
  bubbles = [],
  showProgress,
  progressStep,
  progressTotal,
}: MultiSelectOptionsProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const { speechBubbleBottomPx } = useTeleSpeechContext();
  const chipsTop = speechBubbleBottomPx != null
    ? speechBubbleBottomPx + CHIPS_GAP_BELOW_BUBBLE
    : CHIPS_TOP_FALLBACK;

  const { ready, dismissed, setDismissed } = useSpeechGate({
    hasInteracted: selected.length > 0,
    silenceMs: 250,
    // Match GlassmorphicOptions: prevent the 4-second fallback reveal from instantly
    // triggering auto-dismiss if the AI speaks at exactly that moment.
    dismissSilenceMs: 120_000,
  });

  const { release: releaseMic } = useMicGate();

  const remaining = useMemo(
    () => bubbles.filter((b) => !selected.includes(b.label)),
    [bubbles, selected],
  );

  const handleBubbleSelect = useCallback(
    (option: BubbleOption) => {
      if (dismissed) return;
      setSelected((prev) => (prev.includes(option.label) ? prev : [...prev, option.label]));
    },
    [dismissed],
  );

  const handleDeselect = useCallback((label: string) => {
    setSelected((prev) => prev.filter((l) => l !== label));
  }, []);

  const handleContinue = useCallback(async () => {
    if (selected.length === 0 || dismissed) return;
    setDismissed(true);
    releaseMic();
    try {
      window.dispatchEvent(new CustomEvent("multi-select-submitted"));
    } catch {}
    await sendSelectionIntent(selected.join(", "));
  }, [selected, dismissed, setDismissed, releaseMic]);

  const onBrowserTranscript = useCallback(
    (transcript: string) => {
      const norm = normalizeVoiceText(transcript);

      if (selected.length > 0 && CONTINUE_PHRASES.some((p) => norm.includes(p))) {
        void handleContinue();
        return;
      }

      const match = resolveBestVoiceMatch(transcript, remaining);
      if (match) {
        handleBubbleSelect(match);
      }
    },
    [selected, remaining, handleContinue, handleBubbleSelect],
  );

  useBrowserSpeech({
    enabled: !dismissed,
    onTranscript: onBrowserTranscript,
  });

  const { requiredPhrases, matchMode } = useMemo(() => {
    const step = progressStep ?? 0;
    if (step <= 0) {
      return { requiredPhrases: ["industry", "begin"] as string[], matchMode: "any" as const };
    }
    if (step === 1) {
      return { requiredPhrases: ["role", "interested"] as string[], matchMode: "any" as const };
    }
    return { requiredPhrases: ["priority", "important"] as string[], matchMode: "any" as const };
  }, [progressStep]);

  useSpeechFallbackNudge({
    enabled: selected.length === 0,
    requiredPhrases,
    matchMode,
    instruction:
      "[CORRECTION] You called navigateToSection but did NOT speak. " +
      "Trigger ONLY the missing part: speak the transition phrase NOW (1 short sentence). " +
      "Do NOT read option labels aloud — speak only the question or acknowledgment; options are shown on screen. Do NOT repeat or re-call navigateToSection.",
    delayMs: 2000,
  });

  return (
    <AnimatePresence>
      {!dismissed && ready && (
        <motion.div
          key="multi-select-options"
          data-testid="multi-select-options"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 pointer-events-auto"
        >
          {showProgress && (
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 20 }}
            >
              <MiniProgress step={progressStep ?? 0} total={progressTotal ?? 3} />
            </div>
          )}

          {/* ── Selected chips row ──────────────────────────────────────────── */}
          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute left-4 right-4 flex flex-wrap justify-center gap-2 pointer-events-auto z-20"
                style={{ top: chipsTop }}
              >
                {selected.map((label, i) => (
                  <motion.button
                    key={label}
                    data-testid={`multi-select-chip-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => handleDeselect(label)}
                    className="px-3 py-2 bg-zinc-900/50 rounded-full inline-flex justify-center items-center gap-2 overflow-hidden active:scale-95 transition-transform"
                  >
                    <span className="text-center text-[var(--text-secondary)] text-sm font-normal leading-5">
                      {label}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Remaining floating bubbles ──────────────────────────────────── */}
          <div className="absolute inset-0 pointer-events-auto">
            <FloatingAnswerBubbles
              options={remaining}
              onSelect={handleBubbleSelect}
              disabled={dismissed}
              verticalZone={{ minPct: 55, maxPct: 85 }}
            />
          </div>

          {/* ── Continue button ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {selected.length > 0 && (
              <motion.button
                key="continue-btn"
                data-testid="multi-select-continue"
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={handleContinue}
                style={{
                  position: "fixed",
                  right: 16,
                  bottom: 95,
                  zIndex: 50,
                  pointerEvents: "auto",
                }}
                className="flex btn-primary items-center gap-2 px-6 py-3 rounded-full font-semibold text-base text-[var(--accent-contrast)] active:scale-95 transition-transform no-lightboard"
              >
                <span>Continue</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
      )}
    </AnimatePresence>
  );
}
