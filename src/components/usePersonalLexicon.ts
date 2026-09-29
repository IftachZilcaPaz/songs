"use client";

import { useCallback } from "react";
import { asBareWord } from "@/lib/hebrew/lexicon";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import { MAX_AVOID_WORDS, MAX_PERSONAL_LEXICON_ENTRIES, type LexiconEntry } from "@/lib/songs/types";
import { useStoredList } from "./useStoredList";

function isEntry(value: unknown): value is LexiconEntry {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string" &&
    stripNiqqud(value[1]) === value[0]
  );
}

function isAvoidWord(value: unknown): value is string {
  return typeof value === "string" && asBareWord(value) === value;
}

/**
 * What this browser has learned by ear, sent with every new song:
 * spellings that sounded right, and words the engine could not sing at all.
 */
export function usePersonalLexicon() {
  const spellings = useStoredList("songs.lexicon", isEntry, MAX_PERSONAL_LEXICON_ENTRIES);
  const avoided = useStoredList("songs.avoidWords", isAvoidWord, MAX_AVOID_WORDS);
  const updateSpellings = spellings.update;
  const updateAvoided = avoided.update;

  const save = useCallback(
    (pointed: string) => {
      const bare = stripNiqqud(pointed);
      updateSpellings((previous) => [...previous.filter(([word]) => word !== bare), [bare, pointed]]);
      updateAvoided((previous) => previous.filter((word) => word !== bare));
    },
    [updateSpellings, updateAvoided],
  );

  const remove = useCallback(
    (bare: string) => updateSpellings((previous) => previous.filter(([word]) => word !== bare)),
    [updateSpellings],
  );

  const avoid = useCallback(
    (word: string) => {
      const bare = asBareWord(word);
      if (!bare) return;
      updateAvoided((previous) => [...previous.filter((existing) => existing !== bare), bare]);
      updateSpellings((previous) => previous.filter(([existing]) => existing !== bare));
    },
    [updateAvoided, updateSpellings],
  );

  const unavoid = useCallback(
    (bare: string) => updateAvoided((previous) => previous.filter((word) => word !== bare)),
    [updateAvoided],
  );

  return { entries: spellings.items, avoidWords: avoided.items, save, remove, avoid, unavoid };
}
