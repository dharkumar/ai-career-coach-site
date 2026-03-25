'use client';

import { useMemo } from "react";
import { useVoiceActions } from "@/hooks/useVoiceActions";

interface ViewFullDetailsButtonProps {
  onClick: () => void;
}

/**
 * Glass-pill CTA matching Figma node 3229:29207.
 * Responds to both tap and voice ("view full details", "full details", etc.).
 */
export function ViewFullDetailsButton({ onClick }: ViewFullDetailsButtonProps) {
  useVoiceActions(
    useMemo(
      () => [
        {
          phrases: ["view full details", "full details", "see details", "more details"],
          action: onClick,
        },
      ],
      [onClick],
    ),
  );

  return (
    <button
      onClick={onClick}
      className="self-start px-4 py-3 rounded-3xl text-base font-normal leading-5 text-[var(--text-secondary)] text-center glass-surface transition-all duration-200 active:scale-95 hover:opacity-90"
    >
      View Full Details
    </button>
  );
}
