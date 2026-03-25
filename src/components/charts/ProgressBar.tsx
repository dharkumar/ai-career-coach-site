'use client';

interface ProgressBarProps {
  /** Percentage width 0–100. */
  percent: number;
  /** Color or gradient for the filled portion. */
  color: string;
  /** Track height class. Default "h-3". */
  heightClass?: string;
  /** Track border-radius class. Default "rounded-full". */
  radiusClass?: string;
}

export function ProgressBar({
  percent,
  color,
  heightClass = "h-3",
  radiusClass = "rounded-full",
}: ProgressBarProps) {
  return (
    <div className={`${heightClass} ${radiusClass} bg-[var(--bar-track)] overflow-hidden`}>
      <div
        className={`h-full ${radiusClass} no-lightboard bar-color transition-all duration-500`}
        style={{ width: `${percent}%`, "--_bar": color } as React.CSSProperties}
      />
    </div>
  );
}
