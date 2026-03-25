'use client';

import { useMemo } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { BarChart, type BarChartItem } from "@/components/charts/BarChart";
import { sendTappedIntent } from "@/utils/teleIntent";
import { notifyTele } from "@/utils/teleUtils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ViewFullDetailsButton } from "@/components/ui/ViewFullDetailsButton";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { useMcpCache } from "@/contexts/McpCacheContext";
import { extractGaugeScores } from "@/utils/computeProfileMetrics";

interface CareerGrowthDetailProps {
  rawCareerGrowth?: Record<string, unknown>;
}

function unwrap(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return (obj.data ?? obj.result ?? obj) as Record<string, unknown>;
}

const DEFAULT_BARS: BarChartItem[] = [
  { label: "1 yr ago", value: "16K", height: 40, color: "var(--comp-bar-past)" },
  { label: "Current", value: "22K", height: 60, color: "var(--funnel-bar-blue)" },
  { label: "6-mo proj.", value: "28K", height: 75, color: "var(--comp-bar-projected)" },
  { label: "Target", value: "35K", height: 100, color: "var(--comp-bar-target)" },
];

export function CareerGrowthDetail({ rawCareerGrowth }: CareerGrowthDetailProps) {
  const cache = useMcpCache();
  const resolved = rawCareerGrowth ?? (cache.careerGrowth as Record<string, unknown> | null) ?? undefined;
  const data = useMemo(() => unwrap(resolved), [resolved]);

  const compTraj = (data?.compensation_trajectory as Record<string, unknown>) ?? {};
  const careerGrowthFallback = (compTraj.market_percentile as number) ?? 68;

  const gaugeScores = useMemo(() => extractGaugeScores(cache.skills), [cache.skills]);
  const summary = (data?.summary as Record<string, number>) ?? {};
  const appToInterviewRate = summary.app_to_interview_rate ?? 34;
  const compensationRatio = summary.compensation_ratio ?? 18;
  const marketPercentile = summary.market_percentile ?? 68;
  const yoyGrowth = summary.yoy_growth ?? compensationRatio;

  const compTrajectory = useMemo<BarChartItem[]>(() => {
    const comp = data?.compensation_trajectory as Record<string, unknown> | undefined;
    const snapshots = comp?.snapshots as Record<string, unknown>[] | undefined;
    if (!snapshots?.length) return DEFAULT_BARS;
    const maxVal = Math.max(...snapshots.map((s) => Number(s.amount_sar) || 0), 1);
    const colors = [
      "var(--comp-bar-past)",
      "var(--funnel-bar-blue)",
      "var(--comp-bar-projected)",
      "var(--comp-bar-target)",
    ];
    return snapshots.map((s, i) => ({
      label: String(s.label ?? ""),
      value: `${Number(s.amount_sar) || 0}K`,
      height: (Number(s.amount_sar) / maxVal) * 100,
      color: colors[i] ?? "var(--funnel-bar-blue)",
    }));
  }, [data]);

  const bars = compTrajectory.length >= 2 ? compTrajectory : DEFAULT_BARS;

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["career", "growth"],
    matchMode: "any",
    instruction:
      '[SYSTEM] CareerGrowthDetail is now visible. Say: "Your career growth is accelerating steadily. Here\'s how this is helping you."',
    delayMs: 1200,
  });

  useVoiceActions(
    useMemo(() => [
      { phrases: ["close", "go back", "back to profile"], action: () => void notifyTele("user clicked: back to profile") },
    ], []),
  );

  const handleClose = () => void notifyTele("user clicked: back to profile");

  return (
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
          data-testid="career-growth-detail"
          className="relative overflow-hidden flex flex-col gap-4 z-20"
        >
          {/* Top metrics card: gauge + stats */}
          <div className="rounded-2xl p-4 flex gap-4 items-center glass-surface">
            <CircularGauge percentage={gaugeScores.careerGrowth ?? careerGrowthFallback} size={94} />
            <div className="flex-1 min-w-0 flex flex-wrap gap-2">
              <div className="flex-1 min-w-[90px] flex flex-col gap-1 rounded-2xl">
                <span className="text-[var(--text-primary)] text-xs leading-4">App → Interview</span>
                <span className="text-[var(--text-primary)] text-xl font-semibold leading-[30px]">{appToInterviewRate}%</span>
                <div className="flex items-center gap-1">
                  <ArrowUpRight size={12} className="text-[var(--accent)]" />
                  <span className="text-[var(--accent)] text-xs leading-4">+8% vs avg</span>
                </div>
              </div>
              <div className="flex-1 min-w-[90px] flex flex-col gap-1 rounded-2xl">
                <span className="text-[var(--text-primary)] text-xs leading-4">Compensation rate</span>
                <span className="text-[var(--text-primary)] text-xl font-semibold leading-[30px]">+{compensationRatio}%</span>
                <div className="flex items-center gap-1">
                  <ArrowUpRight size={12} className="text-[var(--accent)]" />
                  <span className="text-[var(--accent)] text-xs leading-4">vs 1 yr ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compensation Trajectory */}
          <div className="rounded-2xl p-4 flex flex-col gap-4 glass-surface">
            <p className="text-[var(--text-primary)] text-xl font-semibold leading-6">
              Compensation Trajectory
            </p>

            <BarChart bars={bars} />

            {/* Bottom stats */}
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

          <ViewFullDetailsButton
            onClick={() => void sendTappedIntent("View Career Growth Details")}
          />
        </div>
      </BottomSheet>
    </>
  );
}
