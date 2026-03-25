'use client';

import { useMemo } from "react";
import { Briefcase, ChevronRight } from "lucide-react";
import { ApplicationCard } from "@/components/ui/ApplicationCard";
import { activeApplications, type JobApplication } from "@/mocks/jobApplicationData";
import { notifyTele } from "@/utils/teleUtils";
import { ApplicationSheetLayout } from "../ApplicationSheetLayout";

interface JobApplicationsSheetProps {
  applications?: JobApplication[];
}

export function JobApplicationsSheet({
  applications: propApps,
}: JobApplicationsSheetProps) {
  const applications = propApps ?? activeApplications;

  const nudgeInstruction = useMemo(() => {
    const lines = applications
      .map(
        (a) =>
          `- ${a.jobTitle} at ${a.company} — ${a.statusLabel}. ${a.statusDetail}${a.alert ? ` (Alert: ${a.alert})` : ""}`,
      )
      .join("\n");
    return (
      "[SYSTEM] JobApplicationsSheet is now visible. Here are the active applications:\n" +
      lines +
      "\nGive a brief spoken summary of these applications. Do NOT call search_jobs — this screen shows application tracking, not job search."
    );
  }, [applications]);

  const handlePastApps = () => void notifyTele("user clicked: Past Applications");

  const extraVoiceActions = useMemo(
    () => [{ phrases: ["past applications", "past apps"], action: handlePastApps }],
    [],
  );

  return (
    <ApplicationSheetLayout
      testId="job-applications-sheet"
      title="Job Applications"
      subtitle="Follow up on your applications"
      applications={applications}
      nudgeInstruction={nudgeInstruction}
      nudgePhrases={["application"]}
      statusField="statusLabel"
      sectionLabel="Active"
      emptyMessage="No active applications."
      extraVoiceActions={extraVoiceActions}
      renderCard={(app, onSelect) => (
        <ApplicationCard key={app.id} application={app} onClick={onSelect} />
      )}
      footer={
        <button
          data-testid="job-applications-sheet-past-apps-btn"
          onClick={handlePastApps}
          className="w-full flex items-center gap-3 py-4 border-t border-[var(--border-card)] transition-all active:opacity-80"
        >
          <Briefcase size={20} className="text-[var(--text-muted)] shrink-0" />
          <span className="flex-1 text-left text-[var(--text-primary)] text-base font-medium">
            Past Applications
          </span>
          <ChevronRight size={18} className="text-[var(--text-dim)] shrink-0" />
        </button>
      }
    />
  );
}
