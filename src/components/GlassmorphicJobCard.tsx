'use client';

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobListing } from "@/types/flow";
import { FitScoreBadge } from "@/components/ui/FitScoreBadge";
import { FitCategoryPill } from "@/components/ui/FitCategoryPill";
import { categorizeFit } from "@/utils/categorizeFit";

const SaudiRiyalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--text-secondary)]">
    <text x="12" y="17" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="Arial">
      ﷼
    </text>
  </svg>
);

interface GlassmorphicJobCardProps {
  job: JobListing;
  isHighlighted?: boolean;
  className?: string;
}

export function GlassmorphicJobCard({
  job,
  isHighlighted = false,
  className,
}: GlassmorphicJobCardProps) {
  return (
    <div
      data-testid={`job-card-${job.id}`}
      className={cn(
        "relative w-full rounded-[16px] flex flex-col gap-4 items-start justify-center overflow-hidden top-sheen",
        "p-8",
        isHighlighted
          ? "glass-card-active"
          : [
              "border border-[var(--border-soft)] backdrop-blur-[29px] [-webkit-backdrop-filter:blur(29px)]",
              "bg-[var(--surface-elevated)] [box-shadow:var(--glass-shadow)]",
            ],
        className
      )}
    >
      {/* Design: Figma Design System — Glassmorphic Job Card (6958:15579) */}
      <div className="relative z-10 flex gap-4 items-start justify-between w-full">
          <div className="flex gap-3 items-center min-w-0 flex-1 min-h-[47px]">
            <div
              data-testid="job-card-logo"
              className="size-10 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            >
              {job.companyLogo ? (
                <img
                  src={job.companyLogo}
                  alt={job.company}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-base font-bold text-zinc-700">
                  {job.company.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1 h-[47px] justify-center">
              <p
                data-testid="job-card-title"
                className="text-[18px] font-bold leading-[27px] text-[#f0f4f2] truncate w-full"
              >
                {job.title}
              </p>
              <p
                data-testid="job-card-company"
                className="text-sm font-medium leading-5 text-white truncate w-full"
              >
                {job.company}
              </p>
            </div>
          </div>
          {job.matchScore != null && (
            <div className="flex gap-2 items-center shrink-0 self-center">
              <span className="text-[11px] font-medium leading-[16.5px] text-[#9f9faa] whitespace-nowrap">
                Fit Score
              </span>
              <FitScoreBadge score={job.matchScore} category={job.fitCategory} size={47} />
            </div>
          )}
        </div>

      <div className="relative z-10 flex items-center justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 items-start min-w-0">
          {job.salaryRange && (
            <div data-testid="job-card-salary" className="flex gap-2 items-center">
              <SaudiRiyalIcon />
              <span className="text-base font-normal leading-6 text-[var(--text-secondary)] whitespace-nowrap">
                {job.salaryRange}
              </span>
            </div>
          )}
          {job.location && (
            <div data-testid="job-card-location" className="flex gap-2 items-center">
              <MapPin size={24} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-base font-normal leading-6 text-[var(--text-secondary)] whitespace-nowrap">
                {job.location}
              </span>
            </div>
          )}
        </div>
        {(job.fitCategory ?? (job.matchScore != null ? categorizeFit(job.matchScore).category : null)) && (
          <FitCategoryPill
            category={job.fitCategory ?? categorizeFit(job.matchScore!).category}
          />
        )}
      </div>
    </div>
  );
}
