/**
 * teleState — module-level singleton for Tele connection state.
 *
 * Survives React component re-mounts (template transitions), so AvatarScreen and
 * BottomNav always read the correct connection state even after unmounting and
 * remounting in a new template.
 *
 * Usage:
 *   import { teleState } from "@/lib/teleState";
 *   // read: teleState.connected
 *   // write: teleState.connected = true; (then dispatch tele-connection-changed)
 */

export type TeleConnectionState = "idle" | "connecting" | "connected";
export type TeleActiveMode = "none" | "tele" | "voice" | "chat";

export const teleState = {
  /** True when avatar stream + OpenAI voice are both live. */
  connected: false,
  /** Reflects the current connection lifecycle stage. */
  connectionState: "idle" as TeleConnectionState,
  /** Which button mode is currently active in BottomNav. */
  activeMode: "none" as TeleActiveMode,
};
