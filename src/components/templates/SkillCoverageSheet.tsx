'use client';

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { X, Maximize2, TrendingUp, Sparkles, Target } from "lucide-react";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { sendBackToProfileIntent } from "@/utils/teleIntent";
import type { SkillData, SkillProgressionItem, LearningPathNode } from "@/utils/computeProfileMetrics";
import { computeProfileMetrics } from "@/utils/computeProfileMetrics";
import { mapRawSkillProgression } from "@/utils/computeProfileMetrics";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { LearningPathTemplate } from "./LearningPathTemplate";
import { SkillTestFlow } from "./SkillTestFlow";

/* ── Constants ────────────────────────────────────────────────────────────── */

// Hardcoded skill gaps that match LearningPathTemplate courses
const HARDCODED_SKILL_GAPS: SkillProgressionItem[] = [
  {
    name: "Kubernetes",
    current_level: 1,
    target_level: 2,
    is_featured: true,
  },
];

const RESUME_COURSES = [
  {
    id: "mlops-deployment",
    title: "MLOps / Model Deployment",
    tag: "For Target Role",
    levelFrom: "Beginner",
    levelTo: "Intermediate",
    progressPct: 55,
    module: "Module 2/4: Strategic Frameworks",
  },
  {
    id: "tech-leadership",
    title: "Technical Leadership",
    tag: "For Saved Jobs",
    levelFrom: "Novice",
    levelTo: "Beginner",
    progressPct: 38,
    module: "Module 1/3: Feedback Frameworks",
  },
];

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface Certification {
  name: string;
  imageUrl: string;
}

interface SkillCoverageSheetProps {
  rawSkillProgression?: Record<string, unknown>;
  skillData?: SkillData;
  skillCoverage?: number;
  targetRole?: string;
  certifications?: Certification[];
  candidateId?: string;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function SkillCoverageSheet({
  rawSkillProgression,
  skillData: legacyData,
  skillCoverage: overrideCoverage,
  targetRole: overrideRole,
  certifications,
  candidateId,
}: SkillCoverageSheetProps) {
  const [showLearningPath, setShowLearningPath] = useState(false);
  const [showSkillTest, setShowSkillTest] = useState(false);

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["skill", "coverage", "breakdown"],
    matchMode: "any",
    instruction:
      '[SYSTEM] SkillCoverageSheet is now visible. Say: "Here\'s a breakdown of your skills and how close you are to your target role."',
    delayMs: 1200,
  });

  const skillData = useMemo(
    () => mapRawSkillProgression(rawSkillProgression) ?? legacyData,
    [rawSkillProgression, legacyData],
  );
  const computed = useMemo(() => computeProfileMetrics(skillData), [skillData]);
  const percentage = overrideCoverage ?? computed.skillCoverage ?? 73;
  const targetRole = overrideRole ?? computed.targetRole ?? "Target Role";

  useVoiceActions(
    useMemo(() => [
      { phrases: ["close", "go back", "back to profile"], action: () => void sendBackToProfileIntent() },
    ], []),
  );

  return (
    <>
      {showSkillTest ? (
        <SkillTestFlow
          candidateId={candidateId || "10000000-0000-0000-0000-000000000001"}
          onBack={() => setShowSkillTest(false)}
          onClose={() => void sendBackToProfileIntent()}
        />
      ) : !showLearningPath ? (
        <div
          data-testid="skill-coverage-sheet"
          className="fixed inset-0 z-50 bg-[var(--bg)] no-lightboard flex flex-col"
        >
          {/* Close button */}
          <button
            data-testid="skill-coverage-sheet-close-btn"
            onClick={() => void sendBackToProfileIntent()}
            className="absolute top-4 right-4 z-10 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)]"
            aria-label="Close"
          >
            <X size={20} className="text-[var(--text-primary)]" />
          </button>

          {/* Scrollable content */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35, delay: 0.05 }}
            className="flex-1 overflow-y-auto px-6 pt-20 pb-[72px] flex flex-col gap-[32px]"
          >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[var(--text-primary)] text-[32px] font-semibold leading-10">
            Skill Coverage
          </h1>
          <p className="text-[var(--text-dim)] text-base">
            How close you are to your next role.
          </p>
        </div>

        {/* Career Path Card */}
        <div className="flex gap-6 items-center">
          <CircularGauge percentage={percentage} size={105} />
          <div className="flex-1 rounded-2xl border border-[#27272a] bg-[#18181b] p-4 pb-[60px] flex flex-col gap-4">
            <div className="flex gap-2 items-center">
              <TrendingUp size={16} className="text-white" />
              <span className="text-white text-sm font-bold">Career Path</span>
            </div>
            <div className="relative flex flex-col pb-[5.257px]">
              <div className="relative h-1 rounded-full bg-[#27272a] w-full mb-[-5.257px]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full h-1 bg-gradient-to-r from-[#a5e8bc] from-[40%] to-[#1dc558]"
                  style={{ width: `${Math.min(percentage, 66)}%` }}
                />
              </div>
              <div className="absolute flex justify-between left-0 top-[-6px] w-[248px]">
                <div className="flex-1 flex flex-col items-center gap-2 pb-[12.5px]">
                  <div className="size-4 rounded-full bg-[#a5e8bc]" />
                  <span className="text-[#a5e8bc] text-xs text-center w-[59px]">
                    Junior AI Developer
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="size-4 rounded-full bg-[#69d88f] border-2 border-[#69d88f]" />
                  <span className="text-[#1dc558] text-xs text-center w-[60px]">
                    AI Developer
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2 pb-[12.5px]">
                  <div className="size-4 rounded-full bg-[#09090b] border-2 border-[#3f3f46]" />
                  <span className="text-[#52525b] text-xs text-center">
                    Senior AI Developer
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Pathway */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[var(--text-primary)] text-xl font-semibold">
              Learning Pathway
            </h2>
            <Maximize2 size={20} className="text-[var(--text-primary)]" />
          </div>
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] overflow-x-auto h-[333px] relative">
            <div className="absolute flex items-center" style={{ left: '-316px', top: '91.6px' }}>
              {/* Coding 101 - Completed */}
              <div className="relative shrink-0 size-20">
                <div className="absolute bg-[rgba(29,197,88,0.2)] border-2 border-[#1dc558] rounded-full shadow-[0px_0px_30px_0px_rgba(29,197,88,0.38),0px_0px_50px_0px_rgba(29,197,88,0.19)] size-20 flex items-center justify-center">
                  <div className="text-white text-xs font-medium text-center leading-[15px]">
                    <div>Coding</div>
                    <div>101</div>
                  </div>
                  <div className="absolute border-2 border-[#1dc558] left-2 top-2 opacity-50 rounded-full size-[60px]" />
                </div>
              </div>
              
              {/* Line connector */}
              <div className="h-0 w-[57px] relative">
                <div className="absolute h-0.5 bg-[#27272a] w-full top-0" />
              </div>
              
              {/* Developer Basics - Completed */}
              <div className="flex flex-col items-start justify-center h-[168px] relative">
                <div className="bg-[#1ed25e] border-2 border-[#1dc558] h-10 rounded-[10px] shadow-[0px_0px_15px_0px_rgba(29,197,88,0.19)] w-[185.688px] flex items-center justify-center px-[18px]">
                  <span className="text-black text-sm font-normal">Developer Basics</span>
                  <div className="ml-2 size-4 flex items-center justify-center">
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <path d="M1 6L6 11L15 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Vertical connector from Coding 101 */}
            <div className="absolute left-[23.69px] top-[175.6px] h-8 w-[101px]">
              <div className="h-full w-0.5 bg-[#27272a]" />
            </div>
            
            {/* Kubernetes - In Progress */}
            <button
              onClick={() => setShowSkillTest(true)}
              className="absolute flex flex-col gap-[7px] items-center left-[107.69px] top-[142.1px] cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="bg-[rgba(54,137,255,0.25)] border-2 border-white rounded-full size-16 flex items-center justify-center p-0.5">
                <div className="size-8 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="white">
                    <path d="M16 4l3 3-3 3-3-3 3-3zm0 18l3 3-3 3-3-3 3-3zm10-9l3 3-3 3-3-3 3-3zM6 13l3 3-3 3-3-3 3-3z" />
                  </svg>
                </div>
              </div>
              <span className="text-white text-xs text-center w-[65px]">Kubernetes</span>
            </button>
            
            {/* Vertical connector from Kubernetes */}
            <div className="absolute left-[188.69px] top-[175.6px] h-8 w-[101px]">
              <div className="h-full w-0.5 bg-[#27272a]" />
            </div>
            
            {/* Docker & Cloud - Upcoming */}
            <div className="absolute flex flex-col gap-[9px] items-center left-[272.69px] top-[141.1px]">
              <div className="bg-[#27272a] border-2 border-[#4b5563] rounded-full size-16 flex items-center justify-center p-0.5">
                <div className="size-5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="#71717a">
                    <path d="M10 2L12 8H18L13 12L15 18L10 14L5 18L7 12L2 8H8L10 2Z" />
                  </svg>
                </div>
              </div>
              <span className="text-white text-xs text-center leading-4">
                Docker<br />& Cloud
              </span>
            </div>
            
            {/* Vertical connector from Docker */}
            <div className="absolute left-[353.69px] top-[175.6px] h-8 w-[101px]">
              <div className="h-full w-0.5 bg-[#27272a]" />
            </div>
            
            {/* Scalability & Performance - Upcoming */}
            <div className="absolute flex flex-col gap-[11px] items-center left-[437.69px] top-[141.1px]">
              <div className="bg-[#27272a] border-2 border-[#4b5563] rounded-full size-16 flex items-center justify-center p-0.5">
                <div className="size-5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="#71717a">
                    <path d="M10 2L12 8H18L13 12L15 18L10 14L5 18L7 12L2 8H8L10 2Z" />
                  </svg>
                </div>
              </div>
              <span className="text-white text-xs text-center leading-4">
                Scalability &<br />Performance
              </span>
            </div>
            
            {/* Vertical connector from Scalability */}
            <div className="absolute left-[527.69px] top-[175.6px] h-8 w-[101px]">
              <div className="h-full w-0.5 bg-[#27272a]" />
            </div>
            
            {/* Next Level tooltip */}
            <div className="absolute bg-[rgba(54,137,255,0.1)] border-2 border-[#3689ff] rounded-[10px] shadow-[0px_0px_30px_0px_rgba(54,137,255,0.25)] left-[611.69px] top-[141.35px] w-[162.68px] p-4 pt-[14px] pb-[2px]">
              <div className="text-center">
                <p className="text-[#3689ff] text-sm font-semibold">Next Level:</p>
                <p className="text-white text-base mt-1">Senior AI Developer</p>
              </div>
            </div>
          </div>
          <button
            className="flex items-center gap-1 self-end"
            style={{ color: "#1dc558" }}
          >
            <span className="text-[13px] font-medium">View Target Role →</span>
          </button>
        </div>

        {/* Certifications */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[var(--text-primary)] text-xl font-semibold">
            Certifications
          </h2>
          <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-4 flex flex-col gap-4">
            <div className="flex gap-2 overflow-x-auto">
              <div className="relative shrink-0 size-24">
                <img
                  src="https://www.figma.com/api/mcp/asset/6ca60d7c-c2fd-4c93-9a08-d50419e316fc"
                  alt="IT Specialist Artificial Intelligence"
                  className="size-24 object-contain"
                />
              </div>
              <div className="relative shrink-0 size-24">
                <img
                  src="https://www.figma.com/api/mcp/asset/fd517776-c9f9-4ecf-bf5c-aba02204e15c"
                  alt="IBM Generative AI Engineer"
                  className="size-24 object-contain"
                />
              </div>
              <div className="relative shrink-0 size-24">
                <img
                  src="https://www.figma.com/api/mcp/asset/103725bb-2e99-4725-af9f-84a1d406bce1"
                  alt="AWS Certified Cloud Practitioner"
                  className="size-24 object-contain"
                />
              </div>
            </div>
          </div>
          <button
            className="flex items-center gap-1 self-end"
            style={{ color: "#1dc558" }}
          >
            <span className="text-[13px] font-medium">Add Certifications →</span>
          </button>
        </div>

        {/* We recommend learning: */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--accent)]" />
            <h2 className="text-[var(--text-primary)] text-xl font-semibold">
              We recommend learning:
            </h2>
          </div>

          <button
            onClick={() => setShowSkillTest(true)}
            className="rounded-2xl bg-[rgba(255,255,255,0.05)] p-4 flex flex-col gap-4 w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
          >
            <h3 className="text-[#f4f4f5] text-base font-bold leading-6">Kubernetes</h3>

            {/* 5-segment level meter */}
            <div className="relative h-1.5 w-full">
              <div className="absolute bg-[#3689ff] h-1.5 left-0 rounded-full top-0 w-[73px]" />
              <div className="absolute bg-[rgba(54,137,255,0.15)] border border-[#3689ff] h-1.5 left-[75px] rounded-full top-0 w-[73px]" />
              <div className="absolute bg-[rgba(255,255,255,0.33)] h-1.5 left-[150px] rounded-full top-0 w-[74px]" />
              <div className="absolute bg-[rgba(255,255,255,0.33)] h-1.5 left-[226px] rounded-full top-0 w-[73px]" />
              <div className="absolute bg-[rgba(255,255,255,0.33)] h-1.5 left-[301px] rounded-full top-0 w-[73px]" />
            </div>

            <span className="text-white text-sm leading-5">Novice → Beginner</span>

            <p className="text-white text-base leading-6">
              <span className="font-bold">Kubernetes</span>
              {" appears as part of your Target Role and in "}
              <span className="font-bold">3 of your saved jobs</span>
              {"."}
            </p>
          </button>
        </div>

        {/* Pick up where you left off */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[var(--text-primary)] text-xl font-semibold">
            Pick up where you left off:
          </h2>
          <div className="flex flex-col gap-3">
            {/* MLOps / Model Deployment */}
            <button className="rounded-2xl bg-[rgba(255,255,255,0.05)] p-4 flex flex-col gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity">
              <div className="inline-flex items-center gap-1 self-start bg-[rgba(28,28,30,0.15)] border border-[rgba(54,137,255,0.3)] rounded-[14px] px-2 py-1">
                <Target size={14} className="text-[#3689ff]" />
                <span className="text-[#3689ff] text-xs leading-4">For Target Role</span>
              </div>
              
              <h3 className="text-[#f4f4f5] text-base font-bold leading-6">MLOps / Model Deployment</h3>
              
              {/* 5-segment progress meter with 55% complete */}
              <div className="relative h-1.5 w-full flex gap-0.5">
                <div className="flex-1 bg-[#3689ff] border border-[#3689ff] rounded-full min-w-0" />
                <div className="flex-1 bg-[#3689ff] border border-[#3689ff] rounded-full min-w-0" />
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-0 bg-[rgba(54,137,255,0.15)] border border-[#3689ff] rounded-full" />
                  <div className="absolute inset-0 bg-[#3689ff] border border-[#3689ff] rounded-l-full" style={{ width: '60%' }} />
                </div>
                <div className="flex-1 bg-[rgba(255,255,255,0.33)] rounded-full min-w-0" />
                <div className="flex-1 bg-[rgba(255,255,255,0.33)] rounded-full min-w-0" />
              </div>
              
              <span className="text-white text-sm leading-5">Beginner → Intermediate · 55% complete</span>
              <span className="text-[#71717a] text-sm leading-5">Module 2/4: Strategic Frameworks</span>
            </button>

            {/* Technical Leadership */}
            <button className="rounded-2xl bg-[rgba(255,255,255,0.05)] p-4 flex flex-col gap-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity">
              <div className="inline-flex items-center gap-1 self-start bg-[rgba(28,28,30,0.15)] border border-[rgba(54,137,255,0.3)] rounded-[14px] px-2 py-1">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#3689ff]">
                  <path d="M8 2L10 6L14 6L11 9L12 13L8 10L4 13L5 9L2 6L6 6L8 2Z" fill="currentColor"/>
                </svg>
                <span className="text-[#3689ff] text-xs leading-4">For Saved Jobs</span>
              </div>
              
              <h3 className="text-[#f4f4f5] text-base font-bold leading-6">Technical Leadership</h3>
              
              {/* 5-segment progress meter with 38% complete */}
              <div className="relative h-1.5 w-full flex gap-0.5">
                <div className="flex-1 bg-[#3689ff] rounded-full min-w-0" />
                <div className="relative flex-1 min-w-0">
                  <div className="absolute inset-0 bg-[rgba(54,137,255,0.15)] border border-[#3689ff] rounded-full" />
                  <div className="absolute inset-0 bg-[#3689ff] rounded-l-full" style={{ width: '45%' }} />
                </div>
                <div className="flex-1 bg-[rgba(255,255,255,0.33)] rounded-full min-w-0" />
                <div className="flex-1 bg-[rgba(255,255,255,0.33)] rounded-full min-w-0" />
                <div className="flex-1 bg-[rgba(255,255,255,0.33)] rounded-full min-w-0" />
              </div>
              
              <span className="text-white text-sm leading-5">Novice → Beginner · 38% complete</span>
              <span className="text-[#71717a] text-sm leading-5">Module 1/3: Feedback Frameworks</span>
            </button>
          </div>
        </div>

          </motion.div>
        </div>
      ) : (
        <LearningPathTemplate
          candidateId={candidateId || "10000000-0000-0000-0000-000000000001"}
          jobTitle={targetRole}
          onClose={() => setShowLearningPath(false)}
        />
      )}
    </>
  );
}


