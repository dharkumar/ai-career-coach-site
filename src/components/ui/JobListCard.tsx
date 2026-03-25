'use client';

import { MapPin, TrendingUp } from "lucide-react";
import { FitScoreBadge } from "@/components/ui/FitScoreBadge";
import { FitCategoryPill } from "@/components/ui/FitCategoryPill";
import type { FitCategory } from "@/utils/categorizeFit";

const SalaryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path
      d="M12 3v18M16.5 6.5H9.75a3 3 0 0 0 0 6h4.5a3 3 0 0 1 0 6H7"
      stroke="var(--text-muted)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface JobListCardProps {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salaryRange: string;
  matchScore: number;
  fitCategory: FitCategory;
  aiSummary: string;
  aiGapInsight?: string;
  postedAt?: string;
  onClick: () => void;
}

export function JobListCard({
  title,
  company,
  companyLogo,
  location,
  salaryRange,
  matchScore,
  fitCategory,
  aiSummary,
  aiGapInsight,
  postedAt,
  onClick,
}: JobListCardProps) {
  return (
    <button
      data-testid="job-list-card"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-[var(--surface-elevated)] p-4 flex flex-col gap-6 transition-all active:scale-[0.98]"
    >
      {/* Top section: header + meta */}
      <div className="flex flex-col gap-4">
        {/* Header row: logo + title/company + fit score */}
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-[var(--surface-elevated)] overflow-hidden shrink-0 flex items-center justify-center">
            {companyLogo ? (
              <img src={companyLogo} alt={company} className="w-full h-full object-contain" />
            ) : (
              <span className="text-base font-bold text-[var(--text-muted)]">{company.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-[18px] font-bold leading-[27px] truncate">
              {title}
            </p>
            <p className="text-[var(--text-secondary)] text-sm font-medium leading-5">{company}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[var(--text-label)] text-[11px] leading-[16.5px] tracking-[0.065px]">Fit Score</span>
            <FitScoreBadge score={matchScore} category={fitCategory} />
          </div>
        </div>

        {/* Meta: salary, location, fit pill */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <SalaryIcon />
              <span className="text-[var(--text-secondary)] text-sm">{salaryRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={24} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-[var(--text-secondary)] text-sm">{location}</span>
            </div>
          </div>
          <FitCategoryPill category={fitCategory} />
        </div>
      </div>

      {/* Gap insight callout (stretch / grow-into only) */}
      {aiGapInsight && fitCategory !== "good-fit" && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: fitCategory === "stretch"
              ? "color-mix(in srgb, var(--fit-stretch) 8%, transparent)"
              : "color-mix(in srgb, var(--fit-grow) 8%, transparent)",
            border: fitCategory === "stretch"
              ? "1px solid color-mix(in srgb, var(--fit-stretch) 20%, transparent)"
              : "1px solid color-mix(in srgb, var(--fit-grow) 20%, transparent)",
          }}
        >
          <TrendingUp
            size={16}
            className="shrink-0 mt-0.5"
            style={{ color: fitCategory === "stretch" ? "var(--fit-stretch)" : "var(--fit-grow)" }}
          />
          <span className="text-xs leading-[18px]" style={{ color: fitCategory === "stretch" ? "var(--fit-stretch-light)" : "var(--fit-grow-light)" }}>
            {aiGapInsight}
          </span>
        </div>
      )}

      {/* AI Summary */}
      <p className="text-[var(--text-primary)] text-sm leading-5 line-clamp-3">{aiSummary}</p>

      {/* Footer */}
      {postedAt && <span className="text-[var(--text-label)] text-xs font-medium">{postedAt}</span>}
    </button>
  );
}
