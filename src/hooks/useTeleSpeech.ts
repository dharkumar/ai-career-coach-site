/**
 * useTeleSpeech — reads the shared avatar speech state from TeleSpeechContext.
 *
 * Previously this hook managed its own LiveKit listener, which meant every
 * component that called useTeleSpeech() got an independent isTalking=false
 * initial state. Components mounting mid-speech (e.g. GlassmorphicOptions,
 * rendered by navigateToSection while the avatar is already talking) would
 * miss the avatar_start_talking event and incorrectly treat the avatar as
 * silent, triggering the 700ms ready timer too early.
 *
 * Now the hook is a thin wrapper around TeleSpeechContext, which owns exactly
 * one LiveKit listener. All callers share the same isTalking value, so mounting
 * mid-speech correctly sees isTalking=true from the start.
 */

export type { TeleSpeechState } from "@/contexts/TeleSpeechContext";
export { useTeleSpeechContext as useTeleSpeech } from "@/contexts/TeleSpeechContext";
