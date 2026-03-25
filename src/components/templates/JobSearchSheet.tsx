'use client';

import { useState, useEffect, useMemo, useCallback } from "react";

import { X } from "lucide-react";
import { JobListCard } from "@/components/ui/JobListCard";
import { categorizeFit, getFitInfo, type FitCategory } from "@/utils/categorizeFit";
import { mockJobs } from "@/mocks/jobSearchData";
import { notifyTele } from "@/utils/teleUtils";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salaryRange: string;
  description?: string;
  matchScore: number;
  fitCategory?: FitCategory;
  aiSummary: string;
  aiGapInsight?: string;
  postedAt?: string;
}

const TABS: { category: FitCategory; label: string }[] = [
  { category: "good-fit", label: "Good fit" },
  { category: "stretch", label: "Stretch" },
  { category: "grow-into", label: "Grow into" },
];

interface JobSearchSheetProps {
  jobs?: JobListing[];
  /** LLM can set the initial tab (e.g. "stretch") so the UI opens on the right category. */
  activeTab?: FitCategory;
}

export function JobSearchSheet({ jobs: propJobs, activeTab: initialTab }: JobSearchSheetProps) {
  const [activeTab, setActiveTab] = useState<FitCategory>(initialTab ?? "good-fit");

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["jobs", "categories", "catches your eye"],
    matchMode: "any",
    instruction:
      '[SYSTEM] JobSearchSheet is now visible. Say: "I found jobs across three categories. Let me know which one catches your eye."',
    delayMs: 1200,
  });

  const jobs = useMemo(() => {
    if (propJobs && propJobs.length > 0) return propJobs;
    return mockJobs;
  }, [propJobs]);

  const categorized = useMemo(() => {
    const buckets: Record<FitCategory, JobListing[]> = {
      "good-fit": [],
      stretch: [],
      "grow-into": [],
    };
    for (const job of jobs) {
      const cat = job.fitCategory ?? categorizeFit(job.matchScore).category;
      buckets[cat].push(job);
    }
    return buckets;
  }, [jobs]);

  const activeJobs = categorized[activeTab];
  const activeFit = getFitInfo(activeTab);

  const handleJobClick = (job: JobListing) => {
    void notifyTele(`user selected job: ${job.title} at ${job.company} [jobId:${job.id}]`);
  };

  const handleClose = () => {
    void notifyTele("user clicked: dashboard");
  };

  const switchToGoodFit = useCallback(() => setActiveTab("good-fit"), []);
  const switchToStretch = useCallback(() => setActiveTab("stretch"), []);
  const switchToGrowInto = useCallback(() => setActiveTab("grow-into"), []);

  const jobVoiceActions = useMemo(
    () =>
      jobs.map((job) => ({
        phrases: [
          job.title.toLowerCase(),
          `${job.title} at ${job.company}`.toLowerCase(),
          `${job.title} ${job.company}`.toLowerCase(),
        ],
        action: () => handleJobClick(job),
      })),
    [jobs],
  );

  useVoiceActions(
    useMemo(() => [
      { phrases: ["close", "dashboard", "go back", "back"], action: handleClose },
      { phrases: ["good fit"], action: switchToGoodFit },
      { phrases: ["stretch"], action: switchToStretch },
      { phrases: ["grow into"], action: switchToGrowInto },
      ...jobVoiceActions,
    ], [switchToGoodFit, switchToStretch, switchToGrowInto, jobVoiceActions]),
  );

  return (
    <div
      data-testid="job-search-sheet"
      className="fixed inset-0 z-50 bg-[var(--bg)] no-lightboard flex flex-col"
    >
      {/* Header */}
      <div className="relative px-6 pt-8 pb-2">
        <button
          data-testid="job-search-sheet-close-btn"
          onClick={handleClose}
          className="absolute top-4 right-4 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] pointer-events-auto"
        >
          <X size={20} className="text-[var(--text-primary)]" />
        </button>
        <h1 className="text-[var(--text-primary)] text-[32px] font-semibold leading-10 mt-10">
          Job Search
        </h1>
        <p className="text-[var(--text-dim)] text-sm mt-1">Find your next job here</p>
      </div>

      {/* Tabs — single glass container with inner active pill */}
      <div
        className="mx-6 mt-3 mb-4 flex rounded-2xl p-[5px]"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border-soft)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {TABS.map(({ category, label }) => {
          const isActive = activeTab === category;
          const fit = getFitInfo(category);
          return (
            <button
              key={category}
              data-testid={`job-search-tab-${category}`}
              onClick={() => setActiveTab(category)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive ? fit.bgColor : "transparent",
                border: isActive ? `1px solid ${fit.borderColor}` : "1px solid transparent",
                color: isActive ? fit.color : "var(--text-muted)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="flex flex-col gap-3">
          {activeJobs.length === 0 && (
            <p className="text-center text-[var(--text-subtle)] text-sm py-12">
              No jobs in this category yet.
            </p>
          )}
          {activeJobs.map((job) => (
            <JobListCard
              key={job.id}
              id={job.id}
              title={job.title}
              company={job.company}
              companyLogo={job.companyLogo}
              location={job.location}
              salaryRange={job.salaryRange}
              matchScore={job.matchScore}
              fitCategory={job.fitCategory ?? categorizeFit(job.matchScore).category}
              aiSummary={job.aiSummary}
              aiGapInsight={job.aiGapInsight}
              postedAt={job.postedAt ?? ""}
              onClick={() => handleJobClick(job)}
            />
          ))}
        </div>

        {/* Category summary */}
        <div className="mt-6 text-center">
          <p className="text-[var(--text-dim)] text-xs">
            Showing {activeJobs.length} {activeFit.label.toLowerCase()} jobs based on your skills
          </p>
        </div>
      </div>
    </div>
  );
}
