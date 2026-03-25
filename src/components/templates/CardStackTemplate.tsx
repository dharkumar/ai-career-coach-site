'use client';

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { CardStack } from "@/components/ui/CardStack";
import { sendJobOpenedIntent, sendJobClosedIntent, sendCardsDismissedIntent } from "@/utils/teleIntent";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import type { JobListing, BackendJobItem } from "@/types/flow";

/**
 * Sanitizes a string value for safe display:
 * - Strips newlines and backslashes
 * - Trims whitespace
 * - Truncates description to 120 chars at word boundary
 */
function sanitizeString(value: string | undefined | null, maxLength?: number): string | undefined {
  if (!value) return undefined;
  let s = value.replace(/[\r\n]+/g, " ").replace(/\\/g, "").trim();
  if (maxLength && s.length > maxLength) {
    s = s.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
  }
  return s || undefined;
}

/**
 * Maps raw get_jobs_by_skills items to the JobListing interface expected by CardStack.
 * All field mapping and sanitization is handled here so the AI only needs to pass the
 * raw backend array — no mapping or sanitization required in the prompt.
 *
 * Accepts both wrapped (`{ job: { id, title, … } }`) and flat (`{ id, title, … }`)
 * formats so the template is resilient to AI payload variations.
 */
function mapBackendJob(item: BackendJobItem): JobListing | null {
  const j = item?.job ?? (item as unknown as BackendJobItem["job"]);
  if (!j?.id || !j?.title) return null;
  return {
    id: j.id,
    title: sanitizeString(j.title) ?? j.id,
    company: sanitizeString(j.company) ?? "",
    location: sanitizeString(j.location) ?? "",
    ...(j.salary_range ? { salaryRange: sanitizeString(j.salary_range) } : {}),
    ...(j.description ? { description: sanitizeString(j.description, 120) } : {}),
    ...(j.required_skills?.length
      ? { tags: j.required_skills.map((s) => s.name).filter(Boolean) }
      : {}),
  };
}

interface CardStackTemplateProps {
  /**
   * Raw items from get_jobs_by_skills — the AI passes these directly without mapping.
   * CardStackTemplate handles all field renaming and sanitization.
   */
  rawJobs?: BackendJobItem[];
  /** Already-mapped job listings (legacy / direct use). */
  jobs?: JobListing[];
  /** Job ID to visually highlight, set by the AI to draw attention to a specific role. */
  highlightedJobId?: string;
  /** Contextual label shown bottom-left (e.g. "Mobeus Career"). */
  footerLeft?: string;
  /** Contextual label shown bottom-right (e.g. "3 Matches Found"). */
  footerRight?: string;
}

/**
 * Job discovery template — wraps the CardStack component.
 *
 * Persistent: stays visible until the AI calls navigateToSection with a new template.
 * No question bubble — TeleSpeechBubble in BaseLayout handles all speech display.
 *
 * Accepts either:
 *  - rawJobs: raw get_jobs_by_skills items → mapped and sanitized here
 *  - jobs: already-mapped JobListing array (legacy)
 *
 * After the cards render, sends a hidden high-priority instruction so the AI
 * speaks the tap/swipe instructions on its next response.
 *
 * Hybrid bottom sheet:
 *   - Card tap → opens CardStackJobPreviewSheet locally (Figma 6958:15709; not JobDetailSheet / browse flow)
 *   - Emits a canonical intent signal for opened job so the AI can acknowledge and explain
 *   - AI can optionally call navigateToSection with updated props to highlight a card
 */
export function CardStackTemplate({ rawJobs, jobs: jobsProp, highlightedJobId, footerLeft, footerRight }: CardStackTemplateProps) {
  const resolvedJobs: JobListing[] = rawJobs
    ? (rawJobs.slice(0, 3).map(mapBackendJob).filter(Boolean) as JobListing[])
    : (jobsProp ?? []);

  const isLoading = resolvedJobs.length === 0;
  const [dismissed, setDismissed] = useState(false);
  const hasDismissedRef = useRef(false);

  const dismissAndSignalCards = useCallback(() => {
    if (hasDismissedRef.current) return;
    hasDismissedRef.current = true;
    setDismissed(true);
    void sendCardsDismissedIntent();
  }, []);

  // Screen tap → navigate to Dashboard
  const handleBackdropTap = useCallback(() => {
    dismissAndSignalCards();
  }, [dismissAndSignalCards]);

  // All cards swiped → navigate to Dashboard (same signal as backdrop tap)
  const handleAllCardsSwiped = useCallback(() => {
    dismissAndSignalCards();
  }, [dismissAndSignalCards]);

  useSpeechFallbackNudge({
    enabled: !isLoading,
    requiredPhrases: ["tap each job to view more information"],
    instruction:
      "[SYSTEM] CardStack is visible. " +
      'If your immediately previous response did not speak the card instructions, your next response MUST say exactly: "Tap each job to view more information." "Swipe right to add a job to your shortlist." "Swipe left to dismiss." ' +
      "Do not call any new tool in that response.",
    delayMs: 1400,
  });

  const handleJobSelected = (job: JobListing) => {
    void sendJobOpenedIntent(job.title, job.company);
  };

  const handleJobClosed = (job: JobListing) => {
    void sendJobClosedIntent(job.title, job.company);
  };

  return (
    <div data-testid="card-stack-template" className="absolute inset-0 pointer-events-none">
      {/* Full-screen backdrop — tapping anywhere outside the cards proceeds to Dashboard */}
      {!isLoading && !dismissed && (
        <div
          data-testid="card-stack-backdrop"
          className="absolute inset-0 pointer-events-auto"
          onClick={handleBackdropTap}
        />
      )}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            data-testid="card-stack-template-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ paddingBottom: 96 }}
          >
            <Loader2 size={20} className="text-[var(--text-subtle)] animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="stack"
            data-testid="card-stack-template-stack"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute pointer-events-auto"
            style={{ bottom: 88, left: 16, right: 16 }}
          >
            {/*
             * Contextual footer — latent capability for when the product evolves
             * beyond the linear onboarding flow. Uncomment when open-ended
             * navigation makes context anchoring useful.
             *
             * {(footerLeft || footerRight) && (
             *   <div className="flex items-center justify-between px-2 mb-2">
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
            <CardStack
              jobs={resolvedJobs}
              highlightedJobId={highlightedJobId}
              onJobSelected={handleJobSelected}
              onJobClosed={handleJobClosed}
              onAllCardsSwiped={handleAllCardsSwiped}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
