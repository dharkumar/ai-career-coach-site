export interface TargetRoleSkill {
  name: string;
  current_level: number;
  target_level: number;
  is_featured?: boolean;
  /** Percentage complete for in-progress courses (shown below the meter). */
  progress?: number;
  /** Module description for in-progress courses. */
  module?: string;
}

// TODO: replace with real data from a fetchTargetRoleSkills tool when available
export const TARGET_ROLE_SKILLS: TargetRoleSkill[] = [
  { name: "Python", current_level: 4, target_level: 4 },
  { name: "ML Frameworks", current_level: 4, target_level: 4 },
  { name: "System Design", current_level: 3, target_level: 3 },
  { name: "Kubernetes", current_level: 1, target_level: 2, is_featured: true },
  {
    name: "MLOps / Model Deployment",
    current_level: 2,
    target_level: 3,
    progress: 55,
    module: "Module 2/4: Strategic Frameworks",
  },
  {
    name: "Technical Leadership",
    current_level: 1,
    target_level: 2,
    progress: 38,
    module: "Module 1/3: Feedback Frameworks",
  },
  { name: "Stakeholder Management", current_level: 0, target_level: 2 },
];

// TODO: replace with real description from candidate/role data when available
export const TARGET_ROLE_DESCRIPTION =
  "The universal skills every {role} needs. Your long-term career investment.";
