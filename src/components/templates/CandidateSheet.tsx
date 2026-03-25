'use client';

import { useCallback, useState } from "react";
import { Plus, Pencil, ArrowRight, Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { sendLooksGoodClickedIntent, sendTappedIntent } from "@/utils/teleIntent";
import { useVoiceTranscriptIntent } from "@/hooks/useVoiceTranscriptIntent";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";

export interface ExperienceEntry {
  title?: string;
  role?: string;
  company: string;
  is_current?: boolean;
  start_date?: string;
  end_date?: string;
  logo_url?: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  field_of_study?: string;
  year?: string | number;
  logo_url?: string;
}

interface CandidateSheetProps {
  /** Candidate's display name. The AI should always provide it, but the component handles missing values defensively. */
  name?: string;
  /** Role / headline shown below the name, e.g. "Graduate AI Practitioner". */
  title?: string;
  /** URL for the circular avatar image. Falls back to initials. */
  avatarUrl?: string;
  /** Work experience entries from complete_onboarding. */
  experience?: ExperienceEntry[];
  /** Education entries from complete_onboarding. */
  education?: EducationEntry[];
  /** Contextual label shown bottom-left (e.g. "LinkedIn Profile"). */
  footerLeft?: string;
  /** Contextual label shown bottom-right (e.g. "Confirm your details"). */
  footerRight?: string;
  /** Candidate ID from find_candidate — persisted to localStorage for return visits. */
  candidateId?: string;
}

/**
 * Candidate profile bottom sheet — onboarding context.
 *
 * Rendered by DynamicSectionLoader when the AI calls navigateToSection with
 * templateId "CandidateSheet" after completing the LinkedIn registration flow.
 * Shows the profile data the AI invented for complete_onboarding so the user
 * can review (and signal edits back via voice or button taps).
 *
 * Matches Figma node 1484:33997.
 *
 * User signals:
 *   - "user clicked: edit profile"      — pencil icon in header
 *   - "user clicked: add experience"    — Add button in Work Experience section
 *   - "user clicked: add education"     — Add button in Education section
 *   - "user clicked: Looks Good"       — confirmation CTA
 */
export function CandidateSheet({
  name = "",
  title,
  avatarUrl,
  experience = [],
  education = [],
  footerLeft,
  footerRight,
  candidateId,
}: CandidateSheetProps) {
  const [confirmed, setConfirmed] = useState(false);

  const profile_title =
    select_profile_title(experience) || title?.trim() || "Graduate AI Practitioner";
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const handleLooksGood = useCallback(() => {
    if (confirmed) return;
    setConfirmed(true);
    void sendLooksGoodClickedIntent();
  }, [confirmed]);

  useVoiceTranscriptIntent({
    enabled: !confirmed,
    onTranscript: (transcript) => {
      const isLooksGoodIntent =
        transcript === "looks good" ||
        transcript.includes("looks good") ||
        transcript.includes("that looks good") ||
        transcript.includes("this looks good") ||
        transcript.includes("all good") ||
        transcript.includes("proceed");

      if (isLooksGoodIntent) {
        handleLooksGood();
      }
    },
  });

  useSpeechFallbackNudge({
    enabled: !confirmed,
    requiredPhrases: [
      "your linkedin has been connected successfully",
      "do these details look correct",
    ],
    matchMode: "all",
    instruction:
      "[SYSTEM] CandidateSheet is now visible. " +
      "If your immediately previous response did not include required candidate-review speech, your next response MUST say exactly: " +
      '"Your LinkedIn has been connected successfully." and "Do these details look correct?" ' +
      "Do not call any new tool in that response.",
    delayMs: 1600,
  });

  if (confirmed) return null;

  return (
    <BottomSheet bottomOffset={88}>
      <div
        data-testid="candidate-sheet-card"
        className={[
          "relative overflow-hidden rounded-[16px] p-8 flex flex-col gap-6 glass-card top-sheen z-20",
          "max-h-[calc(100svh-32px)] overflow-y-auto",
        ].join(" ")}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative z-10 flex gap-4 items-center">
          {/* Avatar */}
          <div
            data-testid="candidate-sheet-avatar"
            className="size-[60px] rounded-full overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: "var(--avatar-bg)" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[var(--accent-contrast)] text-lg font-semibold select-none">
                {initials}
              </span>
            )}
          </div>

          {/* Name + title + edit icon */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p
                data-testid="candidate-sheet-name"
                className="text-[var(--text-primary)] text-[24px] font-semibold leading-7 truncate"
              >
                {name}
              </p>
              <button
                data-testid="candidate-sheet-edit-btn"
                onClick={() => void sendTappedIntent("edit profile")}
                className="shrink-0 size-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity active:scale-90"
                aria-label="Edit profile"
              >
                <Pencil size={16} className="text-[var(--text-primary)]" />
              </button>
            </div>
            <p
              data-testid="candidate-sheet-title"
              className="text-[var(--text-secondary)] text-[16px] font-normal leading-5 truncate"
            >
              {profile_title}
            </p>
          </div>
        </div>

        {/* ── Work Experience ─────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col gap-4">
          <SectionHeader
            label="Work Experience"
            onAdd={() => void sendTappedIntent("add experience")}
          />

          {experience.length === 0 && (
            <p className="text-[var(--text-subtle)] text-[14px] leading-5">No experience added yet.</p>
          )}

          {experience.map((entry, i) => (
            <ExperienceRow key={i} entry={entry} />
          ))}
        </div>

        {/* ── Education ──────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col gap-4">
          <SectionHeader
            label="Education"
            onAdd={() => void sendTappedIntent("add education")}
          />

          {education.length === 0 && (
            <p className="text-[var(--text-subtle)] text-[14px] leading-5">No education added yet.</p>
          )}

          {education.map((entry, i) => (
            <EducationRow key={i} entry={entry} />
          ))}
        </div>

        {/*
         * Contextual footer — latent capability for when the product evolves
         * beyond the linear onboarding flow. In the current strict state-machine
         * flow the user always knows where they are, so footers are dormant.
         * Uncomment when open-ended navigation makes context anchoring useful.
         *
         * {(footerLeft || footerRight) && (
         *   <div className="relative z-10 flex items-center justify-between px-1">
         *     {footerLeft && (
         *       <span className="text-[var(--text-subtle)] text-xs leading-4 truncate">
         *         {footerLeft}
         *       </span>
         *     )}
         *     {footerRight && (
         *       <span className="text-[var(--text-subtle)] text-xs leading-4 truncate text-right">
         *         {footerRight}
         *       </span>
         *     )}
         *   </div>
         * )}
         */}

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <button
          data-testid="candidate-sheet-looks-good-btn"
          onClick={handleLooksGood}
          disabled={confirmed}
          aria-busy={confirmed}
          className={[
            "relative z-10 w-full h-[52px] btn-primary no-lightboard flex items-center justify-center gap-2",
            "transition-all duration-200 active:scale-95 hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          <span className="text-[var(--accent-contrast)] text-[16px] font-semibold leading-5">
            {confirmed ? "Continuing..." : "Looks Good"}
          </span>
          {confirmed ? (
            <Loader2 size={16} className="text-[var(--accent-contrast)] animate-spin" />
          ) : (
            <ArrowRight size={16} className="text-[var(--accent-contrast)]" />
          )}
        </button>
      </div>
    </BottomSheet>
  );
}

/* ── SectionHeader ──────────────────────────────────────────────────────────── */

function SectionHeader({ label, onAdd }: { label: string; onAdd: () => void }) {
  const slug = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex items-center justify-between">
      <p className="text-[var(--text-primary)] text-[20px] font-semibold leading-6">{label}</p>
      <button
        data-testid={`candidate-sheet-add-${slug}-btn`}
        onClick={onAdd}
        className="flex items-center gap-1 text-[var(--accent)] text-[16px] font-normal leading-5 transition-opacity active:opacity-60 hover:opacity-80"
        aria-label={`Add ${label}`}
      >
        Add
        <Plus size={16} className="text-[var(--accent)]" />
      </button>
    </div>
  );
}

/* ── ExperienceRow ──────────────────────────────────────────────────────────── */

function ExperienceRow({ entry }: { entry: ExperienceEntry }) {
  const dateRange = format_date_range(entry.start_date, entry.end_date);
  const role_title = entry.title || entry.role || "Experience";

  return (
    <div data-testid="candidate-sheet-experience-row" className="flex gap-4 items-center">
      {/* Company logo / placeholder */}
      <div className="size-[48px] bg-white/10 rounded-[8px] overflow-hidden shrink-0 flex items-center justify-center">
        {entry.logo_url ? (
          <img src={entry.logo_url} alt={entry.company} className="w-full h-full object-contain" />
        ) : (
          <span className="text-[var(--text-subtle)] text-[18px] font-bold">
            {entry.company.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 min-w-0">
        <p className="text-[var(--text-primary)] text-[16px] font-semibold leading-5 truncate">
          {role_title}
        </p>
        <div className="flex gap-2 items-center text-[var(--text-secondary)] text-[16px] font-normal leading-5">
          <span className="truncate">{entry.company}</span>
          {dateRange && <span className="shrink-0 text-[var(--text-subtle)]">{dateRange}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── EducationRow ───────────────────────────────────────────────────────────── */

function EducationRow({ entry }: { entry: EducationEntry }) {
  const label = entry.field_of_study
    ? `${entry.degree} (${entry.field_of_study})`
    : entry.degree;

  return (
    <div data-testid="candidate-sheet-education-row" className="flex gap-4 items-start">
      {/* Institution logo / placeholder */}
      <div className="size-[48px] bg-[var(--surface-muted)] rounded-[8px] overflow-hidden shrink-0 flex items-center justify-center">
        {entry.logo_url ? (
          <img
            src={entry.logo_url}
            alt={entry.institution}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-[var(--text-subtle)] text-[18px] font-bold">
            {entry.institution.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 min-w-0">
        <p className="text-[var(--text-primary)] text-[16px] font-semibold leading-5">{label}</p>
        <div className="flex gap-2 items-center text-[var(--text-secondary)] text-[16px] font-normal leading-5">
          <span className="truncate">{entry.institution}</span>
          {entry.year && <span className="shrink-0 text-[var(--text-subtle)]">{entry.year}</span>}
        </div>
      </div>
    </div>
  );
}

function format_date_range(start_date?: string, end_date?: string) {
  if (!start_date && !end_date) return "";
  if (start_date && end_date) return `(${start_date} - ${end_date})`;
  return `(${start_date || end_date})`;
}

function select_profile_title(experience: ExperienceEntry[]) {
  if (!experience.length) return "";

  const current_experience = experience.find((entry) => entry.is_current === true);
  if (current_experience) {
    return current_experience.title || current_experience.role || "";
  }

  const sorted_experience = [...experience].sort((a, b) => {
    const a_date = parse_date_ms(a.end_date) ?? parse_date_ms(a.start_date) ?? 0;
    const b_date = parse_date_ms(b.end_date) ?? parse_date_ms(b.start_date) ?? 0;
    return b_date - a_date;
  });

  return sorted_experience[0]?.title || sorted_experience[0]?.role || "";
}

function parse_date_ms(date_value?: string) {
  if (!date_value) return null;
  const date_ms = Date.parse(date_value);
  return Number.isNaN(date_ms) ? null : date_ms;
}
