import { useState, useCallback, useEffect, useRef } from "react";
import type { GenerativeSection } from "@/types/flow";
import { informTele, teleAcknowledge } from "@/utils/teleUtils";
import { getVisitorSession, saveVisitorSession } from "@/utils/visitorMemory";
import { categorizeFit } from "@/utils/categorizeFit";
import { generateAiSummary, generateAiGapInsight } from "@/utils/jobInsights";
import type { SkillRef, SkillGapRef } from "@/utils/jobInsights";
import {
  fetchCandidate,
  fetchJobs,
  fetchSkills,
  fetchCareerGrowth,
  fetchMarketRelevance,
  resolveJobsArray,
  patchSiteFunctions,
} from "@/lib/mcpBridge";
import { readCache, loadIntoCache as loadIntoCacheBridge } from "@/lib/mcpCacheBridge";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";

const INITIAL_SECTIONS: GenerativeSection[] = [
  { id: "welcome", templateId: "WelcomeLanding", props: {} },
];

/**
 * Templates that require the AI to stop and wait after navigateToSection is called.
 *
 * LoadingLinkedIn and LoadingGeneral are intentionally NOT in this set. The LLM
 * calls MCP tools (register_candidate, find_candidate, get_jobs_by_skills)
 * directly via the Mobeus console MCP connection immediately after navigating to
 * those loading screens — the loading screens are pure visual feedback while the
 * tool calls run. disableNewResponseCreation must be false so the AI can continue.
 */
const WAIT_FOR_USER_TEMPLATES = new Set([
  "GlassmorphicOptions",
  "MultiSelectOptions",
  "RegistrationForm",
  "CardStack",
  "Dashboard",
  "CandidateSheet",
  "JobCandidateView",
]);

function shouldDisableNewResponse(sections: GenerativeSection[]): boolean {
  return sections.some((s) => WAIT_FOR_USER_TEMPLATES.has(s.templateId));
}

/**
 * Stable identity for the topmost MultiSelectOptions subsection so we can reset
 * the "Continue submitted" guard when the flow advances industry → role → priority
 * (all the same templateId).
 */
function getActiveMultiSelectFingerprint(sections: GenerativeSection[]): string | null {
  for (let i = sections.length - 1; i >= 0; i--) {
    const s = sections[i];
    if (s.templateId !== "MultiSelectOptions") continue;
    const id = typeof s.id === "string" ? s.id : "";
    const step = s.props?.progressStep;
    if (typeof step === "number") return `${id}\0step:${step}`;
    const bubbles = s.props?.bubbles;
    if (Array.isArray(bubbles) && bubbles.length > 0) {
      const keys = bubbles
        .map((b) =>
          b && typeof b === "object" && b !== null && "label" in b
            ? String((b as { label: unknown }).label)
            : "",
        )
        .join("|");
      return `${id}\0bubbles:${keys}`;
    }
    return `${id}\0default`;
  }
  return null;
}

type UpdatableSection = GenerativeSection & { _update?: boolean };

const RESERVED_SECTION_KEYS = new Set([
  "id",
  "templateId",
  "props",
  "generativeSubsections",
  "value",
  "_update",
  "_sessionEstablished",
]);

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapValuePayload(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 3; i++) {
    const obj = asObject(current);
    if (!obj) break;
    const inner = asObject(obj.value);
    if (!inner) break;
    const hasTopLevelSectionShape =
      "generativeSubsections" in obj || "templateId" in obj || "id" in obj;
    if (hasTopLevelSectionShape) break;
    current = inner;
  }
  return current;
}

function normalizeSection(raw: unknown, index: number): UpdatableSection | null {
  const obj = asObject(raw);
  if (!obj || typeof obj.templateId !== "string" || !obj.templateId.trim()) {
    return null;
  }

  const propsObj = asObject(obj.props) ?? {};
  const rootProps = Object.fromEntries(
    Object.entries(obj).filter(([key]) => !RESERVED_SECTION_KEYS.has(key))
  );

  return {
    id:
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id
        : `${obj.templateId}-${Date.now()}-${index}`,
    templateId: obj.templateId,
    props: {
      ...rootProps,
      ...propsObj,
    },
    _update: obj._update === true,
  };
}

function extractIncomingSections(value: unknown): UpdatableSection[] {
  const unwrapped = unwrapValuePayload(value);

  if (Array.isArray(unwrapped)) {
    return unwrapped
      .map((entry, index) => normalizeSection(entry, index))
      .filter((s): s is UpdatableSection => !!s);
  }

  const obj = asObject(unwrapped);
  if (!obj) return [];

  if (Array.isArray(obj.generativeSubsections)) {
    return obj.generativeSubsections
      .map((entry, index) => normalizeSection(entry, index))
      .filter((s): s is UpdatableSection => !!s);
  }

  const single = normalizeSection(obj, 0);
  return single ? [single] : [];
}

/**
 * Scans incoming sections for a `_sessionEstablished` prop containing
 * `{ candidateId, name }`. If found, persists the session to localStorage
 * and strips the key so templates never see it.
 */
function consumeSessionEstablished(sections: UpdatableSection[]): void {
  for (const section of sections) {
    const raw = section.props._sessionEstablished;
    if (raw && typeof raw === "object") {
      const { candidateId } = raw as { candidateId?: string };
      if (typeof candidateId === "string") {
        saveVisitorSession(candidateId);
      }
    }
    delete section.props._sessionEstablished;
  }
}

function normalizeNavigateToSectionPayload(args: unknown[]): unknown {
  if (args.length === 0) return null;
  if (args.length === 1) return args[0];

  const [badge, title, subtitle, generativeSubsections] = args;
  return {
    ...(typeof badge === "string" ? { badge } : {}),
    ...(typeof title === "string" ? { title } : {}),
    ...(typeof subtitle === "string" ? { subtitle } : {}),
    ...(generativeSubsections !== undefined ? { generativeSubsections } : {}),
  };
}

function mergeSection(base: GenerativeSection, incoming: UpdatableSection): GenerativeSection {
  return {
    id: incoming.id || base.id,
    templateId: incoming.templateId || base.templateId,
    props: {
      ...base.props,
      ...incoming.props,
    },
  };
}

function applyIncomingSections(
  prev: GenerativeSection[],
  incoming: UpdatableSection[]
): GenerativeSection[] {
  if (incoming.length === 0) return prev;

  const hasFullReplaceSection = incoming.some((s) => !s._update);
  const next = hasFullReplaceSection ? [] : [...prev];

  const findMatchIndex = (target: UpdatableSection): number => {
    if (target.id) {
      const byId = next.findIndex((s) => s.id === target.id);
      if (byId !== -1) return byId;
    }
    return next.findIndex((s) => s.templateId === target.templateId);
  };

  for (const section of incoming) {
    const matchInPrev = prev.find(
      (s) => s.id === section.id || s.templateId === section.templateId
    );

    if (section._update) {
      const matchIndex = findMatchIndex(section);
      if (matchIndex !== -1) {
        next[matchIndex] = mergeSection(next[matchIndex], section);
      } else if (matchInPrev) {
        next.push(mergeSection(matchInPrev, section));
      } else {
        next.push({
          id: section.id,
          templateId: section.templateId,
          props: section.props,
        });
      }
      continue;
    }

    if (matchInPrev) {
      next.push(mergeSection(matchInPrev, section));
    } else {
      next.push({
        id: section.id,
        templateId: section.templateId,
        props: section.props,
      });
    }
  }

  return next;
}

const TEMPLATES_NEEDING_JOBS = new Set([
  "CardStack",
  "CardStackJobPreviewSheet",
  "JobSearchSheet",
  "JobDetailSheet",
]);
const TEMPLATES_NEEDING_SKILLS = new Set(["ProfileSheet", "SkillCoverageSheet", "SkillsDetail"]);
const TEMPLATES_NEEDING_CANDIDATE = new Set(["CandidateSheet", "ProfileSheet"]);
const TEMPLATES_NEEDING_CAREER_GROWTH = new Set(["CareerGrowthDetail", "CareerGrowthSheet"]);
const TEMPLATES_NEEDING_MARKET_RELEVANCE = new Set(["MarketRelevanceDetail", "MarketRelevanceSheet"]);

const DASHBOARD_COMPANION_TEMPLATES = new Set([
  "GlassmorphicOptions", "ProfileSheet", "SkillCoverageSheet",
  "JobSearchSheet", "JobDetailSheet", "EligibilitySheet",
  "CloseGapSheet", "JobApplicationsSheet", "PastApplicationsSheet",
  "SkillsDetail", "MarketRelevanceDetail", "CareerGrowthDetail",
  "MarketRelevanceSheet", "CareerGrowthSheet",
]);

function buildJobLookupProps(props: Record<string, unknown>) {
  return { jobId: props.jobId, title: props.jobTitle, company: props.company };
}

/**
 * Unwraps common MCP response wrappers (`{ success, data }`, `{ result }`)
 * to get the actual candidate record with name/experience/education fields.
 */
function unwrapCandidate(cache: unknown): Record<string, unknown> | null {
  if (!cache || typeof cache !== "object") return null;
  const obj = cache as Record<string, unknown>;
  if (obj.name || obj.experience || obj.education) return obj;
  for (const key of ["data", "result"] as const) {
    const inner = obj[key];
    if (inner && typeof inner === "object") {
      const rec = inner as Record<string, unknown>;
      if (rec.name || rec.experience || rec.education) return rec;
    }
  }
  return obj;
}

/**
 * Derives a job title/role from the candidate record.
 * Priority: current experience → most recent experience → first job preference.
 */
function deriveCandidateTitle(cd: Record<string, unknown>): string | undefined {
  const exp = cd.experience;
  if (Array.isArray(exp) && exp.length > 0) {
    const entries = exp as Record<string, unknown>[];
    const current = entries.find((e) => e.is_current === true);
    if (current) return (current.title ?? current.role) as string | undefined;
    return (entries[0].title ?? entries[0].role) as string | undefined;
  }
  const prefs = cd.jobPreferences ?? cd.job_preferences;
  if (Array.isArray(prefs) && prefs.length > 0 && typeof prefs[0] === "string") {
    return prefs[0];
  }
  return undefined;
}

function formatSalaryRange(rec: Record<string, unknown>): string | undefined {
  const min = rec.salary_min ?? rec.salaryMin;
  const max = rec.salary_max ?? rec.salaryMax;
  if (min != null && max != null) {
    const fmt = (v: unknown) => Number(v).toLocaleString("en-US");
    return `${fmt(min)} – ${fmt(max)}`;
  }
  return (rec.salaryRange ?? rec.salary_range) as string | undefined;
}

/**
 * Extracts JobDetailSheet-compatible props from a cached job record.
 * Handles the real API shape (snake_case: `company_name`, `salary_min`,
 * `salary_max`, `match_score`, `job_id`) and the mock/camelCase shape.
 */
function extractJobProps(rec: Record<string, unknown>): Record<string, unknown> {
  const inner =
    rec.job && typeof rec.job === "object"
      ? (rec.job as Record<string, unknown>)
      : rec;

  const id = (inner.job_id ?? inner.id ?? inner.jobId) as string | undefined;
  const matchScore = inner.match_score ?? rec.match_score ?? rec.score ?? inner.matchScore ?? rec.matchScore;
  const fitCategory =
    (inner.fitCategory ??
    inner.fit_category ??
    rec.fitCategory ??
    rec.fit_category ??
    (matchScore != null ? categorizeFit(matchScore as number).category : undefined)) as string | undefined;

  const requiredSkills = (inner.required_skills ?? inner.requiredSkills ?? []) as SkillRef[];
  const recommendedSkills = (inner.recommended_skills ?? inner.recommendedSkills ?? []) as SkillRef[];
  const skillGaps = (rec.skill_gaps ?? rec.skillGaps ?? inner.skill_gaps ?? inner.skillGaps ?? []) as SkillGapRef[];

  let aiSummary = (inner.aiSummary ?? inner.ai_summary) as string | undefined;
  let aiGapInsight = (inner.aiGapInsight ?? inner.ai_gap_insight ?? inner.gap_insight) as string | undefined;

  if (!aiSummary && fitCategory && (requiredSkills.length > 0 || skillGaps.length > 0)) {
    aiSummary = generateAiSummary(
      fitCategory as "good-fit" | "stretch" | "grow-into",
      requiredSkills,
      recommendedSkills,
      skillGaps,
    );
  }
  if (aiGapInsight === undefined && fitCategory && skillGaps.length > 0) {
    aiGapInsight = generateAiGapInsight(skillGaps, fitCategory as "good-fit" | "stretch" | "grow-into");
  }

  return {
    id,
    jobId: id,
    title: inner.title,
    company: inner.company_name ?? inner.company,
    location: inner.location,
    salaryRange: formatSalaryRange(inner),
    description: inner.description,
    matchScore,
    fitCategory,
    requiredSkills,
    recommendedSkills,
    skillGaps,
    aiSummary,
    aiGapInsight,
    postedAt: (inner.postedAt ?? inner.posted_at ?? "") as string,
  };
}

/**
 * Looks up a single job from the cached jobs array and returns
 * props suitable for JobDetailSheet.  Tries matching by ID first,
 * then falls back to title+company (handles voice-initiated navigation
 * where the AI may not know the cached job's ID).
 */
function lookupJobFromCache(
  props: Record<string, unknown>,
  cache: unknown,
): Record<string, unknown> | null {
  const arr = resolveJobsArray(cache);
  const jobId = props.jobId as string | undefined;
  const title = (props.title as string | undefined)?.toLowerCase();
  const company = (props.company as string | undefined)?.toLowerCase();

  // Pass 1: exact ID match
  if (jobId) {
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const inner =
        rec.job && typeof rec.job === "object"
          ? (rec.job as Record<string, unknown>)
          : rec;
      if ((inner.id ?? inner.job_id ?? inner.jobId) === jobId) return extractJobProps(rec);
    }
  }

  // Pass 2: fuzzy match by title + company (handles company_name from API)
  if (title) {
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const inner =
        rec.job && typeof rec.job === "object"
          ? (rec.job as Record<string, unknown>)
          : rec;
      const iTitle = (inner.title as string | undefined)?.toLowerCase();
      const iCompany = ((inner.company_name ?? inner.company) as string | undefined)?.toLowerCase();
      if (iTitle === title && (!company || iCompany === company)) {
        return extractJobProps(rec);
      }
    }
  }

  return null;
}

/**
 * Manages the active generativeSubsections driven by the Runtime Agent via navigateToSection.
 * Patches UIFrameworkSiteFunctions.navigateToSection at runtime so the Mobeus SDK
 * routes all navigation calls through this hook's state updates.
 *
 * MCP data (jobs, skills, candidate) is managed by McpCacheProvider and accessed
 * via readCache() from mcpCacheBridge — no window globals needed.
 */
const NAVIGATE_DRIFT_TIMEOUT_MS = 15000;

export function usePhaseFlow() {
  const [generativeSubsections, setGenerativeSections] =
    useState<GenerativeSection[]>(INITIAL_SECTIONS);
  const lastParseNudgeAtRef = useRef(0);
  const lastNavigateAtRef = useRef(0);
  const driftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef<GenerativeSection[]>(INITIAL_SECTIONS);
  const multiSelectSubmittedRef = useRef(false);
  const multiSelectStepKeyRef = useRef<string | null>(null);

  const navigateToSection = useCallback(
    (...args: unknown[]): boolean | { disableNewResponseCreation: boolean } => {
      try {
        const data = normalizeNavigateToSectionPayload(args);
        if (data == null) return false;
        const parsed =
          typeof data === "object" && data !== null
            ? data
            : JSON.parse(data as string);
        const incoming = extractIncomingSections(parsed);
        if (incoming.length === 0) return false;

        // Flow finished: cancel drift correction timer so we don't interrupt the AI.
        if (driftTimerRef.current) {
          clearTimeout(driftTimerRef.current);
          driftTimerRef.current = null;
        }

        lastNavigateAtRef.current = Date.now();

        consumeSessionEstablished(incoming);

        // Guard: block Dashboard when coming from CandidateSheet — must show CardStack first.
        const prevHasCandidateSheet = sectionsRef.current.some(
          (s) => s.templateId === "CandidateSheet",
        );
        const incomingHasDashboard = incoming.some(
          (s) => s.templateId === "Dashboard",
        );
        const incomingHasCardStack = incoming.some(
          (s) => s.templateId === "CardStack",
        );
        if (
          prevHasCandidateSheet &&
          incomingHasDashboard &&
          !incomingHasCardStack
        ) {
          informTele(
            "[CORRECTION] On 'Looks Good' you MUST show CardStack first. Never go directly to Dashboard. " +
              "Call navigateToSection with CardStack now. Same response: speak the job-count lines and call navigateToSection with " +
              '{"badge":"MOBEUS CAREER","title":"Job Matches","subtitle":"Top recommendations","generativeSubsections":[{"id":"jobs","templateId":"CardStack","props":{}}]}.',
          );
          return { disableNewResponseCreation: true };
        }

        // Onboarding CardStack: preview is local UI. JobDetailSheet is for JobSearchSheet (dashboard) via `user selected job:`.
        const prevHasCardStack = sectionsRef.current.some((s) => s.templateId === "CardStack");
        const prevHasJobSearch = sectionsRef.current.some((s) => s.templateId === "JobSearchSheet");
        const incomingHasJobDetail = incoming.some((s) => s.templateId === "JobDetailSheet");
        if (incomingHasJobDetail && prevHasCardStack && !prevHasJobSearch) {
          for (let i = incoming.length - 1; i >= 0; i--) {
            if (incoming[i].templateId === "JobDetailSheet") incoming.splice(i, 1);
          }
          if (incoming.length === 0) {
            informTele(
              "[SYSTEM] CardStack onboarding: the job preview sheet is already on screen. " +
                "Do NOT open JobDetailSheet. Acknowledge in one sentence only — no navigateToSection, no search_knowledge for JobDetailSheet, no fetchCareerGrowth for that purpose.",
            );
            return { disableNewResponseCreation: true };
          }
        }

        // Dashboard landing uses ProfileSheet only — never floating begin-cta bubbles.
        for (let i = incoming.length - 1; i >= 0; i--) {
          const sec = incoming[i];
          if (sec.templateId === "GlassmorphicOptions" && sec.id === "begin-cta") {
            incoming.splice(i, 1);
          }
        }

        // Guard: block RegistrationForm for returning visitors.
        if (getVisitorSession()) {
          const regIdx = incoming.findIndex((s) => s.templateId === "RegistrationForm");
          if (regIdx !== -1) {
            incoming.splice(regIdx, 1);
            if (!incoming.some((s) => s.templateId === "Dashboard")) {
              incoming.push({ id: "dashboard", templateId: "Dashboard", props: {} });
            }
          }
        }

        // Auto-inject cached MCP data into templates that need it.
        // The LLM no longer serializes large payloads — bridge functions
        // populate the cache via McpCacheProvider (mcpCacheBridge).
        const cache = readCache();
        for (const s of incoming) {
          if (s.props?.rawSkillProgression) {
            const merged = {
              ...(cache.skills as Record<string, unknown> | null),
              ...(s.props.rawSkillProgression as Record<string, unknown>),
            };
            loadIntoCacheBridge("skills", merged);
            s.props = { ...s.props, rawSkillProgression: merged };
          }

          if (TEMPLATES_NEEDING_SKILLS.has(s.templateId) && !s.props?.rawSkillProgression && cache.skills) {
            s.props = { ...s.props, rawSkillProgression: cache.skills };
          } else if (TEMPLATES_NEEDING_SKILLS.has(s.templateId) && !cache.skills) {
            fetchSkills("ai-engineer");
          }
          if (TEMPLATES_NEEDING_JOBS.has(s.templateId) && !s.props?.rawJobs && !s.props?.jobs) {
            if (cache.jobs) {
              const jobsArr = resolveJobsArray(cache.jobs);
              if (jobsArr.length > 0) {
                const normalized = jobsArr.map((item) =>
                  item && typeof item === "object"
                    ? extractJobProps(item as Record<string, unknown>)
                    : item,
                );
                const injected = s.templateId === "CardStack" ? normalized.slice(0, 3) : normalized;
                s.props = { ...s.props, jobs: injected };
              }
            } else {
              const sess = getVisitorSession();
              if (sess) fetchJobs(sess.candidateId);
            }
          }
          if (TEMPLATES_NEEDING_CANDIDATE.has(s.templateId)) {
            if (!cache.candidate) {
              // Candidate cache empty — trigger a fallback fetch
              const sess = getVisitorSession();
              if (sess) fetchCandidate(sess.candidateId);
            }
            if (cache.candidate) {
              const cd = unwrapCandidate(cache.candidate);
              if (cd) {
                const prefer = s.templateId === "ProfileSheet";
                const candidateName = (cd.name ?? cd.full_name ?? cd.display_name) as string | undefined;
                if (candidateName && (prefer || !s.props?.name))
                  s.props = { ...s.props, name: candidateName };
                const candidateTitle = (cd.title as string | undefined) ?? deriveCandidateTitle(cd);
                if (candidateTitle && (prefer || !s.props?.title))
                  s.props = { ...s.props, title: candidateTitle };
                if (cd.avatarUrl && (prefer || !s.props?.avatarUrl))
                  s.props = { ...s.props, avatarUrl: cd.avatarUrl as string };
                if (cd.avatar_url && (prefer || !s.props?.avatarUrl))
                  s.props = { ...s.props, avatarUrl: cd.avatar_url as string };
                if (!s.props?.experience && cd.experience) s.props = { ...s.props, experience: cd.experience };
                if (!s.props?.education && cd.education) s.props = { ...s.props, education: cd.education };
              }
            }
          }

          if (TEMPLATES_NEEDING_CAREER_GROWTH.has(s.templateId)) {
            if (!cache.careerGrowth) {
              const sess = getVisitorSession();
              if (sess) fetchCareerGrowth(sess.candidateId);
            }
            if (cache.careerGrowth && !s.props?.rawCareerGrowth) {
              s.props = { ...s.props, rawCareerGrowth: cache.careerGrowth };
            }
          }
          if (TEMPLATES_NEEDING_MARKET_RELEVANCE.has(s.templateId)) {
            if (!cache.marketRelevance) {
              const sess = getVisitorSession();
              if (sess) fetchMarketRelevance(sess.candidateId);
            }
            if (cache.marketRelevance && !s.props?.rawMarketRelevance) {
              s.props = { ...s.props, rawMarketRelevance: cache.marketRelevance };
            }
          }

          if (s.templateId === "JobDetailSheet" && (s.props?.jobId || s.props?.title) && cache.jobs) {
            const match = lookupJobFromCache(s.props, cache.jobs);
            if (match) {
              const defaults: Record<string, unknown> = {};
              for (const [key, val] of Object.entries(match)) {
                if (val != null && !s.props[key]) defaults[key] = val;
              }
              if (Object.keys(defaults).length > 0) {
                s.props = { ...defaults, ...s.props };
              }
            }
          }

          if (s.templateId === "EligibilitySheet" && (s.props?.jobId || s.props?.jobTitle) && cache.jobs) {
            const match = lookupJobFromCache(buildJobLookupProps(s.props), cache.jobs);
            if (match) {
              if (!s.props.matchScore && match.matchScore != null) s.props = { ...s.props, matchScore: match.matchScore };
              if (!s.props.requiredSkills && match.requiredSkills) s.props = { ...s.props, requiredSkills: match.requiredSkills };
              if (!s.props.recommendedSkills && match.recommendedSkills) s.props = { ...s.props, recommendedSkills: match.recommendedSkills };
              if (!s.props.skillGaps && match.skillGaps) s.props = { ...s.props, skillGaps: match.skillGaps };
              if (!s.props.description && match.description) s.props = { ...s.props, description: match.description };
              if (!s.props.fitCategory && match.fitCategory) s.props = { ...s.props, fitCategory: match.fitCategory };
            }
          }

          if (s.templateId === "CloseGapSheet" && (s.props?.jobId || s.props?.jobTitle) && cache.jobs) {
            const match = lookupJobFromCache(buildJobLookupProps(s.props), cache.jobs);
            if (match) {
              if (!s.props.skillGaps && match.skillGaps) s.props = { ...s.props, skillGaps: match.skillGaps };
              if (!s.props.matchScore && match.matchScore != null) s.props = { ...s.props, matchScore: match.matchScore };
            }
          }

          if (s.templateId === "ProfileSheet" && !s.props?.name) {
            s.props = { ...s.props, name: "Your profile" };
          }
        }

        const hasDashboard = incoming.some((s) => s.templateId === "Dashboard");
        const hasOptions = incoming.some((s) => DASHBOARD_COMPANION_TEMPLATES.has(s.templateId));

        if (hasDashboard && !hasOptions) {
          incoming.push({
            id: "profile-home",
            templateId: "ProfileSheet",
            props: { dashboardAnchor: true },
          });
          const last = incoming[incoming.length - 1];
          if (last.templateId === "ProfileSheet" && TEMPLATES_NEEDING_SKILLS.has(last.templateId)) {
            if (!last.props?.rawSkillProgression && cache.skills) {
              last.props = { ...last.props, rawSkillProgression: cache.skills };
            } else if (!cache.skills) {
              fetchSkills("ai-engineer");
            }
          }
          if (last.templateId === "ProfileSheet" && TEMPLATES_NEEDING_CANDIDATE.has(last.templateId)) {
            if (!cache.candidate) {
              const sess = getVisitorSession();
              if (sess) fetchCandidate(sess.candidateId);
            }
            if (cache.candidate) {
              const cd = unwrapCandidate(cache.candidate);
              if (cd) {
                const candidateName = (cd.name ?? cd.full_name ?? cd.display_name) as string | undefined;
                if (candidateName) last.props = { ...last.props, name: candidateName };
                const candidateTitle = (cd.title as string | undefined) ?? deriveCandidateTitle(cd);
                if (candidateTitle && !last.props?.title) last.props = { ...last.props, title: candidateTitle };
                if (cd.avatarUrl && !last.props?.avatarUrl) last.props = { ...last.props, avatarUrl: cd.avatarUrl as string };
                if (cd.avatar_url && !last.props?.avatarUrl) last.props = { ...last.props, avatarUrl: cd.avatar_url as string };
                if (!last.props?.experience && cd.experience) last.props = { ...last.props, experience: cd.experience };
                if (!last.props?.education && cd.education) last.props = { ...last.props, education: cd.education };
              }
            }
          }
          if (last.templateId === "ProfileSheet" && !last.props?.name) {
            last.props = { ...last.props, name: "Your profile" };
          }
        }

        const hasBeginCta = incoming.some(
          (s) => s.templateId === "GlassmorphicOptions" && s.id === "begin-cta",
        );
        if (hasBeginCta && !hasDashboard) {
          incoming.unshift({
            id: "dashboard",
            templateId: "Dashboard",
            props: {},
          });
        }

        // Multi-select guard: block premature navigation away from MultiSelectOptions.
        // The AI must wait for the user to tap Continue (which fires sendSelectionIntent).
        const prevHasMultiSelect = sectionsRef.current.some(
          (s) => s.templateId === "MultiSelectOptions",
        );
        const incomingReplacesAll = incoming.some((s) => !s._update);
        const incomingKeepsMultiSelect = incoming.some(
          (s) => s.templateId === "MultiSelectOptions",
        );
        if (
          prevHasMultiSelect &&
          incomingReplacesAll &&
          !incomingKeepsMultiSelect &&
          !multiSelectSubmittedRef.current
        ) {
          informTele(
            "[CORRECTION] MultiSelectOptions is still active — the user has not tapped Continue yet. " +
              "Do NOT navigate away from a MultiSelect step on individual voice selections. " +
              'Wait for "user selected: <comma-separated selections>" before calling navigateToSection.',
          );
          return { disableNewResponseCreation: true };
        }

        // Pre-compute from `incoming` BEFORE setState — React 18 automatic
        // batching may defer the updater, leaving `resolved` empty when we
        // need it for the return value and the hard-stop informTele.
        const incomingNeedsWait = incoming.some((s) =>
          WAIT_FOR_USER_TEMPLATES.has(s.templateId),
        );

        if (incoming.some((s) => s.templateId === "GlassmorphicOptions")) {
          informTele(
            "[SYSTEM HARD STOP] GlassmorphicOptions is now on screen. " +
              "Do NOT generate any more speech, audio, or tool calls. " +
              "Wait ONLY for `user selected:` from TellTele before your next response.",
          );
        }

        let resolved: GenerativeSection[] = [];
        setGenerativeSections((prev) => {
          resolved = applyIncomingSections(prev, incoming);
          const fp = getActiveMultiSelectFingerprint(resolved);
          if (fp == null) {
            multiSelectStepKeyRef.current = null;
          } else if (multiSelectStepKeyRef.current !== fp) {
            multiSelectStepKeyRef.current = fp;
            multiSelectSubmittedRef.current = false;
          }
          sectionsRef.current = resolved;
          return resolved;
        });

        // Notify TeleSpeechContext to clear stale speech text (dashboard journey only).
        try {
          const ids = resolved.length > 0
            ? resolved.map((s) => s.templateId)
            : incoming.map((s) => s.templateId);
          window.dispatchEvent(
            new CustomEvent("tele-navigate-section", { detail: { templateIds: ids } })
          );
        } catch {}

        return incomingNeedsWait || shouldDisableNewResponse(resolved)
          ? { disableNewResponseCreation: true }
          : true;
      } catch {
        // not valid JSON — nudge model to retry with strict JSON payload
        const now = Date.now();
        if (now - lastParseNudgeAtRef.current > 1200) {
          lastParseNudgeAtRef.current = now;
          informTele(
            "[CORRECTION NEEDED] navigateToSection payload was invalid JSON. " +
              "Retry immediately with valid JSON (double quotes, no trailing commas, closed strings, closed braces). " +
              "Include root keys badge/title/subtitle/generativeSubsections and valid subsection objects."
          );
        }
      }

      return false;
    },
    []
  );

  // Patch UIFrameworkSiteFunctions so the Mobeus SDK always calls the latest handler.
  useEffect(() => {
    const siteFns = (
      window as unknown as {
        UIFrameworkSiteFunctions?: Record<string, unknown>;
      }
    ).UIFrameworkSiteFunctions;

    if (siteFns && typeof siteFns === "object") {
      siteFns.navigateToSection = navigateToSection;
    }

    patchSiteFunctions();
  }, [navigateToSection]);

  // Track when MultiSelectOptions fires sendSelectionIntent (Continue).
  useEffect(() => {
    const handler = () => {
      multiSelectSubmittedRef.current = true;
    };
    window.addEventListener("multi-select-submitted", handler);
    return () => window.removeEventListener("multi-select-submitted", handler);
  }, []);

  const loadingLinkedInEnteredAtRef = useRef<number | null>(null);

  // Auto-render LoadingLinkedIn when the user clicks "Continue with LinkedIn".
  // The AI often forgets to call navigateToSection for this step.
  useEffect(() => {
    const handler = () => {
      loadingLinkedInEnteredAtRef.current = Date.now();
      setGenerativeSections([
        {
          id: "loading-linkedin",
          templateId: "LoadingLinkedIn",
          props: { message: "Connecting with LinkedIn…" },
        },
      ]);
      sectionsRef.current = [
        {
          id: "loading-linkedin",
          templateId: "LoadingLinkedIn",
          props: { message: "Connecting with LinkedIn…" },
        },
      ];
    };
    window.addEventListener("linkedin-continue", handler);
    return () => window.removeEventListener("linkedin-continue", handler);
  }, []);

  // When on LoadingLinkedIn and AI says connection success, nudge to navigate away.
  // Gate: don't fire while find_candidate/MCP tools are still running (~2s typical).
  const LINKEDIN_TOOLS_MIN_MS = 2500;
  const { speech } = useTeleSpeech();
  const linkedInSuccessNudgeFiredRef = useRef(false);
  useEffect(() => {
    const active = generativeSubsections[generativeSubsections.length - 1];
    if (active?.templateId !== "LoadingLinkedIn") {
      linkedInSuccessNudgeFiredRef.current = false;
      loadingLinkedInEnteredAtRef.current = null;
      return;
    }
    let enteredAt = loadingLinkedInEnteredAtRef.current;
    if (enteredAt == null) {
      // Reached LoadingLinkedIn via AI navigateToSection (no linkedin-continue)
      loadingLinkedInEnteredAtRef.current = Date.now();
      enteredAt = loadingLinkedInEnteredAtRef.current;
    }
    const elapsed = Date.now() - enteredAt;
    if (elapsed < LINKEDIN_TOOLS_MIN_MS) return;

    const text = (speech ?? "").toLowerCase();
    // Require explicit success phrases; "linked" alone matches "LinkedIn" in acknowledgment text
    const hasSuccessPhrase =
      text.includes("connected successfully") ||
      text.includes("has been connected") ||
      text.includes("profile is linked") ||
      text.includes("connection is complete") ||
      text.includes("successfully connected") ||
      text.includes("connection was successful");
    if (!hasSuccessPhrase || linkedInSuccessNudgeFiredRef.current) return;

    linkedInSuccessNudgeFiredRef.current = true;
    const timer = setTimeout(() => {
      teleAcknowledge(
        "[CORRECTION] You said the connection was successful. Call navigateToSection with CandidateSheet NOW. Do NOT speak again. Just call the tool.",
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [generativeSubsections, speech]);

  // Drift detection: if the AI responds to a user signal without calling
  // navigateToSection within the timeout, force it to include the tool call.
  useEffect(() => {
    const onThinkingStart = (event: Event) => {
      const detail = (event as CustomEvent<{ skipNavigateDrift?: boolean }>).detail;
      if (detail?.skipNavigateDrift) return;

      if (driftTimerRef.current) clearTimeout(driftTimerRef.current);
      const stampBefore = lastNavigateAtRef.current;
      driftTimerRef.current = setTimeout(() => {
        if (lastNavigateAtRef.current === stampBefore) {
          teleAcknowledge(
            "[SYSTEM CORRECTION] You spoke but FORGOT to call navigateToSection. " +
              "Trigger ONLY the missing part: call navigateToSection NOW with the payload for this step. " +
              "Do NOT speak again. Do NOT list or read options. Do NOT repeat what you already said. Just call the tool.",
          );
        }
      }, NAVIGATE_DRIFT_TIMEOUT_MS);
    };

    window.addEventListener("teleThinkingStart", onThinkingStart);
    return () => {
      window.removeEventListener("teleThinkingStart", onThinkingStart);
      if (driftTimerRef.current) clearTimeout(driftTimerRef.current);
    };
  }, []);

  // Reset UI to initial state on real disconnect only (was connected → now not).
  // Cache reset is handled by McpCacheProvider with the same guard.
  const wasConnectedRef = useRef(false);
  useEffect(() => {
    const onConnectionChange = (e: Event) => {
      const connected = (e as CustomEvent<{ connected: boolean }>).detail
        .connected;
      if (!connected && wasConnectedRef.current) {
        setGenerativeSections(INITIAL_SECTIONS);
      }
      wasConnectedRef.current = connected;
    };
    window.addEventListener("tele-connection-changed", onConnectionChange);
    return () =>
      window.removeEventListener("tele-connection-changed", onConnectionChange);
  }, []);

  // Pre-fetch candidate data for returning visitors and send the SYSTEM signal.
  // BottomNav sends the primary signal; this is a safety-net fallback.
  const returningVisitorNotifiedRef = useRef(false);
  useEffect(() => {
    if (returningVisitorNotifiedRef.current) return;
    const session = getVisitorSession();
    if (!session) return;

    // Pre-fetch all candidate data immediately — no need to wait for AI.
    fetchCandidate(session.candidateId);
    fetchSkills("ai-engineer");
    fetchMarketRelevance(session.candidateId);
    fetchCareerGrowth(session.candidateId);

    const timer = setTimeout(() => {
      if (returningVisitorNotifiedRef.current) return;
      returningVisitorNotifiedRef.current = true;
      informTele(
        `[SYSTEM] Returning visitor detected. candidate_id: ${session.candidateId}. ` +
          "Candidate data has been pre-loaded by the frontend. " +
          'Say "Here\'s your profile." and call navigateToSection with EXACTLY this JSON: ' +
          '{"badge":"trAIn CAREER","title":"Dashboard","subtitle":"Your Profile",' +
          '"generativeSubsections":[{"id":"dashboard","templateId":"Dashboard","props":{}},' +
          '{"id":"profile-home","templateId":"ProfileSheet","props":{"dashboardAnchor":true}}]}. ' +
          "Do NOT call fetchCandidate, fetchJobs, fetchSkills, fetchMarketRelevance, or fetchCareerGrowth now — they are deferred. " +
          "Skip qualification and registration.",
      );
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  return { generativeSubsections };
}
