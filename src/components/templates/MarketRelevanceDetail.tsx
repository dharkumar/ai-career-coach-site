'use client';

import { useMemo } from "react";
import { Brain, Cloud, Blocks, Zap, X } from "lucide-react";
import { CircularGauge } from "@/components/charts/CircularGauge";
import { sendTappedIntent } from "@/utils/teleIntent";
import { notifyTele } from "@/utils/teleUtils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ViewFullDetailsButton } from "@/components/ui/ViewFullDetailsButton";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { useVoiceActions } from "@/hooks/useVoiceActions";
import { useMcpCache } from "@/contexts/McpCacheContext";
import { extractGaugeScores } from "@/utils/computeProfileMetrics";

interface MarketRelevanceDetailProps {
  rawMarketRelevance?: Record<string, unknown>;
}

interface InvestmentOpp {
  skill_area: string;
  roi: string;
  reason: string;
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

function unwrap(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return (obj.data ?? obj.result ?? obj) as Record<string, unknown>;
}

export function MarketRelevanceDetail({ rawMarketRelevance }: MarketRelevanceDetailProps) {
  const cache = useMcpCache();
  const resolved = rawMarketRelevance ?? (cache.marketRelevance as Record<string, unknown> | null) ?? undefined;
  const data = useMemo(() => unwrap(resolved), [resolved]);

  const gaugeScores = useMemo(() => extractGaugeScores(cache.skills), [cache.skills]);
  const score = gaugeScores.marketRelevance ?? (data?.overall_score as number) ?? 0;
  const insight = data?.key_insight as { headline?: string; body?: string } | undefined;
  const investments = (data?.investment_opportunities as InvestmentOpp[]) ?? [];

  useSpeechFallbackNudge({
    enabled: true,
    requiredPhrases: ["market", "relevance"],
    matchMode: "any",
    instruction:
      `[SYSTEM] MarketRelevanceDetail is now visible. Say: "Your current market relevance is at ${score}%. Here's some tips on how to bring it up."`,
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
          data-testid="market-relevance-detail"
          className="relative overflow-hidden flex flex-col gap-[16px] z-20"
        >
        {/* Key Insight: gauge + text */}
        <div className="rounded-2xl p-4 flex gap-4 items-center glass-surface">
          <CircularGauge percentage={score} size={98} />
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-secondary)] text-sm leading-5">
              {insight?.body
                ? renderInsightBody(insight.body)
                : `Your market relevance is at ${score}%.`}
            </p>
          </div>
        </div>

        {/* Where to Invest Your Time */}
        {investments.length > 0 && (
          <div className="rounded-2xl p-4 flex flex-col gap-4 glass-surface">
            <p className="text-[var(--text-primary)] text-xl font-semibold leading-6">
              Where to Invest Your Time
            </p>
            <div className="flex flex-col gap-4">
              {investments.map((opp) => (
                <InvestmentRow key={opp.skill_area} opp={opp} />
              ))}
            </div>
          </div>
        )}

        <ViewFullDetailsButton
          onClick={() => void sendTappedIntent("View Market Relevance Details")}
        />
      </div>
    </BottomSheet>
    </>
  );
}

function InvestmentRow({ opp }: { opp: InvestmentOpp }) {
  const colors = ROI_STYLES[opp.roi] ?? DEFAULT_ROI;
  const Icon = pickIcon(opp.skill_area);

  return (
    <div className="flex gap-4 items-center">
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
}

function renderInsightBody(body: string) {
  const match = body.match(/(top\s+\d+%)/i);
  if (!match) return body;

  const idx = body.indexOf(match[1]);
  const before = body.slice(0, idx);
  const bold = match[1];
  const after = body.slice(idx + bold.length);

  return (
    <>
      {before}
      <span className="font-bold">{bold}</span>
      {after}
    </>
  );
}
