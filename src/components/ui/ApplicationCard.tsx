'use client';

import { Clock, AlertTriangle } from "lucide-react";
import { APPLICATION_STAGES, type JobApplication } from "@/mocks/jobApplicationData";

interface ApplicationCardProps {
  application: JobApplication;
  onClick?: () => void;
}

export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const { jobTitle, company, companyLogo, stageIndex, statusLabel, statusDetail, alert } =
    application;

  const hasAlert = !!alert;
  const statusColor = hasAlert
    ? "var(--warning)"
    : stageIndex === 0
      ? "var(--accent)"
      : "var(--fit-stretch)";

  return (
    <button
      data-testid="application-card"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] p-4 flex flex-col gap-3 transition-all active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-[var(--surface-elevated)] overflow-hidden shrink-0 flex items-center justify-center">
          {companyLogo ? (
            <img src={companyLogo} alt={company} className="w-full h-full object-contain" />
          ) : (
            <span className="text-base font-bold text-[var(--text-muted)]">{company.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-base font-semibold leading-[22px] truncate">
            {jobTitle}
          </p>
          <p className="text-[var(--text-muted)] text-sm leading-5">{company}</p>
        </div>
      </div>

      {/* Pipeline progress bar — segments only, no labels */}
      <div className="flex gap-1.5">
        {APPLICATION_STAGES.map((stage, i) => (
          <div
            key={stage}
            className="flex-1 h-[5px] rounded-full"
            style={{
              backgroundColor:
                i <= stageIndex ? statusColor : "var(--border-card)",
            }}
          />
        ))}
      </div>

      {/* Status badge — full-width pill with icon */}
      <div
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          backgroundColor: `color-mix(in srgb, ${statusColor} 10%, transparent)`,
        }}
      >
        {hasAlert ? (
          <AlertTriangle size={14} style={{ color: statusColor }} className="shrink-0" />
        ) : (
          <Clock size={14} style={{ color: statusColor }} className="shrink-0" />
        )}
        <span
          className="text-[13px] font-medium leading-[18px]"
          style={{ color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Detail */}
      <p className="text-[var(--text-subtle)] text-[13px] leading-[19px]">{statusDetail}</p>
    </button>
  );
}
