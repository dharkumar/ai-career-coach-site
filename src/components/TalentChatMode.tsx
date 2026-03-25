'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Loader2, Plus, Mic } from "lucide-react";
import { useChatHistory, type ChatMessage } from "@/contexts/ChatHistoryContext";
import { MiniProgress } from "@/components/MiniProgress";
import { TEMPLATE_REGISTRY } from "@/data/templateRegistry";
import { sendSelectionIntent } from "@/utils/teleIntent";
import type { GenerativeSection } from "@/types/flow";

interface TalentChatModeProps {
  onSend: (text: string) => void;
  sessionReady?: boolean;
  sections: GenerativeSection[];
}

function ChatInputBar({
  onSend,
  waiting = false,
  placeholder = "Type your message",
}: {
  onSend: (text: string) => void;
  waiting?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const msg = value.trim();
    if (!msg || waiting) return;
    onSend(msg);
    setValue("");
  };

  return (
    <div
      className="rounded-full overflow-hidden w-full flex items-center gap-2 px-4 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <input
        type="text"
        value={value}
        disabled={waiting}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none disabled:cursor-wait"
      />
      <div className="flex items-center gap-2">
        <button
          className="flex items-center justify-center hover:opacity-70 transition-opacity"
          aria-label="Voice input"
        >
          <img src="/icons/mic.svg" alt="Microphone" className="w-6 h-6" />
        </button>
        <AnimatePresence mode="wait">
          {waiting ? (
            <motion.div
              key="spin"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
            >
              <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
            </motion.div>
          ) : (
            <motion.button
              key="send"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={submit}
              disabled={!value.trim()}
              className="flex items-center justify-center transition-opacity disabled:opacity-50"
              aria-label="Send message"
            >
              <img src="/icons/send-icon.svg" alt="Send" className="w-8 h-8" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: NonNullable<ChatMessage["template"]> }) {
  const TemplateComponent = TEMPLATE_REGISTRY[template.templateId];
  
  if (!TemplateComponent) {
    console.warn(`Template ${template.templateId} not found in registry`);
    return null;
  }

  return (
    <div className="mt-3 w-full">
      <Suspense fallback={
        <div className="rounded-2xl p-8 flex items-center justify-center" style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          <Loader2 className="animate-spin text-white/50" size={24} />
        </div>
      }>
        {/* Chat mode wrapper - converts absolute overlay templates to inline cards */}
        <div 
          className="chat-mode-template-wrapper"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '500px',
          }}
        >
          <style>{`
            .chat-mode-template-wrapper > div {
              position: static !important;
              inset: auto !important;
            }
            .chat-mode-template-wrapper form {
              position: static !important;
              inset: auto !important;
              top: auto !important;
              left: auto !important;
              right: auto !important;
              bottom: auto !important;
            }
          `}</style>
          <TemplateComponent {...template.props} />
        </div>
      </Suspense>
    </div>
  );
}

function CandidateDataCard({ data }: { data: NonNullable<ChatMessage["candidateData"]> }) {
  const initials = data.name
    ? data.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "";

  return (
    <div
      className="rounded-2xl p-4 mt-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Header with avatar and name */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ background: "var(--accent)" }}
        >
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt={data.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-black">{initials}</span>
          )}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{data.name}</p>
          {data.title && <p className="text-white/60 text-xs mt-0.5">{data.title}</p>}
        </div>
      </div>

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <div className="mb-3">
          <p className="text-white/80 text-xs font-semibold mb-2">Work Experience</p>
          {data.experience.map((exp, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <p className="text-white/70 text-xs">{exp.title || exp.role}</p>
              <p className="text-white/50 text-xs">{exp.company}</p>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div>
          <p className="text-white/80 text-xs font-semibold mb-2">Education</p>
          {data.education.map((edu, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <p className="text-white/70 text-xs">{edu.degree}</p>
              <p className="text-white/50 text-xs">{edu.institution}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatView({
  messages,
  isTyping,
  onSend,
  onOptionClick,
  sessionReady = true,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string) => void;
  onOptionClick: (option: string) => void;
  sessionReady?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="px-5 sm:px-12 pt-4 pb-3 flex justify-center">
        <MiniProgress step={0} total={4} />
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 sm:px-12 pt-6 pb-24 space-y-5"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div
                    className="inline-flex items-center justify-center gap-2 rounded-full text-base font-normal leading-5"
                    style={{
                      padding: "12px 16px",
                      background: "rgba(39, 39, 42, 0.5)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <p className="text-white">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start flex-col gap-3 max-w-[520px]">
                  {/* Only show text if it's not empty (template-only messages have no text) */}
                  {msg.text && <p className="chat-message-body text-sm leading-relaxed">{msg.text}</p>}
                  
                  {/* Candidate Data Card */}
                  {msg.candidateData && <CandidateDataCard data={msg.candidateData} />}
                  
                  {/* Template Card (RegistrationForm, Dashboard, etc.) - THIS WAS MISSING! */}
                  {msg.template && <TemplateCard template={msg.template} />}
                  
                  {/* Options (industry chips: white text, white border, dark bg per screenshot) */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => onOptionClick(option)}
                          className="chat-option-chip rounded-full text-base font-normal hover:opacity-90 transition-opacity"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1.5 py-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/35 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-20 px-5 sm:px-12 pt-3 flex-shrink-0 safe-bottom" style={{ paddingBottom: "max(80px, calc(72px + env(safe-area-inset-bottom, 0px)))" }}>
        <ChatInputBar
          onSend={onSend}
          waiting={isTyping || !sessionReady}
          placeholder={!sessionReady ? "Connecting to AI…" : "Type your message"}
        />
      </div>
    </div>
  );
}

export function TalentChatMode({ onSend, sessionReady = true, sections }: TalentChatModeProps) {
  const { messages, addMessage } = useChatHistory();
  const [isTyping, setIsTyping] = useState(false);

  // Mute all audio/video and hide avatar when chat mode is active
  useEffect(() => {
    const muteElement = (el: HTMLMediaElement) => {
      el.muted = true;
      el.volume = 0;
    };

    const muteAllMedia = () => {
      document.querySelectorAll("audio, video").forEach((el) => {
        muteElement(el as HTMLMediaElement);
      });
    };

    const hideAvatarLayers = () => {
      // Hide avatar video layer
      const bgLayer = document.querySelector('[data-layer="bg"]') as HTMLElement;
      if (bgLayer) {
        bgLayer.style.display = 'none';
      }
      
      const fw = (window as any).UIFramework;
      if (!fw) return;
      
      // Mute avatar audio (call once)
      if (typeof fw.setAvatarVolume === "function") {
        (fw.setAvatarVolume as (v: number) => void)(0);
      }
      if (typeof fw.setAvatarVideoMuted === "function") {
        (fw.setAvatarVideoMuted as (v: boolean) => void)(true);
      }
      
      // Hide background layer
      if (typeof fw.hideBgLayer === "function") {
        (fw.hideBgLayer as () => void)();
      }
      
      // Disable lightboard effect
      if (typeof fw.deactivateVisualInversion === "function") {
        (fw.deactivateVisualInversion as () => void)();
      }
    };

    // Initial mute - call once on mount
    muteAllMedia();
    hideAvatarLayers();

    // Watch for new audio/video elements being added to the DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLMediaElement) {
            muteElement(node);
          } else if (node instanceof HTMLElement) {
            // Check if the added element contains audio/video elements
            node.querySelectorAll("audio, video").forEach((el) => {
              muteElement(el as HTMLMediaElement);
            });
          }
        });
      }
    });

    // Observe the entire document for new media elements
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      
      // Restore avatar visibility when exiting chat mode
      const bgLayer = document.querySelector('[data-layer="bg"]') as HTMLElement;
      if (bgLayer) {
        bgLayer.style.display = '';
      }
    };
  }, []);

  // Monitor typing state from context
  useEffect(() => {
    // We can detect if AI is responding by checking if there's a recent user message
    // without a following assistant message
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 5000);
        return () => clearTimeout(timer);
      } else {
        setIsTyping(false);
      }
    }
  }, [messages]);

  const handleSend = useCallback(
    (text: string) => {
      addMessage({ id: `u-${Date.now()}`, role: "user", text });
      setIsTyping(true);
      onSend(text);
    },
    [onSend, addMessage]
  );

  const handleOptionClick = useCallback(
    (option: string) => {
      handleSend(option);
    },
    [handleSend]
  );

  return (
    <motion.div
      key="talent-chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-[55] flex flex-col overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Ellipse glow (5th screenshot) – behind content */}
      <div className="chat-mode-ellipse" aria-hidden="true" />
      {/* Gradient overlay (1st screenshot) – bottom darkening */}
      <div className="chat-mode-gradient-overlay" aria-hidden="true" />
      {/* Chat content wrapper – ensures content sits above decorative layers */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <ChatView
          messages={messages}
          isTyping={isTyping}
          onSend={handleSend}
          onOptionClick={handleOptionClick}
          sessionReady={sessionReady}
        />
      </div>
    </motion.div>
  );
}
