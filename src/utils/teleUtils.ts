type UIFrameworkWindow = Window & {
  UIFramework?: {
    TellTele?: (message: string) => void;
    informTele?: (message: string) => void;
    teleAcknowledge?: (instruction: string, options?: Record<string, unknown>) => void;
    speakAvatar?: (text: string, options?: { ensureConnected?: boolean; chunked?: boolean }) => Promise<boolean>;
    isConnected?: () => boolean;
  };
};

function fw() {
  return (window as UIFrameworkWindow).UIFramework;
}

export type NotifyTeleOptions = {
  /**
   * When true, usePhaseFlow will not arm the navigate drift timer for this Tell.
   * Use for intents that expect long MCP chains (find_candidate, register_candidate, …)
   * before the next navigateToSection — otherwise teleAcknowledge can collide with an
   * active response (conversation_already_has_active_response).
   */
  skipNavigateDrift?: boolean;
};

/**
 * Sends a visible user message to the Runtime Agent via UIFramework.TellTele.
 * Equivalent to the user typing or saying the message aloud.
 *
 * Dispatches a teleThinkingStart event for visual feedback while polling for readiness.
 */
export async function notifyTele(
  message: string,
  options?: NotifyTeleOptions
): Promise<void> {
  try {
    window.dispatchEvent(
      new CustomEvent("teleThinkingStart", {
        detail: { skipNavigateDrift: options?.skipNavigateDrift === true },
      })
    );
  } catch (_) {}

  let attempts = 0;
  while (!fw()?.TellTele && attempts < 50) {
    await new Promise((r) => setTimeout(r, 300));
    attempts++;
  }

  fw()?.TellTele?.(message);
}

/**
 * Sends invisible context to the Runtime Agent via UIFramework.informTele.
 * The user does not see this message — it is injected silently into the AI session.
 */
export function informTele(message: string): void {
  fw()?.informTele?.(message);
}

/**
 * Sends a hidden high-priority instruction to the Runtime Agent.
 * Use this when a UI state should strongly trigger the next response.
 */
export function teleAcknowledge(
  instruction: string,
  options: Record<string, unknown> = { visible: false },
): void {
  fw()?.teleAcknowledge?.(instruction, options);
}

/**
 * Forces the avatar to speak text aloud.
 * Use for immediate welcome feedback while the AI session initializes.
 * Per UIFramework API: ensureConnected=true auto-connects avatar if needed.
 */
export async function speakAvatar(
  text: string,
  options?: { ensureConnected?: boolean; chunked?: boolean },
): Promise<boolean> {
  return (await fw()?.speakAvatar?.(text, options)) ?? false;
}
