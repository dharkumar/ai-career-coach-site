'use client';

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TeleSpeechBubble } from "./TeleSpeechBubble";
import { TalentChatMode } from "./TalentChatMode";
import { DashboardBtn } from "@/components/ui/DashboardBtn";
import { LearningBtn } from "@/components/ui/LearningBtn";
import { useTeleState } from "@/hooks/useTeleState";
import { useCurrentSection } from "@/contexts/CurrentSectionContext";
import { useVisualViewportBottomInset } from "@/hooks/useVisualViewportBottomInset";
import type { GenerativeSection } from "@/types/flow";

const ONBOARDING_TEMPLATES = new Set([
  "EmptyScreen", "WelcomeLanding", "GlassmorphicOptions", "MultiSelectOptions",
  "TextInput", "RegistrationForm", "LoadingGeneral", "LoadingLinkedIn",
  "CandidateSheet", "CardStack",
]);

interface BaseLayoutProps {
  children: ReactNode;
  sections?: GenerativeSection[];
}

/**
 * Persistent outer shell — rendered once in App.tsx and never re-mounted.
 *
 * Owns everything that must survive template and step transitions:
 *  - Static /avatar.jpg background (fades out when Tele connects; UIFramework
 *    BG-LAYER takes over with the HeyGen live stream)
 *  - Green radial glow (always behind the avatar)
 *  - Top / bottom edge gradient fades (above template content z-40)
 *
 * Templates rendered via DynamicSectionLoader float as children above these layers.
 * BottomNav is now in root layout.tsx for global persistence.
 */
export function BaseLayout({ children, sections = [] }: BaseLayoutProps) {
  const { connectionState, connected } = useTeleState();
  const [chatMode, setChatMode] = useState(false);
  useVisualViewportBottomInset();

  const { effectiveTemplateId } = useCurrentSection();
  const showNavButtons = !!effectiveTemplateId && !ONBOARDING_TEMPLATES.has(effectiveTemplateId);

  useEffect(() => {
    const handleModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ activeMode: string }>;
      setChatMode(customEvent.detail.activeMode === "chat");
    };

    window.addEventListener("tele-mode-changed", handleModeChange);
    return () => window.removeEventListener("tele-mode-changed", handleModeChange);
  }, []);

  useEffect(() => {
    const stripInjectedCtaStyles = (scope?: ParentNode) => {
      const targets = (scope ?? document).querySelectorAll<HTMLElement>(".no-lightboard");
      targets.forEach((el) => {
        // Preserve intentional disabled visuals from component state.
        if (el instanceof HTMLButtonElement && el.disabled) return;
        const tid = el.getAttribute("data-testid") ?? "";
        const isEdgeGradient =
          tid === "base-layout-gradient-bottom" || tid === "base-layout-gradient-top";
        el.style.removeProperty("background-color");
        el.style.removeProperty("border-color");
        el.style.removeProperty("box-shadow");
        if (isEdgeGradient) {
          // Gradient is defined in index.css (!important). Only drop injected `none` so CSS shows through.
          if (el.style.backgroundImage === "none") {
            el.style.removeProperty("background-image");
          }
        } else {
          el.style.removeProperty("background-image");
        }
      });
    };

    stripInjectedCtaStyles();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
          const target = mutation.target;
          if (target.matches(".no-lightboard") || target.closest(".no-lightboard")) {
            stripInjectedCtaStyles();
            return;
          }
        }

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(".no-lightboard") || node.querySelector(".no-lightboard")) {
            stripInjectedCtaStyles(node);
          }
        });
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "class", "disabled", "aria-busy"],
    });

    return () => observer.disconnect();
  }, []);



  const handleSendChatMessage = (text: string) => {
    const fw = (window as any).UIFramework;
    if (!fw) return;
    if (typeof fw.TellTele === "function") {
      (fw.TellTele as (t: string) => void)(text);
    }
  };

  return (
    <div data-testid="base-layout" className="relative w-screen h-[100svh] overflow-hidden bg-[var(--bg)]">

      {/* ── Static avatar photo — shown when disconnected regardless of mode ─── */}
      <motion.div
        data-testid="base-layout-avatar-photo"
        className="absolute inset-0 overflow-hidden"
        animate={{ opacity: !connected ? 1 : 0 }}
        transition={{
          delay:0.25,
          duration: 0.2,
          ease: "easeInOut",
        }}
      >
        <img
          src="/Magic.png"
          alt="trAIn — AI career concierge"
          className="absolute right-[-67px] top-[80px] h-[90%] w-auto max-w-none pointer-events-none select-none"
        />
      </motion.div>

      {/* ── Edge gradient fades (above template layer z-40; speech 60, nav 100) */}
      <div
        data-testid="base-layout-gradient-bottom"
        className="absolute left-0 right-0 bottom-0 z-[10] pointer-events-none no-lightboard"
        style={{ height: "28%" }}
      />
      <div
        data-testid="base-layout-gradient-top"
        className="absolute left-0 right-0 top-0 z-[10] pointer-events-none no-lightboard"
        style={{ height: "24%" }}
      />

      {/* ── Persistent speech overlay — shows what Tele is saying for video mode ────────── */}
      {!chatMode && <TeleSpeechBubble />}

      {/* ── Template content ──────────────────────────────────────────────── */}
      {!chatMode && (
        <div data-testid="base-layout-content" className="absolute inset-0">
          {children}
        </div>
      )}

      {/* ── Persistent nav buttons — above all template layers ────────────── */}
      {!chatMode && showNavButtons && (
        <div className="fixed inset-0 pointer-events-none no-lightboard" style={{ zIndex: 120 }}>
          <DashboardBtn />
          <LearningBtn />
        </div>
      )}

      {/* ── Chat Mode Overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatMode && (
          <TalentChatMode
            key="chat-mode"
            onSend={handleSendChatMessage}
            sessionReady={connected}
            sections={sections}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
