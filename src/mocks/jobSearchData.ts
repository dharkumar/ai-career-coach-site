import type { FitCategory } from "@/utils/categorizeFit";

export interface MockJobListing {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salaryRange: string;
  description: string;
  matchScore: number;
  fitCategory: FitCategory;
  requiredSkills: string[];
  skillGaps: string[];
  aiSummary: string;
  aiGapInsight?: string;
  postedAt: string;
  tags: string[];
}

export const mockJobs: MockJobListing[] = [
  // ── Good Fit (score >= 80) ────────────────────────────
  {
    id: "gf-1",
    title: "Operations Manager",
    company: "Saudi Aramco",
    location: "Dhahran, Saudi Arabia",
    salaryRange: "25,000–32,000 SAR/mo",
    description:
      "Lead cross-functional operations teams to optimise supply chain performance and reduce operational costs across upstream facilities.",
    matchScore: 92,
    fitCategory: "good-fit",
    requiredSkills: ["project management", "data analysis", "operations management", "excel"],
    skillGaps: [],
    aiSummary:
      "Your project management and data analysis background at Aramco make this a strong match. The role builds directly on your operational experience.",
    postedAt: "2 days ago",
    tags: ["Operations", "Full-time", "On-site"],
  },
  {
    id: "gf-2",
    title: "Business Intelligence Analyst",
    company: "STC",
    location: "Riyadh, Saudi Arabia",
    salaryRange: "22,000–28,000 SAR/mo",
    description:
      "Transform raw data into actionable insights using SQL and Python to drive strategic decisions across telecom operations.",
    matchScore: 85,
    fitCategory: "good-fit",
    requiredSkills: ["sql", "python", "data analysis", "excel"],
    skillGaps: [],
    aiSummary:
      "Your analytical skills and Python experience align well. This is a natural step from operations analysis into BI.",
    postedAt: "5 days ago",
    tags: ["Analytics", "Full-time", "Hybrid"],
  },
  {
    id: "gf-3",
    title: "Project Coordinator",
    company: "NEOM",
    location: "NEOM, Saudi Arabia",
    salaryRange: "20,000–26,000 SAR/mo",
    description:
      "Coordinate multi-stakeholder projects within the NEOM smart city initiative, ensuring milestones and budgets are met.",
    matchScore: 81,
    fitCategory: "good-fit",
    requiredSkills: ["project management", "stakeholder management", "excel"],
    skillGaps: [],
    aiSummary:
      "Your project management expertise and industrial engineering background are a direct fit for NEOM's coordination needs.",
    postedAt: "1 week ago",
    tags: ["Project Management", "Full-time", "On-site"],
  },

  // ── Stretch (60–79) ───────────────────────────────────
  {
    id: "st-1",
    title: "Data Engineer",
    company: "Mobily",
    location: "Riyadh, Saudi Arabia",
    salaryRange: "28,000–35,000 SAR/mo",
    description:
      "Design and maintain scalable data pipelines, automate ETL workflows, and support real-time analytics for telecom data.",
    matchScore: 72,
    fitCategory: "stretch",
    requiredSkills: ["python", "sql", "data pipelines", "cloud infrastructure", "spark"],
    skillGaps: ["data pipelines", "cloud infrastructure", "spark"],
    aiSummary:
      "You have the Python and SQL foundation. Closing gaps in data pipelines and cloud tools would unlock this role.",
    aiGapInsight: "3 skills to close — a focused 8-week training plan can bridge the gap.",
    postedAt: "3 days ago",
    tags: ["Data Engineering", "Full-time", "Hybrid"],
  },
  {
    id: "st-2",
    title: "Product Analyst",
    company: "Tamara",
    location: "Riyadh, Saudi Arabia",
    salaryRange: "24,000–30,000 SAR/mo",
    description:
      "Drive product decisions with experimentation, cohort analysis, and user behaviour metrics for the leading BNPL platform.",
    matchScore: 67,
    fitCategory: "stretch",
    requiredSkills: ["data analysis", "sql", "a/b testing", "product analytics", "python"],
    skillGaps: ["a/b testing", "product analytics"],
    aiSummary:
      "Strong analytical base. Picking up A/B testing and product analytics frameworks would make you competitive.",
    aiGapInsight: "2 key skills to develop — courses available in your training library.",
    postedAt: "1 week ago",
    tags: ["Product", "Full-time", "Remote"],
  },

  {
    id: "st-3",
    title: "MLOps Engineer",
    company: "NEOM",
    location: "NEOM, Saudi Arabia",
    salaryRange: "30,000–40,000 SAR/mo",
    description:
      "Build and maintain ML infrastructure for AI-powered smart city projects. Deploy and scale ML models using Kubernetes.",
    matchScore: 65,
    fitCategory: "stretch",
    requiredSkills: ["python", "kubernetes", "docker", "machine learning", "ci/cd"],
    skillGaps: ["kubernetes", "docker", "ci/cd"],
    aiSummary:
      "Your Python and ML foundation makes this achievable. Adding Kubernetes bridges you into high-demand MLOps roles.",
    aiGapInsight: "3 infrastructure skills — estimated 3-4 months of focused training.",
    postedAt: "3 days ago",
    tags: ["MLOps", "Full-time", "On-site"],
  },

  // ── Grow Into (< 60) ─────────────────────────────────
  {
    id: "gi-1",
    title: "Machine Learning Engineer",
    company: "Elm",
    location: "Riyadh, Saudi Arabia",
    salaryRange: "35,000–45,000 SAR/mo",
    description:
      "Build and deploy ML models for government digital transformation projects, working with computer vision and NLP systems.",
    matchScore: 42,
    fitCategory: "grow-into",
    requiredSkills: ["python", "machine learning", "deep learning", "tensorflow", "kubernetes", "docker"],
    skillGaps: ["machine learning", "deep learning", "tensorflow", "kubernetes", "docker"],
    aiSummary:
      "Your Python base is a start, but significant upskilling in ML/DL is needed. This is a strong aspirational target.",
    aiGapInsight: "6 skills to build — 4-6 months with ML and infrastructure fundamentals.",
    postedAt: "4 days ago",
    tags: ["AI/ML", "Full-time", "On-site"],
  },
  {
    id: "gi-2",
    title: "Cloud Solutions Architect",
    company: "Zain KSA",
    location: "Riyadh, Saudi Arabia",
    salaryRange: "38,000–48,000 SAR/mo",
    description:
      "Design enterprise cloud architectures on AWS/Azure for telecom clients, ensuring scalability, security, and cost-efficiency.",
    matchScore: 38,
    fitCategory: "grow-into",
    requiredSkills: ["cloud architecture", "aws", "azure", "kubernetes", "system design"],
    skillGaps: ["cloud architecture", "aws", "azure", "kubernetes", "system design"],
    aiSummary:
      "This is a long-term aspiration. Building cloud and system design skills over 6+ months would set the foundation.",
    aiGapInsight: "5 core skills to develop — start with AWS Cloud Practitioner certification.",
    postedAt: "6 days ago",
    tags: ["Cloud", "Full-time", "Hybrid"],
  },
];
