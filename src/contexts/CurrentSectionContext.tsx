'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface CurrentSectionValue {
  currentTemplateId: string | undefined;
  currentSectionId: string | undefined;
  /** currentTemplateId with nested-view override applied. Use this for visibility decisions. */
  effectiveTemplateId: string | undefined;
  /** Nested components call this to announce they've taken over the screen. */
  setOverrideTemplateId: (id: string | undefined) => void;
}

const CurrentSectionContext = createContext<CurrentSectionValue>({
  currentTemplateId: undefined,
  currentSectionId: undefined,
  effectiveTemplateId: undefined,
  setOverrideTemplateId: () => {},
});

export function CurrentSectionProvider({
  currentTemplateId,
  currentSectionId,
  children,
}: { currentTemplateId: string | undefined; currentSectionId: string | undefined; children: ReactNode }) {
  const [overrideTemplateId, setOverrideTemplateId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setOverrideTemplateId(undefined);
  }, [currentTemplateId]);

  const effectiveTemplateId = overrideTemplateId ?? currentTemplateId;

  const value = useMemo<CurrentSectionValue>(
    () => ({ currentTemplateId, currentSectionId, effectiveTemplateId, setOverrideTemplateId }),
    [currentTemplateId, currentSectionId, effectiveTemplateId],
  );

  return (
    <CurrentSectionContext.Provider value={value}>
      {children}
    </CurrentSectionContext.Provider>
  );
}

export function useCurrentSection(): CurrentSectionValue {
  return useContext(CurrentSectionContext);
}
