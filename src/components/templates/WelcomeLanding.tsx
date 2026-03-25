'use client';

import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useTeleState } from "@/hooks/useTeleState";
import { getVisitorSession } from "@/utils/visitorMemory";

/**
 * Initial app state shown before the Runtime Agent connects.
 * Provides the visual shell — the background, glow, and BottomNav all live
 * in BaseLayout, so this component only renders the pre-connect hint text.
 *
 * The AI immediately replaces this with GlassmorphicOptions on first connection.
 */
export function WelcomeLanding() {
  const { connected } = useTeleState();

  useSpeechFallbackNudge({
    enabled: connected && !getVisitorSession(),
    requiredPhrases: ["ready", "journey", "?"],
    matchMode: "any",
    instruction:
      "[SYSTEM] WelcomeLanding is still visible after connect. Execute Step 1 (Greeting) now: speak 'Are you ready to start your journey?' and call navigateToSection with the greeting payload.",
    delayMs: 2800,
  });

  return (
    <div
      data-testid="welcome-landing"
      className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none"
      style={{
        paddingBottom:
          "calc(6.5rem + env(safe-area-inset-bottom, 0px) + var(--vv-bottom-inset, 0px))",
      }}
    >
      
    </div>
  );
}
