import { useState, useEffect } from "react";
import { teleState, type TeleConnectionState, type TeleActiveMode } from "@/lib/teleState";
import { resolveUIModeFromTeleMode, setUIMode } from "@/lib/designSystem";

interface TeleStateResult {
  connected: boolean;
  connectionState: TeleConnectionState;
  activeMode: TeleActiveMode;
}

/**
 * Reactive hook for the global teleState singleton.
 * Subscribes to `tele-connection-changed` and `tele-mode-changed` custom events
 * and keeps React state in sync. Also syncs the UI design-system mode.
 */
export function useTeleState(): TeleStateResult {
  const [connected, setConnected] = useState(() => teleState.connected);
  const [connectionState, setConnectionState] = useState(() => teleState.connectionState);
  const [activeMode, setActiveMode] = useState(() => teleState.activeMode);

  useEffect(() => {
    setConnected(teleState.connected);
    setConnectionState(teleState.connectionState);
    setActiveMode(teleState.activeMode);
    setUIMode(resolveUIModeFromTeleMode(teleState.activeMode));

    const onConnection = () => {
      setConnected(teleState.connected);
      setConnectionState(teleState.connectionState);
    };

    const onMode = (e: Event) => {
      const mode = (e as CustomEvent<{ activeMode: string }>).detail.activeMode;
      setActiveMode(mode as TeleActiveMode);
      setUIMode(resolveUIModeFromTeleMode(mode));
    };

    window.addEventListener("tele-connection-changed", onConnection);
    window.addEventListener("tele-mode-changed", onMode);
    return () => {
      window.removeEventListener("tele-connection-changed", onConnection);
      window.removeEventListener("tele-mode-changed", onMode);
    };
  }, []);

  return { connected, connectionState, activeMode };
}
