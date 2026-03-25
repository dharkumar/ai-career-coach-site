import { useEffect, useRef, useCallback } from "react";

type UIFrameworkType = {
  toggleMute?: () => void;
};

function getFramework(): UIFrameworkType | null {
  return (window as unknown as Record<string, unknown>).UIFramework as UIFrameworkType | null;
}

/**
 * Mutes the mic on mount and unmutes on unmount or when release() is called.
 * Prevents the AI voice model from hearing raw audio during multi-select,
 * eliminating premature responses to individual selections.
 */
export function useMicGate(): { release: () => void } {
  const ownedRef = useRef(false);

  const release = useCallback(() => {
    if (!ownedRef.current) return;
    const fw = getFramework();
    if (typeof fw?.toggleMute === "function") fw.toggleMute();
    ownedRef.current = false;
  }, []);

  useEffect(() => {
    const fw = getFramework();
    if (typeof fw?.toggleMute === "function") {
      fw.toggleMute();
      ownedRef.current = true;
    }
    return () => release();
  }, [release]);

  return { release };
}
