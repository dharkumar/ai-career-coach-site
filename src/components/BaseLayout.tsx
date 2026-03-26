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
 * Persistent outer shell for template rendering.
 *
 * Templates rendered via DynamicSectionLoader float as children.
 * Background, BottomNav, and TeleSpeechBubble are now in root layout.tsx.
 */
export function BaseLayout({ children, sections = [] }: BaseLayoutProps) {
  const { connected } = useTeleState();
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
    <div data-testid="base-layout" className="relative w-screen h-[100svh] overflow-hidden">

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
