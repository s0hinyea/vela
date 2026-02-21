/**
 * useVoicePlayer — plays cached ElevenLabs audio or falls back to device TTS.
 *
 * Usage:
 *   const { play, stop, isPlaying } = useVoicePlayer();
 *   play({ audioUrl, fallbackText });
 *
 * When ElevenLabs is integrated:
 *   - audioUrl will be a real URL from the backend (pre-generated at medication save time)
 *   - The hook loads and plays it via expo-av
 *
 * Before integration (demo mode):
 *   - audioUrl is null → falls back to expo-speech (device TTS)
 *   - Still sounds good enough for a demo
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

interface PlayOptions {
  /** URL to a cached ElevenLabs audio file. null = use TTS fallback */
  audioUrl: string | null;
  /** Text to speak if audioUrl is unavailable */
  fallbackText: string;
}

export function useVoicePlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      Speech.stop();
    };
  }, []);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    Speech.stop();
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async ({ audioUrl, fallbackText }: PlayOptions) => {
      // Stop anything currently playing
      await stop();

      setIsPlaying(true);

      try {
        if (audioUrl) {
          // ─── ElevenLabs audio (production path) ───────────────────────
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });

          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: true, volume: 1.0 }
          );
          soundRef.current = sound;

          // Listen for playback completion
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
              sound.unloadAsync();
              soundRef.current = null;
            }
          });
        } else {
          // ─── TTS fallback (demo mode) ────────────────────────────────
          Speech.speak(fallbackText, {
            language: "en-US",
            pitch: 1.0,
            rate: 0.85, // Slightly slower for seniors
            onDone: () => setIsPlaying(false),
            onStopped: () => setIsPlaying(false),
            onError: () => setIsPlaying(false),
          });
        }
      } catch (error) {
        console.error("Voice playback error:", error);
        setIsPlaying(false);
      }
    },
    [stop]
  );

  return { play, stop, isPlaying };
}
