'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type McpCache,
  EMPTY_CACHE,
  registerCacheAccessors,
  unregisterCacheAccessors,
} from "@/lib/mcpCacheBridge";

const McpCacheContext = createContext<McpCache>(EMPTY_CACHE);

export function McpCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<McpCache>(EMPTY_CACHE);
  const cacheRef = useRef<McpCache>(cache);
  cacheRef.current = cache;

  const handleSet = useCallback((key: keyof McpCache, data: unknown) => {
    cacheRef.current = { ...cacheRef.current, [key]: data };
    setCache((prev) => ({ ...prev, [key]: data }));
  }, []);

  const handleGet = useCallback((): McpCache => cacheRef.current, []);

  useEffect(() => {
    registerCacheAccessors(handleSet, handleGet);
    return () => unregisterCacheAccessors();
  }, [handleSet, handleGet]);

  // Only reset cache on a real disconnect (was connected → now disconnected).
  // BottomNav dispatches connected:false during the "connecting" phase too,
  // which would wipe pre-fetched candidate data before tele is even up.
  const wasConnectedRef = useRef(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const connected = (e as CustomEvent<{ connected: boolean }>).detail
        .connected;
      if (!connected && wasConnectedRef.current) {
        setCache(EMPTY_CACHE);
      }
      wasConnectedRef.current = connected;
    };
    window.addEventListener("tele-connection-changed", handler);
    return () =>
      window.removeEventListener("tele-connection-changed", handler);
  }, []);

  return (
    <McpCacheContext.Provider value={cache}>
      {children}
    </McpCacheContext.Provider>
  );
}

export function useMcpCache(): McpCache {
  return useContext(McpCacheContext);
}
