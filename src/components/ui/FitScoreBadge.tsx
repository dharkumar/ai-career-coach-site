'use client';

import { categorizeFit, type FitCategory } from "@/utils/categorizeFit";

interface FitScoreBadgeProps {
  score: number;
  category?: FitCategory;
  size?: number;
}

export function FitScoreBadge({ score, category, size = 47 }: FitScoreBadgeProps) {
  const fit = category ? categorizeFit(score >= 80 ? 80 : score >= 60 ? 60 : 40) : categorizeFit(score);
  const resolvedFit = category
    ? { ...fit, category, color: categorizeFit(category === "good-fit" ? 80 : category === "stretch" ? 60 : 40).color }
    : fit;

  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div data-testid="fit-score-badge" className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={resolvedFit.color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="relative font-semibold leading-none text-[var(--text-primary)]"
        style={{ fontSize: size * 0.33 }}
      >
        {score}
      </span>
    </div>
  );
}
