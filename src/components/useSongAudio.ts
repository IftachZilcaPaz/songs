"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isAbortError, requestAudio } from "@/lib/client/api";
import type { AudioMode, Song, Vocal } from "@/lib/songs/types";

export type AudioState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly mode: AudioMode }
  | { readonly status: "ready"; readonly mode: AudioMode; readonly url: string }
  | { readonly status: "error"; readonly mode: AudioMode; readonly message: string };

/** Renders a song (or a short preview of it) to audio and owns the resulting object URL. */
export function useSongAudio(song: Song, vocal: Vocal, accessCode: string) {
  const [state, setState] = useState<AudioState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);

  const releaseUrl = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);

  const render = useCallback(
    async (mode: AudioMode) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState({ status: "loading", mode });

      try {
        const audio = await requestAudio(
          {
            variationId: song.variationId,
            mode,
            vocal,
            sections: song.sections.map(({ kind, voiceLines }) => ({ kind, voiceLines: [...voiceLines] })),
            previewVoiceLines: [...song.previewVoiceLines],
            musicStyles: [...song.musicStyles],
          },
          accessCode,
          current.signal,
        );
        releaseUrl();
        objectUrl.current = URL.createObjectURL(audio);
        setState({ status: "ready", mode, url: objectUrl.current });
      } catch (error) {
        if (!isAbortError(error)) setState({ status: "error", mode, message: errorMessage(error) });
      }
    },
    [song, vocal, accessCode, releaseUrl],
  );

  useEffect(
    () => () => {
      controller.current?.abort();
      releaseUrl();
    },
    [releaseUrl],
  );

  return { state, render };
}
