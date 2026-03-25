/**
 * Certified Layout Recipes — Single Source of Truth
 *
 * Maps human-readable recipe names to GridView layout codes.
 * parseDSL imports this map for runtime resolution.
 *
 * ⚠️  Keep in sync with docs/dsl-rules.md certified layouts section.
 *     If you add/remove/rename a recipe here, update the prompt too.
 *
 * Recipe name → layout code:
 *   career-dashboard       → m:dashboard    (6 cards)
 *   skills-analysis        → 1-2-3          (6 cards)
 *   job-comparison         → v:2-2          (4 cards)
 *   market-overview        → m:hero-sidebar (4 cards)
 *   learning-progress      → m:t-layout     (4 cards)
 *   application-tracker    → 2-3            (5 cards)
 *   interview-prep         → v:1-3          (4 cards)
 *   person-deep-dive       → v:1-3          (4 cards)
 *   incident-review        → m:hero-sidebar (4 cards)
 *   ops-dashboard          → m:dashboard    (6 cards)
 *   financial-overview     → 1-2-3          (6 cards)
 *   competitive-analysis   → v:2-2          (4 cards)
 *   board-prep             → 3x3            (9 cards)
 *   product-showcase       → m:hero-sidebar (4 cards)
 *   risk-assessment        → m:t-layout     (4 cards)
 *   timeline-actions       → v:2-2          (4 cards)
 *   kpi-scan               → 1-3-3          (7 cards)
 */

export const CERTIFIED_LAYOUT_MAP: Record<string, string> = {
    // Career Coach recipes
    'career-dashboard':     'm:dashboard',
    'skills-analysis':      '1-2-3',
    'job-comparison':       'v:2-2',
    'market-overview':      'm:hero-sidebar',
    'learning-progress':    'm:t-layout',
    'application-tracker':  '2-3',
    'interview-prep':       'v:1-3',
    // General-purpose recipes
    'person-deep-dive':     'v:1-3',
    'incident-review':      'm:hero-sidebar',
    'ops-dashboard':        'm:dashboard',
    'financial-overview':   '1-2-3',
    'competitive-analysis': 'v:2-2',
    'board-prep':           '3x3',
    'product-showcase':     'm:hero-sidebar',
    'risk-assessment':      'm:t-layout',
    'timeline-actions':     'v:2-2',
    'kpi-scan':             '1-3-3',
};
