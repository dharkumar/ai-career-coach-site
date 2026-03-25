'use client';

const MAX_DOTS = 10;

interface DotPlotProps {
  /** Label shown on the left (e.g. skill name). */
  label: string;
  /** Number of solid (filled) dots. */
  filled: number;
  /** Number of bordered (target gap) dots. */
  target?: number;
  /** Total dot slots. Default 10. */
  total?: number;
  /** Value displayed to the right of the dots. */
  value?: number | string;
}

export function DotPlot({
  label,
  filled,
  target = 0,
  total = MAX_DOTS,
  value,
}: DotPlotProps) {
  const f = Math.min(Math.max(0, filled), total);
  const t = Math.min(Math.max(0, target), total - f);
  const e = total - f - t;

  return (
    <div data-testid="dot-plot" className="flex items-center justify-between">
      <span className="text-white text-base flex-1 min-w-0 truncate pr-3">
        {label}
      </span>
      <div className="flex gap-1 items-center shrink-0">
        <div className="flex gap-1 items-center">
          {Array.from({ length: f }, (_, i) => (
            <div
              key={`f-${i}`}
              className="w-2 h-5 rounded-full bg-[var(--accent)] border-[var(--accent-strong)] no-lightboard"
            />
          ))}
          {Array.from({ length: t }, (_, i) => (
            <div
              key={`t-${i}`}
              className="w-2 h-5 rounded-full bg-[var(--border-card)] border border-[var(--accent-strong)]"
            />
          ))}
          {Array.from({ length: e }, (_, i) => (
            <div
              key={`e-${i}`}
              className="w-2 h-5 rounded-full bg-zinc-800 no-lightboard"
            />
          ))}
        </div>
        {value !== undefined && (
          <span className="text-[var(--text-muted)] text-base font-semibold text-center w-5 ml-2">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
