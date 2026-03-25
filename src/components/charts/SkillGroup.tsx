'use client';

import { Star } from "lucide-react";
import { DotPlot } from "@/components/charts/DotPlot";
import type { SkillProgressionItem } from "@/utils/computeProfileMetrics";

interface SkillGroupProps {
  label?: string;
  skills: SkillProgressionItem[];
}

export function SkillGroup({ label, skills }: SkillGroupProps) {
  return (
    <div data-testid="skill-group" className="flex flex-col gap-4">
      {label && (
        <div className="flex gap-1 items-center">
          <span className="text-white text-base font-bold">{label}</span>
          
        </div>
      )}
      <div className="flex flex-col gap-4">
        {skills.map((skill) => {
          const filled = skill.current_level * 2;
          const gap = (skill.target_level - skill.current_level) * 2;
          return (
            <DotPlot
              key={skill.name}
              label={skill.name}
              filled={filled}
              target={gap}
              value={skill.current_level}
            />
          );
        })}
      </div>
    </div>
  );
}
