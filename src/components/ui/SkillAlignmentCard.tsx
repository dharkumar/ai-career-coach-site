'use client';

import { CheckCircle2, BookOpen } from "lucide-react";
import type { SkillMatch } from "@/mocks/eligibilityData";

interface SkillAlignmentCardProps {
  skill: SkillMatch;
}

export function SkillAlignmentCard({ skill }: SkillAlignmentCardProps) {
  const isHave = skill.status === "have";
  const isWorkingOn = skill.status === "working-on";

  return (
    <div data-testid="skill-alignment-card" className="flex items-start gap-3 py-2">
      <div className="mt-0.5 shrink-0">
        {isHave ? (
          <CheckCircle2 size={20} className="text-[var(--accent)]" />
        ) : (
          <BookOpen size={20} className="text-[var(--fit-stretch)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[15px] font-medium leading-5"
          style={{ color: isHave ? "var(--accent)" : isWorkingOn ? "var(--fit-stretch)" : "var(--text-muted)" }}
        >
          {skill.name}
        </p>
        <p className="text-[var(--text-skill-evidence)] text-[13px] leading-[18px] mt-0.5">
          {skill.evidence}
        </p>
        {isWorkingOn && skill.progress != null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--border-card)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--fit-stretch)] transition-all"
                style={{ width: `${skill.progress}%` }}
              />
            </div>
            {skill.estimatedCompletion && (
              <span className="text-[11px] text-[var(--fit-stretch)] whitespace-nowrap">
                ~{skill.estimatedCompletion}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
