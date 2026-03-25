'use client';

import { useMemo } from "react";
import { motion } from "motion/react";
import { X, ArrowUpRight, Zap, Target, BookOpen, Award } from "lucide-react";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { BarChart, type BarChartItem } from "@/components/charts/BarChart";
import { ProgressBar } from "@/components/charts/ProgressBar";
import { sendBackToProfileIntent } from "@/utils/teleIntent";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { useMcpCache } from "@/contexts/McpCacheContext";
import { extractGaugeScores } from "@/utils/computeProfileMetrics";

interface CareerGrowthSheetProps {
  rawCareerGrowth?: Record<string, unknown>;
}

function unwrap(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return (obj.data ?? obj.result ?? obj) as Record<string, unknown>;
}

interface FunnelStage {
  stage: string;
  count: number;
  conversion_pct: number;
}

interface CompSnapshot {
  label: string;
  amount_sar: number;
  is_projection: boolean;
}

interface InterviewScore {
  dimension: string;
  score: number;
  focus_area: boolean;
  focus_tip: string | null;
}

interface SkillMonth {
  month: string;
  count: number;
}

interface Achievement {
  description: string;
  date?: string;
  type?: string;
}

const DEFAULT_COMP_BARS: BarChartItem[] = [
  { label: "1 yr ago", value: "16K", height: 40, color: "var(--comp-bar-past)" },
  { label: "Current", value: "22K", height: 60, color: "var(--funnel-bar-blue)" },
  { label: "6-mo proj.", value: "28K", height: 75, color: "var(--comp-bar-projected)" },
  { label: "Target", value: "35K", height: 100, color: "var(--comp-bar-target)" },
];

export function CareerGrowthSheet({ rawCareerGrowth }: CareerGrowthSheetProps) {
  const cache = useMcpCache();
  const resolved = rawCareerGrowth ?? (cache.careerGrowth as Record<string, unknown> | null) ?? undefined;
  const data = useMemo(() => unwrap(resolved), [resolved]);

  const compTraj = (data?.compensation_trajectory as Record<string, unknown>) ?? {};
  const careerGrowthFallback = (compTraj.market_percentile as number) ?? 68;

  const gaugeScores = useMemo(() => extractGaugeScores(cache.skills), [cache.skills]);
  const summary = (data?.summary as Record<string, number>) ?? {};
  const targetRole = (data?.target_role as Record<string, unknown>) ?? {};
  const targetTitle = (targetRole.title as string) ?? "Senior AI Architect";
  // Backend uses skills_remaining and estimated_months (not skills_to_go / time_estimate)
  const skillsToGo = (targetRole.skills_remaining as number) ?? 3;
  const timeEstimate = (targetRole.estimated_months as string) ?? "~4-6 months";

  const appToInterviewRate = summary.app_to_interview_rate ?? 34;
  const compensationRatio = summary.compensation_ratio ?? 18;
  // market_percentile and yoy_growth_pct live in compensation_trajectory, not summary
  const marketPercentile = (compTraj.market_percentile as number) ?? 68;
  const yoyGrowth = (compTraj.yoy_growth_pct as number) ?? compensationRatio;

  const funnel = (data?.application_funnel as Record<string, unknown>) ?? {};
  const stages = (funnel.stages as FunnelStage[]) ?? [];
  const funnelInsight = (funnel.insight as string) ?? "";

  const snapshots = ((data?.compensation_trajectory as Record<string, unknown>)?.snapshots as CompSnapshot[]) ?? [];
  const compBars = useMemo<BarChartItem[]>(() => {
    if (!snapshots.length) return DEFAULT_COMP_BARS;
    const maxVal = Math.max(...snapshots.map((s) => s.amount_sar), 1);
    return snapshots.map((s, i) => ({
      label: s.label,
      value: `${Math.round(s.amount_sar)}K`,
      height: (s.amount_sar / maxVal) * 100,
      color: i === 0
        ? "var(--comp-bar-past)"
        : i === 1
          ? "var(--funnel-bar-blue)"
          : i === snapshots.length - 1
            ? "var(--comp-bar-target)"
            : "var(--comp-bar-projected)",
    }));
  }, [snapshots]);

  const scores = (data?.interview_scores as InterviewScore[]) ?? [];
  const focusTip = scores.find((s) => s.focus_area)?.focus_tip ?? "";
  const skillMonths = (data?.skills_added_by_month as SkillMonth[]) ?? [];
  const skillsTotal = (data?.skills_added_total as number) ?? 0;
  const achievements = (data?.recent_achievements as Achievement[]) ?? [];

  const maxFunnel = Math.max(...stages.map((s) => s.count), 1);
  const maxSkill = Math.max(...skillMonths.map((s) => s.count), 1);

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["career", "growth", "detail"],
    matchMode: "any",
    instruction:
      '[SYSTEM] CareerGrowthSheet is now visible. Say: "Here\'s your full career growth breakdown."',
    delayMs: 1200,
  });

  useVoiceActions(
    useMemo(() => [
      { phrases: ["close", "go back", "back to profile"], action: () => void sendBackToProfileIntent() },
    ], []),
  );

  return (
    <div
      data-testid="career-growth-sheet"
      className="fixed inset-0 z-50 bg-[var(--bg)] no-lightboard flex flex-col"
    >
      <button
        onClick={() => void sendBackToProfileIntent()}
        className="absolute top-4 right-4 z-10 size-10 rounded-full flex items-center justify-center bg-[var(--surface-elevated)]"
        aria-label="Close"
      >
        <X size={20} className="text-[var(--text-primary)]" />
      </button>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35, delay: 0.05 }}
        className="flex-1 overflow-y-auto px-4 pt-20 pb-28 flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[var(--text-primary)] text-[32px] font-semibold leading-10">
            Career Growth
          </h1>
          <p className="text-[var(--text-dim)] text-sm leading-[21px]">
            How quickly your growth is turning into real opportunities.
          </p>
        </div>

        {/* Top metrics: gauge + stat boxes */}
        <div className="flex gap-6 items-start">
          <CircularGauge percentage={gaugeScores.careerGrowth ?? careerGrowthFallback} size={94} />
          <div className="flex-1 flex flex-wrap gap-2">
            <div className="flex-1 min-w-[130px] glass-surface rounded-2xl p-[17px]  flex flex-col gap-1">
              <span className="text-[var(--text-label)] text-[11px] leading-[16.5px]">App → Interview</span>
              <span className="text-[var(--text-primary)] text-xl font-semibold leading-[30px]">{appToInterviewRate}%</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight size={12} className="text-[var(--accent)]" />
                <span className="text-[var(--accent)] text-[10px] leading-[15px]">+8% vs avg</span>
              </div>
            </div>
            <div className="flex-1 min-w-[130px] glass-surface rounded-2xl py-[17px] px-[17px]  flex flex-col gap-1">
              <span className="text-[var(--text-label)] text-[11px] leading-[16.5px]">Compensation rate</span>
              <span className="text-[var(--text-primary)] text-xl font-semibold leading-[30px]">+{compensationRatio}%</span>
              <div className="flex items-center gap-1">
                <ArrowUpRight size={12} className="text-[var(--accent)]" />
                <span className="text-[var(--accent)] text-[10px] leading-[15px]">vs 1 yr ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Role card */}
        <div className="glass-surface rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-[14px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
            >
              <Target size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[var(--text-dim)] text-xs leading-[18px]">Target Role</span>
              <span className="text-[var(--text-primary)] text-base font-semibold leading-6">{targetTitle}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-[var(--text-dim)]" />
              <span className="text-[var(--text-dim)] text-[13px] leading-[19.5px]">{skillsToGo} skills to go</span>
            </div>
            <span className="text-[var(--accent)] text-[13px] leading-[19.5px]">{timeEstimate}</span>
          </div>
          <span className="text-[var(--accent)] text-base leading-5">Pick your Target Role →</span>
        </div>

        {/* Application Funnel */}
        {stages.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">Application Funnel</h2>
            <div className="glass-surface rounded-2xl p-[21px] flex flex-col gap-3">
              <p className="text-[var(--text-label)] text-[11px] leading-[16.5px]">
                How often have you made it to the next stage? (Last 90 days)
              </p>
              <div className="flex flex-col gap-3">
                {stages.map((s, i) => {
                  const isTop = i < 2;
                  const barColor = isTop ? "var(--funnel-bar-blue)" : "var(--accent)";
                  const badgeBg = isTop ? "var(--funnel-badge-blue)" : "var(--funnel-badge-green)";
                  const badgeText = isTop ? "var(--funnel-bar-blue)" : "var(--accent)";
                  return (
                    <div key={s.stage} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-body)] text-xs leading-[18px]">{s.stage}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-primary)] text-[13px] font-semibold leading-[19.5px]">{s.count}</span>
                          {i > 0 && s.conversion_pct > 0 && (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[10px] leading-[15px]"
                              style={{ backgroundColor: badgeBg, color: badgeText }}
                            >
                              {s.conversion_pct}%
                            </span>
                          )}
                        </div>
                      </div>
                      <ProgressBar percent={(s.count / maxFunnel) * 100} color={barColor} />
                    </div>
                  );
                })}
              </div>
              {funnelInsight && (
                <div className="flex items-center gap-2 rounded-[10px] p-2.5 bg-[var(--funnel-badge-green)]">
                  <Zap size={12} className="text-[var(--accent)] shrink-0" />
                  <span className="text-[var(--accent)] text-[10px] leading-[15px]">{funnelInsight}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compensation Trajectory */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">Compensation Trajectory</h2>
          <div className="glass-surface rounded-2xl px-5 py-[21px] flex flex-col gap-4">
            <p className="text-[var(--text-label)] text-xs leading-4">
              How your current plan is expected to grow your salary (in SAR)
            </p>
            <BarChart bars={compBars.length >= 2 ? compBars : DEFAULT_COMP_BARS} />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[14px] pt-3 px-3 pb-3 flex flex-col gap-0.5 bg-[var(--stat-bg)]">
                <span className="text-[var(--text-label)] text-[10px] leading-[15px]">Market percentile</span>
                <span className="text-[var(--text-primary)] text-base font-semibold leading-6">{marketPercentile}th</span>
              </div>
              <div className="rounded-[14px] pt-3 px-3 pb-3 flex flex-col gap-0.5 bg-[var(--stat-bg)]">
                <span className="text-[var(--text-label)] text-[10px] leading-[15px]">YoY growth</span>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--accent)] text-base font-semibold leading-6">+{yoyGrowth}%</span>
                  <ArrowUpRight size={14} className="text-[var(--accent)]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interview Effectiveness */}
        {scores.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">Interview Effectiveness</h2>
            <div className="glass-surface rounded-2xl p-[21px] flex flex-col gap-4">
              <p className="text-[var(--text-label)] text-xs leading-4">
                How employers rank interview answers among candidates
              </p>
              <div className="flex flex-col gap-3">
                {scores.map((s) => (
                  <div key={s.dimension} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-body)] text-xs leading-[18px]">{s.dimension}</span>
                      <div className="flex items-center gap-1.5">
                        {s.focus_area ? (
                          <span className="text-[var(--text-label)] text-[10px] leading-[15px]">—</span>
                        ) : (
                          <ArrowUpRight size={10} className="text-[var(--accent)]" />
                        )}
                        <span className="text-[var(--accent)] text-xs font-semibold leading-[18px]">{s.score}</span>
                      </div>
                    </div>
                    <ProgressBar percent={s.score} color="var(--accent)" heightClass="h-2" />
                  </div>
                ))}
              </div>
              {focusTip && (
                <div className="flex items-center gap-2 rounded-[10px] px-2.5 py-2.5 bg-[--focus-bg-warning]">
                  <Target size={12} className="text-[var(--focus-text-warning)] shrink-0" />
                  <span className="text-[var(--focus-text-warning)] text-[10px] leading-[15px]">{focusTip}</span>
                </div>
              )}
              <span className="text-[var(--accent)] text-base leading-5">Practice for interviews →</span>
            </div>
          </div>
        )}

        {/* Skills Added */}
        {skillMonths.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">Skills Added</h2>
              <span className="text-[var(--accent)] text-xs font-semibold leading-[18px]">{skillsTotal} total</span>
            </div>
            <div className="glass-surface rounded-2xl p-4">
              <div className="flex items-end justify-between" style={{ height: 80 }}>
                {skillMonths.map((m, i) => {
                  const isLast = i === skillMonths.length - 1;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[var(--text-primary)] text-[11px] font-semibold leading-[16.5px]">{m.count}</span>
                      <div
                        className="w-[46px] rounded-t-lg no-lightboard bar-color"
                        style={{
                          height: `${(m.count / maxSkill) * 55}px`,
                          minHeight: 8,
                          "--_bar": isLast
                            ? "linear-gradient(to bottom, var(--skill-bar-gradient-start), var(--skill-bar-gradient-end))"
                            : "var(--bar-positive-muted)",
                        } as React.CSSProperties}
                      />
                      <span className="text-[var(--text-zinc)] text-[10px] leading-[15px]">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">Recent Achievements</h2>
            <div className="glass-surface rounded-2xl p-[21px] flex flex-col">
              {achievements.map((a, i) => {
                const isLast = i === achievements.length - 1;
                const IconComp = a.type === "course" ? BookOpen : Award;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 py-3 ${!isLast ? "border-b border-[var(--divider)]" : ""}`}
                  >
                    <div className="size-9 rounded-[10px] bg-[var(--achievement-icon-bg)] flex items-center justify-center shrink-0">
                      <IconComp size={16} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[var(--text-body)] text-[13px] leading-[19.5px] truncate">{a.description}</span>
                      {a.date && (
                        <span className="text-[var(--text-zinc)] text-[11px] leading-[16.5px]">{a.date}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
