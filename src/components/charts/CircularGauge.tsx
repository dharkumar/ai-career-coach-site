'use client';

import { ChevronUp } from "lucide-react";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 251.33

const ACCENT_STROKE: Record<"green" | "amber" | "red", string> = {
  green: "#4ade80",
  amber: "#f59e0b",
  red: "#f87171",
};

interface CircularGaugeProps {
  /**
   * Percentage value 0–100.
   *   – ≥ 75 → green ring (#1dc558)
   *   – < 75  → yellow ring (#f59e0b)
   *
   * Omit to render the Career Velocity state: full green ring
   * with three stacked upward chevrons instead of a number.
   */
  percentage?: number;
  /** Outer diameter in px. Default: 98. */
  size?: number;
  /** When set, overrides default green/amber split for the progress arc. */
  accent?: "green" | "amber" | "red";
}

/**
 * Reusable SVG donut-ring gauge.
 *
 * Color rules (Figma nodes 719:6952 – profile card metrics):
 *   - Green  (#1dc558) when percentage ≥ 75
 *   - Yellow (#f59e0b) when percentage < 75
 *   - Velocity mode (no percentage): full green ring + 3× ChevronUp icons
 *
 * Usage:
 *   <CircularGauge percentage={84} />          → green, "84%"
 *   <CircularGauge percentage={63} />          → yellow, "63%"
 *   <CircularGauge />                          → Career Velocity display
 */
export function CircularGauge({ percentage, size = 98, accent }: CircularGaugeProps) {
  const isVelocity = percentage === undefined;
  const color = isVelocity
    ? "#4ade80"
    : accent
      ? ACCENT_STROKE[accent]
      : percentage >= 75
        ? "#4ade80"
        : "var(--warning)";
  const dashOffset = isVelocity
    ? 0
    : CIRCUMFERENCE * (1 - percentage / 100);

  return (
    <div
      data-testid="circular-gauge"
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/* SVG ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="absolute inset-0"
        aria-hidden="true"
      >
        {/* Track — always full dark ring */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--surface-muted)"
          strokeWidth="10"
        />
        {/* Coloured progress arc (or full ring for velocity) */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap={isVelocity ? undefined : "round"}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex items-center justify-center">
        {isVelocity ? (
          /* 3 stacked upward chevrons — Career Velocity indicator */
          <div className="flex flex-col items-center" style={{ gap: -4 }}>
            <ChevronUp size={13} className="text-[var(--text-primary)] opacity-50" />
            <ChevronUp size={13} className="text-[var(--text-primary)] opacity-75" />
            <ChevronUp size={13} className="text-[var(--text-primary)]" />
          </div>
        ) : (
          <span
            className="text-[var(--text-primary)] font-semibold leading-none"
            style={{ fontSize: 18 }}
          >
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
}
