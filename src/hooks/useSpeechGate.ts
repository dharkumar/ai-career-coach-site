import { useState, useEffect, useRef } from "react";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";

interface SpeechGateOptions {
  /** Milliseconds of uninterrupted silence before revealing. Default 800. */
  silenceMs?: number;
  /** Max wait (ms) if the avatar never speaks after mount. Default 4000. */
  fallbackMs?: number;
  /** Silence duration (ms) that triggers auto-dismiss on a new AI turn. Default 1500. */
  dismissSilenceMs?: number;
  /** When true, skip auto-dismiss (e.g. user already interacted). */
  hasInteracted?: boolean;
}

interface SpeechGateResult {
  ready: boolean;
  dismissed: boolean;
  setDismissed: (v: boolean) => void;
}

/**
 * Gate UI visibility on avatar speech.
 *
 * Waits for the avatar to speak at least once, then requires `silenceMs` of
 * uninterrupted silence before setting `ready = true`. If the avatar never
 * speaks within `fallbackMs` of mount, reveals anyway so the user isn't stuck.
 *
 * Auto-dismisses when a NEW AI turn begins (silence > `dismissSilenceMs`
 * followed by speech) — unless the user has already interacted.
 */
export function useSpeechGate({
  silenceMs = 800,
  fallbackMs = 4000,
  dismissSilenceMs = 1500,
  hasInteracted = false,
}: SpeechGateOptions = {}): SpeechGateResult {
  const { isTalking } = useTeleSpeech();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const silenceStartRef = useRef<number | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const becameVisibleAtRef = useRef<number | null>(null);
  const hasSpeechAfterMountRef = useRef(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!dismissed && ready) {
      if (becameVisibleAtRef.current == null) {
        becameVisibleAtRef.current = Date.now();
      }
      return;
    }
    becameVisibleAtRef.current = null;
  }, [ready, dismissed]);

  useEffect(() => {
    if (!isTalking) {
      silenceStartRef.current = Date.now();

      const timeAlive = Date.now() - mountTimeRef.current;
      const speechGateCleared =
        hasSpeechAfterMountRef.current ||
        timeAlive > 2000 ||
        // Mounted after avatar stopped (e.g. navigateToSection fired post-speech).
        // Use silenceMs instead of 4s fallback so options appear quickly.
        timeAlive < 500;

      if (!speechGateCleared) {
        readyTimerRef.current = setTimeout(
          () => setReady(true),
          Math.max(fallbackMs - timeAlive, silenceMs),
        );
      } else {
        readyTimerRef.current = setTimeout(() => setReady(true), silenceMs);
      }

      return () => {
        if (readyTimerRef.current !== null) {
          clearTimeout(readyTimerRef.current);
          readyTimerRef.current = null;
        }
      };
    }

    hasSpeechAfterMountRef.current = true;
    if (readyTimerRef.current !== null) {
      clearTimeout(readyTimerRef.current);
      readyTimerRef.current = null;
    }

    if (silenceStartRef.current !== null) {
      const silenceDuration = Date.now() - silenceStartRef.current;
      const hasBeenVisible = becameVisibleAtRef.current !== null;
      if (
        !hasInteracted &&
        !dismissed &&
        hasBeenVisible &&
        silenceDuration > dismissSilenceMs
      ) {
        setDismissed(true);
      }
    }
    silenceStartRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTalking, hasInteracted, dismissed]);

  return { ready, dismissed, setDismissed };
}
