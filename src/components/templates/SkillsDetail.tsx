'use client';

import { useEffect, useMemo, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { PathTrack, type PathStop } from "@/components/charts/PathTrack";
import { notifyTele } from "@/utils/teleUtils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { useCurrentSection } from "@/contexts/CurrentSectionContext";
import {
  computeProfileMetrics,
  mapRawSkillProgression,
  type SkillProgressionItem,
} from "@/utils/computeProfileMetrics";
import { SkillCoverageSheet } from "./SkillCoverageSheet";
import { SkillTestFlow } from "./SkillTestFlow";
import { getVisitorSession } from "@/utils/visitorMemory";
import { DEFAULT_STOPS } from "@/constants/careerPathStops";

/* ── Constants ────────────────────────────────────────────────────────────── */

const HARDCODED_SKILL_GAPS: SkillProgressionItem[] = [
  {
    name: "Kubernetes",
    current_level: 1,
    target_level: 2,
    is_featured: true,
  },
];

/* ── Types ────────────────────────────────────────────────────────────────── */

interface SkillsDetailProps {
  rawSkillProgression?: Record<string, unknown>;
  skillCoverage?: number;
  targetRole?: string;
  candidateId?: string;
}


export function SkillsDetail({
  rawSkillProgression,
  skillCoverage: overrideCoverage,
  targetRole: overrideRole,
  candidateId,
}: SkillsDetailProps) {
  const [showCoverageSheet, setShowCoverageSheet] = useState(false);
  const [showTestFlow, setShowTestFlow] = useState(false);
  const resolvedCandidateId = candidateId || getVisitorSession()?.candidateId || "10000000-0000-0000-0000-000000000001";
  const { setOverrideTemplateId } = useCurrentSection();

  useEffect(() => {
    if (showCoverageSheet) setOverrideTemplateId("SkillCoverageSheet");
    else if (showTestFlow) setOverrideTemplateId("SkillTestFlow");
    else setOverrideTemplateId(undefined);
  }, [showCoverageSheet, showTestFlow, setOverrideTemplateId]);

  const skillData = useMemo(
    () => mapRawSkillProgression(rawSkillProgression),
    [rawSkillProgression],
  );
  const computed = useMemo(() => computeProfileMetrics(skillData), [skillData]);

  const coverage = overrideCoverage ?? computed.skillCoverage ?? 0;
  const targetRole = overrideRole ?? computed.targetRole ?? "AI Engineer";

  const stops: PathStop[] = useMemo(() => {
    const last = DEFAULT_STOPS[DEFAULT_STOPS.length - 1];
    if (targetRole && last.label !== targetRole) {
      return [DEFAULT_STOPS[0], DEFAULT_STOPS[1], { label: targetRole, status: "upcoming" }];
    }
    return DEFAULT_STOPS;
  }, [targetRole]);

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["skill", "coverage"],
    matchMode: "any",
    instruction:
      `[SYSTEM] SkillsDetail is now visible. Say: "You are working towards ${targetRole}. You are ${coverage}% of the way there. I recommend working on your Kubernetes skills."`,
    delayMs: 1200,
  });

  useVoiceActions(
    useMemo(() => [
      { phrases: ["close", "go back", "back to profile"], action: () => void notifyTele("user clicked: back to profile") },
      { phrases: ["view skill coverage", "skill coverage", "view coverage"], action: () => setShowCoverageSheet(true) },
    ], []),
  );

  const handleClose = () => void notifyTele("user clicked: back to profile");

  return (
    <>
      {showTestFlow ? (
        <SkillTestFlow
          candidateId={resolvedCandidateId}
          onBack={() => setShowTestFlow(false)}
          onClose={() => void notifyTele("user clicked: back to profile")}
        />
      ) : showCoverageSheet ? (
        <SkillCoverageSheet
          rawSkillProgression={rawSkillProgression}
          skillCoverage={overrideCoverage}
          targetRole={overrideRole}
        />
      ) : (
        <>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] pointer-events-auto"
            aria-label="Close"
          >
            <X size={20} className="text-[var(--text-primary)]" />
          </button>
          <BottomSheet onClose={handleClose}>
            <div
              data-testid="skills-detail"
              className="relative overflow-hidden flex flex-col gap-4 z-20"
            >
             <div className="flex flex-col gap-2">
              {/* Top card: gauge + career path */}
              <div className="rounded-2xl p-4 flex gap-4 items-center glass-surface">
                <CircularGauge percentage={coverage} size={105} />
                <div className="flex-1 min-w-0">
                  <PathTrack label="Career Path" percentage={coverage} stops={stops} />
                </div>
              </div>

              {/* We recommend */}
              <div className="rounded-2xl p-4 flex flex-col gap-4 glass-surface">
                <div className="flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <span className="text-[var(--text-primary)] text-xl font-semibold">
                    We recommend
                  </span>
                </div>

                {HARDCODED_SKILL_GAPS.map((skill) => {
                  const levelLabels = ["Novice", "Beginner", "Intermediate", "Advanced", "Expert"];
                  const currentLabel = levelLabels[skill.current_level] || "Novice";
                  const targetLabel = levelLabels[skill.target_level] || "Expert";

                  return (
                    <button
                      key={skill.name}
                      onClick={() => setShowTestFlow(true)}
                      className="flex flex-col gap-2 w-full text-left pointer-events-auto"
                    >
                      <p className="text-[var(--text-primary)] text-base font-bold">
                        {skill.name}
                      </p>

                      {/* 5-segment level meter */}
                      <div
                        className="relative flex w-full gap-[3px] no-lightboard"
                        style={{ isolation: "isolate", zIndex: 20 }}
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const isFilled = i < skill.current_level;
                          const isTarget = i >= skill.current_level && i < skill.target_level;
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-full no-lightboard bar-color"
                              style={{
                                height: 8,
                                willChange: "transform",
                                "--_bar": isFilled
                                  ? "var(--funnel-bar-blue)"
                                  : isTarget
                                    ? "var(--funnel-bar-blue-muted)"
                                    : "var(--bar-inactive)",
                                ...(isTarget
                                  ? { boxShadow: "inset 0 0 0 1px var(--funnel-bar-blue)" }
                                  : {}),
                              } as React.CSSProperties}
                            />
                          );
                        })}
                      </div>

                      <span className="text-sm text-[var(--text-primary)]">
                        {skill.current_level === 0 ? "Missing Skill" : `${currentLabel} → ${targetLabel}`}
                      </span>

                      <p className="text-[var(--text-primary)] text-base leading-6">
                        <span className="font-bold">{skill.name}</span>
                        {" "}appears as part of your Target Role and in{" "}
                        <span className="font-bold">3 of your saved jobs</span>.
                      </p>
                    </button>
                  );
                })}
              </div>
             </div>

              <button
                onClick={() => setShowCoverageSheet(true)}
                className="self-end btn-primary rounded-[24px] flex items-center gap-2 px-4 py-3 no-lightboard transition-all active:scale-95 z-20"
              >
                <span className="text-[var(--accent-contrast)] text-base font-semibold leading-6 whitespace-nowrap">
                  View Skill Coverage
                </span>
                <ArrowRight size={16} className="text-[var(--accent-contrast)] shrink-0" />
              </button>
            </div>
          </BottomSheet>
        </>
      )}
    </>
  );
}
