import type { FitCategory } from "@/utils/categorizeFit";
import type { CourseRecommendation } from "@/mocks/courseData";
import { capitalize, levelLabel } from "@/utils/text";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillRef {
  name: string;
  level?: string;
}

export interface SkillGapRef {
  name: string;
  required_level?: string;
  current_level?: string | null;
}

export type SkillMatchStatus = "have" | "working-on" | "missing";

export interface SkillMatch {
  name: string;
  evidence: string;
  status: SkillMatchStatus;
  progress?: number;
  estimatedCompletion?: string;
}

export interface CareerImpact {
  text: string;
}

// ---------------------------------------------------------------------------
// Helpers (private)
// ---------------------------------------------------------------------------

function matchedSkillNames(
  required: SkillRef[],
  recommended: SkillRef[],
  gaps: SkillGapRef[],
): string[] {
  const gapSet = new Set(gaps.map((g) => g.name.toLowerCase()));
  const all = [...required, ...recommended];
  return all.filter((s) => !gapSet.has(s.name.toLowerCase())).map((s) => s.name);
}

function listJoin(items: string[], max = 3): string {
  const capped = items.slice(0, max).map(capitalize);
  if (items.length > max) return `${capped.join(", ")} and more`;
  if (capped.length === 1) return capped[0];
  return `${capped.slice(0, -1).join(", ")} and ${capped[capped.length - 1]}`;
}

// ---------------------------------------------------------------------------
// AI Summary & Gap Insight (was generateJobInsights.ts)
// ---------------------------------------------------------------------------

export function generateAiSummary(
  fitCategory: FitCategory,
  requiredSkills: SkillRef[],
  recommendedSkills: SkillRef[],
  skillGaps: SkillGapRef[],
): string {
  const matched = matchedSkillNames(requiredSkills, recommendedSkills, skillGaps);
  const gapNames = skillGaps.map((g) => g.name);

  if (fitCategory === "good-fit") {
    const base = matched.length > 0
      ? `Your ${listJoin(matched)} skills align well with this role.`
      : "Your background is a strong match for this role.";
    return `Strong fit. ${base}`;
  }

  if (fitCategory === "stretch") {
    const matchPart = matched.length > 0
      ? `You have the ${listJoin(matched)} foundation.`
      : "You have a solid foundation.";
    const gapPart = gapNames.length > 0
      ? `Closing gaps in ${listJoin(gapNames)} would unlock this role.`
      : "A bit of upskilling would make you competitive.";
    return `Close match. ${matchPart} ${gapPart}`;
  }

  const matchPart = matched.length > 0
    ? `Your ${listJoin(matched)} skills are a starting point.`
    : "This role is a long-term aspiration.";
  const gapPart = gapNames.length > 0
    ? `Significant upskilling in ${listJoin(gapNames, 4)} is needed.`
    : "Significant upskilling is needed to be competitive.";
  return `Growth opportunity. ${matchPart} ${gapPart}`;
}

export function generateAiGapInsight(
  skillGaps: SkillGapRef[],
  fitCategory: FitCategory,
): string | undefined {
  if (fitCategory === "good-fit" || skillGaps.length === 0) return undefined;

  const count = skillGaps.length;
  const firstName = capitalize(skillGaps[0].name);

  if (fitCategory === "stretch") {
    const weeks = count * 3;
    return `${count} skill${count > 1 ? "s" : ""} to close \u2014 a focused ${weeks}-week training plan can bridge the gap.`;
  }

  const months = Math.max(2, Math.ceil(count * 1.5));
  return `${count} core skill${count > 1 ? "s" : ""} to develop \u2014 start with ${firstName}.`;
}

// ---------------------------------------------------------------------------
// Skill Matches & Career Impact (was deriveEligibility.ts)
// ---------------------------------------------------------------------------

/**
 * Derives SkillMatch entries from the backend's required/recommended skills
 * and skill_gaps arrays. Skills not in the gap list are marked "have";
 * skills in the gap with a current_level are "working-on"; gaps with no
 * current_level are "missing".
 */
export function deriveSkillMatches(
  requiredSkills: SkillRef[],
  recommendedSkills: SkillRef[],
  skillGaps: SkillGapRef[],
): SkillMatch[] {
  const gapMap = new Map(
    skillGaps.map((g) => [g.name.toLowerCase(), g]),
  );

  const result: SkillMatch[] = [];
  const seen = new Set<string>();

  for (const skill of [...requiredSkills, ...recommendedSkills]) {
    const key = skill.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const gap = gapMap.get(key);
    if (!gap) {
      result.push({
        name: capitalize(skill.name),
        evidence: skill.level ? `${levelLabel(skill.level)} proficiency` : "Matched",
        status: "have",
      });
    } else if (gap.current_level) {
      result.push({
        name: capitalize(skill.name),
        evidence: `${levelLabel(gap.current_level)} \u2192 needs ${levelLabel(gap.required_level ?? "advanced")}`,
        status: "working-on",
      });
    } else {
      result.push({
        name: capitalize(skill.name),
        evidence: "Not started",
        status: "missing",
      });
    }
  }

  return result;
}

const GOOD_FIT_IMPACTS: ((desc: string) => string)[] = [
  () => "Direct path to advancing in this domain within 1\u20132 years.",
  (desc) => {
    const snippet = desc.split(/[.!]/)[0]?.trim();
    return snippet
      ? `Builds directly on your current expertise to ${snippet.toLowerCase().slice(0, 80)}.`
      : "Leverages your existing skills for immediate impact.";
  },
];

const STRETCH_IMPACTS: ((desc: string) => string)[] = [
  () => "Bridges you into a high-demand specialisation with strong salary growth potential.",
  () => "Closing the remaining skill gaps would open multiple similar roles across the market.",
];

const GROW_INTO_IMPACTS: ((desc: string) => string)[] = [
  () => "Positions you in a fast-growing field with long-term leadership potential.",
  () => "Building these skills over time opens an entirely new career trajectory.",
];

export function deriveCareerImpact(
  fitCategory: FitCategory,
  description: string,
): CareerImpact[] {
  const templates =
    fitCategory === "good-fit"
      ? GOOD_FIT_IMPACTS
      : fitCategory === "stretch"
        ? STRETCH_IMPACTS
        : GROW_INTO_IMPACTS;

  return templates.map((fn) => ({ text: fn(description) }));
}

// ---------------------------------------------------------------------------
// Placeholder Courses (was deriveCourses.ts)
// ---------------------------------------------------------------------------

const PROVIDERS = ["Coursera", "Udemy", "LinkedIn Learning", "edX", "Pluralsight"];

function estimateDuration(gap: SkillGapRef): string {
  if (!gap.current_level) return "4\u20136 weeks";
  return "2\u20134 weeks";
}

/**
 * Generates placeholder course recommendations from skill gap data.
 * Each gap becomes a training course. The first gap (highest priority) also
 * produces a featured course entry.
 */
export function derivePlaceholderCourses(skillGaps: SkillGapRef[]): {
  gapCourses: (CourseRecommendation & {
    progress?: number;
    estimatedCompletion?: string;
  })[];
  featuredCourse?: {
    name: string;
    provider: string;
    description: string;
    duration: string;
    completionPercent: number;
  };
} {
  if (skillGaps.length === 0) return { gapCourses: [] };

  const courses = skillGaps.map((gap, i) => {
    const name = capitalize(gap.name);
    const provider = PROVIDERS[i % PROVIDERS.length];
    const duration = estimateDuration(gap);
    const targetLevel = gap.required_level ? levelLabel(gap.required_level) : "Proficient";
    const progress = gap.current_level ? 30 : 0;

    return {
      id: `gap-course-${i}`,
      name: `${name} Fundamentals`,
      provider,
      description: `Build ${targetLevel.toLowerCase()}-level ${name.toLowerCase()} skills through hands-on projects.`,
      priority: i < 2,
      savedRoleCount: Math.max(2, 5 - i),
      duration,
      progress,
      estimatedCompletion: duration,
    };
  });

  const topGap = skillGaps[0];
  const topCourse = courses[0];
  const completionPercent = topGap.current_level ? 30 : 0;

  return {
    gapCourses: courses,
    featuredCourse: {
      name: topCourse.name,
      provider: topCourse.provider,
      description: topCourse.description,
      duration: topCourse.duration,
      completionPercent,
    },
  };
}
