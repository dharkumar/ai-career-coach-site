'use client';

import { useMemo } from "react";
import { motion } from "motion/react";
import { X, Brain, Cloud, Blocks, Zap, Flame } from "lucide-react";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { ProgressBar } from "@/components/charts/ProgressBar";
import { sendBackToProfileIntent } from "@/utils/teleIntent";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { useMcpCache } from "@/contexts/McpCacheContext";
import { extractGaugeScores } from "@/utils/computeProfileMetrics";

interface MarketRelevanceSheetProps {
  rawMarketRelevance?: Record<string, unknown>;
}

interface InvestmentOpp {
  skill_area: string;
  roi: string;
  reason: string;
}

interface IndustryTrend {
  label: string;
  change_pct: number;
}

interface TrendMonth {
  month: string;
  score: number;
}

function unwrap(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return (obj.data ?? obj.result ?? obj) as Record<string, unknown>;
}

const ROI_STYLES: Record<string, { badge: string; text: string; iconBg: string }> = {
  "Very High": { badge: "var(--roi-very-high-bg)", text: "var(--roi-very-high)", iconBg: "var(--roi-very-high-icon)" },
  "High":      { badge: "var(--roi-high-bg)",      text: "var(--roi-high)",      iconBg: "var(--roi-high-icon)" },
};
const DEFAULT_ROI = ROI_STYLES["High"];

const SKILL_ICON_MAP: Record<string, typeof Brain> = {
  ai: Brain, machine: Brain, ml: Brain,
  cloud: Cloud,
  system: Blocks, design: Blocks,
};

function pickIcon(skillArea: string) {
  const lower = skillArea.toLowerCase();
  for (const [key, Icon] of Object.entries(SKILL_ICON_MAP)) {
    if (lower.includes(key)) return Icon;
  }
  return Zap;
}

function renderInsightBody(body: string) {
  const match = body.match(/(top\s+\d+%)/i);
  if (!match) return <span className="text-[var(--text-muted)] text-xs leading-[18px]">{body}</span>;
  const idx = body.indexOf(match[1]);
  return (
    <span className="text-[var(--text-muted)] text-xs leading-[18px]">
      {body.slice(0, idx)}
      <span className="text-[var(--accent)]">{match[1]}</span>
      {body.slice(idx + match[1].length)}
    </span>
  );
}

export function MarketRelevanceSheet({ rawMarketRelevance }: MarketRelevanceSheetProps) {
  const cache = useMcpCache();
  const resolved = rawMarketRelevance ?? (cache.marketRelevance as Record<string, unknown> | null) ?? undefined;
  const data = useMemo(() => unwrap(resolved), [resolved]);

  const gaugeScores = useMemo(() => extractGaugeScores(cache.skills), [cache.skills]);
  // Prefer overall_score from the dedicated market relevance endpoint (73 before → 84 after learning).
  // gaugeScores.marketRelevance reads skill_map[AI Engineering].market_avg — a constant industry
  // benchmark (always 70) — so it must come last to avoid masking the real candidate score.
  const score = (data?.overall_score as number) ?? gaugeScores.marketRelevance ?? 0;
  const delta = (data?.six_month_delta as number) ?? 0;
  const insight = data?.key_insight as { headline?: string; body?: string } | undefined;
  const trend = (data?.six_month_trend as TrendMonth[]) ?? [];
  const opportunities = (data?.investment_opportunities as InvestmentOpp[]) ?? [];
  const industryTrends = (data?.industry_trends as IndustryTrend[]) ?? [];

  const maxPct = Math.max(...industryTrends.map((t) => Math.abs(t.change_pct)), 1);
  const maxScore = Math.max(...trend.map((t) => t.score), 1);

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["market", "relevance", "detail"],
    matchMode: "any",
    instruction:
      '[SYSTEM] MarketRelevanceSheet is now visible. Say: "Here\'s your full market relevance breakdown."',
    delayMs: 1200,
  });

  useVoiceActions(
    useMemo(() => [
      { phrases: ["close", "go back", "back to profile"], action: () => void sendBackToProfileIntent() },
    ], []),
  );

  return (
    <div
      data-testid="market-relevance-sheet"
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
        className="flex-1 overflow-y-auto px-[16px] pt-20 pb-28 flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[var(--text-primary)] text-[32px] font-semibold leading-10">
            Market Relevance
          </h1>
          <p className="text-[var(--text-dim)] text-sm">
            How closely your skills align with market demands
          </p>
        </div>

        {/* Score + Key Insight card */}
        <div className="flex gap-8 items-center">
          <CircularGauge percentage={score} size={98} />
          {insight && (
            <div
              className="flex-1 min-w-0 rounded-2xl px-4 py-4 flex flex-col gap-1"
              style={{
                background: "var(--insight-bg)",
                border: "1px solid var(--insight-border)",
              }}
            >
              <span className="text-[var(--accent)] text-[13px] font-semibold leading-5">
                Key Insight
              </span>
              {insight.body && renderInsightBody(insight.body)}
            </div>
          )}
        </div>

        {/* Where to Invest Your Time */}
        {opportunities.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">
              Where to Invest Your Time
            </h2>
            <div className="rounded-2xl p-4 flex flex-col gap-4 glass-surface">
              <p className="text-[var(--text-label)] text-[11px] leading-4">
                Ranked by potential salary return on your learning investment
              </p>
              <div className="flex flex-col gap-3">
                {opportunities.map((opp) => {
                  const colors = ROI_STYLES[opp.roi] ?? DEFAULT_ROI;
                  const Icon = pickIcon(opp.skill_area);
                  return (
                    <div
                      key={opp.skill_area}
                      className="flex gap-4 items-center p-3 rounded-[14px]"
                      style={{
                        background: "var(--investment-row-bg)",
                        border: "1px solid var(--investment-row-border)",
                      }}
                    >
                      <div
                        className="size-8 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: colors.iconBg }}
                      >
                        <Icon size={16} style={{ color: colors.text }} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-primary)] text-[13px] font-semibold leading-5">
                            {opp.skill_area}
                          </span>
                          <span
                            className="text-[11px] font-semibold leading-4 px-2 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: colors.badge, color: colors.text }}
                          >
                            ROI: {opp.roi}
                          </span>
                        </div>
                        <p className="text-[var(--text-dim)] text-[11px] leading-4 truncate">
                          {opp.reason}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <span className="text-[var(--accent)] text-base">
                Go to Learning →
              </span>
            </div>
          </div>
        )}

        {/* Industry Trend Radar */}
        {industryTrends.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">
              Industry Trend Radar
            </h2>
            <div className="rounded-2xl p-4 flex flex-col gap-2.5 glass-surface">
              <p className="text-[var(--text-label)] text-[11px] leading-4">
                Change in number of relevant job postings in the last 30 days
              </p>
              <div className="flex flex-col gap-3">
                {industryTrends.map((t) => {
                  const isPositive = t.change_pct > 0;
                  const isNegative = t.change_pct < 0;
                  const isNeutral = t.change_pct === 0;
                  const barWidth = Math.min((Math.abs(t.change_pct) / maxPct) * 100, 100);
                  const barColor = isNegative
                    ? "var(--bar-negative)"
                    : isNeutral
                      ? "var(--bar-neutral)"
                      : undefined;
                  const textColor = isNegative
                    ? "var(--error)"
                    : isNeutral
                      ? "var(--bar-neutral)"
                      : "var(--accent)";
                  const showFlame = t.change_pct >= 50;

                  return (
                    <div key={t.label} className="flex items-center gap-3">
                      <div className="w-[100px] flex items-center gap-1.5 shrink-0">
                        {showFlame && <Flame size={10} className="text-orange-400 shrink-0" />}
                        <span className="text-[var(--text-secondary)] text-xs truncate">{t.label}</span>
                      </div>
                      <div className="flex-1">
                        <ProgressBar
                          percent={barWidth}
                          color={barColor ?? "linear-gradient(to right, var(--bar-positive), var(--bar-positive-end))"}
                          heightClass="h-5"
                          radiusClass="rounded-lg"
                        />
                      </div>
                      <span
                        className="text-[11px] font-semibold w-[30px] text-right shrink-0"
                        style={{ color: textColor }}
                      >
                        {isPositive ? "+" : ""}{t.change_pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 6-Month Relevance Trend (bar chart) */}
        {trend.length >= 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[var(--text-primary)] text-xl font-semibold leading-6">
                6-Month Relevance Trend
              </h2>
              {delta !== 0 && (
                <span
                  className="text-sm"
                  style={{ color: delta > 0 ? "var(--accent)" : "var(--error)" }}
                >
                  {delta > 0 ? "+" : ""}{delta}%
                </span>
              )}
            </div>
            <div className="rounded-2xl p-4 glass-surface">
              <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
                {trend.map((m, i) => {
                  const isLast = i === trend.length - 1;
                  const barH = (m.score / maxScore) * 85;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[var(--text-dim)] text-[10px] font-semibold">{m.score}%</span>
                      <div
                        className="w-full max-w-[50px] rounded-t-lg no-lightboard bar-color"
                        style={{
                          height: barH,
                          "--_bar": isLast ? "var(--accent)" : "var(--bar-positive-muted)",
                        } as React.CSSProperties}
                      />
                      <span className="text-[var(--text-label)] text-[10px]">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
