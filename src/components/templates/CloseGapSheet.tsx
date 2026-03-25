'use client';

import { useMemo } from "react";

import { ArrowLeft, X, Zap, Clock } from "lucide-react";
import { CourseCard } from "@/components/ui/CourseCard";
import { notifyTele } from "@/utils/teleUtils";
import { eligibilityByJob } from "@/mocks/eligibilityData";
import { derivePlaceholderCourses } from "@/utils/jobInsights";
import type { SkillGapRef } from "@/utils/jobInsights";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";

interface CloseGapSheetProps {
  jobId?: string;
  jobTitle?: string;
  company?: string;
  skillGaps?: SkillGapRef[];
  matchScore?: number;
}

export function CloseGapSheet({
  jobId,
  jobTitle = "Job",
  company = "Company",
  skillGaps,
  matchScore,
}: CloseGapSheetProps) {
  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["skill gaps", "close the gap", "plan"],
    matchMode: "any",
    instruction:
      '[SYSTEM] CloseGapSheet is now visible. Say: "Here\'s a plan to close the skill gaps for this role."',
    delayMs: 1200,
  });

  const derived = useMemo(
    () => (skillGaps?.length ? derivePlaceholderCourses(skillGaps) : null),
    [skillGaps],
  );

  const mockData = useMemo(() => {
    if (jobId && eligibilityByJob[jobId]) return eligibilityByJob[jobId];
    return null;
  }, [jobId]);

  const featured = derived?.featuredCourse ?? mockData?.featuredCourse;
  const courses = derived?.gapCourses ?? mockData?.gapCourses ?? [];
  const completionTarget = matchScore != null ? Math.min(matchScore + 15, 100) : 85;

  const handleStartLearning = () => void notifyTele("user clicked: Start Learning");
  const handleAddTraining = () => void notifyTele("user clicked: Add to Training");
  const handleNoThanks = () => void notifyTele("user clicked: No Thanks");
  const handleBack = () => void notifyTele("user clicked: back to eligibility");
  const handleClose = () => void notifyTele("user clicked: dashboard");

  useVoiceActions(
    useMemo(() => [
      { phrases: ["go back", "back"], action: handleBack },
      { phrases: ["close", "dashboard"], action: handleClose },
      { phrases: ["start learning", "start"], action: handleStartLearning },
      { phrases: ["no thanks", "no"], action: handleNoThanks },
      { phrases: ["add to training", "add training"], action: handleAddTraining },
    ], []),
  );

  return (
    <div
      data-testid="close-gap-sheet"
      className="fixed inset-0 z-50 bg-[var(--bg)] no-lightboard flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <button
          data-testid="close-gap-sheet-back-btn"
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-[var(--glass-btn)] flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-[var(--text-primary)]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[var(--text-primary)] text-lg font-semibold truncate">Close The Gap</h1>
          <p className="text-[var(--text-muted)] text-sm truncate">
            {jobTitle} @ {company}
          </p>
        </div>
        <button
          data-testid="close-gap-sheet-close-btn"
          onClick={handleClose}
          className="w-8 h-8 rounded-full bg-[var(--glass-btn)] flex items-center justify-center shrink-0"
        >
          <X size={16} className="text-[var(--text-subtle)]" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-6">
          {/* Featured course card — blue gradient */}
          {featured && (
            <div
              className="rounded-2xl p-5 flex flex-col gap-4 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--fit-stretch) 12%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))",
                border: "1px solid color-mix(in srgb, var(--fit-stretch) 30%, transparent)",
              }}
            >
              {/* Rich text intro */}
              <p className="text-[var(--text-secondary)] text-[15px] leading-[22px]">
                You're{" "}
                <span className="font-bold text-[var(--fit-stretch)]">{featured.completionPercent}% there</span>
                {" "}— this{" "}
                <span className="font-bold text-[var(--fit-good-light)]">{featured.duration} Course</span>
                {" "}will bring you to an{" "}
                <span className="font-bold text-[var(--fit-good-light)]">{completionTarget}% Match</span>.
              </p>

              {/* Course info sub-card */}
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: "color-mix(in srgb, var(--bg) 60%, transparent)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: "color-mix(in srgb, var(--fit-stretch) 15%, transparent)",
                    }}
                  >
                    <Zap size={18} className="text-[var(--fit-stretch)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-base font-semibold truncate">
                      {featured.name}
                    </p>
                    <p className="text-[var(--text-muted)] text-[13px]">{featured.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[var(--text-dim)]" />
                    <span className="text-[var(--text-dim)] text-xs">{featured.duration}</span>
                  </div>
                </div>
                <p className="text-[var(--text-subtle)] text-[13px] leading-[18px]">{featured.description}</p>
              </div>

              <button
                data-testid="close-gap-sheet-start-learning-btn"
                onClick={handleStartLearning}
                className="w-full h-[46px] rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{
                  background: "var(--fit-stretch)",
                }}
              >
                <span className="text-[var(--bg)] text-sm font-semibold">Start Learning</span>
              </button>
            </div>
          )}

          {/* Other recommended courses */}
          {courses.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[var(--text-primary)] text-base font-semibold">
                Other users also completed:
              </h2>
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  name={course.name}
                  provider={course.provider}
                  description={course.description}
                  priority={course.priority}
                  savedRoleCount={course.savedRoleCount}
                  duration={course.duration}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side CTAs — pinned to bottom */}
      <div className="px-6 pb-8 pt-4 flex gap-3 bg-[var(--bg)]">
        <button
          data-testid="close-gap-sheet-no-thanks-btn"
          onClick={handleNoThanks}
          className="flex-1 h-[52px] btn-secondary flex items-center justify-center transition-all active:scale-95"
        >
          <span className="text-[var(--text-primary)] text-base font-medium">No Thanks</span>
        </button>
        <button
          data-testid="close-gap-sheet-add-training-btn"
          onClick={handleAddTraining}
          className="flex-1 h-[52px] bg-[var(--accent)] no-lightboard rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span className="text-[var(--accent-contrast)] text-base font-semibold">Add to Training</span>
        </button>
      </div>
    </div>
  );
}
