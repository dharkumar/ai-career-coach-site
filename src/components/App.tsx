'use client';

import { usePhaseFlow } from "@/hooks/usePhaseFlow";
import { DynamicSectionLoader } from "@/components/DynamicSectionLoader";
import { BaseLayout } from "@/components/BaseLayout";
import { CurrentSectionProvider } from "@/contexts/CurrentSectionContext";
import { ChatHistoryProvider } from "@/contexts/ChatHistoryContext";

/**
 * Main app — renders talent AI journey.
 */
export default function App() {
  const { generativeSubsections } = usePhaseFlow();

  const lastSection = generativeSubsections[generativeSubsections.length - 1];
  const currentTemplateId = lastSection?.templateId;
  const currentSectionId = lastSection?.id;

  return (
    <ChatHistoryProvider sections={generativeSubsections}>
      <CurrentSectionProvider
        currentTemplateId={currentTemplateId}
        currentSectionId={currentSectionId}
      >
        <BaseLayout sections={generativeSubsections}>
          <DynamicSectionLoader sections={generativeSubsections} />
        </BaseLayout>
      </CurrentSectionProvider>
    </ChatHistoryProvider>
  );
}
