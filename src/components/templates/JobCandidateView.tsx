'use client';

import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CandidateSidebar,
  type SidebarCandidate,
  type SidebarJobPosting,
} from "../employer/CandidateSidebar";
import { CandidateDrawer, type CandidateSection } from "../employer/CandidateDrawer";
import { Breadcrumb } from "../employer/Breadcrumb";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface CandidateSkill {
  name: string;
  level: string;
  years: number;
}

interface CandidateProfile {
  id: string;
  name: string;
  city?: string;
  location?: string;
  experience_years?: number;
  skills: CandidateSkill[];
  experience?: Array<{
    title?: string;
    company?: string;
    years?: number;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    field_of_study?: string;
    graduation_year?: number;
  }>;
}

export interface ApplicantWithScore {
  id: string;
  candidate_name: string | null;
  status: "applied" | "reviewing" | "shortlisted" | "rejected";
  matchScore: number;
  candidate_profile?: CandidateProfile;
}

export interface JobCandidateViewProps {
  jobPosting: SidebarJobPosting;
  applicants: ApplicantWithScore[];
  selectedId: string;
  onSelectCandidate: (id: string) => void;
  /** Navigate back to the job posting applicant list. */
  onBack: () => void;
  /** Navigate back to the hiring overview. */
  onNavigateToHiring?: () => void;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function buildSections(profile?: CandidateProfile): CandidateSection[] {
  const sections: CandidateSection[] = [];

  if (profile?.skills && profile.skills.length > 0) {
    sections.push({
      label: "Skills",
      content: (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {profile.skills.map((s) => (
            <span
              key={s.name}
              className="px-2.5 py-1 rounded-full text-xs"
              style={{
                background: "var(--surface-hover)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-secondary)",
              }}
            >
              {s.name} · {s.years}y
            </span>
          ))}
        </div>
      ),
    });
  }

  if (profile?.experience && profile.experience.length > 0) {
    sections.push({
      label: "Experience",
      content: (
        <div className="flex flex-col gap-2 mt-2">
          {profile.experience.map((e, i) => (
            <div key={i} className="text-xs text-[var(--text-muted)]">
              <span className="text-[var(--text-primary)] font-medium">
                {e.title || "Role"}
              </span>
              {e.company && <span> at {e.company}</span>}
              {e.years != null && <span> · {e.years}y</span>}
            </div>
          ))}
        </div>
      ),
    });
  }

  if (profile?.education && profile.education.length > 0) {
    sections.push({
      label: "Education",
      content: (
        <div className="flex flex-col gap-2 mt-2">
          {profile.education.map((e, i) => (
            <div key={i} className="text-xs text-[var(--text-muted)]">
              <span className="text-[var(--text-primary)] font-medium">
                {e.degree || "Degree"}
              </span>
              {e.institution && <span> — {e.institution}</span>}
              {e.graduation_year && <span> ({e.graduation_year})</span>}
            </div>
          ))}
        </div>
      ),
    });
  }

  return sections;
}

function getMatchLabel(score: number): string {
  if (score >= 93) return "Top Applicant";
  if (score >= 85) return "Close Match";
  if (score >= 75) return "Good Match";
  return "Potential Match";
}

/* ── Component ───────────────────────────────────────────────────────────── */

export function JobCandidateView({
  jobPosting,
  applicants,
  selectedId,
  onSelectCandidate,
  onBack,
  onNavigateToHiring,
}: JobCandidateViewProps) {
  const sidebarCandidates: SidebarCandidate[] = useMemo(
    () =>
      applicants.map((a) => ({
        id: a.id,
        name: a.candidate_name || a.candidate_profile?.name || "Unknown",
        matchScore: a.matchScore,
        starred: a.status === "shortlisted",
        status: a.status,
      })),
    [applicants],
  );

  const selected = useMemo(
    () => applicants.find((a) => a.id === selectedId),
    [applicants, selectedId],
  );

  const selectedIdx = useMemo(
    () => applicants.findIndex((a) => a.id === selectedId),
    [applicants, selectedId],
  );

  const goNext = useCallback(() => {
    if (selectedIdx < applicants.length - 1)
      onSelectCandidate(applicants[selectedIdx + 1].id);
  }, [applicants, selectedIdx, onSelectCandidate]);

  const goPrev = useCallback(() => {
    if (selectedIdx > 0) onSelectCandidate(applicants[selectedIdx - 1].id);
  }, [applicants, selectedIdx, onSelectCandidate]);

  const profile = selected?.candidate_profile;
  const name =
    selected?.candidate_name || profile?.name || "Unknown";
  const role = profile?.experience?.[0]?.title || "Candidate";
  const location = profile?.city || profile?.location;
  const sections = useMemo(() => buildSections(profile), [profile]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-full w-full overflow-hidden p-[24px]"
    >
      {/* Breadcrumb */}
      <div className=" pt-4 pb-[24px] flex-shrink-0">
        <Breadcrumb
          segments={[
            { label: "Hiring", onClick: onNavigateToHiring },
            { label: jobPosting.title, onClick: onBack },
            { label: name },
          ]}
        />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden gap-[24px]">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 h-full">
        <CandidateSidebar
          jobPosting={jobPosting}
          candidates={sidebarCandidates}
          selectedId={selectedId}
          onSelect={onSelectCandidate}
        />
      </div>

      {/* Drawer area */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <CandidateDrawer
                jobTitle={jobPosting.title}
                name={name}
                role={role}
                location={location}
                starred={selected.status === "shortlisted"}
                matchLabel={getMatchLabel(selected.matchScore)}
                matchScore={selected.matchScore}
                matchDescription={`${selected.matchScore}% skill alignment with the ${jobPosting.title} role requirements.`}
                sections={sections}
                onClose={onBack}
                onNext={selectedIdx < applicants.length - 1 ? goNext : undefined}
                onPrev={selectedIdx > 0 ? goPrev : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </motion.div>
  );
}
