'use client';

import React, { Suspense, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GenerativeSection } from "@/types/flow";
import { TEMPLATE_REGISTRY, REQUIRED_PROPS } from "@/data/templateRegistry";
import { informTele } from "@/utils/teleUtils";

const SELF_ANIMATED_TEMPLATES = new Set([
  "JobDetailSheet",
  "JobSearchSheet",
  "CardStackJobPreviewSheet",
  "EligibilitySheet",
  "CloseGapSheet",
  "JobApplicationsSheet",
  "PastApplicationsSheet",
  "SkillCoverageSheet",
  "MarketRelevanceSheet",
  "CareerGrowthSheet",
  "MyLearningTemplate",
  "TargetRoleTemplate",
]);

const SOLID_BG_TEMPLATES = new Set([
  "JobDetailSheet",
  "EligibilitySheet",
]);

interface DynamicSectionLoaderProps {
  sections: GenerativeSection[];
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * Renders ALL active sections sent by the Runtime Agent via navigateToSection.
 *
 * Each section is rendered as an `absolute inset-0` layer stacked in array order
 * (first section = bottom, last section = top). This enables simultaneous
 * composition, e.g. Dashboard (profile button) + ProfileSheet (bottom card)
 * or Dashboard + JobSearchSheet, etc.
 *
 * AnimatePresence handles fade-in/fade-out whenever the sections array changes.
 *
 * Validation (required props + invalid templateId) runs against the LAST section
 * in the array (the most recently requested template). On drift, every 10 loads
 * the AI receives a REMINDER to always call navigateToSection.
 */
export function DynamicSectionLoader({ sections }: DynamicSectionLoaderProps) {
  // Validation runs on the last (most recently added) section.
  const current = sections[sections.length - 1];
  const loadCountRef = useRef(0);
  const prevIdRef = useRef<string>("");

  useEffect(() => {
    if (!current) return;

    if (current.id !== prevIdRef.current) {
      prevIdRef.current = current.id;
      loadCountRef.current += 1;

      if (loadCountRef.current % 10 === 0) {
        informTele(
          "[REMINDER] You MUST call navigateToSection on EVERY conversational turn. Never respond with text only. " +
            "Valid templateIds: EmptyScreen, WelcomeLanding, GlassmorphicOptions, RegistrationForm, LoadingGeneral, LoadingLinkedIn, CardStack, CardStackJobPreviewSheet, Dashboard, ProfileSheet, CandidateSheet, JobSearchSheet, JobDetailSheet, EligibilitySheet, CloseGapSheet, JobApplicationsSheet, PastApplicationsSheet, SkillsDetail, MarketRelevanceDetail, CareerGrowthDetail, MarketRelevanceSheet, CareerGrowthSheet, MyLearningTemplate, TargetRoleTemplate."
        );
      }
    }

    // Validate required props on the newest section only
    const required = REQUIRED_PROPS[current.templateId] ?? [];
    const missing = required.filter(
      (k) => !(k in current.props) || current.props[k] == null
    );
    if (missing.length > 0) {
      informTele(
        `[CORRECTION NEEDED] Template "${current.templateId}" is missing required props: ${missing.join(", ")}. ` +
          `Call navigateToSection again with all required props included.`
      );
    }
  }, [current]);

  useEffect(() => {
    if (!current || TEMPLATE_REGISTRY[current.templateId]) return;
    informTele(
      `[TEMPLATE ERROR] templateId "${current.templateId}" not found. ` +
        `Valid templateIds: EmptyScreen, WelcomeLanding, GlassmorphicOptions, RegistrationForm, LoadingGeneral, LoadingLinkedIn, CardStack, CardStackJobPreviewSheet, Dashboard, ProfileSheet, CandidateSheet, JobSearchSheet, JobDetailSheet, EligibilitySheet, CloseGapSheet, JobApplicationsSheet, PastApplicationsSheet, SkillsDetail, MarketRelevanceDetail, CareerGrowthDetail, MarketRelevanceSheet, CareerGrowthSheet, MyLearningTemplate, TargetRoleTemplate. ` +
        `Call navigateToSection with a valid templateId.`
    );
  }, [current?.templateId]);

  if (sections.length === 0) return null;

  return (
    /*
     * AnimatePresence tracks section additions and removals by key (section.id).
     * Sections are stacked in order — the last array entry renders on top.
     * mode is NOT "wait" so sections animate in/out concurrently.
     */
    <AnimatePresence>
      {sections.map((section) => {
        const Template = TEMPLATE_REGISTRY[section.templateId];

        if (!Template) {
          return (
            <motion.div
              key={section.id}
              data-testid="section-not-found"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[var(--bg)]"
            />
          );
        }

        const sanitizedProps = Object.fromEntries(
          Object.entries(section.props).filter(([, v]) => v !== null)
        );

        const skipFade = SELF_ANIMATED_TEMPLATES.has(section.templateId);

        if (skipFade) {
          const needsSolidBg = SOLID_BG_TEMPLATES.has(section.templateId);
          return (
            <div
              key={section.id}
              data-testid={`section-${section.templateId}`}
              className={`absolute inset-0${needsSolidBg ? " bg-[var(--bg-deep)] no-lightboard" : ""}`}
            >
              <ErrorBoundary fallback={<div className="w-full h-full" />}>
                <Suspense fallback={<div className="w-full h-full" />}>
                  <Template {...sanitizedProps} />
                </Suspense>
              </ErrorBoundary>
            </div>
          );
        }

        return (
          <motion.div
            key={section.id}
            data-testid={`section-${section.templateId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <ErrorBoundary fallback={<div className="w-full h-full" />}>
              <Suspense fallback={<div className="w-full h-full" />}>
                <Template {...sanitizedProps} />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
