'use client';

import { motion } from "motion/react";

const LinkedInIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="8" fill="var(--linkedin)" />
    <path
      d="M11 16H15V29H11V16ZM13 14.5C11.9 14.5 11 13.6 11 12.5C11 11.4 11.9 10.5 13 10.5C14.1 10.5 15 11.4 15 12.5C15 13.6 14.1 14.5 13 14.5Z"
      fill="white"
    />
    <path
      d="M18 16H21.8V17.8C22.5 16.7 23.9 16 25.4 16C28.8 16 30 18.2 30 21.4V29H26V22.4C26 20.8 25.6 19.6 24 19.6C22.4 19.6 21.8 20.8 21.8 22.4V29H18V16Z"
      fill="white"
    />
  </svg>
);

const PulsingRing = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute rounded-full border border-[var(--linkedin)]/30"
    style={{ inset: 0 }}
    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
    transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeOut" }}
  />
);

interface LoadingLinkedInProps {
  /** Label shown below the animation. */
  message?: string;
}

/**
 * LinkedIn-branded visual loading screen.
 *
 * Pure UI — no MCP calls. The Runtime Agent (LLM) calls
 * find_candidate → get_candidate directly via the Mobeus console MCP
 * connection for this phase, then navigates to CandidateSheet when done.
 *
 * This template is shown immediately after the user taps "Continue with LinkedIn"
 * and stays visible while the LLM's tool calls execute in the background.
 */
export function LoadingLinkedIn({
  message = "Connecting with LinkedIn…",
}: LoadingLinkedInProps) {
  return (
    <motion.div
      data-testid="loading-linkedin"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex items-center justify-center"
      style={{ paddingBottom: 96 }}
    >
      <div className="w-96 h-80 relative rounded-lg btn-secondary overflow-hidden flex items-center justify-center">
        <div
          data-testid="loading-linkedin-loading"
          className="flex flex-col items-center gap-6"
        >
          <div className="relative w-20 h-20 flex items-center justify-center">
            <PulsingRing delay={0} />
            <PulsingRing delay={0.6} />
            <PulsingRing delay={1.2} />
            <div className="relative z-10">
              <LinkedInIcon />
            </div>
          </div>
          <p
            data-testid="loading-linkedin-message"
            className="text-[var(--text-muted)] text-base text-center px-10 leading-relaxed"
          >
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
