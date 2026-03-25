'use client';

import { useMemo } from "react";
import { Star } from "lucide-react";
import { motion } from "motion/react";

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface SidebarCandidate {
  id: string;
  name: string;
  matchScore: number;
  starred?: boolean;
  status?: string;
}

export interface SidebarJobPosting {
  title: string;
  department?: string;
  location?: string;
  postedAt?: string;
}

export interface CandidateSidebarProps {
  jobPosting: SidebarJobPosting;
  candidates: SidebarCandidate[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

/* ── Score bar ───────────────────────────────────────────────────────────── */

function ScoreBar() {
  return (
    <div
      className="w-1 h-3.5 rounded-sm flex-shrink-0"
      style={{ background: "var(--accent)" }}
    />
  );
}

/* ── Candidate row ───────────────────────────────────────────────────────── */

function CandidateRow({
  candidate,
  selected,
  showStar,
  onClick,
}: {
  candidate: SidebarCandidate;
  selected: boolean;
  showStar: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 transition-all duration-150"
      style={{
        background: selected
          ? "var(--border-medium)"
          : "var(--surface-elevated)",
        border: selected
          ? "1px solid var(--border-soft)"
          : "1px solid var(--surface-elevated)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base text-[var(--text-primary)] truncate">
            {candidate.name}
          </span>
          {showStar && (
            <Star
              size={16}
              className="fill-current text-[var(--accent)] flex-shrink-0"
            />
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-base font-semibold text-white">
            {candidate.matchScore}
          </span>
          <ScoreBar />
        </div>
      </div>
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function CandidateSidebar({
  jobPosting,
  candidates,
  selectedId,
  onSelect,
}: CandidateSidebarProps) {
  const shortlisted = useMemo(
    () =>
      candidates
        .filter((c) => c.status === "shortlisted")
        .sort((a, b) => b.matchScore - a.matchScore),
    [candidates],
  );

  const topRecommendations = useMemo(
    () =>
      candidates
        .filter((c) => c.status !== "shortlisted")
        .sort((a, b) => b.matchScore - a.matchScore),
    [candidates],
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col rounded-2xl h-full overflow-hidden"
      style={{ background: "var(--surface-elevated)" }}
    >
      {/* Job Posting card — always visible / pinned */}
      <section className="flex flex-col gap-4 p-8 pb-0 flex-shrink-0">
        <h2 className="text-xl font-semibold text-white">Job Posting</h2>
        <div
          className="rounded-xl p-5"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--surface-elevated)",
          }}
        >
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {jobPosting.title}
          </p>
          <div className="flex items-center gap-3 mt-1" style={{ fontSize: 14 }}>
            {jobPosting.department && (
              <span className="text-[var(--text-muted)]">
                {jobPosting.department}
              </span>
            )}
            {jobPosting.department && jobPosting.location && (
              <span className="size-1 rounded-full bg-[var(--text-muted)]" />
            )}
            {jobPosting.location && (
              <span className="text-[var(--text-muted)]">
                {jobPosting.location}
              </span>
            )}
            {(jobPosting.department || jobPosting.location) &&
              jobPosting.postedAt && (
                <span className="size-1 rounded-full bg-[var(--text-muted)]" />
              )}
            {jobPosting.postedAt && (
              <span className="text-[var(--text-muted)]">
                {jobPosting.postedAt.replace(/\s*ago$/i, "")}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Scrollable candidate lists */}
      <div className="flex flex-col gap-6 px-8 pt-6 pb-8 flex-1 min-h-0 overflow-y-auto">
        {/* Candidate Shortlist */}
        {shortlisted.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-white">
              Candidate Shortlist
            </h2>
            <div className="flex flex-col gap-4">
              {shortlisted.map((c) => (
                <CandidateRow
                  key={c.id}
                  candidate={c}
                  selected={selectedId === c.id}
                  showStar
                  onClick={() => onSelect?.(c.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Top Recommendations */}
        {topRecommendations.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-white">
              Top Recommendations
            </h2>
            <div className="flex flex-col gap-5">
              {topRecommendations.map((c) => (
                <CandidateRow
                  key={c.id}
                  candidate={c}
                  selected={selectedId === c.id}
                  showStar={false}
                  onClick={() => onSelect?.(c.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
