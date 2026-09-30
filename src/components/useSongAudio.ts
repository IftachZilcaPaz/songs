"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isAbortError, requestAudio, requestGuide } from "@/lib/client/api";
import { previewLines } from "@/lib/music/plan";
import type { AudioMode, AudioRequest, PronunciationGuide, Song, Vocal } from "@/lib/songs/types";

export type AudioState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly mode: AudioMode }
  | { readonly status: "ready"; readonly mode: AudioMode; readonly url: string }
  | { readonly status: "error"; readonly mode: AudioMode; readonly message: string };

/** How the engine is asked to sing, chosen once in the studio. */
export interface Singer {
  readonly vocal: Vocal;
  /** Also send each line's pronunciation in Latin letters (see pronunciationStyles). */
  readonly pronunciationGuide: boolean;
}

/**
 * Transliterations already written in this visit, keyed by the exact voice
 * line: a line is transliterated once, and a fixed line gets a fresh one.
 */
const guideCache = new Map<string, string>();

function sungLines(request: AudioRequest): readonly string[] {
  if (request.mode === "preview") return previewLines({ previewVoiceLines: request.previewVoiceLines ?? [], sections: request.sections });
  return request.sections.flatMap((section) => section.voiceLines);
}

async function pronunciationGuideFor(request: AudioRequest, accessCode: string, signal: AbortSignal): Promise<PronunciationGuide> {
  const lines = [...new Set(sungLines(request))];
  const missing = lines.filter((line) => !guideCache.has(line));
  if (missing.length > 0) {
    const written = await requestGuide({ lines: missing }, accessCode, signal);
    for (const [line, sayAs] of Object.entries(written)) guideCache.set(line, sayAs);
  }
  return Object.fromEntries(lines.flatMap((line) => {
    const sayAs = guideCache.get(line);
    return sayAs ? [[line, sayAs]] : [];
  }));
}

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
    async (request: AudioRequest, withGuide: boolean) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState({ status: "loading", mode: request.mode });

      try {
        const pronunciationGuide = withGuide ? await pronunciationGuideFor(request, accessCode, current.signal) : {};
        const audio = await requestAudio({ ...request, pronunciationGuide }, accessCode, current.signal);
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
