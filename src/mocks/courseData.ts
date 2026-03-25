export interface CourseRecommendation {
  id: string;
  name: string;
  provider: string;
  providerLogo?: string;
  description: string;
  priority?: boolean;
  savedRoleCount: number;
  duration: string;
}

export const mockCourses: CourseRecommendation[] = [
  {
    id: "kubernetes",
    name: "Kubernetes",
    provider: "Coursera",
    description: "Kubernetes for Developers on Coursera — 3 weeks at 5hrs/week",
    priority: true,
    savedRoleCount: 5,
    duration: "3–4 weeks",
  },
  {
    id: "system-design",
    name: "System Design",
    provider: "O'Reilly",
    description: "Grokking System Design course — 4 weeks at 5hrs/week",
    priority: true,
    savedRoleCount: 4,
    duration: "4–6 weeks",
  },
  {
    id: "cicd-pipelines",
    name: "CI/CD Pipelines",
    provider: "AWS",
    description: "AWS certification for CI/CD — 2 weeks at 4hrs/week",
    priority: false,
    savedRoleCount: 3,
    duration: "2–3 weeks",
  },
];
