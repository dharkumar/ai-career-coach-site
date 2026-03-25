'use client';

import type { LearningPathNode } from "@/utils/computeProfileMetrics";

const NODE_STYLES: Record<LearningPathNode["status"], { ring: string; bg: string; text: string }> = {
  completed: {
    ring: "border-[var(--accent)] shadow-[0_0_30px_rgba(29,197,88,0.38)]",
    bg: "bg-[rgba(29,197,88,0.2)]",
    text: "text-white",
  },
  "in-progress": {
    ring: "border-[var(--accent)] shadow-[0_0_15px_rgba(29,197,88,0.19)]",
    bg: "bg-[rgba(29,197,88,0.25)]",
    text: "text-white",
  },
  upcoming: {
    ring: "border-[#4b5563]",
    bg: "bg-[var(--border-card)]",
    text: "text-white",
  },
};

interface LearningNodeProps {
  node: LearningPathNode;
  isLast?: boolean;
}

export function LearningNode({ node, isLast = false }: LearningNodeProps) {
  const style = NODE_STYLES[node.status];
  return (
    <div data-testid="learning-node" className="flex items-center shrink-0">
      <div className="flex flex-col items-center gap-2 w-20">
        <div
          className={`size-16 rounded-full border-2 flex items-center justify-center ${style.ring} ${style.bg}`}
        >
          <span className={`text-xs font-medium text-center leading-tight px-1 ${style.text}`}>
            {node.label}
          </span>
        </div>
      </div>
      {!isLast && (
        <div className="w-14 h-0.5 bg-[var(--border-card)] shrink-0" />
      )}
    </div>
  );
}
