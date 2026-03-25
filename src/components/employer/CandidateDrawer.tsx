'use client';

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  X,
  Star,
  Maximize2,
  ChevronUp,
  ChevronDown,
  MessageCircle,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface CandidateSection {
  label: string;
  content?: React.ReactNode;
}

export interface CandidateDrawerProps {
  /** Job title shown in the compact header, e.g. "Senior AI Developer". */
  jobTitle: string;
  /** Candidate display name. */
  name: string;
  /** Subtitle line, e.g. "AI Practitioner". */
  role?: string;
  /** Secondary subtitle, e.g. "Jeddah". */
  location?: string;
  /** Avatar URL. Falls back to initials. */
  avatarUrl?: string;
  /** Whether the candidate is starred / bookmarked. */
  starred?: boolean;
  /** Match label shown on the green badge, e.g. "Close Match" or "Top Applicant". */
  matchLabel?: string;
  /** Short description under the match label. */
  matchDescription?: string;
  /** Numeric match score (0–100). */
  matchScore?: number;
  /** Content sections rendered in the body. */
  sections?: CandidateSection[];
  /** Start in expanded mode. */
  defaultExpanded?: boolean;
  /** Called when the user taps the back arrow (compact) or collapse chevron (expanded). */
  onClose?: () => void;
  /** Called when "Chat about this candidate" is pressed. */
  onChat?: () => void;
  /** Called when starred state toggles. */
  onToggleStar?: () => void;
  /** Navigate to next candidate (expanded mode). */
  onNext?: () => void;
  /** Navigate to previous candidate (expanded mode). */
  onPrev?: () => void;
}

/* ── Shared sub-components ───────────────────────────────────────────────── */

function Avatar({ url, name }: { url?: string; name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="size-14 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
      style={{ background: "var(--avatar-bg)" }}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          className="size-full object-cover"
        />
      ) : (
        <span className="text-sm font-bold text-black/70">{initials}</span>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      className="size-11 rounded-full border-[3px] flex items-center justify-center flex-shrink-0"
      style={{ borderColor: "var(--accent)" }}
    >
      <span className="text-sm font-semibold text-white">{score}</span>
    </div>
  );
}

function MatchCard({
  label,
  description,
  score,
}: {
  label: string;
  description?: string;
  score?: number;
}) {
  return (
    <div
      className="flex items-start justify-between rounded-xl p-4 w-full"
      style={{ background: "var(--accent-surface)" }}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && (
          <p className="text-xs text-white/60 leading-relaxed">{description}</p>
        )}
      </div>
      {score != null && <ScoreBadge score={score} />}
    </div>
  );
}

function SectionCard({
  section,
  className = "",
}: {
  section: CandidateSection;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col ${className}`}
      style={{
        background: "var(--surface-elevated)",
        minHeight: 80,
      }}
    >
      <p className="text-sm font-semibold text-white">{section.label}</p>
      {section.content && <div className="mt-2 flex-1">{section.content}</div>}
    </div>
  );
}

function ChatButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 self-end h-10 px-4 rounded-full text-sm font-semibold transition-colors flex-shrink-0"
      style={{
        background: "var(--accent-medium)",
        color: "var(--text-secondary)",
      }}
    >
      <MessageCircle size={18} />
      Chat about this candidate
    </button>
  );
}

/* ── Default sections (always rendered, even without content) ────────────── */

const DEFAULT_SECTION_LABELS = [
  "Application Progress",
  "Skill Match",
  "Certifications",
  "Experience",
  "Education",
];

function mergedSections(provided: CandidateSection[]): CandidateSection[] {
  const byLabel = new Map(provided.map((s) => [s.label, s]));
  return DEFAULT_SECTION_LABELS.map(
    (label) => byLabel.get(label) ?? { label },
  );
}

/* ── Animation variants ──────────────────────────────────────────────────── */

const LAYOUT_SPRING = { type: "spring" as const, stiffness: 340, damping: 34 };

/* ── Main component ──────────────────────────────────────────────────────── */

export function CandidateDrawer({
  jobTitle,
  name,
  role,
  location,
  avatarUrl,
  starred = false,
  matchLabel = "Close Match",
  matchDescription,
  matchScore,
  sections = [],
  defaultExpanded = false,
  onClose,
  onChat,
  onToggleStar,
  onNext,
  onPrev,
}: CandidateDrawerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpand = useCallback(() => setExpanded((v) => !v), []);

  const allSections = mergedSections(sections);
  const topSections = allSections.slice(0, 1);
  const gridSections = allSections.slice(1);

  return (
    <motion.div
      layout
      transition={LAYOUT_SPRING}
      className="flex flex-col rounded-2xl overflow-hidden h-full"
      style={{
        background: "var(--surface-elevated)",
        width: expanded ? "100%" : 676,
        maxWidth: "100%",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          /* ── EXPANDED ────────────────────────────────────────────────── */
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4 p-8 size-full overflow-y-auto"
          >
            {/* Profile row */}
            <div className="flex items-start gap-4">
              <Avatar url={avatarUrl} name={name} />

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold text-white truncate">
                    {name}
                  </h2>
                  <button
                    type="button"
                    onClick={onToggleStar}
                    className="flex-shrink-0"
                  >
                    <Star
                      size={20}
                      className={
                        starred
                          ? "fill-current text-[var(--accent)]"
                          : "text-white/30"
                      }
                    />
                  </button>
                </div>

                {(role || location) && (
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    {role && <span>{role}</span>}
                    {role && location && (
                      <span className="size-1 rounded-full bg-white/50" />
                    )}
                    {location && <span>{location}</span>}
                  </div>
                )}
              </div>

              {/* Prev / Next navigation */}
              <div className="flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={onPrev}
                  className="p-0.5 rounded text-white/30 hover:text-white/70 transition-colors"
                >
                  <ChevronUp size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    onNext?.();
                  }}
                  className="p-0.5 rounded text-white/30 hover:text-white/70 transition-colors"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            </div>

            {/* Match card */}
            <MatchCard
              label={matchLabel}
              description={matchDescription}
              score={matchScore}
            />

            {/* Top section — full width */}
            {topSections.map((s) => (
              <SectionCard key={s.label} section={s} className="h-[167px]" />
            ))}

            {/* Grid sections — 2 columns */}
            {gridSections.length > 0 && (
              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                {gridSections.map((s) => (
                  <SectionCard key={s.label} section={s} className="h-full" />
                ))}
              </div>
            )}

            {/* Chat CTA */}
            <ChatButton onClick={onChat} />
          </motion.div>
        ) : (
          /* ── COMPACT ─────────────────────────────────────────────────── */
          <motion.div
            key="compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6 p-8 size-full overflow-y-auto"
          >
            {/* Header row */}
            <div className="flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={20} className="text-white" />
                <span className="text-lg text-white">{jobTitle}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Inner container */}
            <div
              className="flex flex-col flex-1 min-h-0 rounded-xl p-4"
              style={{ background: "var(--surface-elevated)" }}
            >
              {/* Profile row */}
              <div className="flex items-start gap-4 flex-shrink-0">
                <Avatar url={avatarUrl} name={name} />

                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold text-white truncate">
                        {name}
                      </h2>
                      <button
                        type="button"
                        onClick={onToggleStar}
                        className="flex-shrink-0"
                      >
                        <Star
                          size={20}
                          className={
                            starred
                              ? "fill-current text-[var(--accent)]"
                              : "text-white/30"
                          }
                        />
                      </button>
                    </div>

                    {/* Enlarge icon */}
                    <button
                      type="button"
                      onClick={toggleExpand}
                      className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
                    >
                      <Maximize2 size={20} />
                    </button>
                  </div>

                  {(role || location) && (
                    <div className="flex items-center gap-3 text-sm text-white/50">
                      {role && <span>{role}</span>}
                      {role && location && (
                        <span className="size-1 rounded-full bg-white/50" />
                      )}
                      {location && <span>{location}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Match card */}
              <div className="mt-4 flex-shrink-0">
                <MatchCard
                  label={(matchScore ?? 0) >= 75 ? "Top Applicant" : "Close Match"}
                  description={matchDescription}
                  score={matchScore}
                />
              </div>

              {/* Sections — vertical stack */}
              <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0 overflow-y-auto">
                {allSections.map((s) => (
                  <SectionCard key={s.label} section={s} className="flex-1" />
                ))}
              </div>

              {/* Chat CTA */}
              <div className="mt-4 flex-shrink-0">
                <ChatButton onClick={onChat} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
