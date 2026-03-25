'use client';

import { useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { X, MapPin, Play, Ban, Check } from "lucide-react";
import { useMcpCache } from "@/contexts/McpCacheContext";
import { resolveJobsArray } from "@/lib/mcpBridge";
import { notifyTele } from "@/utils/teleUtils";
import { sendJobClosedIntent } from "@/utils/teleIntent";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { categorizeFit, type FitCategory } from "@/utils/categorizeFit";
import { FitScoreBadge } from "@/components/ui/FitScoreBadge";

const SaudiRiyalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--text-secondary)]">
    <text x="12" y="17" textAnchor="middle" fontSize="15" fill="currentColor" fontFamily="Arial">
      ﷼
    </text>
  </svg>
);

function lookupFromCache(
  jobId: string | undefined,
  title: string | undefined,
  company: string | undefined,
  jobs: unknown,
): Record<string, unknown> | null {
  const arr = resolveJobsArray(jobs);
  const tLower = title?.toLowerCase();
  const cLower = company?.toLowerCase();

  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const inner =
      rec.job && typeof rec.job === "object"
        ? (rec.job as Record<string, unknown>)
        : rec;
    const id = (inner.job_id ?? inner.id ?? inner.jobId) as string | undefined;
    if (jobId && id === jobId) return inner;
    const iTitle = (inner.title as string | undefined)?.toLowerCase();
    const iCompany = ((inner.company_name ?? inner.company) as string | undefined)?.toLowerCase();
    if (tLower && iTitle === tLower && (!cLower || iCompany === cLower)) return inner;
  }
  return null;
}

function fmtSalary(min?: number, max?: number): string | undefined {
  if (min == null || max == null) return undefined;
  const fmt = (v: number) => v.toLocaleString("en-US");
  return `${fmt(min)} – ${fmt(max)}`;
}

export interface CardStackJobPreviewSheetProps {
  jobId?: string;
  title?: string;
  company?: string;
  companyLogo?: string;
  location?: string;
  salaryRange?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  matchScore?: number;
  fitCategory?: FitCategory;
  aiSummary?: string;
  postedAt?: string;
  /** When omitted (e.g. AI-driven section only), closing notifies via `sendJobClosedIntent`. */
  onClose?: () => void;
}

/**
 * Bottom sheet for job preview from CardStack — Design System node 6958:15709.
 * Distinct from full-screen {@link JobDetailSheet} (browse / job search flow).
 */
export function CardStackJobPreviewSheet(props: CardStackJobPreviewSheetProps) {
  const onCloseProp = props.onClose;
  const cache = useMcpCache();

  const cached = useMemo(() => {
    if (!cache.jobs) return null;
    return lookupFromCache(props.jobId, props.title, props.company, cache.jobs);
  }, [props.jobId, props.title, props.company, cache.jobs]);

  const title = props.title ?? (cached?.title as string | undefined) ?? "Job";
  const company = props.company ?? (cached?.company_name as string | undefined) ?? (cached?.company as string | undefined) ?? "";
  const location = props.location ?? (cached?.location as string | undefined) ?? "";
  const salaryRange =
    props.salaryRange ??
    fmtSalary(props.salaryMin, props.salaryMax) ??
    fmtSalary(cached?.salary_min as number | undefined, cached?.salary_max as number | undefined) ??
    (cached?.salary_range as string | undefined);
  const description = props.description ?? (cached?.description as string | undefined);
  const matchScore =
    props.matchScore ?? (cached?.match_score as number | undefined) ?? (cached?.score as number | undefined);
  const fitCategory =
    props.fitCategory ?? (matchScore != null ? categorizeFit(matchScore).category : undefined);
  const aiSummary = props.aiSummary ?? (cached?.ai_summary as string | undefined) ?? (cached?.aiSummary as string | undefined);
  const companyLogo = props.companyLogo ?? (cached?.company_logo as string | undefined);

  const isGoodFit = fitCategory === "good-fit";
  const insightPrefix =
    isGoodFit ? "Strong fit." : fitCategory === "grow-into" ? "Grow into this." : "Close match.";
  const summaryText = description ?? aiSummary ?? "No summary available for this role yet.";

  const close = useCallback(() => {
    if (onCloseProp) {
      onCloseProp();
      return;
    }
    void sendJobClosedIntent(title, company);
  }, [onCloseProp, title, company]);

  const onNoThanks = useCallback(() => {
    void notifyTele(`user clicked: No thanks on job card: ${title} at ${company}`, { skipNavigateDrift: true });
    close();
  }, [close, title, company]);

  const onInterested = useCallback(() => {
    void notifyTele(`user clicked: I'm interested on job card: ${title} at ${company}`, { skipNavigateDrift: true });
    close();
  }, [close, title, company]);

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: [title.toLowerCase().slice(0, 12)],
    matchMode: "any",
    instruction:
      `[SYSTEM] CardStack job preview is open for "${title}" at "${company}". ` +
      "Acknowledge in one sentence. FORBIDDEN: navigateToSection with JobDetailSheet, search_knowledge for JobDetailSheet payload, " +
      "or fetchCareerGrowth to drive full job detail — the preview sheet already shows the role.",
    delayMs: 1000,
  });

  useVoiceActions(
    useMemo(
      () => [
        { phrases: ["close", "go back", "dismiss", "never mind"], action: close },
        { phrases: ["no thanks", "not interested", "pass"], action: onNoThanks },
        { phrases: ["interested", "i'm interested", "yes i want", "apply"], action: onInterested },
      ],
      [close, onNoThanks, onInterested],
    ),
  );

  return (
    <motion.div
      data-testid="card-stack-job-preview-sheet"
      className="fixed inset-0 z-[120] flex flex-col justify-end pointer-events-auto no-lightboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.button
        type="button"
        aria-label="Close job preview"
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-stack-job-preview-title"
        className={[
          "relative mx-4 mb-6 max-h-[min(90vh,780px)] overflow-y-auto rounded-2xl",
          "border border-[var(--border-soft)] [box-shadow:var(--glass-shadow)]",
          "bg-[var(--surface-elevated)] backdrop-blur-[29px] [-webkit-backdrop-filter:blur(29px)]",
        ].join(" ")}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: "spring", damping: 32, stiffness: 380 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-6 p-4">
          {/* Header — Figma 6958:15710–15720 */}
          <div className="flex flex-col gap-0 w-full">
            <div className="flex gap-4 items-center w-full">
              <div className="flex gap-4 items-center min-w-0 flex-1">
                <div
                  data-testid="card-stack-job-preview-logo"
                  className="size-[60px] bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                >
                  {companyLogo ? (
                    <img src={companyLogo} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl font-bold text-zinc-700">{company.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-start min-w-0">
                  <p
                    id="card-stack-job-preview-title"
                    className="text-2xl font-semibold leading-7 text-[var(--text-primary)] truncate w-full"
                  >
                    {title}
                  </p>
                  <p className="text-xl font-normal leading-6 text-[var(--text-secondary)] truncate w-full">{company}</p>
                </div>
              </div>
              <button
                type="button"
                data-testid="card-stack-job-preview-close"
                onClick={close}
                className="shrink-0 size-6 flex items-center justify-center text-[var(--text-primary)] rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={22} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Salary / location + fit score — Figma 6958:15721–15734 */}
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex flex-col gap-2 items-start min-w-0">
              {salaryRange && (
                <div className="flex gap-2 items-center">
                  <SaudiRiyalIcon />
                  <span className="text-base font-normal leading-6 text-[var(--text-secondary)] whitespace-nowrap">
                    {salaryRange}
                  </span>
                </div>
              )}
              {location && (
                <div className="flex gap-2 items-center">
                  <MapPin size={24} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="text-base font-normal leading-6 text-[var(--text-secondary)]">{location}</span>
                </div>
              )}
            </div>
            {matchScore != null && (
              <div className="flex gap-2 items-center shrink-0 self-start pt-0.5">
                <span className="text-[11px] font-medium leading-[16.5px] text-[var(--text-bottom-nav-icon-muted)] whitespace-nowrap">
                  Fit Score
                </span>
                <FitScoreBadge score={matchScore} category={fitCategory} size={47} />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-2 items-start w-full">
            <p className="text-base font-bold leading-6 text-[#f0f4f2]">Summary</p>
            <p className="text-sm font-normal leading-5 text-[var(--text-secondary)] w-full">{summaryText}</p>
          </div>

          {/* A Day in the life */}
          <div className="flex flex-col gap-2 items-start w-full">
            <p className="text-base font-bold leading-6 text-[#f0f4f2]">A Day in the life</p>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[var(--surface-card)]">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/80 to-zinc-950/90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-14 rounded-full bg-black/55 flex items-center justify-center border border-white/15">
                  <Play size={28} className="text-white ml-1" fill="white" />
                </div>
              </div>
            </div>
          </div>

          {/* Insight + CTAs — Figma 6958:15743–15753 */}
          <div className="flex flex-col gap-2 items-start w-full">
            {aiSummary && (
              <div
                className="w-full rounded-2xl px-[17px] py-[17px]"
                style={{
                  border:
                    fitCategory === "grow-into"
                      ? "1px solid rgba(167, 139, 250, 0.2)"
                      : isGoodFit
                        ? "1px solid rgba(16, 185, 129, 0.15)"
                        : "1px solid rgba(81, 162, 255, 0.2)",
                  background:
                    fitCategory === "grow-into"
                      ? "linear-gradient(164.8deg, rgba(167, 139, 250, 0.12) 0%, rgba(167, 139, 250, 0.05) 100%)"
                      : isGoodFit
                        ? "linear-gradient(164.8deg, rgba(16, 185, 129, 0.1) 0%, rgba(0, 188, 125, 0.05) 100%)"
                        : "linear-gradient(164.8deg, rgba(81, 162, 255, 0.1) 0%, rgba(81, 162, 255, 0.05) 100%)",
                }}
              >
                <p className="text-sm leading-[22.75px] text-[rgba(240,244,242,0.9)]">
                  <span className="font-bold">{insightPrefix}</span>{" "}
                  <span className="font-normal">{aiSummary}</span>
                </p>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button
                type="button"
                data-testid="card-stack-job-preview-no-thanks"
                onClick={onNoThanks}
                className="flex-1 h-[50px] rounded-[10px] border border-[var(--border-strong)] bg-[#27272a] flex items-center justify-center gap-2 text-[var(--text-primary)] text-base font-normal hover:opacity-95 active:scale-[0.99] transition-all"
              >
                <span>No, thanks</span>
                <Ban size={16} className="shrink-0 opacity-90" />
              </button>
              <button
                type="button"
                data-testid="card-stack-job-preview-interested"
                onClick={onInterested}
                className="flex-1 h-[50px] rounded-[10px] border border-[var(--border-strong)] bg-[#27272a] flex items-center justify-center gap-2 text-[var(--text-primary)] text-base font-normal hover:opacity-95 active:scale-[0.99] transition-all"
              >
                <span>I&apos;m interested</span>
                <Check size={16} className="shrink-0 opacity-90" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
