'use client';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

/**
 * Initial app state shown before the Runtime Agent connects.
 * Shows "TAP BELOW TO BEGIN" hint text over the static avatar background.
 *
 * The AI immediately replaces this with template components on first connection.
 */
export function WelcomeLanding() {
  const sessionState = useVoiceSessionStore((s) => s.sessionState);
  const connected = sessionState === 'connected';

  return (
    <div
      data-testid="welcome-landing"
      className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none"
      style={{
        paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px) + var(--vv-bottom-inset, 0px))',
      }}
    >
      {/* Show hint text only when not connected */}
      {!connected && (
        <p
          className="text-center text-sm font-medium tracking-wider uppercase"
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          TAP BELOW TO BEGIN
        </p>
      )}
    </div>
  );
}
