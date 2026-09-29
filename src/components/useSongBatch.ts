"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isAbortError, requestLyrics } from "@/lib/client/api";
import type { LexiconEntry, Song, SubjectGender } from "@/lib/songs/types";
import type { VariationId } from "@/lib/songs/variations";

export type SongResult =
  | { readonly status: "loading" }
  | { readonly status: "done"; readonly song: Song }
  | { readonly status: "error"; readonly message: string };

export interface SongBrief {
  readonly text: string;
  readonly subjectGender: SubjectGender;
}

/**
 * Generates one song per variation in parallel. Each variation is an
 * independent request, so results appear as soon as each one is ready and
 * a failure affects only its own card.
 */
export function useSongBatch(accessCode: string, lexicon: readonly LexiconEntry[]) {
  const [results, setResults] = useState<ReadonlyMap<VariationId, SongResult>>(new Map());
  const controllers = useRef(new Map<VariationId, AbortController>());
  const lastBrief = useRef<SongBrief | null>(null);
  // Read at request time, so a regenerated song uses the spellings picked since.
  const latestLexicon = useRef(lexicon);
  useEffect(() => {
    latestLexicon.current = lexicon;
  }, [lexicon]);

  const setResult = useCallback((id: VariationId, result: SongResult) => {
    setResults((previous) => new Map(previous).set(id, result));
  }, []);

  const run = useCallback(
    async (id: VariationId, brief: SongBrief) => {
      controllers.current.get(id)?.abort();
      const controller = new AbortController();
      controllers.current.set(id, controller);
      setResult(id, { status: "loading" });

      try {
        const song = await requestLyrics(
          { ...brief, variationId: id, lexicon: [...latestLexicon.current] },
          accessCode,
          controller.signal,
        );
        setResult(id, { status: "done", song });
      } catch (error) {
        if (!isAbortError(error)) setResult(id, { status: "error", message: errorMessage(error) });
      } finally {
        if (controllers.current.get(id) === controller) controllers.current.delete(id);
      }
    },
    [accessCode, setResult],
  );

  const generate = useCallback(
    (ids: readonly VariationId[], brief: SongBrief) => {
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
      lastBrief.current = brief;
      setResults(new Map(ids.map((id) => [id, { status: "loading" }])));
      ids.forEach((id) => void run(id, brief));
    },
    [run],
  );

  const regenerate = useCallback(
    (id: VariationId) => {
      if (lastBrief.current) void run(id, lastBrief.current);
    },
    [run],
  );

  /** Replaces a finished song after the user edits it (e.g. a pronunciation fix). */
  const replaceSong = useCallback((id: VariationId, song: Song) => setResult(id, { status: "done", song }), [setResult]);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  const isBusy = [...results.values()].some((result) => result.status === "loading");

  return { results, generate, regenerate, replaceSong, isBusy };
}
