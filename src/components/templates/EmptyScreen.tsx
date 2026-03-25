'use client';

import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";

/**
 * Explicit no-op template for speech-only turns.
 * Use this when trAIn should keep talking without rendering an interactive layer.
 *
 * After 2500 ms, if the AI has not started speaking the expected follow-up
 * (e.g. "ready to show you" for step 8), a hidden nudge is sent to unblock it.
 * This is the key mechanism that drives the step 7 → step 8 (CardStack)
 * transition: EmptyScreen renders after "Looks Good", the nudge fires, and the
 * AI generates the CardStack response without waiting for a user signal.
 */
export function EmptyScreen() {
  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["ready to show you", "i'm ready to show", "show you potential", "where should we begin"],
    instruction:
      "[SYSTEM] EmptyScreen has been visible for 2.5 s with no follow-up speech detected. " +
      "Proceed immediately to the next required step (do NOT wait for user input). " +
      "If there is pending job data from get_jobs_by_skills, call navigateToSection with CardStack now.",
    delayMs: 2500,
  });

  return <div data-testid="empty-screen" />;
}
