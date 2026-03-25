import { notifyTele, teleAcknowledge } from "@/utils/teleUtils";

export function getLinkedInPlaceholderEmail(): string {
  return "linkedin_demo@trainco.com";
}

export type SendLinkedInContinueOptions = {
  /**
   * Voice path: interrupt-steer so Realtime does not treat natural speech as
   * email signup and call `register_candidate` instead of `find_candidate`.
   */
  steerModel?: boolean;
};

export function sendSelectionIntent(label: string): Promise<void> {
  // Dispatch event for ChatHistoryContext to capture
  window.dispatchEvent(
    new CustomEvent("user-selection", { detail: { selection: label } })
  );
  return notifyTele(`user selected: ${label}`);
}

export function sendLinkedInContinueIntent(
  email = getLinkedInPlaceholderEmail(),
  options?: SendLinkedInContinueOptions,
): Promise<void> {
  if (options?.steerModel) {
    teleAcknowledge(
      "[SYSTEM] LinkedIn path (voice). The canonical `user clicked: Continue with LinkedIn | email: " +
        email +
        "` signal is being sent now via TellTele. Execute journey-onboarding Step 6 only: " +
        "`find_candidate` with that email, then bridge calls. " +
        "FORBIDDEN on this path: `register_candidate`. " +
        "If you already started `register_candidate`, abandon it and use `find_candidate` only.",
      { visible: false },
    );
  }
  return notifyTele(`user clicked: Continue with LinkedIn | email: ${email}`, {
    skipNavigateDrift: true,
  });
}

export function sendRegistrationEmailIntent(email: string): Promise<void> {
  return notifyTele(`user registered with email: ${email}`, {
    skipNavigateDrift: true,
  });
}

export function sendTappedIntent(target: string): Promise<void> {
  return notifyTele(`user clicked: ${target}`);
}

export function sendDashboardIntent(): Promise<void> {
  return notifyTele("user clicked: dashboard");
}

export function sendBackToProfileIntent(): Promise<void> {
  return notifyTele("user clicked: back to profile");
}

export function sendLooksGoodClickedIntent(): Promise<void> {
  return notifyTele("user clicked: Looks Good");
}

export function sendJobOpenedIntent(title: string, company: string): Promise<void> {
  return notifyTele(`user opened job: ${title} at ${company}`, { skipNavigateDrift: true });
}

export function sendJobClosedIntent(title: string, company: string): Promise<void> {
  return notifyTele(`user closed job: ${title} at ${company}`, { skipNavigateDrift: true });
}

export function sendCardsDismissedIntent(): Promise<void> {
  return notifyTele("user tapped: cards");
}

export function sendInvalidOptionVoiceIntent(): Promise<void> {
  return notifyTele(
    "[SYSTEM] User spoke but did not select a valid option. " +
      "Please repeat the question and wait for a bubble selection."
  );
}
