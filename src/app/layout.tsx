import type { Metadata } from 'next';
import './globals.css';
import { VoiceSessionProvider } from '@/components/voice/VoiceSessionProvider';
import { BackgroundLayer } from '@/components/voice/BackgroundLayer';
import { SceneLayout } from '@/components/voice/SceneLayout';
import { BottomNav } from '@/components/BottomNav';
import { TeleSpeechBubble } from '@/components/TeleSpeechBubble';
import { DevToolbar } from '@/components/DevToolbar';
import { ChatPanel } from '@/components/voice/ChatPanel';
import { TeleSpeechProvider } from '@/contexts/TeleSpeechContext';

const agentName = process.env.NEXT_PUBLIC_AGENT_NAME || 'AI Assistant';

export const metadata: Metadata = {
  title: agentName,
  description: `Talk to ${agentName} - powered by Mobeus`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <VoiceSessionProvider>
          <TeleSpeechProvider>
            <BackgroundLayer />
            <TeleSpeechBubble />
            <div id="scene-root" className="relative z-[2] h-dvh">
              <SceneLayout>{children}</SceneLayout>
            </div>
            <div 
              className="flex flex-col items-center gap-2"
              style={{
                position: 'fixed',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: 'calc(12px + env(safe-area-inset-bottom, 0px) + var(--vv-bottom-inset, 0px))',
                zIndex: 100,
              }}
            >
              <DevToolbar />
              <BottomNav />
            </div>
            <ChatPanel />
          </TeleSpeechProvider>
        </VoiceSessionProvider>
      </body>
    </html>
  );
}
