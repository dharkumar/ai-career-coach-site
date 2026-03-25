'use client';

import { useState, useRef, useCallback, useMemo, Suspense } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "motion/react";
import { GlassmorphicJobCard } from "../GlassmorphicJobCard";

import type { JobListing } from "@/types/flow";
import { TEMPLATE_REGISTRY } from "@/data/templateRegistry";
import { useVoiceActions, type VoiceAction } from "@/hooks/useVoiceActions";
import { jobListingVoicePhrases, CARD_STACK_FRONT_CARD_PHRASES } from "@/utils/voiceMatch";

const CardStackJobPreviewLazy = TEMPLATE_REGISTRY.CardStackJobPreviewSheet;

interface CardStackProps {
  jobs: JobListing[];
  highlightedJobId?: string;
  onFirstInteraction?: () => void;
  /** Called when the user taps a card to open the detail sheet. */
  onJobSelected?: (job: JobListing) => void;
  /** Called when the user closes the job detail sheet — local close, no navigation. */
  onJobClosed?: (job: JobListing) => void;
  /** Called when the user has swiped away every card in the stack. */
  onAllCardsSwiped?: () => void;
}

const SWIPE_THRESHOLD = 80;
const EXIT_DISTANCE = 600;
/** Visible card body height (padding + header + meta); keep in sync with GlassmorphicJobCard / Figma 6958:15579 */
const CARD_STACK_CARD_BODY_PX = 184;

interface SwipeableCardProps {
  job: JobListing;
  stackIndex: number;
  totalCards: number;
  isTop: boolean;
  onSwipedOff: (dir: "left" | "right") => void;
  onTap: () => void;
  isHighlighted: boolean;
}

function SwipeableCard({ job, stackIndex, totalCards, isTop, onSwipedOff, onTap, isHighlighted }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-14, 0, 14]);
  const isDragging = useRef(false);

  // Card chrome matches Figma Design System — Glassmorphic Job Card (node 6958:15579) in GlassmorphicJobCard.
  // Figma stacking: front card (stackIndex=0) sits at the BOTTOM of the container
  // so back cards' rounded tops peek above it.
  //   stackIndex=0 (front): top = (totalCards-1)*12  e.g. 24 for 3 cards
  //   stackIndex=1 (mid):   top = 12
  //   stackIndex=2 (back):  top = 0   ← only top 12px visible above front card
  const topOffset = (totalCards - 1 - stackIndex) * 12;

  const handleDragEnd = useCallback(
    async (_e: unknown, info: { offset: { x: number } }) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        await animate(x, EXIT_DISTANCE, { duration: 0.3, ease: [0.16, 1, 0.3, 1] });
        onSwipedOff("right");
      } else if (info.offset.x < -SWIPE_THRESHOLD) {
        await animate(x, -EXIT_DISTANCE, { duration: 0.3, ease: [0.16, 1, 0.3, 1] });
        onSwipedOff("left");
      }
    },
    [x, onSwipedOff]
  );

  return (
    <motion.div
      data-testid={`card-stack-card-${job.id}`}
      animate={{ top: topOffset }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      style={{
        position: "absolute",
        top: topOffset,
        left: 0,
        right: 0,
        // Front card has the highest z-index so it covers everything below it
        zIndex: 10 - stackIndex,
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        cursor: isTop ? "grab" : "default",
        touchAction: "pan-y",
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragStart={() => { isDragging.current = true; }}
      onDragEnd={(e, info) => {
        setTimeout(() => { isDragging.current = false; }, 50);
        if (isTop) handleDragEnd(e, info);
      }}
      onClick={() => {
        if (isTop && !isDragging.current) onTap();
      }}
      whileDrag={{ cursor: "grabbing" }}
    >
      <GlassmorphicJobCard job={job} isHighlighted={isHighlighted} />
    </motion.div>
  );
}

export function CardStack({ jobs, highlightedJobId, onFirstInteraction, onJobSelected, onJobClosed, onAllCardsSwiped }: CardStackProps) {
  const [topIndex, setTopIndex] = useState(0);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const hasInteracted = useRef(false);

  const visibleJobs = jobs.slice(topIndex, topIndex + 3);

  const handleSwipedOff = useCallback((_dir: "left" | "right") => {
    const next = topIndex + 1;
    setTopIndex(next);
    // Fire once all cards have been swiped away.
    // Keep this outside the state updater to avoid render-phase parent updates.
    if (next >= jobs.length) {
      onAllCardsSwiped?.();
    }
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      onFirstInteraction?.();
    }
  }, [topIndex, onFirstInteraction, jobs.length, onAllCardsSwiped]);

  const handleCardTap = useCallback((job: JobListing) => {
    setSelectedJob(job);
    onJobSelected?.(job);
  }, [onJobSelected]);

  const frontJob = visibleJobs[0] ?? null;
  const jobVoiceActions = useMemo((): VoiceAction[] => {
    const actions: VoiceAction[] = jobs.map((job) => ({
      phrases: jobListingVoicePhrases(job),
      action: () => handleCardTap(job),
    }));
    if (frontJob) {
      actions.push({
        phrases: [...CARD_STACK_FRONT_CARD_PHRASES],
        action: () => handleCardTap(frontJob),
      });
    }
    return actions;
  }, [jobs, frontJob, handleCardTap]);

  useVoiceActions(jobVoiceActions, selectedJob == null && jobs.length > 0);

  if (visibleJobs.length === 0) {
    return (
      <div data-testid="card-stack-empty" className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-[var(--text-subtle)] text-[16px]">You've reviewed all matches.</p>
      </div>
    );
  }

  const totalCards = visibleJobs.length;
  const containerHeight = CARD_STACK_CARD_BODY_PX + (totalCards - 1) * 12;

  return (
    <>
      {/* Card stack — clipped so only front card + peeking tops of back cards show */}
      <div data-testid="card-stack" className="relative overflow-hidden" style={{ height: containerHeight }}>
        {/* Render back→front so front card's z-index wins over back cards */}
        {[...visibleJobs].reverse().map((job, reversedIdx) => {
          const stackIndex = visibleJobs.length - 1 - reversedIdx;
          const isTop = stackIndex === 0;
          return (
            <SwipeableCard
              key={job.id}
              job={job}
              stackIndex={stackIndex}
              totalCards={totalCards}
              isTop={isTop}
              onSwipedOff={handleSwipedOff}
              onTap={() => handleCardTap(job)}
              isHighlighted={job.id === highlightedJobId}
            />
          );
        })}
      </div>

      {/* Job preview bottom sheet (CardStack only — Figma 6958:15709) */}
      <AnimatePresence>
        {selectedJob && (
          <Suspense key={selectedJob.id} fallback={null}>
            <CardStackJobPreviewLazy
              jobId={selectedJob.id}
              title={selectedJob.title}
              company={selectedJob.company}
              companyLogo={selectedJob.companyLogo}
              location={selectedJob.location}
              salaryRange={selectedJob.salaryRange}
              description={selectedJob.description}
              matchScore={selectedJob.matchScore}
              fitCategory={selectedJob.fitCategory}
              aiSummary={selectedJob.aiSummary}
              postedAt={selectedJob.postedAt}
              onClose={() => {
                onJobClosed?.(selectedJob);
                setSelectedJob(null);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}
