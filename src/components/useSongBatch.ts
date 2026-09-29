"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isAbortError, requestLyrics, requestReview } from "@/lib/client/api";
import { applyLineFixes, type LineFix } from "@/lib/songs/review";
import type { LexiconEntry, Song, SubjectGender } from "@/lib/songs/types";
import type { VariationId } from "@/lib/songs/variations";

export type ReviewState =
  | { readonly status: "running" }
  | { readonly status: "done"; readonly fixes: readonly LineFix[] }
  | { readonly status: "failed"; readonly message: string };

export type SongResult =
  | { readonly status: "loading" }
  | { readonly status: "done"; readonly song: Song; readonly review: ReviewState }
  | { readonly status: "error"; readonly message: string };

export interface SongBrief {
  readonly text: string;
  readonly subjectGender: SubjectGender;
}

/**
 * Generates one song per variation in parallel, then proofreads each song's
 * pronunciation before any audio is rendered. Each variation is independent,
 * so results appear as soon as they are ready and a failure affects only its
 * own card.
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
      const personalLexicon = [...latestLexicon.current];

      try {
        let song: Song;
        try {
          song = await requestLyrics({ ...brief, variationId: id, lexicon: personalLexicon }, accessCode, controller.signal);
        } catch (error) {
          if (!isAbortError(error)) setResult(id, { status: "error", message: errorMessage(error) });
          return;
        }
        setResult(id, { status: "done", song, review: { status: "running" } });

        try {
          const sections = song.sections.map(({ voiceLines }) => ({ voiceLines: [...voiceLines] }));
          const { fixes } = await requestReview({ ...brief, sections, lexicon: personalLexicon }, accessCode, controller.signal);
          setResult(id, { status: "done", song: applyLineFixes(song, fixes), review: { status: "done", fixes } });
        } catch (error) {
          if (!isAbortError(error)) setResult(id, { status: "done", song, review: { status: "failed", message: errorMessage(error) } });
        }
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

  /** Replaces a finished song after the user edits it (e.g. a pronunciation fix), keeping its review. */
  const replaceSong = useCallback((id: VariationId, song: Song) => {
    setResults((previous) => {
      const current = previous.get(id);
      return current?.status === "done" ? new Map(previous).set(id, { ...current, song }) : previous;
    });
  }, []);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  const isBusy = [...results.values()].some((result) => result.status === "loading");

  return { results, generate, regenerate, replaceSong, isBusy };
}
