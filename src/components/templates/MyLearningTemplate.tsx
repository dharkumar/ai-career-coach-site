'use client';

import { useState, useMemo, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Video, BookOpen, Terminal, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { completeLearning, prefetchAfterLearning } from "@/lib/mcpBridge";
import { notifyTele, teleAcknowledge } from "@/utils/teleUtils";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions, type VoiceAction } from "@/hooks/useVoiceActions";

/* ── Types ──────────────────────────────────────────────────────────────── */

type PlanPhase = "plan" | "customize" | "my-learning" | "lesson-video" | "lesson-reading";
type LessonType = "VIDEO" | "READING" | "HANDS-ON";
type Provider = "aws" | "pearson" | "google-cloud";

interface LessonItem {
  type: LessonType;
  duration: string;
  title: string;
  provider: Provider;
}

interface PlanSection {
  id: string;
  number: number;
  title: string;
  lessonCount: string;
  lessons: LessonItem[];
}

interface TopicOption {
  name: string;
  subtitle: string;
  hours: string;
}

interface MyLearningTemplateProps {
  candidateId?: string;
  /** Starting phase — "my-learning" when opened as a template, "plan" from SkillTestFlow */
  initialPhase?: PlanPhase;
  /** X button — returns to SkillTestFlow landing */
  onBack?: () => void;
  /** Finish Course — calls completeLearning then navigates to ProfileSheet */
  onClose?: () => void;
}

/* ── Data ────────────────────────────────────────────────────────────────── */

const SECTIONS_BASE: PlanSection[] = [
  {
    id: "s1",
    number: 1,
    title: "Container Fundamentals",
    lessonCount: "3 lessons",
    lessons: [
      { type: "VIDEO",    duration: "30 min", title: "Introduction to Kubernetes",  provider: "aws" },
      { type: "READING",  duration: "15 min", title: "Building Your First Cluster", provider: "pearson" },
      { type: "HANDS-ON", duration: "45 min", title: "Hands-on Lab Setup",           provider: "google-cloud" },
    ],
  },
  {
    id: "s2",
    number: 2,
    title: "Level-up Validation",
    lessonCount: "3 lessons + test",
    lessons: [
      { type: "VIDEO",    duration: "30 min", title: "Production Strategies",    provider: "pearson" },
      { type: "READING",  duration: "15 min", title: "Performance Optimization", provider: "aws" },
      { type: "HANDS-ON", duration: "45 min", title: "Real-world Scenario Lab",  provider: "aws" },
    ],
  },
];

const SECTION_OPERATORS: PlanSection = {
  id: "s3",
  number: 3,
  title: "Deep Dive: Operators",
  lessonCount: "3 lessons",
  lessons: [
    { type: "VIDEO",    duration: "30 min", title: "Kubernetes Operators Fundamentals", provider: "aws" },
    { type: "READING",  duration: "15 min", title: "Custom Resource Definitions",        provider: "pearson" },
    { type: "HANDS-ON", duration: "45 min", title: "Build Your First Operator",          provider: "google-cloud" },
  ],
};

const FORMAT_OPTIONS = [
  "More video",
  "More hands-on",
  "More reading",
  "More conversations",
  "Balanced mix",
];

const TOPIC_OPTIONS: TopicOption[] = [
  { name: "Helm Charts",           subtitle: "Used in 3 of your saved jobs",    hours: "+2 hours"   },
  { name: "Kubernetes Operators",  subtitle: "Required for Senior AI Architect", hours: "+3 hours"   },
  { name: "Service Mesh Advanced", subtitle: "Used in 2 of your saved jobs",     hours: "+2.5 hours" },
  { name: "Cloud-Native Security", subtitle: "High demand in market",            hours: "+1.5 hours" },
];

/* ── Sub-components ──────────────────────────────────────────────────────── */

function ProviderLogo({ provider }: { provider: Provider }) {
  const base = "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden";
  if (provider === "aws") {
    return (
      <div className={base} style={{ background: "var(--brand-aws)" }}>
        <img
          src="https://cdn.simpleicons.org/amazonaws/FF9900"
          alt="AWS"
          className="w-5 h-5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    );
  }
  if (provider === "pearson") {
    return (
      <div className={base} style={{ background: "var(--brand-pearson)" }}>
        <span className="text-white text-sm font-bold">P</span>
      </div>
    );
  }
  return (
    <div className={base} style={{ background: "var(--text-primary)" }}>
      <img
        src="https://cdn.simpleicons.org/googlecloud"
        alt="GCP"
        className="w-5 h-5"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

function LessonTypeBadge({ type, duration }: { type: LessonType; duration: string }) {
  const Icon = type === "VIDEO" ? Video : type === "READING" ? BookOpen : Terminal;
  const color =
    type === "VIDEO" ? "var(--lesson-video)" : type === "READING" ? "var(--lesson-reading)" : "var(--lesson-handson)";
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} style={{ color }} />
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
        {type}
      </span>
      <span className="text-[var(--text-muted)] text-[11px]">· {duration}</span>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export function MyLearningTemplate({ candidateId, initialPhase = "my-learning", onBack, onClose }: MyLearningTemplateProps) {
  const [phase, setPhase] = useState<PlanPhase>(initialPhase);
  const [expandedSection, setExpandedSection] = useState<string | null>("s1");

  // Pre-fetch after-learning data as soon as this screen opens (if not already done).
  // completeLearning() will instant-swap from these cached snapshots.
  useEffect(() => {
    if (candidateId) void prefetchAfterLearning(candidateId);
  }, []);  
  const [selectedFormat, setSelectedFormat] = useState("Balanced mix");
  const [pendingFormat, setPendingFormat] = useState("Balanced mix");
  const [topicToggles, setTopicToggles] = useState<Record<string, boolean>>({
    "Kubernetes Operators": true,
  });
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({
    "Kubernetes Operators": true,
  });
  const [hasOperators, setHasOperators] = useState(false);
  const [planUpdated, setPlanUpdated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sections = useMemo(
    () => (hasOperators ? [...SECTIONS_BASE, SECTION_OPERATORS] : SECTIONS_BASE),
    [hasOperators],
  );

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const handleUpdatePlan = () => {
    setSelectedFormat(pendingFormat);
    setTopicToggles({ ...pendingToggles });
    setHasOperators(!!pendingToggles["Kubernetes Operators"]);
    setPlanUpdated(true);
    setExpandedSection("s1");
    setPhase("plan");
  };

  const handleFinishCourse = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (candidateId) await completeLearning(candidateId);
    setSubmitting(false);
    onClose ? onClose() : void notifyTele("user clicked: back to profile");
  };

  /* Close handler — same pattern as ApplicationSheetLayout */
  const handleMyLearningClose = () => {
    teleAcknowledge(
      '[SYSTEM] User tapped close on MyLearningTemplate. Call navigateToSection with EXACTLY this JSON: ' +
        '{"badge":"trAIn CAREER","title":"Dashboard","subtitle":"Your Profile",' +
        '"generativeSubsections":[{"id":"dashboard","templateId":"Dashboard","props":{}},' +
        '{"id":"profile-home","templateId":"ProfileSheet","props":{"dashboardAnchor":true}}]}. ' +
        "Do NOT speak.",
    );
  };

  /* Speech nudges */
  useSpeechFallbackNudge({
    enabled: phase === "my-learning",
    requiredPhrases: ["learning"],
    matchMode: "any",
    instruction:
      '[SYSTEM] MyLearningTemplate is now visible. Say: "Here\'s your learning dashboard. Pick up where you left off or start a new course."',
    delayMs: 1200,
  });

  useSpeechFallbackNudge({
    enabled: phase === "plan" && !planUpdated,
    requiredPhrases: ["learning plan", "kubernetes"],
    matchMode: "any",
    instruction:
      '[SYSTEM] MyLearningTemplate is visible. Say: "Here\'s a Kubernetes learning plan for you. It will take you to the Beginner level."',
    delayMs: 800,
  });

  useSpeechFallbackNudge({
    enabled: phase === "plan" && planUpdated,
    requiredPhrases: ["operators", "balanced"],
    matchMode: "any",
    instruction:
      "[SYSTEM] Updated Kubernetes plan is visible. Say: \"OK. I've added a section on Operators and kept the learning formats balanced.\"",
    delayMs: 600,
  });

  useSpeechFallbackNudge({
    enabled: phase === "customize",
    requiredPhrases: ["format", "topics"],
    matchMode: "any",
    instruction:
      "[SYSTEM] Customize plan is visible. Say: \"You can pick preferred formats, or add more topics to the plan.\"",
    delayMs: 600,
  });

  useVoiceActions(
    useMemo<VoiceAction[]>(
      () =>
        phase === "my-learning"
          ? [{ phrases: ["close", "go back", "dashboard", "back"], action: handleMyLearningClose }]
          : [],
      [phase],
    ),
  );

  /* ── My Learning (full-screen dashboard) ── */
  if (phase === "my-learning") {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-deep)] no-lightboard overflow-y-auto"
        data-testid="my-learning"
      >
        {/* Top bar */}
        <div className="relative px-4 pt-8 pb-2">
          <button
            onClick={onBack ? onBack : handleMyLearningClose}
            className="fixed top-4 right-4 z-[125] size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] no-lightboard pointer-events-auto"
          aria-label="Close"
          >
            <X size={20} className="text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Page title */}
        <div className="px-5 pt-4 pb-6">
          <h1 className="text-[var(--text-primary)] text-3xl font-bold">My Learning</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Here you can pick your next course or lesson.</p>
        </div>

        <div className="px-5 flex flex-col gap-6 pb-10">
          {/* ── We recommend learning ── */}
          <div>
            <p className="text-[var(--text-primary)] text-base font-bold mb-3 flex items-center gap-1.5">
              <span style={{ color: "var(--accent)" }}>✦✦</span> We recommend learning:
            </p>
            <button
              onClick={() => setPhase("plan")}
              className="w-full rounded-2xl p-4 text-left no-lightboard"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[var(--text-primary)] text-base font-bold">Kubernetes</p>
                <ChevronRight size={18} style={{ color: "var(--accent)" }} />
              </div>
              <div className="flex gap-1 mb-1">
                {[15, 0, 0, 0, 0].map((pct, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border-subtle)" }}
                  >
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                  </div>
                ))}
              </div>
              <p className="text-[var(--text-muted)] text-sm mb-2">Novice → Beginner</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                <span className="text-[var(--text-primary)] font-semibold">Kubernetes</span> appears as part of your Target Role and in{" "}
                <span className="text-[var(--text-primary)] font-semibold">3 of your saved jobs</span>.
              </p>
            </button>
          </div>

          {/* ── Pick up where you left off ── */}
          <div>
            <p className="text-[var(--text-primary)] text-base font-bold mb-3">Pick up where you left off:</p>
            <div className="flex flex-col gap-3">

              {/* MLOps / Model Deployment */}
              <div
                className="rounded-2xl p-4"
                style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)" }}
              >
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-3 text-xs font-semibold"
                  style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                  For Target Role
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[var(--text-primary)] text-base font-bold">MLOps / Model Deployment</p>
                  <ChevronRight size={18} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex gap-1 mb-1">
                  {[100, 100, 20, 0, 0].map((pct, i) => (
                    <div
                      key={i}
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--border-subtle)" }}
                    >
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                    </div>
                  ))}
                </div>
                <p className="text-[var(--text-muted)] text-sm">Beginner → Intermediate · 55% complete</p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">Module 2/4: Strategic Frameworks</p>
              </div>

              {/* Technical Leadership */}
              <div
                className="rounded-2xl p-4"
                style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-subtle)" }}
              >
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-3 text-xs font-semibold"
                  style={{ background: "color-mix(in srgb, var(--lesson-reading) 10%, transparent)", color: "var(--lesson-reading)", border: "1px solid color-mix(in srgb, var(--lesson-reading) 25%, transparent)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                  For Saved Jobs
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[var(--text-primary)] text-base font-bold">Technical Leadership</p>
                  <ChevronRight size={18} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex gap-1 mb-1">
                  {[100, 75, 0, 0, 0].map((pct, i) => (
                    <div
                      key={i}
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--border-subtle)" }}
                    >
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                    </div>
                  ))}
                </div>
                <p className="text-[var(--text-muted)] text-sm">Novice → Beginner · 38% complete</p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">Module 1/3: Feedback Frameworks</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Lesson: Video (Image 6) ── */
  if (phase === "lesson-video") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-deep)] no-lightboard overflow-y-auto"
        data-testid="lesson-video"
      >
        <div className="px-5 pt-10 pb-4 relative">
          <button
            onClick={() => setPhase("plan")}
            className="absolute top-4 right-4 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] no-lightboard"
          >
            <X size={20} className="text-[var(--text-primary)]" />
          </button>
          <LessonTypeBadge type="VIDEO" duration="30 min" />
          <h1 className="text-[var(--text-primary)] text-xl font-bold mt-2 leading-snug">
            Introduction to Kubernetes
          </h1>
        </div>

        {/* Video player */}
        <div className="mx-5 rounded-2xl overflow-hidden" style={{ background: "var(--surface-code)" }}>
          <div className="relative flex items-center justify-center" style={{ height: 200 }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: "var(--play-btn-bg)",
                border: "2px solid var(--play-btn-border)",
              }}
            >
              <div className="flex items-center gap-[3px]">
                <div className="w-[5px] h-4 rounded-sm" style={{ background: "var(--play-btn-fg)" }} />
                <div className="w-[5px] h-4 rounded-sm" style={{ background: "var(--play-btn-fg)" }} />
              </div>
            </div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-[var(--text-muted)] text-sm">
              Video in progress...
            </p>
          </div>
          <div className="px-4 pb-3">
            <div
              className="flex h-1 rounded-full overflow-hidden w-full"
              style={{ background: "var(--border-subtle)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: "40%", background: "var(--accent)" }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[var(--text-muted)] text-xs">16 min</span>
              <span className="text-[var(--text-muted)] text-xs">40 min</span>
            </div>
          </div>
        </div>

        {/* What you're learning */}
        <div className="px-5 mt-5">
          <p className="text-[var(--text-primary)] text-base font-bold mb-2">What you're learning</p>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            In this hands-on lab, you'll create a Dockerfile, build an image, and run your first
            container. You'll learn best practices for layer caching and multi-stage builds.
          </p>
        </div>

        {/* Timestamps */}
        <div className="px-5 mt-5">
          <p className="text-[var(--text-primary)] text-base font-bold mb-2">Timestamps</p>
          <div className="flex flex-col gap-1.5">
            {[
              ["0:00",  "Why containers exist"],
              ["9:30",  "How containers differ from virtual machines"],
              ["17:00", "Building your first container image"],
              ["26:00", "Managing containers with Docker commands"],
            ].map(([time, label]) => (
              <p key={time} className="text-[var(--text-secondary)] text-sm">
                <span className="text-[var(--text-muted)]">{time}</span> - {label}
              </p>
            ))}
          </div>
        </div>

        {/* Next lesson preview */}
        <div
          className="mx-5 mt-5 rounded-2xl p-4"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p className="text-[var(--text-muted)] text-xs font-semibold mb-2">Next:</p>
          <div className="flex items-center gap-3">
            <ProviderLogo provider="pearson" />
            <div>
              <LessonTypeBadge type="READING" duration="15 min" />
              <p className="text-[var(--text-primary)] text-sm font-semibold mt-0.5">
                Building Your First Cluster
              </p>
            </div>
          </div>
        </div>

        {/* Next Lesson button */}
        <div className="px-5 pb-10 mt-5">
          <button
            onClick={() => setPhase("lesson-reading")}
            className="w-full h-[52px] rounded-[24px] flex items-center justify-center gap-1 no-lightboard"
            style={{ background: "var(--accent)", boxShadow: "var(--shadow-btn)" }}
          >
            <span className="text-[var(--accent-contrast)] text-base font-semibold">
              Next Lesson
            </span>
            <ChevronRight size={16} className="text-[var(--accent-contrast)]" />
          </button>
        </div>
      </div>
    );
  }

  /* ── Lesson: Reading (Image 7) ── */
  if (phase === "lesson-reading") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-deep)] no-lightboard overflow-y-auto"
        data-testid="lesson-reading"
      >
        <div className="px-5 pt-10 pb-4 relative">
          <button
            onClick={() => setPhase("plan")}
            className="absolute top-4 right-4 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] no-lightboard"
          >
            <X size={20} className="text-[var(--text-primary)]" />
          </button>
          <LessonTypeBadge type="READING" duration="15 min" />
          <h1 className="text-[var(--text-primary)] text-xl font-bold mt-2 leading-snug">
            Building your First Cluster
          </h1>
        </div>

        <div className="px-5 flex flex-col gap-5 pb-10">
          <div>
            <p className="text-[var(--text-primary)] text-lg font-bold leading-snug mb-3">
              Understanding Pods: The Smallest Unit in Kubernetes
            </p>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3">
              Every application you run in Kubernetes lives inside a Pod. Before you can deploy,
              scale, or troubleshoot anything, you need to understand what a Pod actually is and why
              Kubernetes doesn't just run containers directly.
            </p>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Consider a simple example. You have a web application packaged as a container image. To
              run it in Kubernetes, you define a Pod specification — a short YAML file that tells
              Kubernetes which image to use, which port your app listens on, and any environment
              variables it needs. Kubernetes reads the specification, finds a node in the cluster
              with available resources, and starts the Pod there.
            </p>
          </div>

          {/* YAML code block */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--surface-code)", border: "1px solid var(--border-code)" }}
          >
            <div
              className="px-3 py-1.5 text-[11px] font-mono"
              style={{ color: "var(--text-code-dim)", borderBottom: "1px solid var(--border-code)" }}
            >
              yaml
            </div>
            <pre className="px-4 py-3 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">
              <span style={{ color: "var(--code-key)" }}>apiVersion</span>
              <span style={{ color: "var(--code-value)" }}>: v1{"\n"}</span>
              <span style={{ color: "var(--code-key)" }}>kind</span>
              <span style={{ color: "var(--code-value)" }}>: Pod{"\n"}</span>
              <span style={{ color: "var(--code-key)" }}>metadata</span>
              <span style={{ color: "var(--code-value)" }}>:{"\n"}  </span>
              <span style={{ color: "var(--code-key)" }}>name</span>
              <span style={{ color: "var(--code-value)" }}>: my-web-app{"\n"}</span>
              <span style={{ color: "var(--code-key)" }}>spec</span>
              <span style={{ color: "var(--code-value)" }}>:{"\n"}  </span>
              <span style={{ color: "var(--code-key)" }}>containers</span>
              <span style={{ color: "var(--code-value)" }}>:{"\n"}  - </span>
              <span style={{ color: "var(--code-key)" }}>name</span>
              <span style={{ color: "var(--code-value)" }}>: web{"\n"}    </span>
              <span style={{ color: "var(--code-key)" }}>image</span>
              <span style={{ color: "var(--code-value)" }}>: my-web-app:</span>
              <span style={{ color: "var(--code-number)" }}>1.0</span>
              <span style={{ color: "var(--code-value)" }}>{"\n"}    </span>
              <span style={{ color: "var(--code-key)" }}>ports</span>
              <span style={{ color: "var(--code-value)" }}>:{"\n"}    - </span>
              <span style={{ color: "var(--code-key)" }}>containerPort</span>
              <span style={{ color: "var(--code-value)" }}>: </span>
              <span style={{ color: "var(--code-number)" }}>8080</span>
            </pre>
          </div>

          {/* Finish Course button */}
          <button
            disabled={submitting}
            onClick={() => void handleFinishCourse()}
            className="w-full h-[52px] rounded-[24px] flex items-center justify-center gap-1 transition-opacity no-lightboard"
            style={{
              background: "var(--accent)",
              boxShadow: submitting ? "none" : "var(--shadow-btn)",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            <span className="text-[var(--accent-contrast)] text-base font-semibold">
              {submitting ? "Saving..." : "Finish Course"}
            </span>
            {!submitting && <ChevronRight size={16} className="text-[var(--accent-contrast)]" />}
          </button>
        </div>
      </div>
    );
  }

  /* ── Plan + Customize (transparent overlay — avatar shows through) ── */
  return (
    <div className="fixed inset-0 z-[110] pointer-events-none no-lightboard">
      {/* X button — back to SkillTestFlow landing or dashboard */}
      <button
        onClick={() => onBack ? onBack() : void notifyTele("user clicked: dashboard")}
        className="absolute top-4 right-4 z-10 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] pointer-events-auto no-lightboard"
        aria-label="Close"
      >
        <X size={20} className="text-[var(--text-primary)]" />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="absolute bottom-32 left-4 right-4 pointer-events-auto"
        >
          {/* ── Plan view (Images 2, 3, 5) ── */}
          {phase === "plan" && (
            <div className="flex flex-col gap-3">
              {/* Scrollable accordion */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ maxHeight: "48vh", background: "var(--surface-glass)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid var(--glass-btn-border)" }}
              >
                <div className="overflow-y-auto" style={{ maxHeight: "58vh" }}>
                  {sections.map((section, sIdx) => (
                    <div
                      key={section.id}
                      style={{
                        borderBottom:
                          sIdx < sections.length - 1
                            ? "1px solid var(--border-subtle)"
                            : "none",
                      }}
                    >
                      {/* Section header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left no-lightboard"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background:
                                "color-mix(in srgb, var(--accent) 15%, transparent)",
                              color: "var(--accent)",
                              border:
                                "1.5px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                            }}
                          >
                            {section.number}
                          </div>
                          <p className="text-[var(--text-primary)] text-sm font-bold">
                            {section.title} ({section.lessonCount})
                          </p>
                        </div>
                        {expandedSection === section.id ? (
                          <ChevronUp size={16} className="text-[var(--text-muted)] shrink-0" />
                        ) : (
                          <ChevronDown
                            size={16}
                            className="text-[var(--text-muted)] shrink-0"
                          />
                        )}
                      </button>

                      {/* Lessons — shown when expanded */}
                      <AnimatePresence initial={false}>
                        {expandedSection === section.id && (
                          <motion.div
                            key="lessons"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 flex flex-col gap-2">
                              {section.lessons.map((lesson) => (
                                <div
                                  key={lesson.title}
                                  className="flex items-center gap-3 rounded-xl p-3"
                                  style={{
                                    background: "var(--surface-elevated)",
                                    border: "1px solid var(--border-subtle)",
                                  }}
                                >
                                  <ProviderLogo provider={lesson.provider} />
                                  <div className="flex-1 min-w-0">
                                    <LessonTypeBadge
                                      type={lesson.type}
                                      duration={lesson.duration}
                                    />
                                    <p className="text-[var(--text-primary)] text-sm font-semibold mt-0.5 leading-snug">
                                      {lesson.title}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPendingFormat(selectedFormat);
                    setPendingToggles({ ...topicToggles });
                    setPhase("customize");
                  }}
                  className="flex-1 h-[44px] rounded-[24px] flex items-center justify-center no-lightboard"
                  style={{ background: "var(--surface-btn-dim)" }}
                >
                  <span className="text-[var(--text-primary)] text-sm font-semibold">
                    Customize this plan
                  </span>
                </button>
                <button
                  onClick={() => setPhase("my-learning")}
                  className="flex-1 h-[44px] rounded-[24px] flex items-center justify-center no-lightboard"
                  style={{ background: "var(--surface-btn-dim)" }}
                >
                  <span className="text-[var(--text-primary)] text-sm font-semibold">
                    Add to my learning
                  </span>
                </button>
              </div>

              {/* Start Learning */}
              <button
                onClick={() => setPhase("lesson-video")}
                className="w-full h-[52px] rounded-[24px] flex items-center justify-center gap-1 no-lightboard"
                style={{ background: "var(--accent)", boxShadow: "var(--shadow-btn)" }}
              >
                <span className="text-[var(--accent-contrast)] text-base font-semibold">
                  Start Learning
                </span>
                <ChevronRight size={16} className="text-[var(--accent-contrast)]" />
              </button>
            </div>
          )}

          {/* ── Customize plan (Image 4) ── */}
          {phase === "customize" && (
            <div className="flex flex-col gap-3">
              <div
                className="overflow-y-auto flex flex-col gap-3"
                style={{ maxHeight: "50vh" }}
              >
                {/* Preferred Format */}
                <div className="rounded-2xl p-4 glass-surface">
                  <p className="text-[var(--text-primary)] font-bold text-base mb-3">
                    Preferred Format
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FORMAT_OPTIONS.map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setPendingFormat(fmt)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all no-lightboard"
                        style={{
                          background:
                            pendingFormat === fmt
                              ? "var(--accent)"
                              : "var(--surface-elevated)",
                          color:
                            pendingFormat === fmt
                              ? "var(--accent-contrast)"
                              : "var(--text-primary)",
                          border:
                            pendingFormat === fmt
                              ? "none"
                              : "1px solid var(--border-subtle)",
                        }}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Topics */}
                <div className="rounded-2xl p-4 glass-surface">
                  <p className="text-[var(--text-primary)] font-bold text-base mb-3">
                    Additional Topics
                  </p>
                  <div className="flex flex-col gap-4">
                    {TOPIC_OPTIONS.map((topic) => {
                      const isOn = !!pendingToggles[topic.name];
                      return (
                        <div
                          key={topic.name}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-sm font-semibold">
                              {topic.name}
                            </p>
                            <p className="text-[var(--text-muted)] text-xs">{topic.subtitle}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[var(--text-muted)] text-xs">
                              {topic.hours}
                            </span>
                            <button
                              onClick={() =>
                                setPendingToggles((prev) => ({
                                  ...prev,
                                  [topic.name]: !prev[topic.name],
                                }))
                              }
                              className="relative w-11 h-6 rounded-full transition-colors shrink-0 no-lightboard"
                              style={{
                                background: isOn ? "var(--accent)" : "var(--border-subtle)",
                              }}
                            >
                              <motion.div
                                animate={{ x: isOn ? 22 : 2 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 30,
                                }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Go back / Update my plan */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPhase("plan")}
                  className="flex-1 h-[52px] rounded-[24px] flex items-center justify-center no-lightboard"
                  style={{ background: "var(--surface-btn-dim)" }}
                >
                  <span className="text-[var(--text-primary)] text-base font-semibold">
                    Go back
                  </span>
                </button>
                <button
                  onClick={handleUpdatePlan}
                  className="flex-1 h-[52px] rounded-[24px] flex items-center justify-center gap-1 no-lightboard"
                  style={{ background: "var(--accent)", boxShadow: "var(--shadow-btn)" }}
                >
                  <span className="text-[var(--accent-contrast)] text-base font-semibold">
                    Update my plan
                  </span>
                  <ChevronRight size={14} className="text-[var(--accent-contrast)]" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
