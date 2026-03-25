export type UIMode = "video" | "voice" | "chat";

const TELE_TO_UI_MODE: Record<string, UIMode> = {
  tele: "video",
  voice: "voice",
  chat: "chat",
  none: "video",
};

const UI_MODE_CLASSES: Record<UIMode, string> = {
  video: "ui-mode-video",
  voice: "ui-mode-voice",
  chat: "ui-mode-chat",
};

/**
 * Centralized UI mode setter.
 * All mode themes are driven by `data-ui-mode` on <html>.
 */
export function setUIMode(mode: UIMode): void {
  const root = document.documentElement;
  root.setAttribute("data-ui-mode", mode);

  // Keep a class-based mode in sync with data-ui-mode.
  // This mirrors patterns used in other Mobeus apps and makes
  // runtime theme state easier to target from CSS/tools.
  root.classList.remove(
    UI_MODE_CLASSES.video,
    UI_MODE_CLASSES.voice,
    UI_MODE_CLASSES.chat
  );
  root.classList.add(UI_MODE_CLASSES[mode]);
}

export function resolveUIModeFromTeleMode(mode: string | undefined): UIMode {
  if (!mode) return "video";
  return TELE_TO_UI_MODE[mode] ?? "video";
}
