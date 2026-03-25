'use client';

import { useState, useEffect, useRef, useMemo } from "react";
import { Share2, Crosshair, Briefcase, FileText, ChevronRight } from "lucide-react";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { sendTappedIntent, sendSelectionIntent } from "@/utils/teleIntent";
import { notifyTele } from "@/utils/teleUtils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";
import { SpotlightOverlay } from "@/components/ui/SpotlightOverlay";
import { computeProfileMetrics, type SkillData, extractGaugeScores } from "@/utils/computeProfileMetrics";
import { mapRawSkillProgression } from "@/utils/computeProfileMetrics";
import { useMcpCache } from "@/contexts/McpCacheContext";
// TODO: replace with real-time value from a fetchApplications tool when available
import { activeApplications } from "@/mocks/jobApplicationData";

const TUTORIAL_KEY = "trainco_profile_tutorial_shown";

/* ── Speech-driven section glow ────────────────────────────────────────────── */

export type GlowSection =
  | "target-role"
  | "skill-coverage"
  | "market-relevance"
  | "career-growth";

  const SECTION_TRIGGERS: { section: GlowSection; phrases: string[] }[] = [
    { section: "target-role", phrases: ["target role"] },
    { section: "skill-coverage", phrases: ["skill coverage"] },
    { section: "market-relevance", phrases: ["market relevance"] },
    { section: "career-growth", phrases: ["career growth"] },
  ];
  
  const GLOW_ON: React.CSSProperties = {
    boxShadow: "0px 0px 18px 15px var(--spotlight-fill)"
  };
  
  const GLOW_TRANSITION = "border-color 0.5s ease, box-shadow 0.5s ease, background 0.5s ease, z-index 0s";
  
  function sectionGlow(active: boolean): React.CSSProperties {
    return { 
      transition: GLOW_TRANSITION, 
      position: 'relative',
      zIndex: active ? 40 : 1, 
      ...(active ? GLOW_ON : {}) 
    };
  }

/* ── Component ─────────────────────────────────────────────────────────────── */

interface ProfileSheetProps {
  name: string;
  title?: string;
  avatarUrl?: string;
  /**
   * Raw `get_skill_progression` response — AI dumps the MCP result directly.
   * The frontend maps, validates, and computes all metrics automatically.
   */
  rawSkillProgression?: Record<string, unknown>;
  /** Legacy: pre-mapped skill data. Prefer rawSkillProgression. */
  skillData?: SkillData;
  /** Target role name (e.g. "Senior AI Architect"). Shown in a sub-card. */
  targetRole?: string;
  /** Skills remaining to reach target role. */
  skillsToGo?: number;
  /** Estimated timeline string (e.g. "~4-6 months"). */
  estimatedTimeline?: string;
  /** Skill Coverage score 0–100. Green if >= 75, yellow if < 75. */
  skillCoverage?: number;
  /** Market Relevance score 0–100. Green if >= 75, yellow if < 75. */
  marketRelevance?: number;
  /** Career Growth score 0–100. If omitted the gauge shows upward-chevron display. */
  careerGrowth?: number;
  /** Contextual label shown bottom-left (e.g. "Your Profile"). */
  footerLeft?: string;
  /** Contextual label shown bottom-right (e.g. "Skill Coverage: 72%"). */
  footerRight?: string;
  /**
   * When true (dashboard home): profile card is the primary nav surface — no backdrop
   * dismiss and no voice "close" to leave the sheet.
   */
  dashboardAnchor?: boolean;
  /** Active application count — shown in quick link tile; optional until data loads. */
  applicationsCount?: number;
  /** Saved jobs count — shown in quick link tile; optional until data loads. */
  savedJobsCount?: number;
}

export function ProfileSheet({
  name,
  title,
  avatarUrl,
  rawSkillProgression,
  skillData: legacyData,
  targetRole,
  skillCoverage,
  marketRelevance,
  careerGrowth,
  dashboardAnchor = false,
  applicationsCount,
  savedJobsCount,
}: ProfileSheetProps) {
  const skillData = useMemo(
    () => mapRawSkillProgression(rawSkillProgression) ?? legacyData,
    [rawSkillProgression, legacyData],
  );
  const computed = useMemo(() => computeProfileMetrics(skillData), [skillData]);

  const resolvedTargetRole = targetRole ?? computed.targetRole ?? "AI Engineer";
  const cache = useMcpCache();
  const gaugeFromCache = useMemo(() => extractGaugeScores(cache.skills), [cache.skills]);

  // Market relevance: read overall_score from the dedicated endpoint cache (73 → 84 after learning).
  // gaugeFromCache.marketRelevance comes from skill_map[AI Engineering].market_avg — a constant
  // industry benchmark (always 70), NOT the candidate's score. Use it only as last resort.
  const mrFromDedicatedCache = useMemo(
    () => (cache.marketRelevance as Record<string, unknown> | null)?.overall_score as number | undefined,
    [cache.marketRelevance],
  );

  // Career growth: read market_percentile from the dedicated endpoint cache (68 → 76 after learning).
  // computeProfileMetrics intentionally leaves careerGrowth undefined, causing the gauge to show
  // velocity chevrons instead of a score when this dedicated cache slot is not used.
  const cgPercentile = useMemo(() => {
    const cgData = cache.careerGrowth as Record<string, unknown> | null;
    const traj = cgData?.compensation_trajectory as Record<string, unknown> | undefined;
    return traj?.market_percentile as number | undefined;
  }, [cache.careerGrowth]);

  const resolvedSkillCoverage = skillCoverage ?? computed.skillCoverage ?? gaugeFromCache.skillCoverage;
  // Market relevance priority:
  //   1. Explicit prop from AI         (overrides everything — AI knows best)
  //   2. mrFromDedicatedCache          (cache.marketRelevance.overall_score: 73 before, 84 after)
  //   3. gaugeFromCache.marketRelevance (skill_map[AI Engineering].market_avg: constant 70 — last resort)
  // NOTE: computed.marketRelevance is intentionally excluded here — it reads market_avg (70, a constant
  // industry benchmark) not the candidate's actual score, so including it would always block #2.
  const resolvedMarketRelevance = marketRelevance ?? mrFromDedicatedCache ?? gaugeFromCache.marketRelevance;
  const resolvedCareerGrowth = careerGrowth ?? cgPercentile ?? computed.careerGrowth ?? gaugeFromCache.careerGrowth;

  const skillGaugeAccent = useMemo((): "green" | "amber" | undefined => {
    if (resolvedSkillCoverage === undefined) return undefined;
    return resolvedSkillCoverage < 75 ? "amber" : "green";
  }, [resolvedSkillCoverage]);

  const marketGaugeAccent = useMemo((): "green" | "red" | undefined => {
    if (resolvedMarketRelevance === undefined) return undefined;
    return resolvedMarketRelevance < 75 ? "red" : "green";
  }, [resolvedMarketRelevance]);

  // TODO: replace activeApplications.length with real-time count from a fetchApplications tool when available
  const resolvedAppsCount = applicationsCount ?? activeApplications.length;
  const appsLabel = `${resolvedAppsCount} application${resolvedAppsCount === 1 ? "" : "s"}`;
  const savedLabel =
    savedJobsCount === undefined ? "—" : `${savedJobsCount} saved job${savedJobsCount === 1 ? "" : "s"}`;

  const { speech, isTalking } = useTeleSpeech();
  const [glow, setGlow] = useState<GlowSection | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorialDoneRef = useRef(false);
  const tutorialEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorialClaimedRef = useRef(false);
  
  

  // Speech-driven tutorial: detects section keywords in avatar speech
  // and activates the corresponding glow.
  useEffect(() => {
    const spoken = (speech ?? "").toLowerCase();
    if (!isTalking || !spoken || tutorialDoneRef.current) return;

    let best: GlowSection | null = null;
    let bestIdx = -1;
    const candidates: { section: GlowSection; idx: number }[] = [];

    for (const { section, phrases } of SECTION_TRIGGERS) {
      for (const p of phrases) {
        const idx = spoken.lastIndexOf(p);
        if (idx !== -1) {
          candidates.push({ section, idx });
          if (idx > bestIdx) {
            bestIdx = idx;
            best = section;
          }
        }
      }
    }

    if (best) {
      const winner = best;
      setGlow((prev) => {
        if (winner === prev && candidates.length > 1) {
          const alt = candidates
            .filter((c) => c.section !== prev)
            .sort((a, b) => b.idx - a.idx)[0];
          if (alt) return alt.section;
        }
        return winner;
      });
      if (clearRef.current) clearTimeout(clearRef.current);
    }

    if (spoken.includes("career growth")) {
      tutorialDoneRef.current = true;
      localStorage.setItem(TUTORIAL_KEY, "true");
      if (tutorialEndTimerRef.current) clearTimeout(tutorialEndTimerRef.current);
      tutorialEndTimerRef.current = setTimeout(() => setGlow(null), 4000);
    }
  }, [speech, isTalking]);

  useEffect(() => {
    if (clearRef.current) clearTimeout(clearRef.current);
    if (!isTalking && glow) {
      clearRef.current = setTimeout(() => setGlow(null), 2000);
    }
    return () => { if (clearRef.current) clearTimeout(clearRef.current); };
  }, [isTalking, glow]);

  useEffect(() => {
    return () => { if (tutorialEndTimerRef.current) clearTimeout(tutorialEndTimerRef.current); };
  }, []);

  const [tutorialEnabled] = useState(() => {
    if (localStorage.getItem(TUTORIAL_KEY) === "true") return false;
    if (tutorialClaimedRef.current) return false;
    tutorialClaimedRef.current = true;
    return true;
  });

  useSpeechFallbackNudge({
    enabled: tutorialEnabled,
    requiredPhrases: ["this is your profile", "let's take a look"],
    matchMode: "all",
    instruction:
      "[SYSTEM] ProfileSheet tutorial was NOT spoken. Your next response MUST include ALL of the following speech in order, in a SINGLE response:\n" +
      '1. "This is your profile. Let\'s take a look."\n' +
      '2. "Based on everything I know about you, I picked a Target Role you should grow towards. You may change this at any time."\n' +
      '3. "Your Skill Coverage tells you how close you are to your Target Role."\n' +
      '4. "Your Market Relevance measures how closely your skills align with market demands."\n' +
      '5. "Your Career Growth measures how quickly your growth is turning into real opportunities."\n' +
      '6. "You may tap on any of these to see more details, or you can ask me directly."\n' +
      "Say ALL six lines in one response. Do not stop early. Do not wait for user input between them.",
    delayMs: 1200,
  });

  useVoiceActions(
    useMemo(() => {
      const actions = [
        { phrases: ["share", "share profile"], action: () => void sendTappedIntent("share profile") },
        { phrases: ["skill coverage", "skills"], action: () => void sendTappedIntent("Skill Coverage") },
        { phrases: ["market relevance", "market"], action: () => void sendTappedIntent("Market Relevance") },
        { phrases: ["career growth", "career"], action: () => void sendTappedIntent("Career Growth") },
        { phrases: ["target role", "view target role", "my target role"], action: () => void sendTappedIntent("Target Role") },
        {
          phrases: ["applications", "my applications", "check on my applications"],
          action: () => void sendSelectionIntent("Check on my applications"),
        },
        {
          phrases: ["saved jobs", "view saved jobs"],
          action: () => void sendSelectionIntent("View saved jobs"),
        },
      ];
      if (!dashboardAnchor) {
        actions.push({
          phrases: ["close", "go back"],
          action: () => void notifyTele("user clicked: profile"),
        });
      }
      return actions;
    }, [dashboardAnchor]),
  );

  const initials = (name ?? "").split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <BottomSheet
      data-testid="profile-sheet"
      onClose={
        dashboardAnchor
          ? undefined
          : () => void notifyTele("user clicked: profile")
      }
    >
      <SpotlightOverlay activeId={glow} />
      
      <div
        data-testid="profile-sheet-card"
        className="relative overflow-hidden rounded-2xl px-5 py-6 sm:p-6 flex flex-col gap-5 glass-card top-sheen z-20"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="relative z-10 flex gap-4 items-start">
          <div
            data-testid="profile-sheet-avatar"
            className="size-[56px] sm:size-[60px] rounded-full overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-white/10"
            style={{ background: "var(--avatar-bg)" }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[var(--accent-contrast)] text-lg font-semibold select-none">
                {initials}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5 flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-3">
              <p
                data-testid="profile-sheet-name"
                className="text-[var(--text-primary)] text-xl sm:text-2xl font-semibold leading-tight tracking-tight truncate"
              >
                {name}
              </p>
              <button
                data-testid="profile-sheet-share-btn"
                type="button"
                onClick={() => void sendTappedIntent("share profile")}
                className="shrink-0 size-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors active:scale-95"
                aria-label="Share profile"
              >
                <Share2 size={18} className="text-[var(--text-primary)]" />
              </button>
            </div>
            {title && (
              <p
                data-testid="profile-sheet-title"
                className="text-[var(--text-secondary)] text-[15px] font-normal leading-5 truncate"
              >
                {title}
              </p>
            )}
          </div>
        </div>

        {/* ── Target Role ─────────────────────────────────────────── */}
        <button
          type="button"
          data-spotlight="target-role"
          onClick={() => void sendTappedIntent("Target Role")}
          className="rounded-2xl p-4 glass-surface border border-white/5 w-full text-left transition-all hover:bg-white/[0.04] active:scale-[0.99]"
          style={sectionGlow(glow === "target-role")}
        >
          <div className="flex gap-3 items-center">
            <div
              className="size-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
            >
              <Crosshair size={22} className="text-emerald-400" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-emerald-400 text-xs font-medium uppercase tracking-wide">
                Target Role
              </span>
              <span className="text-white text-base sm:text-lg font-semibold leading-snug truncate">
                {resolvedTargetRole}
              </span>
            </div>
          </div>
        </button>

        {/* ── Metrics row ─────────────────────────────────────────── */}
        <div className="relative z-10 flex items-start justify-between gap-2 sm:gap-4 py-1">
          <MetricColumn
            id="skill-coverage"
            label="Skill Coverage"
            percentage={resolvedSkillCoverage}
            gaugeAccent={skillGaugeAccent}
            glowing={glow === "skill-coverage"}
            onClick={() => void sendTappedIntent("Skill Coverage")}
          />
          <MetricColumn
            id="market-relevance"
            label="Market Relevance"
            percentage={resolvedMarketRelevance}
            gaugeAccent={marketGaugeAccent}
            glowing={glow === "market-relevance"}
            onClick={() => void sendTappedIntent("Market Relevance")}
          />
          <MetricColumn
            id="career-growth"
            label="Career Growth"
            percentage={resolvedCareerGrowth}
            gaugeAccent={resolvedCareerGrowth === undefined ? undefined : "green"}
            glowing={glow === "career-growth"}
            onClick={() => void sendTappedIntent("Career Growth")}
          />
        </div>

        {/* ── Applications & Saved jobs ───────────────────────────── */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="profile-sheet-applications-tile"
            onClick={() => void sendSelectionIntent("Check on my applications")}
            className="rounded-2xl p-4 flex flex-col gap-3 text-left glass-surface border border-white/5 transition-all hover:bg-white/[0.04] active:scale-[0.99]"
          >
            <FileText size={22} className="text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span className="text-[var(--text-secondary)] text-[13px] leading-snug">{appsLabel}</span>
            <span className="text-emerald-400 text-sm font-semibold flex items-center gap-0.5">
              Applications
              <ChevronRight size={16} className="shrink-0 opacity-90" />
            </span>
          </button>
          <button
            type="button"
            data-testid="profile-sheet-saved-jobs-tile"
            onClick={() => void sendSelectionIntent("View saved jobs")}
            className="rounded-2xl p-4 flex flex-col gap-3 text-left glass-surface border border-white/5 transition-all hover:bg-white/[0.04] active:scale-[0.99]"
          >
            <Briefcase size={22} className="text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span className="text-[var(--text-secondary)] text-[13px] leading-snug">{savedLabel}</span>
            <span className="text-emerald-400 text-sm font-semibold flex items-center gap-0.5">
              Saved Jobs
              <ChevronRight size={16} className="shrink-0 opacity-90" />
            </span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

/* ── MetricColumn ──────────────────────────────────────────────────────────── */

interface MetricColumnProps {
  id: string;
  label: string;
  percentage?: number;
  gaugeAccent?: "green" | "amber" | "red";
  glowing?: boolean;
  onClick: () => void;
}

function MetricColumn({ id, label, percentage, gaugeAccent, glowing, onClick }: MetricColumnProps) {
  return (
    <button
      type="button"
      data-spotlight={id}
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 flex-1 min-w-0 rounded-2xl border border-transparent py-1 px-0.5"
      style={sectionGlow(!!glowing)}
    >
      <CircularGauge percentage={percentage} size={80} accent={gaugeAccent} />
      <span className="text-emerald-400 text-[14px] sm:text-[12px] font-semibold text-center inline-flex items-center justify-center gap-0.5 leading-tight">
        <span>{label}</span>
        <ChevronRight size={12} className="opacity-85 shrink-0" aria-hidden />
      </span>
    </button>
  );
}
