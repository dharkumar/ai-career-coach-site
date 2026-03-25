'use client';

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { motion } from "motion/react";
import { notifyTele } from "@/utils/teleUtils";
import { useCurrentSection } from "@/contexts/CurrentSectionContext";

const TEMPLATES_WITH_CLOSE_BTN = new Set([
  "SkillsDetail",
  "SkillCoverageSheet",
  "SkillTestFlow",
  "MarketRelevanceDetail",
  "CareerGrowthDetail",
  "MarketRelevanceSheet",
  "CareerGrowthSheet",
  "MyLearningTemplate",
  "JobSearchSheet",
  "JobDetailSheet",
  "EligibilitySheet",
  "JobApplicationsSheet",
  "PastApplicationsSheet",
  "CardStackJobPreviewSheet",
  "TargetRoleTemplate",
]);

/**
 * Persistent top-right learning button.
 *
 * Sends `user clicked: my learning` to Tele. Shifts left (right-[65px])
 * when the current template renders its own close button at right-4,
 * otherwise sits at right-4.
 */
export function LearningBtn() {
  const [active, setActive] = useState(false);
  const { effectiveTemplateId } = useCurrentSection();

  const hasCloseBtn = TEMPLATES_WITH_CLOSE_BTN.has(effectiveTemplateId ?? "");

  const handleClick = () => {
    void notifyTele("user clicked: my learning");
  };

  return (
    <button
      data-testid="learning-btn"
      onClick={handleClick}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      className="absolute pointer-events-auto transition-all duration-200 active:scale-95 top-4"
      style={{ zIndex: 100, right: hasCloseBtn ? 64 : 16 }}
      aria-label="Go to my learning"
    >
      <motion.div
        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300"
        animate={{
          scale: 1,
          boxShadow: active
            ? "0px 0px 20px 0px var(--accent-strong)"
            : "0px 0px 0px 0px transparent",
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          background: "var(--surface-muted)",
          border: `1px solid ${active ? "var(--accent-strong)" : "var(--border-strong)"}`,
        }}
      >
        <GraduationCap size={18} style={{ color: `${active ? "var(--accent)" : "var(--text-primary)"}` }} />
      </motion.div>
    </button>
  );
}
