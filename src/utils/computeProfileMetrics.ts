/**
 * Computes ProfileSheet summary metrics from raw `get_skill_progression` data.
 *
 * Moves deterministic arithmetic out of the LLM prompt so the AI only needs
 * to forward the raw MCP response — no manual averaging or rounding.
 */

export interface SkillMapItem {
  category: string;
  current: number;
  market_avg: number;
  top10: number;
}

export interface SkillProgressionItem {
  name: string;
  current_level: number;
  target_level: number;
  is_featured?: boolean;
}

export interface LearningPathNode {
  id: string;
  label: string;
  status: "completed" | "in-progress" | "upcoming";
  x: number;
  y: number;
  milestones?: string[];
}

export interface LearningPathEdge {
  from: string;
  to: string;
}

export interface SkillData {
  role_title?: string;
  skill_map?: SkillMapItem[];
  skill_progression?: SkillProgressionItem[];
  learning_path_nodes?: LearningPathNode[];
  learning_path_edges?: LearningPathEdge[];
}

export interface ProfileMetrics {
  targetRole: string | undefined;
  skillsToGo: number | undefined;
  estimatedTimeline: string | undefined;
  skillCoverage: number | undefined;
  marketRelevance: number | undefined;
  careerGrowth: number | undefined;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export function computeProfileMetrics(data: SkillData | null | undefined): ProfileMetrics {
  if (!data) {
    return {
      targetRole: undefined,
      skillsToGo: undefined,
      estimatedTimeline: undefined,
      skillCoverage: undefined,
      marketRelevance: undefined,
      careerGrowth: undefined,
    };
  }

  const { role_title, skill_map, skill_progression } = data;

  const targetRole = role_title || undefined;

  let skillsToGo: number | undefined;
  let estimatedTimeline: string | undefined;
  let skillCoverage: number | undefined;

  if (skill_progression && skill_progression.length > 0) {
    const gaps = skill_progression.filter((s) => s.current_level < s.target_level);
    skillsToGo = gaps.length;

    const totalGap = gaps.reduce((sum, s) => sum + (s.target_level - s.current_level), 0);
    const months = Math.max(2, Math.ceil(totalGap * 1.5));
    estimatedTimeline = `~${months}-${months + 2} months`;

    skillCoverage = avg(
      skill_progression.map((s) =>
        s.target_level > 0 ? Math.min(100, (s.current_level / s.target_level) * 100) : 100
      )
    );
  }

  let marketRelevance: number | undefined;
  let careerGrowth: number | undefined;

  if (skill_map && skill_map.length > 0) {
    const aiEntry = skill_map.find((s) => s.category === "AI Engineering");
    if (aiEntry) {
      skillCoverage = aiEntry.current;
      marketRelevance = aiEntry.market_avg;
      // careerGrowth left undefined → renders as velocity chevrons in CircularGauge
    } else {
      marketRelevance = avg(
        skill_map.map((s) =>
          s.market_avg > 0 ? Math.min(100, (s.current / s.market_avg) * 100) : 100
        )
      );
      // careerGrowth left undefined → renders as velocity chevrons in CircularGauge
    }
  }

  return { targetRole, skillsToGo, estimatedTimeline, skillCoverage, marketRelevance, careerGrowth };
}

// ---------------------------------------------------------------------------
// Raw MCP response mapping (was mapRawSkillProgression.ts)
// ---------------------------------------------------------------------------

/**
 * Maps raw `get_skill_progression` MCP response to the SkillData interface.
 * All field validation and sanitization happens here.
 */
export function mapRawSkillProgression(
  raw: Record<string, unknown> | null | undefined,
): SkillData | null {
  if (!raw || typeof raw !== "object") return null;

  const roleTitle =
    typeof raw.role_title === "string" ? raw.role_title : undefined;

  const skillMap = Array.isArray(raw.skill_map)
    ? (raw.skill_map.map(mapSkillMapItem).filter(Boolean) as SkillMapItem[])
    : undefined;

  const skillProgression = Array.isArray(raw.skill_progression)
    ? (raw.skill_progression.map(mapSkillProgressionItem).filter(Boolean) as SkillProgressionItem[])
    : undefined;

  const learningPathNodes = Array.isArray(raw.learning_path_nodes)
    ? (raw.learning_path_nodes.map(mapLearningPathNode).filter(Boolean) as LearningPathNode[])
    : undefined;

  const learningPathEdges = Array.isArray(raw.learning_path_edges)
    ? (raw.learning_path_edges.map(mapLearningPathEdge).filter(Boolean) as LearningPathEdge[])
    : undefined;

  if (!roleTitle && !skillMap?.length && !skillProgression?.length) return null;

  return {
    role_title: roleTitle,
    skill_map: skillMap,
    skill_progression: skillProgression,
    learning_path_nodes: learningPathNodes,
    learning_path_edges: learningPathEdges,
  };
}

/**
 * Extracts gauge scores from raw skill progression cache data.
 * Uses the "AI Engineering" category: current → skillCoverage,
 * market_avg → marketRelevance, top10 → careerGrowth.
 */
export function extractGaugeScores(rawSkills: unknown): {
  skillCoverage?: number;
  marketRelevance?: number;
  careerGrowth?: number;
} {
  const data = mapRawSkillProgression(rawSkills as Record<string, unknown> | null);
  if (!data) return {};
  const metrics = computeProfileMetrics(data);
  return {
    skillCoverage: metrics.skillCoverage,
    marketRelevance: metrics.marketRelevance,
    careerGrowth: metrics.careerGrowth,
  };
}

function mapSkillMapItem(item: unknown): SkillMapItem | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (typeof o.category !== "string") return null;
  return {
    category: o.category,
    current: Number(o.current) || 0,
    market_avg: Number(o.market_avg) || 0,
    top10: Number(o.top10) || 0,
  };
}

function mapSkillProgressionItem(item: unknown): SkillProgressionItem | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (typeof o.name !== "string") return null;
  return {
    name: o.name,
    current_level: Number(o.current_level) || 0,
    target_level: Number(o.target_level) || 0,
    is_featured: !!o.is_featured,
  };
}

function mapLearningPathNode(item: unknown): LearningPathNode | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.label !== "string") return null;
  const status = o.status as string;
  if (status !== "completed" && status !== "in-progress" && status !== "upcoming")
    return null;
  return {
    id: o.id,
    label: o.label,
    status,
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    milestones: Array.isArray(o.milestones)
      ? o.milestones.filter((m): m is string => typeof m === "string")
      : undefined,
  };
}

function mapLearningPathEdge(item: unknown): LearningPathEdge | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (typeof o.from !== "string" || typeof o.to !== "string") return null;
  return { from: o.from, to: o.to };
}
