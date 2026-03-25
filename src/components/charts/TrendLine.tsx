'use client';

interface TrendPoint {
  month: string;
  score: number;
}

interface TrendLineProps {
  data: TrendPoint[];
  /** SVG height in px. Default 60. */
  height?: number;
  /** Stroke color. Default var(--accent). */
  color?: string;
  /** Show month labels below the line. Default false. */
  showLabels?: boolean;
}

/**
 * Minimal SVG sparkline for 6-month trend data.
 * Renders a polyline with an optional gradient fill beneath it.
 */
export function TrendLine({
  data,
  height = 60,
  color = "var(--accent)",
  showLabels = false,
}: TrendLineProps) {
  if (data.length < 2) return null;

  const scores = data.map((d) => d.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const width = 200;
  const padY = 6;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padY + chartH - ((d.score - min) / range) * chartH;
    return `${x},${y}`;
  });

  const gradId = `trend-fill-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points.join(" ")} ${width},${height}`}
          fill={`url(#${gradId})`}
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showLabels && (
        <div className="flex justify-between px-0.5">
          {data.map((d) => (
            <span key={d.month} className="text-[10px] text-[var(--text-dim)]">
              {d.month}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
