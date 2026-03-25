'use client';

import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useSpeechFallbackNudge } from "@/hooks/useSpeechFallbackNudge";
import { informTele } from "@/utils/teleUtils";
import { HAD_SESSION_AT_APP_START } from "@/utils/visitorMemory";
import { useCurrentSection } from "@/contexts/CurrentSectionContext";

/**
 * Post-onboarding destination template.
 *
 * Renders the persistent DashboardBtn (top-left, Figma nodes 719:6374 / 719:6366).
 * BaseLayout provides avatar, glow, gradient, BottomNav. The landing surface is
 * ProfileSheet (id profile-home) — no floating begin-cta bubbles.
 *
 * The AI navigates here with ProfileSheet in a single navigateToSection call
 * (or the frontend injects profile-home when only Dashboard is sent).
 */
const DASHBOARD_TOP_TEMPLATES = new Set(["Dashboard", "ProfileSheet"]);

let dashboardNudgeFiredThisSession = false;

export function Dashboard() {
  const { effectiveTemplateId } = useCurrentSection();
  const nudgeFiredRef = useRef(dashboardNudgeFiredThisSession);

  const isDashboardTop = useMemo(
    () => DASHBOARD_TOP_TEMPLATES.has(effectiveTemplateId ?? ""),
    [effectiveTemplateId],
  );

  const nudgeEnabled = isDashboardTop && !nudgeFiredRef.current;

  useEffect(() => {
    if (isDashboardTop && !dashboardNudgeFiredThisSession) {
      dashboardNudgeFiredThisSession = true;
      nudgeFiredRef.current = true;
    }
  }, [isDashboardTop]);

  useEffect(() => {
    informTele(
      "[SYSTEM] Dashboard mounted. Always respond in English only — never switch language based on the user's name or profile data."
    );
  }, []);

  const isReturning = HAD_SESSION_AT_APP_START;

  const dashboardLandingJson =
    '{"badge":"trAIn CAREER","title":"Dashboard","subtitle":"Your Profile",' +
    '"generativeSubsections":[{"id":"dashboard","templateId":"Dashboard","props":{}},' +
    '{"id":"profile-home","templateId":"ProfileSheet","props":{"dashboardAnchor":true}}]}';

  useSpeechFallbackNudge({
    enabled: nudgeEnabled,
    requiredPhrases: [
      "tap this icon to access it at any time",
      "this is your profile",
      "here's your profile",
    ],
    instruction: isReturning
      ? "[SYSTEM] Dashboard is visible but you have not spoken the required line yet. " +
        'Say "Here\'s your profile." (1–2 sentences max). ' +
        "Do NOT call fetchCandidate, fetchJobs, or fetchSkills — the frontend handles data loading. " +
        "Do NOT explain dashboard metrics (Skill Coverage, Market Relevance, Career Growth). " +
        "Do NOT deliver the ProfileSheet tutorial — that belongs exclusively in ProfileSheet. " +
        "Include navigateToSection with EXACTLY: " + dashboardLandingJson
      : "[SYSTEM] Dashboard is visible but you have not spoken the required lines yet. " +
        "Your next response MUST include ALL of the following speech in order, in a SINGLE response:\n" +
        '1. "Tap this icon to access it at any time."\n' +
        '2. "This is your profile. Let\'s take a look."\n' +
        '3. "Based on everything I know about you, I picked a Target Role you should grow towards. You may change this at any time."\n' +
        '4. "Your Skill Coverage tells you how close you are to your Target Role."\n' +
        '5. "Your Market Relevance measures how closely your skills align with market demands."\n' +
        '6. "Your Career Growth measures how quickly your growth is turning into real opportunities."\n' +
        '7. "You may tap on any of these to see more details, or you can ask me directly."\n' +
        "Say ALL seven lines in one response. Do not stop early. Do not wait for user input between them. " +
        "Include navigateToSection with EXACTLY: " + dashboardLandingJson,
    delayMs: 1500,
  });

  return (
    <motion.div
      data-testid="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
