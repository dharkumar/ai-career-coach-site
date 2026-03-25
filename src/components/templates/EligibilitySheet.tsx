'use client';

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Plus, Sparkles } from "lucide-react";
import { SkillAlignmentCard } from "@/components/ui/SkillAlignmentCard";
import { notifyTele } from "@/utils/teleUtils";
import { eligibilityByJob, workingOnPlaceholder } from "@/mocks/eligibilityData";
import { categorizeFit, getFitInfo, type FitCategory } from "@/utils/categorizeFit";
import { deriveSkillMatches, deriveCareerImpact } from "@/utils/jobInsights";
import type { SkillMatch, CareerImpact, SkillRef, SkillGapRef } from "@/utils/jobInsights";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";

interface EligibilitySheetProps {
  jobId?: string;
  jobTitle?: string;
  company?: string;
  description?: string;
  matchScore?: number;
  fitCategory?: FitCategory;
  requiredSkills?: SkillRef[];
  recommendedSkills?: SkillRef[];
  skillGaps?: SkillGapRef[];
  skillMatches?: SkillMatch[];
  careerImpact?: CareerImpact[];
}

export function EligibilitySheet({
  jobId,
  jobTitle = "Job",
  company = "Company",
  description = "",
  matchScore = 0,
  fitCategory: fitCategoryProp,
  requiredSkills,
  recommendedSkills,
  skillGaps,
  skillMatches: propSkills,
  careerImpact: propImpact,
}: EligibilitySheetProps) {
  const fitCategory = fitCategoryProp
    ?? (matchScore > 0 ? categorizeFit(matchScore).category : "good-fit");
  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["eligib"],
    matchMode: "any",
    instruction:
      '[SYSTEM] EligibilitySheet is now visible. Give a brief eligibility summary for this role.',
    delayMs: 1200,
  });

  const mockData = useMemo(() => {
    if (jobId && eligibilityByJob[jobId]) return eligibilityByJob[jobId];
    const allEntries = Object.values(eligibilityByJob);
    return allEntries[0] ?? null;
  }, [jobId]);

  const hasRealSkillData = !!(requiredSkills?.length || skillGaps?.length);

  const derivedSkills = useMemo(() => {
    if (!hasRealSkillData) return null;
    const derived = deriveSkillMatches(
      requiredSkills ?? [],
      recommendedSkills ?? [],
      skillGaps ?? [],
    );
    const workingOn = derived.filter((s) => s.status === "working-on");
    if (workingOn.length === 0 && workingOnPlaceholder.length > 0) {
      return [...derived, ...workingOnPlaceholder];
    }
    return derived;
  }, [hasRealSkillData, requiredSkills, recommendedSkills, skillGaps]);

  const derivedImpact = useMemo(() => {
    if (!hasRealSkillData) return null;
    return deriveCareerImpact(fitCategory, description);
  }, [hasRealSkillData, fitCategory, description]);

  const skillMatches = propSkills ?? derivedSkills ?? mockData?.skillMatches ?? [];
  const careerImpact = propImpact ?? derivedImpact ?? mockData?.careerImpact ?? [];

  const haveSkills = skillMatches.filter((s) => s.status === "have");
  const workingOnSkills = skillMatches.filter((s) => s.status === "working-on");
  const missingSkills = skillMatches.filter((s) => s.status === "missing");

  const isGoodFit = fitCategory === "good-fit";
  const fitInfo = getFitInfo(fitCategory);

  const handleApply = () => void notifyTele("user clicked: Apply Now");
  const handleCloseGap = () => void notifyTele("user clicked: Close the gap");
  const handleSave = () => void notifyTele("user clicked: Save for later");
  const handleBack = () => void notifyTele("user clicked: back to job detail");

  useVoiceActions(
    useMemo(() => [
      { phrases: ["go back", "back"], action: handleBack },
      { phrases: ["save", "save for later"], action: handleSave },
      { phrases: ["apply now", "apply"], action: handleApply },
      { phrases: ["close the gap", "close gap"], action: handleCloseGap },
    ], []),
  );

  const matchPercent = Math.min(Math.max(matchScore, 0), 100);

  return (
    <div
      data-testid="eligibility-sheet"
      className="fixed inset-0 z-[110] bg-[var(--bg-deep)] no-lightboard flex flex-col"
      style={{ isolation: "isolate" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 pt-8 pb-4 bg-[var(--bg-deep)] no-lightboard">
        <button
          data-testid="eligibility-sheet-back-btn"
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-[var(--glass-btn)] flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[var(--text-primary)] text-lg font-semibold truncate">Am I eligible?</h1>
          <p className="text-[var(--text-muted)] text-sm truncate">
            {jobTitle} @ {company}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-6">
          {/* Match progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="h-2 rounded-full bg-[var(--border-card)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${matchPercent}%`, backgroundColor: fitInfo.color }}
              />
            </div>
          </div>

          {/* Section heading */}
          <h2 className="text-[var(--text-primary)] text-[20px] font-semibold leading-7">
            Your Skill Alignment
          </h2>

          {/* "You have" section */}
          {haveSkills.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-[var(--text-primary)] text-base font-semibold">You have</h3>
              {haveSkills.map((s) => (
                <SkillAlignmentCard key={s.name} skill={s} />
              ))}
            </div>
          )}

          {/* "You're working on" section */}
          {workingOnSkills.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-[var(--text-primary)] text-base font-semibold">You're working on</h3>
              {workingOnSkills.map((s) => (
                <SkillAlignmentCard key={s.name} skill={s} />
              ))}
            </div>
          )}

          {/* Missing skills section */}
          {missingSkills.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-[var(--text-primary)] text-base font-semibold">Skills to develop</h3>
              {missingSkills.map((s) => (
                <SkillAlignmentCard key={s.name} skill={s} />
              ))}
            </div>
          )}

          {/* Career impact card */}
          {careerImpact.length > 0 && (
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, transparent), color-mix(in srgb, var(--fit-stretch) 6%, transparent))",
                border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--accent)]" />
                <h3 className="text-[var(--text-primary)] text-sm font-semibold">
                  What this role would do for your career
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {careerImpact.map((item, i) => (
                  <p key={i} className="text-[var(--text-subtle)] text-[13px] leading-[19px] pl-[26px]">
                    {item.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side CTAs — pinned to bottom */}
      <div className="px-6 pb-[32px] pt-4 flex gap-3 bg-[var(--bg-deep)] no-lightboard">
        <button
          data-testid="eligibility-sheet-save-btn"
          onClick={handleSave}
          className="flex-1 h-[52px] btn-secondary flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span className="text-[var(--text-primary)] text-base font-medium">Save for Later</span>
          <Plus size={16} className="text-[var(--text-primary)]" />
        </button>
        {isGoodFit ? (
          <button
            data-testid="eligibility-sheet-apply-btn"
            onClick={handleApply}
            className="flex-1 h-[52px] bg-[var(--accent)] no-lightboard rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="text-[var(--accent-contrast)] text-base font-semibold">Apply Now</span>
            <ArrowRight size={16} className="text-[var(--accent-contrast)]" />
          </button>
        ) : (
          <button
            data-testid="eligibility-sheet-close-gap-btn"
            onClick={handleCloseGap}
            className="flex-1 h-[52px] bg-[var(--accent)] no-lightboard rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="text-[var(--accent-contrast)] text-base font-semibold">Close the Gap</span>
            <ArrowRight size={16} className="text-[var(--accent-contrast)]" />
          </button>
        )}
      </div>
    </div>
  );
}
