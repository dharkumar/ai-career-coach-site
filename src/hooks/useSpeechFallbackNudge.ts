import { useEffect, useRef } from "react";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";
import { useCurrentSection } from "@/contexts/CurrentSectionContext";
import { teleAcknowledge, informTele } from "@/utils/teleUtils";

type MatchMode = "any" | "all";

interface UseSpeechFallbackNudgeOptions {
  /** Toggle nudge behavior (e.g. enable after template fully renders). */
  enabled?: boolean;
  /** Hidden instruction sent if required speech is not detected in time. */
  instruction: string;
  /** Phrases that count as successful speech for this step. */
  requiredPhrases: string[];
  /** How required phrases are evaluated. Default: any. */
  matchMode?: MatchMode;
  /** Delay before firing fallback instruction. Default: 1600ms. */
  delayMs?: number;
  /** When true, also check for missing navigateToSection after user selected. Requires instructionForMissingNavigate. */
  enableNavigateCheck?: boolean;
  /** Instruction sent when speech happened but navigateToSection was not called. Used with enableNavigateCheck. */
  instructionForMissingNavigate?: string;
}

const RETRY_INTERVAL_MS = 800;
const MAX_RETRIES = 8;
const RECENT_SPEECH_MS = 5000;

/**
 * One-shot fallback nudge for turns that can stall with tool-only responses.
 *
 * Pattern:
 * - Template mounts or becomes ready.
 * - Wait `delayMs` for expected speech.
 * - If the avatar is still talking when the timer fires, keep waiting
 *   (up to MAX_RETRIES × RETRY_INTERVAL_MS) so we don't interrupt mid-sentence.
 * - If expected speech is still missing after the avatar stops, send a hidden
 *   system nudge.
 * - Never fire more than once per template mount.
 */
function sendNudge(text: string): void {
  const fw = (window as Window & {
    UIFramework?: {
      teleAcknowledge?: (
        instructionText: string,
        options?: Record<string, unknown>
      ) => void;
    };
  }).UIFramework;

  if (typeof fw?.teleAcknowledge === "function") {
    teleAcknowledge(text, { visible: false });
  } else {
    informTele(text);
  }
}

export function useSpeechFallbackNudge({
  enabled = true,
  instruction,
  requiredPhrases,
  matchMode = "any",
  delayMs = 1600,
  enableNavigateCheck = false,
  instructionForMissingNavigate,
}: UseSpeechFallbackNudgeOptions): void {
  const { speech, isTalking, getLastSpeechAt } = useTeleSpeech();
  const { currentSectionId } = useCurrentSection();
  const seenRef = useRef<Set<string>>(new Set());
  const hasFiredRef = useRef(false);
  const hasFiredNavigateRef = useRef(false);
  const isTalkingRef = useRef(isTalking);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const sectionWhenNavigateCheckStartedRef = useRef<string | undefined>(undefined);
  const currentSectionIdRef = useRef<string | undefined>(currentSectionId);
  const prevSectionResetRef = useRef<string | undefined>(undefined);
  currentSectionIdRef.current = currentSectionId;

  isTalkingRef.current = isTalking;

  // New flow step → new expected speech. Clear stale phrase hits (e.g. "interested"
  // from the industry question must not satisfy the role MultiSelect nudge).
  useEffect(() => {
    if (currentSectionId === prevSectionResetRef.current) return;
    prevSectionResetRef.current = currentSectionId;
    seenRef.current = new Set();
    hasFiredRef.current = false;
    hasFiredNavigateRef.current = false;
    retriesRef.current = 0;
  }, [currentSectionId]);

  useEffect(() => {
    const text = (speech ?? "").toLowerCase();
    if (!text) return;

    for (const phrase of requiredPhrases) {
      if (!phrase) continue;
      if (text.includes(phrase.toLowerCase())) {
        seenRef.current.add(phrase.toLowerCase());
      }
    }
  }, [speech, requiredPhrases]);

  const hasRequiredSpeech = (): boolean => {
    if (requiredPhrases.length === 0) return false;
    const normalized = requiredPhrases.map((p) => p.toLowerCase());
    if (matchMode === "all") {
      return normalized.every((p) => seenRef.current.has(p));
    }
    return normalized.some((p) => seenRef.current.has(p));
  };

  // Check 1: Missing speech — AI called navigateToSection but did not speak.
  useEffect(() => {
    if (!enabled || hasFiredRef.current) return;

    const attempt = () => {
      if (hasFiredRef.current) return;
      if (hasRequiredSpeech()) return;

      // Avatar spoke recently — the speech was almost certainly part of the
      // same response that called navigateToSection.  Skip the nudge.
      if (Date.now() - getLastSpeechAt() < RECENT_SPEECH_MS) {
        hasFiredRef.current = true;
        return;
      }

      if (isTalkingRef.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        timerRef.current = setTimeout(attempt, RETRY_INTERVAL_MS);
        return;
      }

      hasFiredRef.current = true;
      sendNudge(instruction);
    };

    timerRef.current = setTimeout(attempt, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, instruction, requiredPhrases, matchMode, delayMs, currentSectionId]);

  // Check 2: Missing navigate — AI spoke but did not call navigateToSection.
  useEffect(() => {
    if (
      !enableNavigateCheck ||
      !instructionForMissingNavigate ||
      hasFiredNavigateRef.current
    )
      return;

    // Capture section only when we start the check; don't overwrite on re-runs.
    const sectionAtStart = currentSectionId;
    sectionWhenNavigateCheckStartedRef.current = sectionAtStart;
    navigateTimerRef.current = setTimeout(() => {
      if (hasFiredNavigateRef.current) return;
      if (!hasRequiredSpeech()) return;
      // Fire only if we're still on the same section (navigate didn't happen).
      if (sectionWhenNavigateCheckStartedRef.current !== currentSectionIdRef.current)
        return;

      hasFiredNavigateRef.current = true;
      sendNudge(instructionForMissingNavigate);
    }, delayMs);

    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, [enableNavigateCheck, instructionForMissingNavigate, delayMs, currentSectionId]);
}

