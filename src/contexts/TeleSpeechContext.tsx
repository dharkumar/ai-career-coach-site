'use client';

/**
 * TeleSpeechContext — singleton LiveKit listener for avatar speech events.
 *
 * WHY A CONTEXT?
 * useTeleSpeech() used to be a standalone hook: every component that called it
 * created its own independent isTalking=false state and its own LiveKit
 * DataReceived listener. This caused a subtle but critical bug:
 *
 *   When GlassmorphicOptions mounted mid-speech (because navigateToSection fires
 *   while the avatar is already talking), its brand-new hook instance started
 *   with isTalking=false and immediately triggered the 700ms silence timer — even
 *   though the avatar was actively speaking. For short AI sentences (STEP 1 "Welcome!",
 *   STEP 2 "Let us begin.") the timer fired in an acceptable gap. But for the longer
 *   STEP 3 insight sentence (~3–4 s), the timer fired hundreds of milliseconds
 *   before the insight finished, showing the priority options while the avatar was
 *   mid-sentence, and then the 1500ms dismiss threshold kicked in when the question
 *   sentence started, hiding the options before the user could see them.
 *
 * SOLUTION: a single Context provider owns one LiveKit listener and one isTalking
 * state. All useTeleSpeech() callers read from this shared state, so a component
 * mounting mid-speech immediately gets isTalking=true and behaves correctly.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export interface TeleSpeechState {
  speech: string | null;
  /** True from avatar_start_talking until avatar_stop_talking. Shared across all consumers. */
  isTalking: boolean;
  /** Pixel offset from top where the speech bubble ends. Used to position content below it. */
  speechBubbleBottomPx: number | null;
}

export interface TeleSpeechContextValue extends TeleSpeechState {
  setSpeechBubbleBottomPx: (px: number | null) => void;
  /** Epoch ms when the avatar last started talking. Useful for recency checks. */
  getLastSpeechAt: () => number;
}

const TeleSpeechContext = createContext<TeleSpeechContextValue>({
  speech: null,
  isTalking: false,
  speechBubbleBottomPx: null,
  setSpeechBubbleBottomPx: () => {},
  getLastSpeechAt: () => 0,
});

export function TeleSpeechProvider({ children }: { children: ReactNode }) {
  const [speech, setSpeech] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const [speechBubbleBottomPx, setSpeechBubbleBottomPx] = useState<number | null>(null);

  const registeredRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageCacheRef = useRef<Map<string, string>>(new Map());
  const navigateClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechAtRef = useRef(0);

  const getLastSpeechAt = useCallback(() => lastSpeechAtRef.current, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const tryRegister = () => {
    if (registeredRef.current) {
      stopPolling();
      return;
    }

     
    const win = window as any;
    const room = win.UIFramework?.voiceController?.avatarController?.model?.room;
    const DataReceived = win.LivekitClient?.RoomEvent?.DataReceived;

    if (!room?.on || !DataReceived) return;

    console.log("[TeleSpeechContext] LiveKit room found, attaching singleton DataReceived handler");

    const onDataReceived = (...args: unknown[]) => {
      try {
        const payload = args[0] as Uint8Array;
        const data = JSON.parse(new TextDecoder().decode(payload));

        const { type, task_id, message } = data ?? {};

        if (type === "avatar_talking_message" && task_id && message) {
          messageCacheRef.current.set(task_id, message);
        } else if (type === "avatar_start_talking") {
          lastSpeechAtRef.current = Date.now();
          if (navigateClearTimerRef.current) {
            clearTimeout(navigateClearTimerRef.current);
            navigateClearTimerRef.current = null;
          }
          const cached = task_id ? messageCacheRef.current.get(task_id) : undefined;
          if (cached) setSpeech(cached);
          setIsTalking(true);
        } else if (type === "avatar_stop_talking") {
          setIsTalking(false);
          if (task_id) messageCacheRef.current.delete(task_id);
        }
      } catch {
        // Ignore non-JSON or unrelated data channel messages
      }
    };

    room.on(DataReceived, onDataReceived);
    registeredRef.current = true;
    stopPolling();

    cleanupRef.current = () => {
      room.off(DataReceived, onDataReceived);
    };
  };

  const startPolling = () => {
    stopPolling();
    let attempts = 0;
    pollRef.current = setInterval(() => {
      attempts++;
      tryRegister();
      if (registeredRef.current || attempts >= 100) stopPolling();
    }, 300);
  };

  useEffect(() => {
    tryRegister();
    if (!registeredRef.current) startPolling();

    const onConnectionChange = (e: Event) => {
      const connected = (e as CustomEvent<{ connected: boolean }>).detail?.connected;
      if (connected) {
        cleanupRef.current?.();
        cleanupRef.current = null;
        registeredRef.current = false;
        messageCacheRef.current.clear();
        setSpeech(null);
        setIsTalking(false);
        tryRegister();
        if (!registeredRef.current) startPolling();
      }
    };

    // Delayed stale-speech clear on navigateToSection — dashboard journey only.
    // Qualification flow (GlassmorphicOptions, MultiSelectOptions, etc.) keeps the bubble
    // visible while the user selects options. Only clear on dashboard templates.
    const NAVIGATE_CLEAR_DELAY_MS = 8000;
    const DASHBOARD_JOURNEY_TEMPLATES = new Set([
      "Dashboard",
      "ProfileSheet",
      "JobSearchSheet",
      "JobDetailSheet",
      "EligibilitySheet",
      "CloseGapSheet",
      "JobApplicationsSheet",
      "PastApplicationsSheet",
      "SkillCoverageSheet",
      "MarketRelevanceSheet",
      "CareerGrowthSheet",
      "SkillsDetail",
      "MarketRelevanceDetail",
      "CareerGrowthDetail",
    ]);
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ templateIds?: string[] }>).detail;
      const templateIds = detail?.templateIds ?? [];
      const isDashboardJourney = templateIds.some((id) =>
        DASHBOARD_JOURNEY_TEMPLATES.has(id)
      );
      if (!isDashboardJourney) return;

      const navigateAt = Date.now();
      if (navigateClearTimerRef.current) clearTimeout(navigateClearTimerRef.current);
      navigateClearTimerRef.current = setTimeout(() => {
        // Speech arrived within a few seconds of the navigate event —
        // this is a speech+navigate response, not stale text. Keep it.
        if (lastSpeechAtRef.current > navigateAt - 5000) {
          navigateClearTimerRef.current = null;
          return;
        }
        setSpeech(null);
        navigateClearTimerRef.current = null;
      }, NAVIGATE_CLEAR_DELAY_MS);
    };

    window.addEventListener("tele-connection-changed", onConnectionChange);
    window.addEventListener("tele-navigate-section", onNavigate);

    return () => {
      stopPolling();
      if (navigateClearTimerRef.current) clearTimeout(navigateClearTimerRef.current);
      window.removeEventListener("tele-connection-changed", onConnectionChange);
      window.removeEventListener("tele-navigate-section", onNavigate);
      cleanupRef.current?.();
      registeredRef.current = false;
    };
     
  }, []);

  return (
    <TeleSpeechContext.Provider value={{ speech, isTalking, speechBubbleBottomPx, setSpeechBubbleBottomPx, getLastSpeechAt }}>
      {children}
    </TeleSpeechContext.Provider>
  );
}

/** Read the shared avatar speech state. Must be inside <TeleSpeechProvider>. */
export function useTeleSpeechContext(): TeleSpeechContextValue {
  return useContext(TeleSpeechContext);
}
