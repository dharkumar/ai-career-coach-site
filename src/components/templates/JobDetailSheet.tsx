'use client';

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, MapPin, Plus, Play, Sparkles, RefreshCw, Loader2, BookOpen, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FitCategoryPill } from "@/components/ui/FitCategoryPill";
import { notifyTele } from "@/utils/teleUtils";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { categorizeFit, type FitCategory } from "@/utils/categorizeFit";
import { useMcpCache } from "@/contexts/McpCacheContext";
import { resolveJobsArray } from "@/lib/mcpBridge";
import type { BackendSkillGap } from "@/types/flow";
import { LearningPathTemplate } from "@/components/templates/LearningPathTemplate";

interface JobDetailSheetProps {
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
  aiGapInsight?: string;
  postedAt?: string;
  candidateId?: string;
  /** When provided, the back button calls this instead of notifying Tele (for local embedding). */
  onClose?: () => void;
}

const SalaryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path
      d="M12 3v18M16.5 6.5H9.75a3 3 0 0 0 0 6h4.5a3 3 0 0 1 0 6H7"
      stroke="var(--text-muted)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function fmtSalary(min?: number, max?: number): string | undefined {
  if (min == null || max == null) return undefined;
  const fmt = (v: number) => v.toLocaleString("en-US");
  return `${fmt(min)} – ${fmt(max)}`;
}

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

export function JobDetailSheet(props: JobDetailSheetProps) {
  const cache = useMcpCache();
  const [showLearningPath, setShowLearningPath] = useState(false);

  const cached = useMemo(() => {
    if (props.description || props.location || props.salaryRange || props.salaryMin) return null;
    if (!cache.jobs) return null;
    return lookupFromCache(props.jobId, props.title, props.company, cache.jobs);
  }, [props.jobId, props.title, props.company, props.description, props.location, props.salaryRange, props.salaryMin, cache.jobs]);

  const title = props.title ?? (cached?.title as string | undefined) ?? "Job";
  const company = props.company ?? (cached?.company_name as string | undefined) ?? (cached?.company as string | undefined) ?? "";
  const location = props.location ?? (cached?.location as string | undefined);
  const salaryRange = props.salaryRange ?? fmtSalary(props.salaryMin, props.salaryMax) ?? fmtSalary(cached?.salary_min as number | undefined, cached?.salary_max as number | undefined);
  const description = props.description ?? (cached?.description as string | undefined);
  const matchScore = props.matchScore ?? (cached?.match_score as number | undefined) ?? (cached?.score as number | undefined);
  const fitCategory =
    props.fitCategory ??
    (matchScore != null ? categorizeFit(matchScore).category : undefined);
  const aiSummary = props.aiSummary ?? (cached?.ai_summary as string | undefined);

  const rawSkillGaps = cached?.skill_gaps as BackendSkillGap[] | undefined;
  const jobId = props.jobId ?? (cached?.id as string | undefined);
  const isLearningPathJob = jobId === "job_004" && rawSkillGaps && rawSkillGaps.length > 0;

  const hasData = !!(description || salaryRange || location);
  const isLoading = !hasData && !cache.jobs;

  const isGoodFit = fitCategory === "good-fit";
  const insightPrefix = isGoodFit ? "Strong fit." : "Close match.";

  useSpeechFallbackNudge({
    enabled: hasData,
    requiredPhrases: [title.toLowerCase()],
    matchMode: "any",
    instruction: `[SYSTEM] JobDetailSheet is now visible for "${title}" at "${company}". Say a brief remark about the job (1-2 sentences).`,
    delayMs: 1200,
  });

  const handleBack = () => {
    if (props.onClose) props.onClose();
    else void notifyTele("user clicked: back to job search");
  };

  const handleRetry = () => {
    void notifyTele("user clicked: retry job detail");
  };

  const handleEligibility = () => {
    void notifyTele("user clicked: Am I eligible?");
  };

  const handleSave = () => {
    void notifyTele("user clicked: Save for later");
  };

  useVoiceActions(
    useMemo(() => [
      { phrases: ["go back", "back"], action: handleBack },
      { phrases: ["save", "save for later"], action: handleSave },
      { phrases: ["eligibility", "am I eligible", "eligible"], action: handleEligibility },
      { phrases: ["retry", "try again"], action: handleRetry },
    ], []),
  );

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[110] flex flex-col bg-[var(--bg-deep)] no-lightboard"
      style={{ isolation: "isolate" }}
      data-testid="job-detail-sheet"
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 pt-8 pb-4 bg-[var(--bg-deep)] no-lightboard">
        <button
          data-testid="job-detail-sheet-close-btn"
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-[var(--glass-btn)] flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-lg font-semibold leading-6 truncate">
            {title}
          </p>
          <p className="text-[var(--text-muted)] text-sm leading-5 truncate">
            {company}
          </p>
        </div>
      </div>

      {hasData ? (
        <>
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="flex flex-col gap-6">
              {/* Salary + location row with fit pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  {salaryRange && (
                    <div className="flex items-center gap-1.5">
                      <SalaryIcon />
                      <span className="text-[var(--text-secondary)] text-sm">{salaryRange}</span>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={18} className="text-[var(--text-muted)] shrink-0" />
                      <span className="text-[var(--text-secondary)] text-sm">{location}</span>
                    </div>
                  )}
                </div>
                {fitCategory && <FitCategoryPill category={fitCategory} />}
              </div>

              {/* Summary */}
              {description && (
                <div data-testid="job-detail-sheet-description" className="flex flex-col gap-3">
                  <p className="text-[var(--text-primary)] text-base font-bold">Summary</p>
                  <p className="text-[var(--text-muted)] text-[15px] leading-relaxed">{description}</p>
                </div>
              )}

              {/* A Day in the Life */}
              <div className="flex flex-col gap-3">
                <p className="text-[var(--text-primary)] text-base font-bold">A Day in the life</p>
                <div
                  className="relative w-full aspect-video rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--surface-card) 0%, var(--bg) 100%)",
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--glass-btn)] flex items-center justify-center">
                    <Play size={20} className="text-[var(--text-primary)] ml-0.5" fill="var(--text-primary)" />
                  </div>
                </div>
              </div>

              {/* AI Insight callout */}
              {aiSummary && (
                <div
                  className="flex items-start gap-3 rounded-2xl p-4"
                  style={{
                    background: isGoodFit
                      ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent), color-mix(in srgb, var(--accent) 2%, transparent))"
                      : "linear-gradient(135deg, color-mix(in srgb, var(--fit-stretch) 8%, transparent), color-mix(in srgb, var(--fit-stretch) 2%, transparent))",
                    border: isGoodFit
                      ? "1px solid color-mix(in srgb, var(--accent) 20%, transparent)"
                      : "1px solid color-mix(in srgb, var(--fit-stretch) 20%, transparent)",
                  }}
                >
                  <Sparkles
                    size={18}
                    className="shrink-0 mt-0.5"
                    style={{ color: isGoodFit ? "var(--accent)" : "var(--fit-stretch)" }}
                  />
                  <p
                    className="text-[14px] leading-[20px]"
                    style={{ color: isGoodFit ? "var(--fit-good-light)" : "var(--fit-stretch-light)" }}
                  >
                    <span className="font-bold">{insightPrefix}</span>{" "}
                    {aiSummary}
                  </p>
                </div>
              )}

              {/* Skill Gaps section — only shown for job_004 when gaps exist */}
              {isLearningPathJob && rawSkillGaps && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-[var(--fit-stretch)] shrink-0" />
                    <p className="text-[var(--text-primary)] text-base font-bold">Skill Gaps</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {rawSkillGaps.map((gap) => (
                      <div
                        key={gap.name}
                        className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{
                          background: "color-mix(in srgb, var(--fit-stretch) 8%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--fit-stretch) 20%, transparent)",
                        }}
                      >
                        <span className="text-[var(--text-primary)] text-sm font-medium capitalize">
                          {gap.name}
                        </span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: "color-mix(in srgb, var(--fit-stretch) 15%, transparent)",
                            color: "var(--fit-stretch-light)",
                          }}
                        >
                          {gap.current_level == null
                            ? "Missing"
                            : `${gap.current_level} → ${gap.required_level}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side-by-side CTAs — pinned to bottom */}
          <div className="px-6 pb-[32px] pt-4 flex flex-col gap-3 bg-[var(--bg-deep)] no-lightboard">
            {/* Learning Path CTA — only for job_004 with skill gaps */}
            {isLearningPathJob && (
              <button
                data-testid="job-detail-sheet-learning-btn"
                onClick={() => setShowLearningPath(true)}
                className="w-full h-[52px] flex items-center justify-center gap-2 rounded-2xl transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 90%, #8B5CF6), var(--accent))",
                }}
              >
                <BookOpen size={18} className="text-[var(--accent-contrast)]" />
                <span className="text-[var(--accent-contrast)] text-base font-semibold">Start Learning Path</span>
              </button>
            )}
            <div className="flex gap-3">
              <button
                data-testid="job-detail-sheet-save-btn"
                onClick={handleSave}
                className="flex-1 h-[52px] btn-secondary flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span className="text-[var(--text-primary)] text-base font-medium">Save for Later</span>
                <Plus size={16} className="text-[var(--text-primary)]" />
              </button>
              <button
                data-testid="job-detail-sheet-eligibility-btn"
                onClick={handleEligibility}
                className="flex-1 h-[52px] bg-[var(--accent)] no-lightboard flex items-center justify-center gap-2 transition-all active:scale-95 rounded-2xl"
              >
                <span className="text-[var(--accent-contrast)] text-base font-semibold">Am I eligible?</span>
                <ArrowRight size={16} className="text-[var(--accent-contrast)]" />
              </button>
            </div>
          </div>
        </>
      ) : isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
          <Loader2 size={32} className="text-[var(--accent)] animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading job details…</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
          <div className="w-14 h-14 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center">
            <RefreshCw size={24} className="text-[var(--text-muted)]" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] text-lg font-semibold mb-1">
              Couldn't load job details
            </p>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              We weren't able to retrieve the details for this position. Please try again.
            </p>
          </div>
          <button
            data-testid="job-detail-sheet-retry-btn"
            onClick={handleRetry}
            className="h-[48px] px-8 bg-[var(--accent)] rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw size={16} className="text-[var(--accent-contrast)]" />
            <span className="text-[var(--accent-contrast)] text-base font-semibold">Try Again</span>
          </button>
        </div>
      )}

      {/* Learning Path overlay — slides in on top of JobDetailSheet */}
      <AnimatePresence>
        {showLearningPath && props.candidateId && (
          <LearningPathTemplate
            candidateId={props.candidateId}
            jobTitle={title}
            onClose={() => setShowLearningPath(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
