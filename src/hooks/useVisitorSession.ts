import { useSyncExternalStore } from "react";
import { getVisitorSession, type VisitorSession } from "@/utils/visitorMemory";

const STORAGE_KEY = "trainco_visitor_session";

let cachedSnapshot: VisitorSession | null = getVisitorSession();

function getSnapshot(): VisitorSession | null {
  return cachedSnapshot;
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cachedSnapshot = getVisitorSession();
      onStoreChange();
    }
  };

  const onCustom = () => {
    cachedSnapshot = getVisitorSession();
    onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("visitor-session-changed", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("visitor-session-changed", onCustom);
  };
}

/**
 * Reactive hook for the visitor session stored in localStorage.
 *
 * Subscribes to both cross-tab `storage` events and an in-tab
 * `visitor-session-changed` custom event (dispatched by saveVisitorSession).
 */
export function useVisitorSession(): VisitorSession | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
