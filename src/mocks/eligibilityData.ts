import type { CourseRecommendation } from "@/mocks/courseData";

export type { SkillMatch, SkillMatchStatus, CareerImpact } from "@/utils/jobInsights";
import type { SkillMatch, CareerImpact } from "@/utils/jobInsights";

export interface EligibilityDetail {
  jobId: string;
  skillMatches: SkillMatch[];
  careerImpact: CareerImpact[];
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
}

export const eligibilityByJob: Record<string, EligibilityDetail> = {
  "gf-1": {
    jobId: "gf-1",
    skillMatches: [
      { name: "Project Management", evidence: "5 years experience at Saudi Aramco & Al Rajhi Bank", status: "have" },
      { name: "Data Analysis", evidence: "3 years building operational dashboards", status: "have" },
      { name: "Operations Management", evidence: "Led supply chain optimisation reducing costs by 15%", status: "have" },
      { name: "Microsoft Excel", evidence: "6 years advanced usage including macros & pivot tables", status: "have" },
    ],
    careerImpact: [
      { text: "Direct promotion path to Senior Operations Director within 2-3 years" },
      { text: "Leverages your existing Aramco network and domain expertise" },
    ],
    gapCourses: [],
  },
  "st-1": {
    jobId: "st-1",
    skillMatches: [
      { name: "Python", evidence: "2 years intermediate experience with scripting & automation", status: "have" },
      { name: "SQL", evidence: "1 year experience with database queries", status: "have" },
      {
        name: "Data Pipelines",
        evidence: "Apache Airflow fundamentals — course in progress",
        status: "working-on",
        progress: 35,
        estimatedCompletion: "4 weeks",
      },
      {
        name: "Cloud Infrastructure",
        evidence: "AWS Cloud Practitioner — certification in progress",
        status: "working-on",
        progress: 60,
        estimatedCompletion: "2 weeks",
      },
      { name: "Apache Spark", evidence: "Not started", status: "missing" },
    ],
    careerImpact: [
      { text: "Bridges into high-demand data engineering market growing 35% YoY in KSA" },
      { text: "Salary uplift of 15-25% over current operations roles" },
    ],
    gapCourses: [
      {
        id: "spark-fundamentals",
        name: "Apache Spark Fundamentals",
        provider: "Databricks",
        description: "Hands-on Spark course covering RDDs, DataFrames, and streaming",
        priority: true,
        savedRoleCount: 3,
        duration: "3 weeks",
        progress: 0,
        estimatedCompletion: "3 weeks",
      },
      {
        id: "airflow-pipelines",
        name: "Data Pipelines with Airflow",
        provider: "Coursera",
        description: "Build production-grade ETL pipelines with Apache Airflow",
        priority: true,
        savedRoleCount: 4,
        duration: "4 weeks",
        progress: 35,
        estimatedCompletion: "3 weeks",
      },
    ],
    featuredCourse: {
      name: "AWS Cloud Practitioner",
      provider: "AWS Training",
      description: "Complete your cloud infrastructure certification",
      duration: "2 weeks remaining",
      completionPercent: 60,
    },
  },
  "st-3": {
    jobId: "st-3",
    skillMatches: [
      { name: "Python", evidence: "2 years intermediate experience", status: "have" },
      {
        name: "Machine Learning",
        evidence: "ML Foundations — exploring basics",
        status: "working-on",
        progress: 15,
        estimatedCompletion: "10 weeks",
      },
      { name: "Kubernetes", evidence: "Not started", status: "missing" },
      { name: "Docker", evidence: "Not started", status: "missing" },
      { name: "CI/CD", evidence: "Not started", status: "missing" },
    ],
    careerImpact: [
      { text: "Bridges ML knowledge with infrastructure — fastest path to senior MLOps roles" },
      { text: "Positions you at intersection of AI and DevOps in Saudi Vision 2030 initiatives" },
    ],
    gapCourses: [
      {
        id: "kubernetes",
        name: "Kubernetes Fundamentals",
        provider: "Coursera",
        description: "Kubernetes for Developers — 3 weeks at 5hrs/week covering pods, services, and deployments",
        priority: true,
        savedRoleCount: 5,
        duration: "3-4 weeks",
      },
      {
        id: "docker-fundamentals",
        name: "Docker Fundamentals",
        provider: "Docker",
        description: "Containerization basics for ML model deployment",
        priority: true,
        savedRoleCount: 4,
        duration: "2 weeks",
      },
    ],
    featuredCourse: {
      name: "Kubernetes Fundamentals",
      provider: "Coursera",
      description: "Start your MLOps journey with container orchestration",
      duration: "3-4 weeks",
      completionPercent: 0,
    },
  },
  "gi-1": {
    jobId: "gi-1",
    skillMatches: [
      { name: "Python", evidence: "2 years intermediate experience", status: "have" },
      {
        name: "Machine Learning",
        evidence: "Intro to ML — exploring basics",
        status: "working-on",
        progress: 15,
        estimatedCompletion: "10 weeks",
      },
      { name: "Deep Learning", evidence: "Not started", status: "missing" },
      { name: "TensorFlow", evidence: "Not started", status: "missing" },
      { name: "MLOps", evidence: "Not started", status: "missing" },
      { name: "Kubernetes", evidence: "Not started", status: "missing" },
      { name: "Docker", evidence: "Not started", status: "missing" },
    ],
    careerImpact: [
      { text: "Positions you in the fastest-growing tech sector in Saudi Vision 2030" },
      { text: "Long-term career trajectory toward AI leadership roles" },
    ],
    gapCourses: [
      {
        id: "ml-foundations",
        name: "Machine Learning Foundations",
        provider: "Stanford Online",
        description: "Andrew Ng's ML course — the gold standard intro to ML",
        priority: true,
        savedRoleCount: 5,
        duration: "8 weeks",
        progress: 15,
        estimatedCompletion: "7 weeks",
      },
      {
        id: "deep-learning-spec",
        name: "Deep Learning Specialisation",
        provider: "Coursera",
        description: "5-course specialisation covering CNNs, RNNs, and transformers",
        priority: true,
        savedRoleCount: 4,
        duration: "12 weeks",
      },
      {
        id: "tensorflow-dev",
        name: "TensorFlow Developer Certificate",
        provider: "Google",
        description: "Hands-on TF2 course with deployment best practices",
        priority: false,
        savedRoleCount: 3,
        duration: "6 weeks",
      },
      {
        id: "kubernetes",
        name: "Kubernetes Fundamentals",
        provider: "Coursera",
        description: "Container orchestration for ML deployment at scale",
        priority: false,
        savedRoleCount: 3,
        duration: "3-4 weeks",
      },
    ],
    featuredCourse: {
      name: "Machine Learning Foundations",
      provider: "Stanford Online",
      description: "Continue building your ML fundamentals",
      duration: "7 weeks remaining",
      completionPercent: 15,
    },
  },
};

/**
 * Placeholder "working-on" entries used when real training data is not
 * yet available. These are injected by EligibilitySheet when the derived
 * skills have no working-on entries but the user may be actively training.
 */
export const workingOnPlaceholder: SkillMatch[] = [
  {
    name: "Completing relevant training",
    evidence: "Enroll in recommended courses to start closing skill gaps",
    status: "working-on",
    progress: 0,
    estimatedCompletion: "TBD",
  },
];
