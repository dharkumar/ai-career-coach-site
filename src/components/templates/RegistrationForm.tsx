'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, ArrowRight } from "lucide-react";
import {
  getLinkedInPlaceholderEmail,
  sendLinkedInContinueIntent,
  sendRegistrationEmailIntent,
} from "@/utils/teleIntent";
import { informTele } from "@/utils/teleUtils";
import { useVoiceTranscriptIntent } from "@/hooks/useVoiceTranscriptIntent";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { matchesLinkedInRegistrationIntent } from "@/utils/voiceMatch";

type RegistrationStep = "form" | "email-success";

const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect width="20" height="20" rx="3" fill="var(--linkedin)" />
    <path d="M5.5 8H7.5V15H5.5V8ZM6.5 7C5.95 7 5.5 6.55 5.5 6C5.5 5.45 5.95 5 6.5 5C7.05 5 7.5 5.45 7.5 6C7.5 6.55 7.05 7 6.5 7Z" fill="white" />
    <path d="M9 8H10.9V9C11.2 8.4 11.9 8 12.7 8C14.4 8 15 9.1 15 10.7V15H13V11.2C13 10.4 12.8 9.8 12 9.8C11.2 9.8 10.9 10.4 10.9 11.2V15H9V8Z" fill="white" />
  </svg>
);

const AccountCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2ZM10 5C11.66 5 13 6.34 13 8C13 9.66 11.66 11 10 11C8.34 11 7 9.66 7 8C7 6.34 8.34 5 10 5ZM10 16.2C7.67 16.2 5.61 15.02 4.4 13.22C4.43 11.37 8.2 10.4 10 10.4C11.79 10.4 15.57 11.37 15.6 13.22C14.39 15.02 12.33 16.2 10 16.2Z" fill="var(--text-subtle)" />
  </svg>
);

interface RegistrationFormProps {
  /**
   * Optional email pre-fill. When the AI hears the user mention their email,
   * it calls navigateToSection with this prop to populate the input field.
   */
  prefillEmail?: string;
  /** Optional phone pre-fill. */
  prefillPhone?: string;
}

/**
 * Registration template — pure display, no direct API calls.
 *
 * No question bubble: TeleSpeechBubble in BaseLayout shows the AI's speech.
 *
 * LinkedIn path:
 *   User clicks "Continue with LinkedIn" OR says a LinkedIn intent by voice.
 *   → linkedin-continue + sendLinkedInContinueIntent(..., { steerModel: true } from voice) —
 *     canonical test email (linkedin_demo@trainco.com). Voice uses teleAcknowledge + TellTele to avoid register_candidate.
 *   → AI navigates to LoadingLinkedIn, calls find_candidate, then get_candidate,
 *     then calls get_jobs_by_skills.
 *
 * Email path:
 *   User submits email form
 *   → sendRegistrationEmailIntent("<address>")
 *   → AI calls navigateToSection with LoadingGeneral
 */
export function RegistrationForm({
  prefillEmail,
  prefillPhone: _prefillPhone,
}: RegistrationFormProps) {
  const [regStep, setRegStep] = useState<RegistrationStep>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const linkedInIntentConsumedRef = useRef(false);

  useSpeechFallbackNudge({
    enabled: regStep === "form",
    requiredPhrases: ["account", "linkedin", "create"],
    matchMode: "any",
    instruction:
      '[CORRECTION] Trigger ONLY the missing speech. Say exactly: "Create your account to view matching roles." then "You can also connect to LinkedIn." Do NOT repeat this instruction. Do NOT add extra text.',
    delayMs: 800,
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  // HARD STOP: tell the AI to wait for user action — do not call find_candidate/register_candidate until signal.
  useEffect(() => {
    if (regStep !== "form") return;
    informTele(
      "[SYSTEM] RegistrationForm is now visible. STOP. Do NOT call find_candidate, register_candidate, fetchCandidate, fetchJobs, or fetchSkills. " +
        "Wait for the user to either click 'Continue with LinkedIn' or submit their email. Only then proceed with journey-onboarding."
    );
  }, [regStep]);

  // Auto-dismiss after email-success — AI's next navigateToSection takes over
  useEffect(() => {
    if (regStep === "email-success") {
      const timer = setTimeout(() => setDismissed(true), 2200);
      return () => clearTimeout(timer);
    }
  }, [regStep]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    setError("");
    setRegStep("email-success");
    setTimeout(() => sendRegistrationEmailIntent(email), 600);
  };

  const handleLinkedIn = useCallback((source: "click" | "voice") => {
    if (linkedInIntentConsumedRef.current) return;
    linkedInIntentConsumedRef.current = true;
    setDismissed(true);
    window.dispatchEvent(new CustomEvent("linkedin-continue"));
    void sendLinkedInContinueIntent(getLinkedInPlaceholderEmail(), {
      steerModel: source === "voice",
    });
  }, []);

  const voiceLinkedInEnabled = !dismissed && regStep === "form";

  const onLinkedInVoiceTranscript = useCallback(
    (transcript: string) => {
      if (matchesLinkedInRegistrationIntent(transcript)) handleLinkedIn("voice");
    },
    [handleLinkedIn],
  );

  // Same dual-path idea as MultiSelectOptions + docs: OpenAI transcription may attach
  // after mount; Web Speech API fires locally so the canonical `user clicked:` intent
  // still reaches Tele when the model event is late or missing.
  useBrowserSpeech({
    enabled: voiceLinkedInEnabled,
    onTranscript: onLinkedInVoiceTranscript,
  });

  useVoiceTranscriptIntent({
    enabled: voiceLinkedInEnabled,
    onTranscript: onLinkedInVoiceTranscript,
  });

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="registration-form"
          data-testid="registration-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <AnimatePresence mode="wait">
            {regStep === "form" && (
              <motion.form
                key="form"
                data-testid="registration-form-email-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleEmailSubmit}
                className={[
                  "absolute pointer-events-auto overflow-hidden",
                  "rounded-[16px] p-8 flex flex-col gap-6 glass-card top-sheen",
                ].join(" ")}
                style={{ top: "46.4%", left: 16, right: 16, zIndex: 20 }}
              >
                <div className="relative z-10 flex flex-col gap-2">
                  <h2 className="text-[var(--text-primary)] text-[24px] font-semibold leading-7">Get Started</h2>
                  <p className="text-[var(--text-muted)] text-[16px] font-normal leading-5">
                    Create your account to start your journey
                  </p>
                </div>

                <div className="relative z-10 flex flex-col gap-4">
                  <div className="self-stretch h-14 px-3 py-3.5 input inline-flex justify-start items-center gap-3 overflow-hidden">
                    <AccountCircleIcon />
                    <input
                      data-testid="registration-form-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email or mobile number"
                      className="flex-1 bg-transparent text-[16px] text-[var(--text-secondary)] placeholder:text-[var(--text-subtle)] outline-none tracking-[-0.31px]"
                      autoComplete="email"
                    />
                  </div>

                  {error && <p data-testid="registration-form-error" className="text-red-400 text-sm -mt-2">{error}</p>}

                  <button
                    data-testid="registration-form-continue-btn"
                    type="submit"
                    className="relative z-10 w-full h-[52px] btn-primary no-lightboard flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <span className="text-[var(--accent-contrast)] text-[16px] font-semibold leading-5">Continue</span>
                    <ArrowRight size={16} className="text-[var(--accent-contrast)]" />
                  </button>
                </div>

                <div className="relative z-10 flex items-center h-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="px-4 text-[14px] text-[var(--text-muted)] leading-5">Or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                  data-testid="registration-form-linkedin-btn"
                  type="button"
                  onClick={() => handleLinkedIn("click")}
                  className="relative z-10 self-stretch w-full h-12 btn-secondary no-lightboard inline-flex justify-center items-center gap-3 transition-all duration-200 active:scale-95 hover:opacity-90"
                >
                  <LinkedInIcon />
                  <span className="text-[var(--text-primary)] text-[16px] font-normal leading-5">
                    Continue with LinkedIn
                  </span>
                </button>

                <div className="relative z-10 flex items-center justify-center gap-2 text-[14px] leading-4">
                  <span className="text-[var(--text-muted)]">Already have an account?</span>
                  <span className="text-[var(--accent)] font-semibold">Sign in</span>
                </div>
              </motion.form>
            )}

            {regStep === "email-success" && (
              <motion.div
                key="success"
                data-testid="registration-form-email-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
                  >
                    <CheckCircle size={64} className="text-[var(--accent)]" strokeWidth={1.5} />
                  </motion.div>
                  <p className="text-white text-xl font-semibold">Account Created!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
