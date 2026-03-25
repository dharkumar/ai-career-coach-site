'use client';

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FloatingAnswerBubbles } from "@/components/FloatingAnswerBubbles";
import { MiniProgress } from "@/components/MiniProgress";
import { informTele } from "@/utils/teleUtils";
import {
  sendInvalidOptionVoiceIntent,
  sendSelectionIntent,
} from "@/utils/teleIntent";
import { useSpeechGate } from "@/hooks/useSpeechGate";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceTranscriptIntent } from "@/hooks/useVoiceTranscriptIntent";
import { resolveBestVoiceMatch } from "@/utils/voiceMatch";
import type { BubbleOption } from "@/components/FloatingAnswerBubbles";

interface GlassmorphicOptionsProps {
  /** Answer bubble options. Required. */
  bubbles: BubbleOption[];
  /** Whether to show the top progress bar. */
  showProgress?: boolean;
  /** Current step index for the progress bar (0-based). */
  progressStep?: number;
  /** Total number of steps for the progress bar. */
  progressTotal?: number;
}

/**
 * Reusable options template — replaces QualificationStep.
 *
 * The question text is NOT a prop: TeleSpeechBubble (always visible in BaseLayout)
 * shows whatever the avatar is saying. This template only renders the interactive
 * option bubbles below it.
 *
 * Selection flow (click or voice):
 *   1. User taps OR says a bubble label aloud.
 *   2. FloatingAnswerBubbles highlights the selected bubble (built-in).
 *   3. Shared intent bridge sends `user selected: <label>` immediately.
 *   4. After 500ms, the template fades itself out (self-dismiss).
 *      The AI's next navigateToSection replaces it when ready.
 *
 * When bubbles become interactive (`ready` from useSpeechGate), we informTele once
 * so Realtime waits for `user selected:` before calling navigateToSection again.
 */
export function GlassmorphicOptions({
  bubbles = [],
  showProgress = false,
  progressStep = 0,
  progressTotal = 4,
}: GlassmorphicOptionsProps) {
  const [hasSelected, setHasSelected] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const waitForSelectionHintSentRef = useRef(false);

  const { ready, dismissed, setDismissed } = useSpeechGate({
    hasInteracted: hasSelected,
    /* Let the avatar finish the question before showing taps (was 250ms — too easy to bundle with model follow-up). */
    silenceMs: 850,
    dismissSilenceMs: 120_000,
  });

  useEffect(() => {
    if (!ready || dismissed || waitForSelectionHintSentRef.current) return;
    waitForSelectionHintSentRef.current = true;
    informTele(
      "[SYSTEM] GlassmorphicOptions: answer bubbles are on screen and pointer-events are enabled. " +
        "Do NOT call navigateToSection or advance to the next journey step until the user selects one option. " +
        "You will receive `user selected: <label>` via TellTele when they tap a bubble or speak a matching label. " +
        "Until then, stay silent or give at most one short acknowledgment if the user speaks off-script — " +
        "do not ask the next interview question (e.g. industry) or narrate the next screen."
    );
  }, [ready, dismissed]);

  const handleSelect = useCallback(
    (option: BubbleOption) => {
      if (hasSelected || dismissed) return;
      setHasSelected(true);
      setSelectedLabel(option.value ?? option.label);
      const label = option.value ?? option.label;
      void sendSelectionIntent(label);
      console.log("USER SELECTED:", label);
      setTimeout(() => setDismissed(true), 500);
    },
    [hasSelected, dismissed, setDismissed],
  );

  useSpeechFallbackNudge({
    enabled: !hasSelected,
    requiredPhrases: ["?", "industry", "choose", "interested", "ready", "journey", "role", "priority"],
    matchMode: "any",
    instruction:
      "[CORRECTION] You called navigateToSection but did NOT speak. " +
      "Trigger ONLY the missing part: speak the transition phrase NOW (1 short sentence). " +
      "Do NOT read option labels aloud — speak only the question or acknowledgment; options are shown on screen. Do NOT repeat or re-call navigateToSection.",
    instructionForMissingNavigate:
      "[CORRECTION] The user has selected an option (check TellTele for `user selected:`). " +
      "Trigger ONLY the missing part: call navigateToSection with the next step payload NOW. " +
      "Do NOT speak again before calling the tool. Do NOT list or read options.",
    enableNavigateCheck: hasSelected,
    delayMs: 3000,
  });

  useVoiceTranscriptIntent({
    enabled: !hasSelected && !dismissed,
    onTranscript: (transcript) => {
      const match = resolveBestVoiceMatch(transcript, bubbles);
      if (match) {
        handleSelect(match);
      } else {
        void sendInvalidOptionVoiceIntent();
      }
    },
  });

  return (
    <AnimatePresence>
      {!dismissed && ready && (
        <motion.div
          key="glassmorphic-options"
          data-testid="glassmorphic-options"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {showProgress && (
            <div
              data-testid="glassmorphic-options-progress"
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 20 }}
            >
              <MiniProgress step={progressStep} total={progressTotal} />
            </div>
          )}

          <div data-testid="glassmorphic-options-bubbles" className="absolute inset-0 pointer-events-auto">
            <FloatingAnswerBubbles
              options={bubbles}
              onSelect={handleSelect}
              highlightedText={selectedLabel ?? undefined}
              disabled={hasSelected}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
