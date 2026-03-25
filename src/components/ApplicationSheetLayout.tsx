'use client';

import { type ReactNode, useMemo } from "react";
import { X } from "lucide-react";
import { type JobApplication } from "@/mocks/jobApplicationData";
import { notifyTele, teleAcknowledge } from "@/utils/teleUtils";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions, type VoiceAction } from "@/hooks/useVoiceActions";

interface ApplicationSheetLayoutProps {
  testId: string;
  title: string;
  subtitle: string;
  applications: JobApplication[];
  nudgeInstruction: string;
  nudgePhrases: string[];
  statusField: "statusLabel" | "statusDetail";
  renderCard: (app: JobApplication, onSelect: () => void) => ReactNode;
  extraVoiceActions?: VoiceAction[];
  sectionLabel?: string;
  emptyMessage?: string;
  footer?: ReactNode;
}

export function ApplicationSheetLayout({
  testId,
  title,
  subtitle,
  applications,
  nudgeInstruction,
  nudgePhrases,
  statusField,
  renderCard,
  extraVoiceActions = [],
  sectionLabel,
  emptyMessage = "No applications.",
  footer,
}: ApplicationSheetLayoutProps) {
  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: nudgePhrases,
    matchMode: "any",
    instruction: nudgeInstruction,
    delayMs: 1200,
  });

  const handleClose = () => {
    teleAcknowledge(
      '[SYSTEM] User tapped close. Call navigateToSection with EXACTLY this JSON: ' +
        '{"badge":"trAIn CAREER","title":"Dashboard","subtitle":"Your Profile",' +
        '"generativeSubsections":[{"id":"dashboard","templateId":"Dashboard","props":{}},' +
        '{"id":"profile-home","templateId":"ProfileSheet","props":{"dashboardAnchor":true}}]}. ' +
        "Do NOT speak. Do NOT call search_jobs.",
    );
  };

  const appVoiceActions: VoiceAction[] = useMemo(
    () =>
      applications.map((app) => ({
        phrases: [
          app.jobTitle.toLowerCase(),
          `${app.jobTitle} at ${app.company}`.toLowerCase(),
          `${app.jobTitle} ${app.company}`.toLowerCase(),
        ],
        action: () =>
          notifyTele(
            `user selected application: ${app.jobTitle} at ${app.company} [status:${app[statusField]}]`,
          ),
      })),
    [applications, statusField],
  );

  useVoiceActions(
    useMemo(
      () => [
        { phrases: ["close", "dashboard", "go back", "back"], action: handleClose },
        ...extraVoiceActions,
        ...appVoiceActions,
      ],
      [extraVoiceActions, appVoiceActions],
    ),
  );

  return (
    <div data-testid={testId} className="fixed inset-0 z-50 bg-[var(--bg)] no-lightboard flex flex-col">
      <div className="relative px-6 pt-8 pb-2">
        <button
          data-testid={`${testId}-close-btn`}
          onClick={handleClose}
          className="absolute top-4 right-4 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] pointer-events-auto"
        >
          <X size={20} className="text-[var(--text-primary)]" />
        </button>
        <h1 className="text-[var(--text-primary)] text-[28px] font-bold leading-9 mt-10">
          {title}
        </h1>
        <p className="text-[var(--text-subtle)] text-[15px] leading-5 mt-1">{subtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
        <div className="flex flex-col gap-4">
          {sectionLabel && (
            <h2 className="text-[var(--text-primary)] text-base font-semibold">{sectionLabel}</h2>
          )}
          {applications.length === 0 && (
            <p className="text-[var(--text-subtle)] text-sm text-center py-8">{emptyMessage}</p>
          )}
          {applications.map((app) =>
            renderCard(app, () =>
              notifyTele(
                `user selected application: ${app.jobTitle} at ${app.company} [status:${app[statusField]}]`,
              ),
            ),
          )}
          {footer}
        </div>
      </div>
    </div>
  );
}
