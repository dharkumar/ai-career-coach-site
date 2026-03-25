'use client';

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";
import { notifyTele } from "@/utils/teleUtils";
import { useCurrentSection } from "@/contexts/CurrentSectionContext";

const PersonShieldIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="7" r="3.5" stroke="var(--text-primary)" strokeWidth="1.5" />
    <path
      d="M4 19c0-3.314 3.582-6 8-6"
      stroke="var(--text-primary)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="18" cy="18" r="4" fill="var(--bg)" />
    <path
      d="M18 15.5v5M15.5 18h5"
      stroke="var(--text-primary)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Persistent top-left profile button (Figma 719:6374 normal / 719:6366 active).
 *
 * Sends `user clicked: profile` to Tele. On dashboard home the profile card is
 * already visible — the agent should acknowledge rather than navigate to bubbles.
 *
 * Pulses with a green glow when the avatar says "Tap this icon…".
 */
export function DashboardBtn() {
  const [active, setActive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggeredSpeechRef = useRef<string | null>(null);
  const { speech, isTalking } = useTeleSpeech();
  const { currentTemplateId } = useCurrentSection();

  useEffect(() => {
    const spoken = (speech ?? "").trim();
    const normalized = spoken.toLowerCase();
    const triggerPhrase = "tap this icon to access it at any time.";

    if (!isTalking || !spoken || !normalized.includes(triggerPhrase)) return;
    if (lastTriggeredSpeechRef.current === spoken) return;

    lastTriggeredSpeechRef.current = spoken;
    setPulse(true);

    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), 3200);
  }, [speech, isTalking]);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    void notifyTele("user clicked: profile");
  };

  return (
    <button
      data-testid="dashboard-profile-btn"
      onClick={handleClick}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      className="absolute pointer-events-auto transition-all duration-200 active:scale-95 top-4 left-4"
      style={{ zIndex: 100 }}
      aria-label="Go to dashboard"
    >
      <motion.div
        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300"
        animate={
          pulse
            ? {
                scale: [1, 1.06, 1],
                boxShadow: [
                  "0px 0px 8px 0px var(--accent-strong)",
                  "0px 0px 24px 2px var(--accent-strong)",
                  "0px 0px 8px 0px var(--accent-strong)",
                ],
              }
            : {
                scale: 1,
                boxShadow: active
                  ? "0px 0px 20px 0px var(--accent-strong)"
                  : "0px 0px 0px 0px transparent",
              }
        }
        transition={
          pulse
            ? { duration: 1.1, repeat: 2, ease: "easeInOut" }
            : { duration: 0.4, ease: "easeOut" }
        }
        style={{
          background: "var(--surface-muted)",
          border: `1px solid ${
            pulse || active ? "var(--accent-strong)" : "var(--border-strong)"
          }`,
        }}
      >
        <PersonShieldIcon />
      </motion.div>
    </button>
  );
}
