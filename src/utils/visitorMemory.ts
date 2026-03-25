const STORAGE_KEY = "trainco_visitor_session";

/**
 * Captured at module load time. True only if a session existed when the app started
 * (returning visitor). False for first-time users who complete onboarding mid-session.
 */
export const HAD_SESSION_AT_APP_START = (() => {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
})();

export interface VisitorSession {
  candidateId: string;
  /** Persisted across page reloads so fetch functions always use after-learning routes. */
  learningCompleted?: boolean;
}

export function saveVisitorSession(candidateId: string): void {
  try {
    const existing = getVisitorSession();
    if (existing?.candidateId === candidateId) return;
    // Preserve learningCompleted if the same candidate logs back in
    const session: VisitorSession = { candidateId, learningCompleted: existing?.learningCompleted };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent("visitor-session-changed"));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

/**
 * Marks the current candidate's learning path as completed in localStorage.
 * Persists across page reloads and backend restarts so fetch functions
 * always load post-learning data once the user has finished a course.
 */
export function saveLearningCompleted(): void {
  try {
    const existing = getVisitorSession();
    if (!existing?.candidateId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, learningCompleted: true }));
  } catch {
    // localStorage may be unavailable
  }
}

export function getVisitorSession(): VisitorSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<VisitorSession>;
    if (!data.candidateId) return null;
    return { candidateId: data.candidateId, learningCompleted: data.learningCompleted };
  } catch {
    return null;
  }
}

