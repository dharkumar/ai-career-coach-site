'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useTeleSpeech } from "@/hooks/useTeleSpeech";
import type { GenerativeSection } from "@/types/flow";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  options?: string[];
  candidateData?: {
    name?: string;
    title?: string;
    avatarUrl?: string;
    experience?: Array<{ company: string; title?: string; role?: string }>;
    education?: Array<{ institution: string; degree: string }>;
  };
  template?: {
    templateId: string;
    props: Record<string, unknown>;
  };
}

interface ChatHistoryContextValue {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearHistory: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue>({
  messages: [],
  addMessage: () => {},
  clearHistory: () => {},
});

export function ChatHistoryProvider({
  children,
  sections = [],
}: {
  children: ReactNode;
  sections?: GenerativeSection[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { speech, isTalking } = useTeleSpeech();
  const prevIsTalkingRef = useRef(false);
  const chunkBufferRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedSpeechRef = useRef<string>("");
  const usedSectionIdsRef = useRef<Set<string>>(new Set());

  // Extract options from current sections - called when creating message
  const extractCurrentOptions = useCallback((): string[] => {
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (
        section.templateId === "GlassmorphicOptions" ||
        section.templateId === "MultiSelectOptions"
      ) {
        // Only use options from sections we haven't used yet
        if (!usedSectionIdsRef.current.has(section.id)) {
          const bubbles = section.props?.bubbles;
          if (Array.isArray(bubbles)) {
            const extractedOptions = bubbles.map((b: { label: string; value?: string }) =>
              b.value ?? b.label
            );
            // Mark this section as used
            usedSectionIdsRef.current.add(section.id);
            return extractedOptions;
          }
        }
      }
    }
    return [];
  }, [sections]);

  // Extract candidate data
  const extractCandidateData = useCallback(() => {
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      if (section.templateId === "CandidateSheet") {
        return {
          name: section.props?.name as string | undefined,
          title: section.props?.title as string | undefined,
          avatarUrl: section.props?.avatarUrl as string | undefined,
          experience: section.props?.experience as Array<{ company: string; title?: string; role?: string }> | undefined,
          education: section.props?.education as Array<{ institution: string; degree: string }> | undefined,
        };
      }
    }
    return null;
  }, [sections]);

  // Flush AI response to messages
  const flushResponse = useCallback(() => {
    const full = chunkBufferRef.current.join(" ").trim();
    chunkBufferRef.current = [];

    if (full && full !== lastProcessedSpeechRef.current) {
      lastProcessedSpeechRef.current = full;
      // Extract options at the moment of creating the message
      const options = extractCurrentOptions();
      const candidateData = extractCandidateData();
      const newMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: full,
        ...(options.length > 0 ? { options } : {}),
        ...(candidateData ? { candidateData } : {}),
      };
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === "assistant" && lastMsg.text === full) {
          return prev;
        }
        return [...prev, newMsg];
      });
      // Template extraction removed - now handled by section monitoring useEffect below
    }
  }, [extractCandidateData, extractCurrentOptions]);

  // Listen to AI speech and accumulate chunks
  useEffect(() => {
    if (isTalking) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (speech) chunkBufferRef.current.push(speech);
    }
    if (!isTalking && prevIsTalkingRef.current) {
      silenceTimerRef.current = setTimeout(flushResponse, 100);
    }
    prevIsTalkingRef.current = isTalking;
  }, [isTalking, speech, flushResponse]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // Monitor sections for templates - Simple, reliable approach
  useEffect(() => {
    const STANDALONE_TEMPLATES = [
      "RegistrationForm",
      "Dashboard",
      "ProfileSheet",
      "CardStack",
      "LoadingLinkedIn",
      "CandidateSheet",
    ];


    // Check each section for standalone templates
    sections.forEach((section) => {
      if (STANDALONE_TEMPLATES.includes(section.templateId)) {
        
        setMessages((prev) => {
          // Check if already added
          const exists = prev.some(m => 
            m.template?.templateId === section.templateId &&
            m.id.includes(section.id)
          );
          
          if (exists) {
  
            return prev;
          }
          
          
          return [...prev, {
            id: `template-${section.id}-${Date.now()}`,
            role: "assistant" as const,
            text: "",
            template: {
              templateId: section.templateId,
              props: section.props || {},
            },
          }];
        });
      }
    });
  }, [sections]);

  // Listen to user selection events
  useEffect(() => {
    const handleUserSelection = (event: Event) => {
      const customEvent = event as CustomEvent<{ selection: string }>;
      const selection = customEvent.detail?.selection;
      if (selection) {
        const userMsg: ChatMessage = {
          id: `u-${Date.now()}`,
          role: "user",
          text: selection,
        };
        setMessages((prev) => [...prev, userMsg]);
        lastProcessedSpeechRef.current = "";
        chunkBufferRef.current = [];
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
    };

    window.addEventListener("user-selection", handleUserSelection as EventListener);
    return () => {
      window.removeEventListener("user-selection", handleUserSelection as EventListener);
    };
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    lastProcessedSpeechRef.current = "";
    chunkBufferRef.current = [];
  }, []);

  return (
    <ChatHistoryContext.Provider value={{ messages, addMessage, clearHistory }}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  return useContext(ChatHistoryContext);
}
