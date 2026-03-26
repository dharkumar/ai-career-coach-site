'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

const DEV_TOOLBAR_HOST = process.env.NEXT_PUBLIC_DEV_TOOLBAR_HOST as string | undefined;

function getFramework(): Record<string, unknown> | null {
  return (window as unknown as Record<string, unknown>).UIFramework as Record<string, unknown> | null;
}

export function DevToolbar() {
  const [micMuted, setMicMuted] = useState(false);
  const [teleMuted, setTeleMuted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const muteLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if in dev mode after hydration to avoid mismatch
  useEffect(() => {
    const isDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      (!!DEV_TOOLBAR_HOST && window.location.hostname === DEV_TOOLBAR_HOST);
    setIsClient(isDev);
  }, []);

  const sweepAudioElements = useCallback((muted: boolean) => {
    document.querySelectorAll("audio, video").forEach((el) => {
      (el as HTMLMediaElement).muted = muted;
      (el as HTMLMediaElement).volume = muted ? 0 : 1;
    });
  }, []);

  const handleToggleMic = useCallback(() => {
    const fw = getFramework();
    if (typeof fw?.toggleMute === "function") (fw.toggleMute as () => void)();
    setMicMuted((prev) => !prev);
  }, []);

  const handleToggleTele = useCallback(() => {
    const fw = getFramework();
    const next = !teleMuted;

    if (typeof fw?.setAvatarVideoMuted === "function")
      (fw.setAvatarVideoMuted as (v: boolean) => void)(next);
    if (typeof fw?.setAvatarVolume === "function")
      (fw.setAvatarVolume as (v: number) => void)(next ? 0 : 1);

    sweepAudioElements(next);
    setTeleMuted(next);
  }, [teleMuted, sweepAudioElements]);

  useEffect(() => {
    if (teleMuted) {
      sweepAudioElements(true);
      muteLoopRef.current = setInterval(() => sweepAudioElements(true), 500);
    } else if (muteLoopRef.current) {
      clearInterval(muteLoopRef.current);
      muteLoopRef.current = null;
    }
    return () => {
      if (muteLoopRef.current) clearInterval(muteLoopRef.current);
    };
  }, [teleMuted, sweepAudioElements]);

  if (!isClient) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleMic}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: micMuted ? "var(--error-surface)" : "var(--glass-btn)",
          border: micMuted ? "1px solid var(--error-border)" : "1px solid var(--glass-btn-border)",
        }}
        title={micMuted ? "Unmute mic" : "Mute mic"}
      >
        {micMuted ? (
          <MicOff size={14} className="text-red-400" />
        ) : (
          <Mic size={14} className="text-white/50" />
        )}
      </button>

      <button
        onClick={handleToggleTele}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: teleMuted ? "var(--error-surface)" : "var(--glass-btn)",
          border: teleMuted ? "1px solid var(--error-border)" : "1px solid var(--glass-btn-border)",
        }}
        title={teleMuted ? "Unmute Tele" : "Mute Tele"}
      >
        {teleMuted ? (
          <VolumeX size={14} className="text-red-400" />
        ) : (
          <Volume2 size={14} className="text-white/50" />
        )}
      </button>
    </div>
  );
}
