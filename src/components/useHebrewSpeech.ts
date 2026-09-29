"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const HEBREW = /^(he|iw)\b/i;

function hasSpeech(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function findHebrewVoice(): SpeechSynthesisVoice | undefined {
  return hasSpeech() ? window.speechSynthesis.getVoices().find((voice) => HEBREW.test(voice.lang)) : undefined;
}

// Browsers load voices asynchronously and announce them with `voiceschanged`.
function subscribe(onChange: () => void): () => void {
  if (!hasSpeech()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/**
 * Free, instant reading of voice text with the device's own Hebrew voice.
 * It checks what the niqqud says, not how the singing engine will sing it.
 */
export function useHebrewSpeech() {
  const supported = useSyncExternalStore(subscribe, () => Boolean(findHebrewVoice()), () => false);
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (hasSpeech()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (lines: readonly string[]) => {
      const voice = findHebrewVoice();
      if (!voice) return;
      window.speechSynthesis.cancel();
      lines.forEach((line, index) => {
        const utterance = new SpeechSynthesisUtterance(line);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.9;
        if (index === lines.length - 1) {
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
        }
        window.speechSynthesis.speak(utterance);
      });
      setSpeaking(lines.length > 0);
    },
    [],
  );

  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop };
}
