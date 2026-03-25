export const APPLICATION_STAGES = [
  "Applied",
  "Review",
  "Assessment",
  "Interview",
  "Offer",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export type ApplicationStatus = "active" | "not-selected" | "rejected" | "withdrawn";

export interface JobApplication {
  id: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  appliedAt: string;
  status: ApplicationStatus;
  stageIndex: number;
  statusLabel: string;
  statusDetail: string;
  alert?: string;
  aiInsight?: string;
  learningPathLink?: string;
}

export const activeApplications: JobApplication[] = [
  {
    id: "app-1",
    jobTitle: "Operations Manager",
    company: "Saudi Aramco",
    appliedAt: "2026-03-06",
    status: "active",
    stageIndex: 0,
    statusLabel: "Just Applied",
    statusDetail:
      "You applied today. This company typically responds within 8 days.",
  },
  {
    id: "app-2",
    jobTitle: "Business Intelligence Analyst",
    company: "STC",
    appliedAt: "2026-02-28",
    status: "active",
    stageIndex: 1,
    statusLabel: "In Review",
    statusDetail:
      "In review for 5 days. This company typically responds within 8 days.",
  },
  {
    id: "app-3",
    jobTitle: "Data Engineer",
    company: "Mobily",
    appliedAt: "2026-02-10",
    status: "active",
    stageIndex: 2,
    statusLabel: "Assessment invitation received — due in 3 days",
    statusDetail: "Assessment stage reached.",
    alert: "Action required",
  },
];

export const pastApplications: JobApplication[] = [
  {
    id: "past-1",
    jobTitle: "Senior Data Analyst",
    company: "Al Rajhi Bank",
    appliedAt: "2026-01-15",
    status: "not-selected",
    stageIndex: 3,
    statusLabel: "Not Selected",
    statusDetail: "You made it to the interview stage but were not selected.",
    aiInsight:
      "Strong interview performance — the team noted your analytical skills. The gap was in advanced statistical modelling, which you can close with a focused course.",
    learningPathLink: "statistical-modelling",
  },
  {
    id: "past-2",
    jobTitle: "Product Manager",
    company: "Noon",
    appliedAt: "2025-12-20",
    status: "rejected",
    stageIndex: 1,
    statusLabel: "Not Progressed",
    statusDetail: "Application did not advance past the review stage.",
    aiInsight:
      "The role required 3+ years of product management experience. Building a product analytics portfolio would strengthen future applications.",
    learningPathLink: "product-analytics",
  },
];
