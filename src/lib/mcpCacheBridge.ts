/**
 * Module-level bridge between the React McpCacheProvider and non-React code
 * (mcpBridge fetch functions, navigateToSection in usePhaseFlow).
 *
 * The Provider registers its setter/getter on mount. If a fetch completes
 * before the Provider mounts, writes are buffered and flushed automatically.
 */

export interface McpCache {
  candidate: Record<string, unknown> | null;
  jobs: unknown | null;
  skills: unknown | null;
  careerGrowth: unknown | null;
  marketRelevance: unknown | null;
  /** Pre-fetched post-learning snapshots — populated when SkillTestFlow/MyLearningTemplate opens */
  skillsAfter: unknown | null;
  marketRelevanceAfter: unknown | null;
  careerGrowthAfter: unknown | null;
  jobsAfter: unknown | null;
}

export const EMPTY_CACHE: McpCache = {
  candidate: null,
  jobs: null,
  skills: null,
  careerGrowth: null,
  marketRelevance: null,
  skillsAfter: null,
  marketRelevanceAfter: null,
  careerGrowthAfter: null,
  jobsAfter: null,
};

type CacheKey = keyof McpCache;
type CacheSetter = (key: CacheKey, data: unknown) => void;
type CacheReader = () => McpCache;

let setter: CacheSetter | null = null;
let reader: CacheReader | null = null;
let pendingWrites: [CacheKey, unknown][] = [];

export function registerCacheAccessors(s: CacheSetter, r: CacheReader) {
  setter = s;
  reader = r;
  for (const [key, data] of pendingWrites) {
    s(key, data);
  }
  pendingWrites = [];
}

export function unregisterCacheAccessors() {
  setter = null;
  reader = null;
}

export function loadIntoCache(key: CacheKey, data: unknown) {
  if (setter) {
    setter(key, data);
  } else {
    pendingWrites.push([key, data]);
  }
}

export function readCache(): McpCache {
  return reader ? reader() : EMPTY_CACHE;
}
