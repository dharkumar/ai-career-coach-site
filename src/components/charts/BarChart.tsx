'use client';

export interface BarChartItem {
  label: string;
  value: string;
  /** Percentage height 0–100 relative to the tallest bar. */
  height: number;
  color: string;
}

interface BarChartProps {
  bars: BarChartItem[];
  /** Height in px for the bar area. Default 100. */
  barHeight?: number;
}

export function BarChart({ bars, barHeight = 100 }: BarChartProps) {
  return (
    <div className="flex items-end justify-between gap-2">
      {bars.map((bar) => (
        <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[var(--text-primary)] text-xs font-bold leading-4">
            {bar.value}
          </span>
          <div className="w-full flex items-end" style={{ height: barHeight }}>
            <div
              className="w-full rounded-t-lg no-lightboard bar-color"
              style={{
                height: `${bar.height}%`,
                "--_bar": bar.color,
                minHeight: 8,
              } as React.CSSProperties}
            />
          </div>
          <span className="text-[var(--text-dim)] text-xs text-center leading-4">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}
