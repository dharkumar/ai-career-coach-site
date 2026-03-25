import { useEffect, useRef } from "react";

interface VoiceModel {
  addEventListener: (event: string, handler: (e: unknown) => void) => void;
  removeEventListener: (event: string, handler: (e: unknown) => void) => void;
}

interface TranscriptionEvent {
  transcript?: string;
}

type UIFrameworkWindow = Window & {
  UIFramework?: {
    getVoiceComponents?: () => { model?: VoiceModel } | null;
  };
};

const TRANSCRIPTION_EVENT = "conversation.item.input_audio_transcription.completed";
const MODEL_POLL_MS = 250;

interface UseVoiceTranscriptIntentOptions {
  enabled?: boolean;
  dedupeWindowMs?: number;
  onTranscript: (transcript: string) => void;
}

export function useVoiceTranscriptIntent({
  enabled = true,
  dedupeWindowMs = 1200,
  onTranscript,
}: UseVoiceTranscriptIntentOptions): void {
  const lastTranscriptRef = useRef<{ text: string; at: number } | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (!enabled) return;

    let cleanedUp = false;
    let attachedModel: VoiceModel | null = null;

    const onTranscription = (e: unknown) => {
      const event = e as TranscriptionEvent;
      const transcript = (event?.transcript ?? "").toLowerCase().trim();
      if (!transcript) return;

      const now = Date.now();
      const last = lastTranscriptRef.current;
      if (
        last &&
        last.text === transcript &&
        now - last.at < dedupeWindowMs
      ) {
        return;
      }

      lastTranscriptRef.current = { text: transcript, at: now };
      onTranscriptRef.current(transcript);
    };

    const tryAttach = () => {
      if (cleanedUp) return;
      const fw = (window as UIFrameworkWindow).UIFramework;
      const model = fw?.getVoiceComponents?.()?.model;
      if (!model?.addEventListener) return;
      if (model === attachedModel) return;

      if (attachedModel) {
        attachedModel.removeEventListener(TRANSCRIPTION_EVENT, onTranscription);
      }
      attachedModel = model;
      model.addEventListener(TRANSCRIPTION_EVENT, onTranscription);
    };

    tryAttach();
    const pollId = window.setInterval(tryAttach, MODEL_POLL_MS);

    return () => {
      cleanedUp = true;
      window.clearInterval(pollId);
      if (attachedModel) {
        attachedModel.removeEventListener(TRANSCRIPTION_EVENT, onTranscription);
      }
    };
  }, [enabled, dedupeWindowMs]);
}
