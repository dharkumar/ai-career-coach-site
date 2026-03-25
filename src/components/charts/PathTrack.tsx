'use client';

import { TrendingUp } from "lucide-react";

export interface PathStop {
  label: string;
  status: "completed" | "current" | "upcoming";
}

interface PathTrackProps {
  /** Label displayed next to the icon (e.g. "Career Path"). */
  label?: string;
  /** Left label below the track (e.g. "Current"). */
  fromLabel?: string;
  /** Right label below the track (e.g. target role name). */
  toLabel?: string;
  /** Progress percentage 0–100. Clamped internally. */
  percentage: number;
  /**
   * When provided, renders labeled markers along the bar instead of
   * simple fromLabel/toLabel endpoints.
   */
  stops?: PathStop[];
}

export function PathTrack({
  label = "Career Path",
  fromLabel = "Current",
  toLabel,
  percentage,
  stops,
}: PathTrackProps) {
  const progress = Math.min(100, Math.max(0, percentage));

  return (
    <div data-testid="path-track" className="flex-1  flex flex-col gap-4 ">
      <div className="flex gap-2 items-center">
        <TrendingUp size={16} className="text-[var(--accent)]" />
        <span className="text-white text-xl font-semibold">{label}</span>
      </div>

      {stops ? (
        <div className="flex flex-row">
          <div className="relative flex flex-col items-center w-full">
            <div
              className="absolute inset-y-0 left-0 rounded-full h-[5px] top-[5.5px] bg-white"
              style={{ width: "100%" }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full h-[5px] top-[5.5px]"
              style={{
                width: `${percentage}%`,
                background: "linear-gradient(to right, var(--accent-light) 40%, var(--accent))",
              }}
            />
            <div className="w-full flex flex-row justify-between">
            {stops.map((stop, i) => {
              
              const filled = stop.status === "completed" || stop.status === "current";
              const backgroundColor = i === 0 ? "bg-[--accent-light] border-[--accent-light]" : "bg-[var(--accent)] border-[var(--accent)]";
              return (
                <div
                  key={stop.label}
                  className="flex flex-col items-center justify-center gap-1"
                  
                >
                  <div
                    className={`size-4 rounded-full border-2 no-lightboard ${
                      filled
                        ? backgroundColor
                        : "bg-white border-white"
                    }`}
                  />
                  <span
                    key={stop.label}
                    className={`text-xs text-center flex-1 ${
                      stop.status === "current"
                        ? "text-[var(--accent)] font-medium"
                        : stop.status === "completed"
                          ? "text-[var(--accent-light)]"
                          : "text-[var(--text-dim)]"
                    }`}
                  >
                    {stop.label}
                  </span>
                </div>
              );
            })}
            </div>
            
          </div>
          
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative h-1 rounded-full ">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(to right, var(--accent-light) 40%, var(--accent))",
              }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--accent-light)] text-xs">
              {fromLabel}
            </span>
            {toLabel && (
              <span className="text-[var(--accent)] text-xs font-medium">
                {toLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
