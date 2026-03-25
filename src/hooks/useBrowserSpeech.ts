import { useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string; readonly confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLocal {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLocal {
  readonly error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLocal) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLocal) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface UseBrowserSpeechOptions {
  enabled?: boolean;
  lang?: string;
  onTranscript: (transcript: string) => void;
}

/**
 * Local browser speech-to-text via the Web Speech API.
 * Runs entirely client-side — audio never reaches the LiveKit/AI voice model
 * when the LiveKit mic is muted via useMicGate.
 *
 * Supports Chrome (native), Edge, and Safari (webkitSpeechRecognition).
 */
export function useBrowserSpeech({
  enabled = true,
  lang = "en-US",
  onTranscript,
}: UseBrowserSpeechOptions): { supported: boolean } {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  const supported = !!(win?.SpeechRecognition || win?.webkitSpeechRecognition);

  const startRecognition = useCallback(() => {
    if (!supported || !enabled) return;

    const Ctor = (win!.SpeechRecognition || win!.webkitSpeechRecognition) as SpeechRecognitionCtor;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEventLocal) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            onTranscriptRef.current(transcript);
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLocal) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      console.warn("[useBrowserSpeech] error:", event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch { /* already started or aborted */ }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* ignore */ }
  }, [supported, enabled, lang]);

  useEffect(() => {
    if (!enabled || !supported) {
      if (recognitionRef.current) {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        try { r.stop(); } catch { /* ignore */ }
      }
      return;
    }

    startRecognition();

    return () => {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      if (r) {
        try { r.stop(); } catch { /* ignore */ }
      }
    };
  }, [enabled, supported, startRecognition]);

  return { supported };
}
