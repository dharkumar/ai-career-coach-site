'use client';

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { pastApplications, type JobApplication } from "@/mocks/jobApplicationData";
import { notifyTele } from "@/utils/teleUtils";
import { ApplicationSheetLayout } from "../ApplicationSheetLayout";

interface PastApplicationsSheetProps {
  applications?: JobApplication[];
}

export function PastApplicationsSheet({
  applications: propApps,
}: PastApplicationsSheetProps) {
  const applications = propApps ?? pastApplications;

  const nudgeInstruction = useMemo(() => {
    const lines = applications
      .map(
        (a) =>
          `- ${a.jobTitle} at ${a.company} — ${a.statusLabel}. ${a.statusDetail}${a.aiInsight ? ` Insight: ${a.aiInsight}` : ""}`,
      )
      .join("\n");
    return (
      "[SYSTEM] PastApplicationsSheet is now visible. Here are the past applications:\n" +
      lines +
      '\nSay: "Here are your past applications and what you can learn from them." Then briefly summarize each. Do NOT call search_jobs.'
    );
  }, [applications]);

  const handleViewLearningPath = (link: string) =>
    void notifyTele(`user clicked: View learning path: ${link}`);

  return (
    <ApplicationSheetLayout
      testId="past-applications-sheet"
      title="Past Applications"
      subtitle="Check how you fared for previous positions"
      applications={applications}
      nudgeInstruction={nudgeInstruction}
      nudgePhrases={["past applications"]}
      statusField="statusDetail"
      emptyMessage="No past applications."
      renderCard={(app, onSelect) => (
        <PastApplicationCard
          key={app.id}
          application={app}
          onViewLearningPath={handleViewLearningPath}
          onClick={onSelect}
        />
      )}
    />
  );
}

/* ── PastApplicationCard ─────────────────────────────────────────────────── */

function formatAppliedDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface PastApplicationCardProps {
  application: JobApplication;
  onViewLearningPath: (link: string) => void;
  onClick?: () => void;
}

function PastApplicationCard({ application, onViewLearningPath, onClick }: PastApplicationCardProps) {
  const { jobTitle, company, companyLogo, appliedAt, statusDetail, aiInsight, learningPathLink } =
    application;

  return (
    <div data-testid="past-application-card" onClick={onClick} role="button" tabIndex={0} className="cursor-pointer rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] p-4 flex flex-col gap-3 transition-all active:scale-[0.98]">
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
          <p className="text-[var(--text-muted)] text-sm leading-5">
            {company} &bull; applied {formatAppliedDate(appliedAt)}
          </p>
        </div>
      </div>

      <div
        className="w-full px-3 py-2 rounded-xl"
        style={{
          backgroundColor: "color-mix(in srgb, var(--fit-stretch) 10%, transparent)",
        }}
      >
        <span className="text-[13px] font-medium leading-[18px] text-[var(--fit-stretch)]">
          {statusDetail}
        </span>
      </div>

      {aiInsight && (
        <p className="text-[var(--text-subtle)] text-[13px] leading-[18px]">
          {aiInsight}
          {learningPathLink && (<br />)}
          {learningPathLink && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewLearningPath(learningPathLink); }}
              className="inline-flex items-center gap-0.5 mt-1 transition-all active:scale-95"
            >
              <span className="text-[var(--fit-stretch)] text-[13px] font-medium">View learning path</span>
              <ChevronRight size={14} className="text-[var(--fit-stretch)]" />
            </button>
          )}
        </p>
      )}
    </div>
  );
}
