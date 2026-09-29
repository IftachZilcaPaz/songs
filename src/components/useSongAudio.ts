"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isAbortError, requestAudio } from "@/lib/client/api";
import type { AudioMode, AudioRequest, Song, Vocal } from "@/lib/songs/types";

export type AudioState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly mode: AudioMode }
  | { readonly status: "ready"; readonly mode: AudioMode; readonly url: string }
  | { readonly status: "error"; readonly mode: AudioMode; readonly message: string };

/** Renders audio requests and owns the resulting object URL (revoked when replaced or unmounted). */
export function useAudioRender(accessCode: string) {
  const [state, setState] = useState<AudioState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);

  const releaseUrl = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);

  const render = useCallback(
    async (request: AudioRequest) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState({ status: "loading", mode: request.mode });

      try {
        const audio = await requestAudio(request, accessCode, current.signal);
        releaseUrl();
        objectUrl.current = URL.createObjectURL(audio);
        setState({ status: "ready", mode: request.mode, url: objectUrl.current });
      } catch (error) {
        if (!isAbortError(error)) setState({ status: "error", mode: request.mode, message: errorMessage(error) });
      }
    },
    [accessCode, releaseUrl],
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

/** The whole song, or its preview lines. */
export function songAudioRequest(song: Song, vocal: Vocal, mode: AudioMode): AudioRequest {
  return {
    variationId: song.variationId,
    mode,
    vocal,
    sections: song.sections.map(({ kind, voiceLines }) => ({ kind, voiceLines: [...voiceLines] })),
    previewVoiceLines: [...song.previewVoiceLines],
    musicStyles: [...song.musicStyles],
    seed: song.seed,
  };
}

/** A short clip of a single line, sung in the song's style: used to audition spellings. */
export function lineAudioRequest(song: Song, vocal: Vocal, line: string): AudioRequest {
  return {
    variationId: song.variationId,
    mode: "preview",
    vocal,
    sections: [{ kind: "chorus", voiceLines: [line] }],
    previewVoiceLines: [line],
    musicStyles: [...song.musicStyles],
    seed: song.seed,
  };
}
