'use client';

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { teleState } from "@/lib/teleState";
import type { TeleConnectionState, TeleActiveMode } from "@/lib/teleState";
import { resolveUIModeFromTeleMode, setUIMode } from "@/lib/designSystem";
import { getVisitorSession } from "@/utils/visitorMemory";
import { speakAvatar, teleAcknowledge } from "@/utils/teleUtils";

interface BottomNavProps {
  /** Sent to Tele via TellTele() after voice connects. */
  greetingPrompt?: string;
  className?: string;
}

/* ── Inline SVGs matching Figma icons ──────────────────────────────────── */

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.5 L13.6 6.8 L19 8 L13.6 9.2 L12 14.5 L10.4 9.2 L5 8 L10.4 6.8 Z" />
    <path d="M5 15 L5.9 17.6 L8.5 18.5 L5.9 19.4 L5 22 L4.1 19.4 L1.5 18.5 L4.1 17.6 Z" opacity="0.7" />
    <path d="M19 12.5 L19.7 14.6 L21.8 15.3 L19.7 16 L19 18.1 L18.3 16 L16.2 15.3 L18.3 14.6 Z" opacity="0.5" />
  </svg>
);

const SoundwaveIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <rect x="2"  y="9"  width="2.5" height="6"  rx="1.25" opacity="0.45" />
    <rect x="6"  y="6"  width="2.5" height="12" rx="1.25" opacity="0.65" />
    <rect x="10" y="3"  width="2.5" height="18" rx="1.25" />
    <rect x="14" y="6"  width="2.5" height="12" rx="1.25" opacity="0.65" />
    <rect x="18" y="9"  width="2.5" height="6"  rx="1.25" opacity="0.45" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4C2.9 2 2 2.9 2 4V18L6 14H20C21.1 14 22 13.1 22 12V4C22 2.9 21.1 2 20 2Z" opacity="0.8" />
  </svg>
);


/** Write state to the singleton and dispatch the connection event. */
function syncTeleState(
  connectionState: TeleConnectionState,
  activeMode: TeleActiveMode,
  connected: boolean
) {
  teleState.connectionState = connectionState;
  teleState.activeMode = activeMode;
  teleState.connected = connected;
  window.dispatchEvent(
    new CustomEvent("tele-connection-changed", { detail: { connected } })
  );
  window.dispatchEvent(
    new CustomEvent("tele-mode-changed", { detail: { activeMode } })
  );
}

async function disconnectTele() {
  const fw = (window as any).UIFramework;
  if (!fw) return;
  try {
    // Per UIFramework API: disconnectOpenAI (voice) and disconnectAvatar
    if (typeof fw.disconnectOpenAI === "function") await fw.disconnectOpenAI();
    if (typeof fw.disconnectAvatar === "function") await fw.disconnectAvatar();
  } catch (e) {
    console.warn("[BottomNav] Disconnect error (non-fatal):", e);
  }
}

async function connectTele(
  greetingPrompt?: string,
  onAvatarReady?: () => void
) {
  // 1. Wait up to 5 s for CDN script to load
  let attempts = 0;
  while (!(window as any).UIFramework && attempts < 50) {
    await new Promise((r) => setTimeout(r, 100));
    attempts++;
  }

  const fw = (window as any).UIFramework;
  if (!fw) {
    console.warn("[BottomNav] UIFramework not available after 5s");
    return;
  }

  // 2. Start connection (avatar stream + voice AI)
  if (typeof fw.connectAll === "function") {
    await fw.connectAll();
  } else if (typeof fw.connectOpenAI === "function") {
    await fw.connectOpenAI();
  } else if (typeof fw.connect === "function") {
    await fw.connect();
  }

  const pollMs = 400;
  const pollMax = 30;
  const avatarConnected = () =>
    fw.instance?.avatarController?.isConnected?.() === true;
  const voiceConnected = () =>
    fw.getVoiceChatState?.()?.connectionState?.isConnected === true;

  // 3. Wait for LiveKit / HeyGen avatar, then welcome line (needs video path up).
  for (let i = 0; i < pollMax; i++) {
    if (avatarConnected()) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }

  // 4. Hide static avatar (Magic.png) before live avatar speaks.
  onAvatarReady?.();

  const session = getVisitorSession();
  const welcomeText = session
    ? "Welcome back!"
    : "Welcome to train, I am your AI career companion";

  if (welcomeText && avatarConnected()) {
    await new Promise((r) => setTimeout(r, 500));
    await speakAvatar(welcomeText, { ensureConnected: true });
  } else if (!welcomeText) {
    // Returning visitor — skip bridge greeting; the AI will handle the full welcome.
  } else {
    console.warn(
      "[BottomNav] Avatar not connected after wait; skipping speakAvatar welcome"
    );
  }

  // 5. Wait for OpenAI voice; teleAcknowledge must run only after both are live.
  for (let i = 0; i < pollMax; i++) {
    if (voiceConnected()) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }

  if (!voiceConnected()) {
    console.warn(
      "[BottomNav] Voice not connected after wait; teleAcknowledge may be unreliable"
    );
  }

  // 6. Brief delay so the Realtime session (prompt + tools) is ready after voice reports connected.
  await new Promise((r) => setTimeout(r, 1200));
  if (!fw.teleAcknowledge) {
    console.warn("[BottomNav] teleAcknowledge not available");
    return;
  }
  const ENGLISH_GATE = "[SYSTEM] Respond ONLY in English. Never switch language. ";
  const prompt = session
    ? ENGLISH_GATE +
      `Returning visitor detected. candidate_id: ${session.candidateId}. ` +
      "Candidate data has been pre-loaded by the frontend. " +
      'Say "Here\'s your profile." and call navigateToSection immediately with EXACTLY this JSON: ' +
      '{"badge":"trAIn CAREER","title":"Dashboard","subtitle":"Your Profile",' +
      '"generativeSubsections":[{"id":"dashboard","templateId":"Dashboard","props":{}},' +
      '{"id":"profile-home","templateId":"ProfileSheet","props":{"dashboardAnchor":true}}]}. ' +
      "Do NOT call fetchCandidate, fetchJobs, or fetchSkills now — they are deferred. " +
      "Skip qualification and registration."
    : ENGLISH_GATE +
      (greetingPrompt ??
        'Say "Are you ready to start your journey?" and call navigateToSection once with EXACTLY this JSON so the bubbles appear: ' +
        '{"badge":"MOBEUS CAREER","title":"Welcome","subtitle":"Getting started",' +
        '"generativeSubsections":[{"id":"start","templateId":"GlassmorphicOptions","props":{"bubbles":[' +
        '{"label":"Yes, I\'m ready"},{"label":"Not just yet"},{"label":"Tell me more"}]}}]}. ' +
        "HARD STOP after that navigateToSection: your turn is DONE. " +
        "Do NOT generate any more speech, audio, or tool calls. " +
        "Do NOT ask the industry question or mention any future step. " +
        "Wait ONLY for `user selected:` from TellTele."
      );
  teleAcknowledge(prompt);
}

async function connectVoiceOnly(): Promise<boolean> {
  const fw = (window as any).UIFramework;
  if (!fw) return false;
  try {
    if (typeof fw.connectOpenAI === "function") {
      await fw.connectOpenAI();
      return true;
    }
    if (typeof fw.startVoiceChat === "function") {
      await fw.startVoiceChat();
      return true;
    }
  } catch (e) {
    console.warn("[BottomNav] connectVoiceOnly error:", e);
  }
  return false;
}

/** Layout from Figma Design System — Bottom Nav (6958:15887); 168×40, px-4 py-2, 56px active capsule */
const ACTIVE_CAPSULE_W = 56;
const ACTIVE_CAPSULE_LEFT: Record<"tele" | "voice" | "chat", number> = {
  tele: 0,
  voice: 55,
  chat: 112,
};

export function BottomNav({ greetingPrompt, className = "" }: BottomNavProps) {
  // Read initial state from singleton so remounts (phase changes) preserve state.
  const [connectionState, setConnectionState] = useState<TeleConnectionState>(
    () => teleState.connectionState
  );
  const [activeMode, setActiveMode] = useState<TeleActiveMode>(
    () => teleState.activeMode
  );

  /** Update both local state and the module singleton, then dispatch event. */
  const applyState = (
    cs: TeleConnectionState,
    am: TeleActiveMode,
    connected: boolean
  ) => {
    setConnectionState(cs);
    setActiveMode(am);
    syncTeleState(cs, am, connected);
    setUIMode(resolveUIModeFromTeleMode(am));
  };

  const handleTeleButton = async () => {
    if (connectionState === "connecting") return;

    if (connectionState === "connected") {
      if (activeMode === "tele") {
        await disconnectTele();
        applyState("idle", "none", false);
      } else {
        applyState("connected", "tele", true);
      }
      return;
    }

    applyState("connecting", "tele", false);
    try {
      await connectTele(greetingPrompt, () =>
        applyState("connected", "tele", true)
      );
    } catch {
      applyState("idle", "none", false);
    }
  };

  const handleVoiceButton = async () => {
    if (connectionState === "connecting") return;

    if (connectionState === "connected") {
      if (activeMode === "voice") {
        await disconnectTele();
        applyState("idle", "none", false);
      } else {
        applyState("connected", "voice", true);
      }
      return;
    }

    applyState("connecting", "voice", false);
    try {
      const ok = await connectVoiceOnly();
      applyState(ok ? "connected" : "idle", ok ? "voice" : "none", ok);
    } catch {
      applyState("idle", "none", false);
    }
  };

  const handleChatButton = async () => {
    if (connectionState === "connecting") return;

    if (connectionState === "connected") {
      if (activeMode === "chat") {
        await disconnectTele();
        applyState("idle", "none", false);
      } else {
        applyState("connected", "chat", true);
      }
      return;
    }

    applyState("connecting", "chat", false);
    try {
      const ok = await connectVoiceOnly();
      applyState(ok ? "connected" : "idle", ok ? "chat" : "none", ok);
    } catch {
      applyState("idle", "none", false);
    }
  };

  const connected = connectionState === "connected";
  const teleActive = activeMode === "tele" && connected;
  const voiceActive = activeMode === "voice" && connected;
  const chatActive = activeMode === "chat" && connected;
  const inactiveIcon = "text-[var(--text-bottom-nav-icon-muted)]";

  const showActiveCapsule =
    connected && (activeMode === "tele" || activeMode === "voice" || activeMode === "chat");
  const activeCapsuleLeft =
    activeMode === "tele" || activeMode === "voice" || activeMode === "chat"
      ? ACTIVE_CAPSULE_LEFT[activeMode]
      : 0;

  return (
    <div data-testid="bottom-nav" className={cn("relative h-10 w-[168px]", className)}>

      {/* Base pill — Figma: surface #18181b, border #27272a, soft white outer glow */}
      <div
        data-testid="bottom-nav-pill"
        className={cn(
          "absolute inset-0 flex items-center justify-between rounded-[100px] px-4 py-2",
          "bg-[var(--surface-card)] border border-[var(--border-card)] [box-shadow:var(--shadow-bottom-nav-pill)]",
        )}
      >
        {/* Button 1: Tele (avatar + voice) */}
        <button
          data-testid="bottom-nav-tele-btn"
          onClick={handleTeleButton}
          disabled={connectionState === "connecting"}
          className={cn(
            "relative z-[1] flex size-6 items-center justify-center transition-colors",
            teleActive ? "text-[var(--accent-strong)]" : inactiveIcon,
          )}
          aria-label={connected ? "Disconnect Tele" : "Connect Tele"}
        >
          {connectionState === "connecting" ? (
            <Loader2 size={18} className="animate-spin text-[var(--accent-strong)]" />
          ) : teleActive ? (
            <X size={18} className="text-[var(--accent-strong)]" />
          ) : (
            <SparklesIcon />
          )}
        </button>

        {/* Button 2: Voice only */}
        <button
          data-testid="bottom-nav-voice-btn"
          onClick={handleVoiceButton}
          disabled={connectionState === "connecting"}
          className={cn(
            "absolute z-[1] flex size-6 items-center justify-center transition-colors",
            voiceActive ? "text-[var(--accent-strong)]" : inactiveIcon,
          )}
          style={{ left: 71, top: 7 }}
          aria-label={voiceActive ? "Disconnect voice" : "Voice only"}
        >
          <SoundwaveIcon />
        </button>

        {/* Button 3: Chat */}
        <button
          data-testid="bottom-nav-chat-btn"
          onClick={handleChatButton}
          disabled={connectionState === "connecting"}
          className={cn(
            "relative z-[1] flex size-6 items-center justify-center transition-colors",
            chatActive ? "text-[var(--accent-strong)]" : inactiveIcon,
          )}
          aria-label={chatActive ? "Disconnect chat" : "Chat"}
        >
          <ChatIcon />
        </button>
      </div>

      {/* Active capsule — Figma SelectedToggleItem: #1c1c1e fill, #1ed25e border + green glow */}
      {showActiveCapsule && (
        <div
          data-testid="bottom-nav-connected-glow"
          className={cn(
            "pointer-events-none absolute top-0 z-[2] flex h-full items-center justify-center rounded-[100px] py-2",
            "border border-[var(--accent-strong)] bg-[var(--surface-bottom-nav-capsule)]",
            "shadow-[0px_0px_8px_0px_var(--accent-strong)]",
            "transition-[left] duration-200 ease-out",
          )}
          style={{ left: activeCapsuleLeft, width: ACTIVE_CAPSULE_W }}
        >
          {activeMode === "tele" && <X size={18} className="text-[var(--accent-strong)]" />}
          {activeMode === "voice" && (
            <SoundwaveIcon className="size-6 text-[var(--accent-strong)]" />
          )}
          {activeMode === "chat" && <ChatIcon className="size-6 text-[var(--accent-strong)]" />}
        </div>
      )}

      {/* Connecting indicator */}
      {connectionState === "connecting" && (
        <div
          data-testid="bottom-nav-connecting-indicator"
          className={cn(
            "pointer-events-none absolute left-0 top-0 z-[3] flex h-full items-center justify-center rounded-[100px] py-2",
            "border border-[var(--border-accent-soft)] bg-[var(--surface-bottom-nav-capsule)]",
          )}
          style={{ width: ACTIVE_CAPSULE_W }}
        >
          <Loader2 size={18} className="animate-spin text-[var(--accent-strong)]" />
        </div>
      )}
    </div>
  );
}
