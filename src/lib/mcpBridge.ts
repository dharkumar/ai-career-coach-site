import { saveVisitorSession, getVisitorSession, saveLearningCompleted } from "@/utils/visitorMemory";
import { loadIntoCache, readCache, type McpCache } from "@/lib/mcpCacheBridge";
import type {
  MockJobsByPosterResponse,
  ApplicationWithProfileListResponse,
  JobPostingCreate,
  JobPostingResponse,
} from "@/lib/employerApi";
import { cacheJobApplicantsFromTool } from "@/lib/employerApplicantsCache";

const inFlight = new Set<string>();

async function invokeBridge(
  toolName: string,
  cacheKey: keyof McpCache,
  args: Record<string, unknown>,
): Promise<true | undefined> {
  try {
    const res = await fetch(`/api/invoke/${toolName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      console.error(`[mcpBridge] ${toolName} failed:`, res.status);
      return undefined;
    }
    const data = await res.json();
    loadIntoCache(cacheKey, data);
    return true;
  } catch (err) {
    console.error(`[mcpBridge] ${toolName} error:`, err);
    return undefined;
  }
}

/**
 * Unwraps the cached / API jobs value into a flat array of job records.
 * Handles `{ success, data: { jobs: [...] } }`, `{ jobs: [...] }`,
 * plain arrays, and `{ results: [...] }`.
 */
export function resolveJobsArray(cache: unknown): unknown[] {
  if (Array.isArray(cache)) return cache;
  if (cache && typeof cache === "object") {
    const obj = cache as Record<string, unknown>;
    if (Array.isArray(obj.jobs)) return obj.jobs;
    const data = obj.data;
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.jobs)) return d.jobs;
    }
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

function mergeAndDedupe(arrA: unknown[], arrB: unknown[]): unknown[] {
  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const item of [...arrA, ...arrB]) {
    const rec = item as Record<string, unknown>;
    const inner = (rec.job && typeof rec.job === "object" ? rec.job : rec) as Record<string, unknown>;
    const id = (inner.id ?? inner.job_id ?? inner.jobId) as string | undefined;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    merged.push(item);
  }
  return merged;
}

// export async function fetchJobs(candidateId: string): Promise<true | undefined> {
//   if (!candidateId?.trim()) return undefined;
//   const cid = candidateId.trim();
//   if (inFlight.has("jobs")) return undefined;
//   inFlight.add("jobs");
//   try {
//     const [bySkills, byInterest] = await Promise.allSettled([
//       fetch("/api/invoke/get_jobs_by_skills", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ candidate_id: cid, limit: 50 }),
//       }),
//       fetch("/api/invoke/get_jobs_by_interest", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ candidate_id: cid, limit: 50 }),
//       }),
//     ]);

//     const extract = async (r: PromiseSettledResult<Response>): Promise<unknown[]> => {
//       if (r.status !== "fulfilled" || !r.value.ok) return [];
//       return resolveJobsArray(await r.value.json());
//     };

//     const arrA = await extract(bySkills);
//     const arrB = await extract(byInterest);
//     const merged = mergeAndDedupe(arrA, arrB);

//     loadIntoCache("jobs", { jobs: merged, total: merged.length });
//     return true;
//   } catch (err) {
//     console.error("[mcpBridge] fetchJobs error:", err);
//     return undefined;
//   } finally {
//     inFlight.delete("jobs");
//   }
// }

export async function fetchJobs(candidateId: string): Promise<true | undefined> {
  if (!candidateId?.trim()) return undefined;
  if (inFlight.has("jobs")) return undefined;
  inFlight.add("jobs");
  try {
    const sess = getVisitorSession();
    if (sess?.learningCompleted) {
      // After learning: use /after route (Kubernetes included) — no backend flag needed.
      // Also re-seed backend skill override so any subsequent MCP tool calls are correct.
      void fetch(`/api/learning/${candidateId.trim()}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
      const res = await fetch(`/api/learning/${candidateId.trim()}/jobs/after?limit=6`);
      if (res.ok) {
        loadIntoCache("jobs", await res.json() as unknown);
        return true;
      }
    }
    return await invokeBridge("get_jobs_by_skills", "jobs", { candidate_id: candidateId.trim(), limit: 6 });
  } finally {
    inFlight.delete("jobs");
  }
}

export async function fetchSkills(roleId: string): Promise<true | undefined> {
  if (!roleId?.trim()) return undefined;
  if (inFlight.has("skills")) return undefined;
  inFlight.add("skills");
  try {
    const sess = getVisitorSession();
    if (sess?.candidateId) {
      // Always use the direct Express route when candidateId is known — avoids MCP timing
      // issues and prevents the AI from using the wrong role_id (e.g. "data-scientist" → 404).
      // Pick /after endpoint if learning was completed, baseline otherwise.
      const endpoint = sess.learningCompleted
        ? `/api/learning/${sess.candidateId}/skills/${roleId.trim()}/after`
        : `/api/learning/${sess.candidateId}/skills/${roleId.trim()}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json() as unknown;
        loadIntoCache("skills", data);
        return true;
      }
    }
    // Fallback to MCP only when no candidateId (new visitor or session not yet saved).
    return await invokeBridge("get_skill_progression", "skills", { role_id: roleId.trim() });
  } finally {
    inFlight.delete("skills");
  }
}

/**
 * Unwraps `{ success, data: { ... } }` or `{ result: { ... } }` wrappers
 * to get the actual candidate record.
 */
function unwrapCandidateResponse(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const obj = payload as Record<string, unknown>;
  for (const key of ["data", "result"] as const) {
    const inner = obj[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return inner as Record<string, unknown>;
    }
  }
  return obj;
}

export async function fetchCandidate(candidateId: string): Promise<true | undefined> {
  if (!candidateId?.trim()) return undefined;
  const cid = candidateId.trim();
  if (inFlight.has("candidate")) return undefined;
  inFlight.add("candidate");
  try {
    const res = await fetch("/api/invoke/get_candidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: cid }),
    });
    if (!res.ok) return undefined;
    const raw = await res.json();
    const candidate = unwrapCandidateResponse(raw);
    loadIntoCache("candidate", candidate);
    saveVisitorSession(cid);
    return true;
  } catch (err) {
    console.error("[mcpBridge] fetchCandidate error:", err);
    return undefined;
  } finally {
    inFlight.delete("candidate");
  }
}

export async function fetchCareerGrowth(candidateId: string): Promise<true | undefined> {
  if (!candidateId?.trim()) return undefined;
  if (inFlight.has("careerGrowth")) return undefined;
  inFlight.add("careerGrowth");
  try {
    const sess = getVisitorSession();
    // Always use the direct route — avoids MCP flakiness for career growth data.
    const endpoint = sess?.learningCompleted
      ? `/api/learning/${candidateId.trim()}/career-growth/after`
      : `/api/learning/${candidateId.trim()}/career-growth`;
    const res = await fetch(endpoint);
    if (res.ok) {
      loadIntoCache("careerGrowth", await res.json() as unknown);
      return true;
    }
    return await invokeBridge("get_career_growth", "careerGrowth", { candidate_id: candidateId.trim() });
  } finally {
    inFlight.delete("careerGrowth");
  }
}

export async function fetchMarketRelevance(candidateId: string): Promise<true | undefined> {
  if (!candidateId?.trim()) return undefined;
  if (inFlight.has("marketRelevance")) return undefined;
  inFlight.add("marketRelevance");
  try {
    const sess = getVisitorSession();
    // Always use the direct route — avoids MCP flakiness for market relevance data.
    const endpoint = sess?.learningCompleted
      ? `/api/learning/${candidateId.trim()}/market-relevance/after`
      : `/api/learning/${candidateId.trim()}/market-relevance`;
    const res = await fetch(endpoint);
    if (res.ok) {
      loadIntoCache("marketRelevance", await res.json() as unknown);
      return true;
    }
    return await invokeBridge("get_market_relevance", "marketRelevance", { candidate_id: candidateId.trim() });
  } finally {
    inFlight.delete("marketRelevance");
  }
}

// ── Helper for completeLearning ───────────────────────────────────────────────

async function fetchJsonSafe(url: string): Promise<unknown> {
  try {
    const res = await fetch(url);
    return res.ok ? (await res.json() as unknown) : null;
  } catch {
    return null;
  }
}

/**
 * Swaps one cache key with data from `cached` (pre-fetched snapshot) or, if
 * not yet available, fetches it from `url`. Both the active key and the *After
 * snapshot key are updated so future reads are consistent.
 */
async function swapOrFetch(
  cached: unknown,
  url: string,
  activeKey: keyof McpCache,
  afterKey: keyof McpCache,
): Promise<void> {
  const data = cached ?? await fetchJsonSafe(url);
  if (data) {
    loadIntoCache(activeKey, data);
    loadIntoCache(afterKey, data);
  }
}

/**
 * Pre-fetches all post-learning data into the *After cache slots.
 * Called when SkillTestFlow / MyLearningTemplate mounts so that
 * completeLearning() can instantly swap without any network delay.
 * Safe to call multiple times — skips if already prefetched.
 */
export async function prefetchAfterLearning(
  candidateId: string,
  roleId = "ai-engineer",
): Promise<void> {
  const cid = candidateId.trim();
  if (!cid) return;
  if (inFlight.has("prefetchAfter")) return;
  if (readCache().skillsAfter) return; // Already done
  inFlight.add("prefetchAfter");
  try {
    await Promise.allSettled([
      (async () => {
        const d = await fetchJsonSafe(`/api/learning/${cid}/skills/${roleId}/after`);
        if (d) loadIntoCache("skillsAfter", d);
      })(),
      (async () => {
        const d = await fetchJsonSafe(`/api/learning/${cid}/market-relevance/after`);
        if (d) loadIntoCache("marketRelevanceAfter", d);
      })(),
      (async () => {
        const d = await fetchJsonSafe(`/api/learning/${cid}/career-growth/after`);
        if (d) loadIntoCache("careerGrowthAfter", d);
      })(),
      (async () => {
        const d = await fetchJsonSafe(`/api/learning/${cid}/jobs/after?limit=6`);
        if (d) loadIntoCache("jobsAfter", d);
      })(),
    ]);
  } finally {
    inFlight.delete("prefetchAfter");
  }
}

/**
 * Marks a candidate's learning path as complete.
 *
 * Flow:
 *   1. POST /api/learning/{id}/complete  → seeds backend skill override for live scoring
 *   2. Swap pre-fetched *After slots → active cache keys (instant if prefetch ran)
 *      Falls back to /after routes if prefetch hadn't completed yet.
 *   3. Persist learningCompleted=true to localStorage so all future fetch calls
 *      (including after page reload or backend restart) use the /after endpoints.
 */
export async function completeLearning(candidateId: string): Promise<true | undefined> {
  if (!candidateId?.trim()) return undefined;
  const cid = candidateId.trim();

  try {
    // 1. Seed backend skill override (idempotent — also ensures jobs scored with Kubernetes)
    const flagRes = await fetch(`/api/learning/${cid}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!flagRes.ok) {
      console.error("[mcpBridge] completeLearning flag failed:", flagRes.status);
      return undefined;
    }

    // 2. Swap pre-fetched snapshots into active slots (or fetch from /after if needed)
    const snapshot = readCache();
    await Promise.allSettled([
      swapOrFetch(snapshot.skillsAfter,          `/api/learning/${cid}/skills/ai-engineer/after`, "skills",          "skillsAfter"),
      swapOrFetch(snapshot.marketRelevanceAfter, `/api/learning/${cid}/market-relevance/after`,   "marketRelevance", "marketRelevanceAfter"),
      swapOrFetch(snapshot.careerGrowthAfter,    `/api/learning/${cid}/career-growth/after`,      "careerGrowth",    "careerGrowthAfter"),
      swapOrFetch(snapshot.jobsAfter,            `/api/learning/${cid}/jobs/after?limit=6`,       "jobs",            "jobsAfter"),
    ]);

    // 3. Persist so every subsequent fetch (restart, reconnect, reload) uses /after routes
    saveLearningCompleted();

    return true;
  } catch (err) {
    console.error("[mcpBridge] completeLearning error:", err);
    return undefined;
  }
}

/** Mobeus site function: applicants for a posting (errors → null). */
export async function fetchJobApplicants(
  postingId: string,
  includeProfile = true,
): Promise<unknown> {
  try {
    const res = await fetch("/api/invoke/get_job_applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        posting_id: postingId,
        include_profile: includeProfile,
        limit: 100,
      }),
    });
    if (!res.ok) {
      console.error(`[mcpBridge] fetchJobApplicants failed:`, res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[mcpBridge] fetchJobApplicants error:", err);
    return null;
  }
}



/** Calls the `list_job_postings_by_poster` MCP tool (employer flow). */
export async function invokeListJobsByPoster(
  postedBy: string,
  limit = 20,
  offset = 0,
): Promise<MockJobsByPosterResponse> {
  const res = await fetch("/api/invoke/list_job_postings_by_poster", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posted_by: postedBy, limit, offset }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail ??
        `list_job_postings_by_poster failed (${res.status})`,
    );
  }
  return res.json() as Promise<MockJobsByPosterResponse>;
}

/** Calls the `get_job_applicants` MCP tool (employer flow). */
export async function invokeGetJobApplicants(
  postingId: string,
  includeProfile = false,
  limit = 50,
  offset = 0,
): Promise<ApplicationWithProfileListResponse> {
  const res = await fetch("/api/invoke/get_job_applicants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      posting_id: postingId,
      include_profile: includeProfile,
      limit,
      offset,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail ?? `get_job_applicants failed (${res.status})`,
    );
  }
  return res.json() as Promise<ApplicationWithProfileListResponse>;
}

/**
 * Patches UIFrameworkSiteFunctions with the real bridge implementations.
 * Called by usePhaseFlow after mount.
 */
export function patchSiteFunctions() {
  const siteFns = (
    window as unknown as { UIFrameworkSiteFunctions?: Record<string, unknown> }
  ).UIFrameworkSiteFunctions;
  if (!siteFns) return;
  siteFns.fetchJobs = fetchJobs;
  siteFns.fetchSkills = fetchSkills;
  siteFns.fetchCandidate = fetchCandidate;
  siteFns.fetchCareerGrowth = fetchCareerGrowth;
  siteFns.fetchMarketRelevance = fetchMarketRelevance;
  siteFns.completeLearning = completeLearning;
  siteFns.fetchJobApplicants = fetchJobApplicants;
  /** Employer: Mobeus pushes get_job_applicants result so UI skips /api/invoke. */
  siteFns.cacheJobApplicants = (postingId: string, data: unknown) =>
    cacheJobApplicantsFromTool(postingId, data);
}
