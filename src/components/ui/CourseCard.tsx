'use client';

import { Layers, Clock, BarChart2 } from "lucide-react";

export interface CourseCardProps {
  name: string;
  provider: string;
  providerLogo?: string;
  description: string;
  priority?: boolean;
  savedRoleCount: number;
  duration: string;
  modules?: number;
  level?: string;
}

export function CourseCard({
  name,
  providerLogo,
  provider,
  priority,
  savedRoleCount,
  duration,
  modules,
  level,
}: CourseCardProps) {
  return (
    <div
      data-testid="course-card"
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-soft)",
      }}
    >
      {/* Header: logo + name/provider + priority pill */}
      <div className="flex items-start gap-3">
        {providerLogo && (
          <img
            src={providerLogo}
            alt={provider}
            className="size-10 rounded-lg object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-primary)] text-base font-semibold truncate">
              {name}
            </span>
            {priority && (
              <span
                className="shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5"
                style={{
                  color: "var(--warning)",
                  backgroundColor: "color-mix(in srgb, var(--warning) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--warning) 20%, transparent)",
                }}
              >
                Priority
              </span>
            )}
          </div>
          <span className="text-[var(--text-muted)] text-[13px]">{provider}</span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-[var(--text-dim)]" />
          <span className="text-[var(--text-dim)] text-xs">{duration}</span>
        </div>
        {modules != null && (
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-[var(--text-dim)]" />
            <span className="text-[var(--text-dim)] text-xs">{modules} modules</span>
          </div>
        )}
        {level && (
          <div className="flex items-center gap-1.5">
            <BarChart2 size={13} className="text-[var(--text-dim)]" />
            <span className="text-[var(--text-dim)] text-xs">{level}</span>
          </div>
        )}
      </div>

      {/* Saved role count */}
      {savedRoleCount > 0 && (
        <span className="text-[var(--text-subtle)] text-xs">
          Appears in {savedRoleCount} of your saved roles
        </span>
      )}
    </div>
  );
}
