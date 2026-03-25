'use client';

import { useState, useMemo, useEffect } from "react";
import { X, ChevronRight, Upload, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { completeLearning, prefetchAfterLearning } from "@/lib/mcpBridge";
import { notifyTele } from "@/utils/teleUtils";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useMcpCache } from "@/contexts/McpCacheContext";
import { extractGaugeScores } from "@/utils/computeProfileMetrics";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { MyLearningTemplate } from "./MyLearningTemplate";

/* ── Types ──────────────────────────────────────────────────────────────── */

type Phase = "landing" | "prep" | "q0" | "q1" | "q2" | "results" | "upload";

interface SkillTestFlowProps {
  candidateId: string;
  /** X button — returns to SkillsDetail */
  onBack: () => void;
  /** "Back to Profile →" in results — navigates to ProfileSheet */
  onClose: () => void;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const MCQ_OPTIONS = ["Container", "Pod", "Node", "Cluster"];

const TF_QUESTION =
  "A Kubernetes Service of type ClusterIP is accessible from outside the cluster without any additional configuration.";

const TF_EXPLANATION =
  "ClusterIP services are only accessible within the cluster. To expose services externally, you need NodePort, LoadBalancer, or Ingress.";

const ESSAY_QUESTION =
  "You've deployed an app with 3 replicas. One pod keeps crashing while the other two run fine. Walk me through how you'd figure out what's going wrong.";

const TOPICS = [
  "Deploy an app to an existing cluster",
  "Diagnose why a pod isn't starting",
  "Scale a deployment and verifying the result",
  "Explain how Pods, Deployments, and Services relate to each other",
  "Create a basic service to connect two pods",
];

const LEVEL_LABELS = ["Novice", "Beginner", "Intermediate", "Advanced", "Expert"];
const MARKET_RELEVANCE_HARDCODED = 73;

/* ── Component ──────────────────────────────────────────────────────────── */

export function SkillTestFlow({ candidateId, onBack, onClose }: SkillTestFlowProps) {
  const [phase, setPhase] = useState<Phase>("landing");
  const [mcqSelected, setMcqSelected] = useState<string | null>(null);
  const [tfSelected, setTfSelected] = useState<"true" | "false" | null>(null);
  const [essayText, setEssayText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLearningPath, setShowLearningPath] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Pre-fetch after-learning data as soon as this screen opens.
  // completeLearning() will instant-swap from these cached snapshots.
  useEffect(() => {
    if (candidateId) void prefetchAfterLearning(candidateId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "q1") setTfSelected(null);
  }, [phase]);

  const cache = useMcpCache();
  const gaugeScores = useMemo(() => extractGaugeScores(cache.skills), [cache.skills]);

  useSpeechFallbackNudge({
    enabled: phase === "landing",
    requiredPhrases: ["kubernetes", "skill"],
    matchMode: "any",
    instruction:
      '[SYSTEM] SkillTestFlow landing is visible. Say: "Let\'s upgrade your Kubernetes Skill. We can create a learning plan or take a practical test to validate your knowledge."',
    delayMs: 800,
  });

  useSpeechFallbackNudge({
    enabled: phase === "prep",
    requiredPhrases: ["beginner", "test"],
    matchMode: "any",
    instruction:
      '[SYSTEM] SkillTestFlow prep is visible. Say: "Got it. We\'ll take a Beginner Kubernetes test. Here\'s what you can expect. Let me know when you\'re ready."',
    delayMs: 600,
  });

  useSpeechFallbackNudge({
    enabled: phase === "results",
    requiredPhrases: ["passed", "beginner"],
    matchMode: "any",
    instruction:
      '[SYSTEM] SkillTestFlow results are visible. Say: "You passed your test. You are now at Beginner level for Kubernetes. I\'ve updated your profile accordingly."',
    delayMs: 600,
  });

  useSpeechFallbackNudge({
    enabled: phase === "upload",
    requiredPhrases: ["certificate", "upload"],
    matchMode: "any",
    instruction:
      '[SYSTEM] Certificate upload screen is visible. Say: "Excellent. When you\'re ready, please upload your certificate of completion."',
    delayMs: 600,
  });

  const handleSubmitEssay = async () => {
    if (!essayText.trim() || submitting) return;
    setSubmitting(true);
    await completeLearning(candidateId);
    setSubmitting(false);
    setPhase("results");
  };

  if (showLearningPath) {
    return (
      <MyLearningTemplate
        candidateId={candidateId}
        initialPhase="plan"
        onBack={() => setShowLearningPath(false)}
        onClose={() => void notifyTele("user clicked: back to profile")}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[105] pointer-events-none no-lightboard">
      {/* Close (X) button — always goes back to SkillsDetail */}
      <button
        onClick={onBack}
        className="absolute top-4 right-4 z-10 size-10 rounded-full flex items-center justify-center bg-[rgba(28,28,30,0.2)] pointer-events-auto no-lightboard"
        aria-label="Close"
      >
        <X size={20} className="text-white" />
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
          {/* ── Landing (Screen 1) ─────────────────────────────────────────── */}
          {phase === "landing" && (
            <div className="flex flex-col gap-2.5">
              {/* Skill card — Figma 5252:75904 */}
              <div className="rounded-2xl glass-surface p-4 flex flex-col gap-2">
                <h3 className="text-[#f4f4f5] text-base font-bold leading-6">Kubernetes</h3>

                {/* 5-segment level meter (h-1.5 = 6px) */}
                <div className="relative h-1.5 w-full">
                  <div className="absolute bg-[#3689ff] h-1.5 left-0 rounded-full top-0 w-[73px]" />
                  <div className="absolute bg-[rgba(54,137,255,0.15)] border border-[#3689ff] h-1.5 left-[75px] rounded-full top-0 w-[73px]" />
                  <div className="absolute bg-[rgba(255,255,255,0.25)] h-1.5 left-[150px] rounded-full top-0 w-[74px]" />
                  <div className="absolute bg-[rgba(255,255,255,0.25)] h-1.5 left-[226px] rounded-full top-0 w-[73px]" />
                  <div className="absolute bg-[rgba(255,255,255,0.25)] h-1.5 left-[301px] rounded-full top-0 w-[73px]" />
                </div>

                <span className="text-white text-sm leading-5">Novice → Beginner</span>
              </div>

              {/* Action row — Figma 5252:75903: Take a test (left) + Create a Learning Plan (right), justify-end */}
              <div className="flex flex-wrap items-start justify-end gap-x-2 gap-y-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setPhase("prep")}
                  className="shrink-0 min-w-[115px] rounded-[24px] px-4 py-3 no-lightboard bg-[rgba(16,42,40,0.2)]"
                >
                  <span className="text-[#f4f4f5] text-base font-normal leading-6">Take a test</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLearningPath(true)}
                  className="inline-flex shrink-0 items-center justify-end gap-2 rounded-[24px] px-4 py-3 no-lightboard bg-[#1dc558] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                >
                  <span className="text-[#18181b] text-base font-semibold leading-6">
                    Create a Learning Plan
                  </span>
                  <ChevronRight size={16} className="text-[#18181b] shrink-0" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {/* ── Prep (Screen 2) ────────────────────────────────────────────── */}
          {phase === "prep" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl glass-surface p-4 flex flex-col gap-2">
                <h3 className="text-[#f4f4f5] text-xl font-semibold leading-6">
                  Kubernetes Beginner Test
                </h3>
                
                <h4 className="text-[#f4f4f5] text-base font-bold leading-6">Topics covered:</h4>
                
                <ul className="list-disc pl-6 flex flex-col gap-0 text-[#fafafa] text-base leading-6">
                  {TOPICS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPhase("q0")}
                  className="inline-flex items-center justify-center gap-2 rounded-[24px] px-4 py-3 text-[#18181b] no-lightboard bg-[#1dc558] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                >
                  <span className="text-base font-semibold leading-6">Start Test</span>
                  <ChevronRight size={16} className="shrink-0" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {/* ── Q0: Multiple Choice (Screen 3) ─────────────────────────────── */}
          {phase === "q0" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl glass-surface p-4 flex flex-col gap-6">
                <p className="text-[#fafafa] font-bold text-base leading-6">
                  What is the smallest deployable unit in Kubernetes?
                </p>
                
                <div className="flex flex-col gap-2.5">
                  {MCQ_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setMcqSelected(opt)}
                      className="w-full h-[57px] rounded-[14px] flex items-center gap-2 px-[17px] border transition-all no-lightboard bg-[rgba(255,255,255,0.05)]"
                      style={{
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="size-[22px] rounded-full border shrink-0"
                        style={{
                          borderColor: "rgba(255,255,255,0.2)",
                        }}
                      />
                      <span className="text-[#fafafa] text-sm font-medium leading-5">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-disabled={!mcqSelected}
                  onClick={() => {
                    if (mcqSelected) setPhase("q1");
                  }}
                  className={
                    "inline-flex items-center justify-center gap-2 rounded-[24px] px-4 py-3 text-[#18181b] no-lightboard bg-[#1dc558] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] " +
                    (!mcqSelected ? "cursor-not-allowed opacity-45" : "cursor-pointer")
                  }
                >
                  <span className="text-base font-semibold leading-6">Next Question</span>
                  <ChevronRight size={16} className="shrink-0" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {/* ── Q1: True / False — single screen (Figma): question + T/F + explanation + Next */}
          {phase === "q1" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl glass-surface p-4 flex flex-col gap-2">
                <p className="text-[#fafafa] font-bold text-base leading-6">{TF_QUESTION}</p>

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setTfSelected("true")}
                    className="flex-1 h-[58px] rounded-[14px] flex items-center justify-center font-semibold text-base transition-all no-lightboard border border-solid border-[#EF4444] bg-[rgba(239,68,68,0.15)] text-[#EF4444]"
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setTfSelected("false")}
                    className="flex-1 h-[58px] rounded-[14px] flex items-center justify-center font-semibold text-base transition-all no-lightboard border border-solid border-[#1ED25E] bg-[rgba(30,210,94,0.15)] text-[#1ED25E]"
                  >
                    False
                  </button>
                </div>

                <div className="rounded-2xl bg-[rgba(255,255,255,0.05)] px-4 py-[14px] mt-2 text-base text-white leading-6">
                  {TF_EXPLANATION}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  aria-disabled={tfSelected === null}
                  onClick={() => {
                    if (tfSelected !== null) setPhase("q2");
                  }}
                  className={
                    "inline-flex items-center justify-center gap-2 rounded-[24px] px-4 py-3 text-[#18181b] no-lightboard bg-[#1dc558] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] " +
                    (tfSelected === null ? "cursor-not-allowed opacity-45" : "cursor-pointer")
                  }
                >
                  <span className="text-base font-semibold leading-6">Next Question</span>
                  <ChevronRight size={16} className="shrink-0" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {/* ── Q2: Open-ended Essay (Screen 5) ────────────────────────────── */}
          {phase === "q2" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl glass-surface p-4 flex flex-col gap-4">
                <p className="text-[#fafafa] font-bold text-base leading-6">{ESSAY_QUESTION}</p>
                
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  rows={6}
                  placeholder="|"
                  className="w-full rounded-lg p-4 text-xs text-white resize-none outline-none bg-[rgba(0,0,0,0.25)] border border-[#52525b]"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-disabled={!essayText.trim() || submitting}
                  onClick={() => {
                    if (essayText.trim() && !submitting) void handleSubmitEssay();
                  }}
                  className={
                    "inline-flex items-center justify-center gap-2 rounded-[24px] px-4 py-3 text-[#18181b] no-lightboard bg-[#1dc558] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] " +
                    (!essayText.trim() || submitting
                      ? "cursor-not-allowed opacity-45"
                      : "cursor-pointer")
                  }
                >
                  <span className="text-base font-semibold leading-6">
                    {submitting ? "Saving..." : "Submit Answer"}
                  </span>
                  {!submitting && <ChevronRight size={16} className="shrink-0" aria-hidden />}
                </button>
              </div>
            </div>
          )}

          {/* ── Results (Screen 6-7) ─────────────────────────────────────────── */}
          {phase === "results" && (
            <div className="flex flex-col gap-3">
              {/* Kubernetes at Beginner level */}
              <div className="rounded-2xl glass-surface p-4 flex flex-col gap-2">
                <h3 className="text-[#f4f4f5] text-base font-bold leading-6">Kubernetes</h3>
                
                {/* 5-segment level meter - now showing 2 filled */}
                <div className="relative h-1.5 w-full">
                  <div className="absolute bg-[#3689ff] h-1.5 left-0 rounded-full top-0 w-[73px]" />
                  <div className="absolute bg-[#3689ff] border border-[#3689ff] h-1.5 left-[75px] rounded-full top-0 w-[73px]" />
                  <div className="absolute bg-[rgba(255,255,255,0.33)] h-1.5 left-[150px] rounded-full top-0 w-[74px]" />
                  <div className="absolute bg-[rgba(255,255,255,0.33)] h-1.5 left-[226px] rounded-full top-0 w-[73px]" />
                  <div className="absolute bg-[rgba(255,255,255,0.33)] h-1.5 left-[301px] rounded-full top-0 w-[73px]" />
                </div>
                
                <span className="text-[#1dc558] text-sm leading-4 font-semibold">Beginner</span>
              </div>

              {/* Score gauges */}
              <div className="rounded-2xl glass-surface p-2 flex items-center justify-between gap-6">
                <div className="flex flex-col items-center gap-3 flex-1">
                  <CircularGauge percentage={gaugeScores.skillCoverage} size={105} />
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-[#1dc558] text-sm font-normal leading-4 text-center">
                      Skill{'\n'}Coverage
                    </span>
                    <ChevronRight size={24} className="text-[#1dc558]" />
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-3 flex-1">
                  <CircularGauge percentage={MARKET_RELEVANCE_HARDCODED} size={105} />
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-[#1dc558] text-sm font-normal leading-4 text-center whitespace-pre">
                      Market{'\n'}Relevance
                    </span>
                    <ChevronRight size={24} className="text-[#1dc558]" />
                  </div>
                </div>
                
                {/* Career Growth — undefined percentage renders velocity chevrons */}
                <div className="flex flex-col items-center gap-3 flex-1">
                  <CircularGauge size={105} />
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-[#1dc558] text-sm font-normal leading-4 text-center">
                      Career{'\n'}Growth
                    </span>
                    <ChevronRight size={24} className="text-[#1dc558]" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 rounded-[24px] px-4 py-3 text-[#18181b] no-lightboard bg-[#1dc558] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                >
                  <span className="text-base font-semibold leading-6">Back to Profile</span>
                  <ChevronRight size={16} className="shrink-0" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {/* ── Upload Certificate ─────────────────────────────────────────── */}
          {phase === "upload" && (
            <div className="rounded-2xl glass-surface p-5 flex flex-col gap-4">
              {!uploadSuccess ? (
                <>
                  <div>
                    <p className="text-[#f4f4f5] font-bold text-base mb-2">
                      Validate outside learning
                    </p>
                    <p className="text-white text-sm leading-relaxed">
                      Excellent. When you're ready, please upload your certificate of completion.
                    </p>
                    <p className="text-white/60 text-xs mt-2 leading-relaxed">
                      We accept certificates from recognized platforms like Coursera, Udacity, edX, 
                      and official Kubernetes certifications (CKA, CKAD, CKS).
                    </p>
                  </div>

                  {/* Upload button */}
                  <button
                    onClick={() => {
                      setUploadSuccess(true);
                      void notifyTele("user uploaded certificate: Kubernetes");
                    }}
                    className="w-full h-[64px] rounded-2xl flex flex-col items-center justify-center gap-1 border-2 border-dashed transition-all no-lightboard hover:border-[#1dc558]"
                    style={{
                      borderColor: "rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Upload size={24} className="text-white/60" />
                    <span className="text-white/60 text-sm font-medium">
                      Click to upload certificate
                    </span>
                    <span className="text-white/60 text-xs">
                      PDF, JPG, PNG (max 10MB)
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {/* Success state */}
                  <div className="text-center py-4">
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{ background: "rgba(30,210,94,0.15)" }}
                    >
                      <CheckCircle2 size={32} className="text-[#1dc558]" />
                    </div>
                    <p className="text-[#f4f4f5] font-bold text-lg mb-2">
                      Certificate Received
                    </p>
                    <p className="text-white text-sm leading-relaxed">
                      We'll review it and update your skill level within 24 hours. 
                      You'll receive a notification once it's validated.
                    </p>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="w-full h-12 rounded-[24px] flex items-center justify-center gap-2 px-4 no-lightboard bg-[#1dc558] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                  >
                    <span className="text-[#18181b] text-base font-semibold">
                      Back to Profile
                    </span>
                    <ChevronRight size={16} className="text-[#18181b]" />
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
