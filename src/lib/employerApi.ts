/** Employer API client — calls the Express proxy at /api/employer/* */

export interface SkillSet {
  mustHave: string[];
  preferred: string[];
  niceToHave: string[];
}

export interface JobPostingCreate {
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  description?: string;
  skills?: SkillSet;
  salary_min?: string;
  salary_max?: string;
  posted_by?: string;
}

export interface JobPostingResponse {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
  skills: SkillSet | null;
  salary_min: string | null;
  salary_max: string | null;
  posted_by: string | null;
  /** e.g. "active", "closed", "draft" */
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JobPostingListResponse {
  items: JobPostingResponse[];
  total: number;
}

/** Response types for /by-poster — sourced from the job-matching service */

export interface MockJobSkill {
  name: string;
  level: string;
}

export interface MockJobResponse {
  id: string;
  title: string;
  company: string;
  posted_by: string | null;
  location: string;
  category: string;
  description: string;
  salary_range: string | null;
  required_skills: MockJobSkill[];
  recommended_skills: MockJobSkill[];
}

export interface MockJobsByPosterResponse {
  jobs: MockJobResponse[];
  total: number;
  limit: number;
  offset: number;
}

const BASE = "/api/employer";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // Server returned non-JSON (e.g. HTML error page or SPA catch-all).
    // Surface a helpful message instead of a raw parse error.
    const preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(
      `Expected JSON from ${res.url} (${res.status}) but got: ${preview}`,
    );
  }
}

export async function fetchJobPostings(limit = 50, offset = 0): Promise<JobPostingListResponse> {
  const res = await fetch(`${BASE}/job-postings?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to fetch job postings (${res.status}): ${err.slice(0, 200)}`);
  }
  return parseJson<JobPostingListResponse>(res);
}

export async function fetchJobPostingsByPoster(
  postedBy: string,
  limit = 50,
  offset = 0,
): Promise<MockJobsByPosterResponse> {
  const res = await fetch(
    `${BASE}/job-postings/by-poster/${encodeURIComponent(postedBy)}?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to fetch jobs by poster (${res.status}): ${err.slice(0, 200)}`);
  }
  return parseJson<MockJobsByPosterResponse>(res);
}

/* ── Applications ────────────────────────────────────────────────────────── */

export interface CandidateSkill {
  name: string;
  level: string;
  years: number;
}

export interface CandidateProfile {
  id: string;
  name?: string;
  city?: string;
  location?: string;
  experience_years?: number;
  skills?: CandidateSkill[];
  job_preferences?: string[];
  experience?: { title: string; company: string; years: number }[];
  education?: { degree: string; institution: string; graduation_year: number }[];
}

export interface ApplicationWithProfileResponse {
  id: string;
  job_posting_id: string;
  candidate_id: string;
  candidate_name: string | null;
  status: string;
  applied_at: string;
  updated_at: string;
  candidate_profile: CandidateProfile | null;
}

export interface ApplicationWithProfileListResponse {
  items: ApplicationWithProfileResponse[];
  total: number;
  limit: number;
  offset: number;
}

