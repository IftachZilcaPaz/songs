"use client";

import { useCallback } from "react";
import { asBareWord } from "@/lib/hebrew/lexicon";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import { isWordSayAs } from "@/lib/hebrew/say-as";
import type { FixRecord } from "@/lib/songs/memory-export";
import { MAX_AVOID_WORDS, MAX_PERSONAL_LEXICON_ENTRIES, type LexiconEntry } from "@/lib/songs/types";
import { useStoredList } from "./useStoredList";

function isEntry(value: unknown): value is LexiconEntry {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 3)) return false;
  const [bare, pointed, sayAs] = value as unknown[];
  return (
    typeof bare === "string" &&
    typeof pointed === "string" &&
    stripNiqqud(pointed) === bare &&
    (sayAs === undefined || (typeof sayAs === "string" && isWordSayAs(sayAs)))
  );
}

const MAX_HISTORY = 500;

function isFixRecord(value: unknown): value is FixRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.before === "string" &&
    typeof record.after === "string" &&
    typeof record.line === "string" &&
    (record.sayAs === undefined || typeof record.sayAs === "string")
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
  const history = useStoredList("songs.fixHistory", isFixRecord, MAX_HISTORY);
  const updateHistory = history.update;
  const updateSpellings = spellings.update;
  const updateAvoided = avoided.update;

  const save = useCallback(
    (pointed: string, sayAs?: string) => {
      const bare = stripNiqqud(pointed);
      const entry: LexiconEntry = sayAs && isWordSayAs(sayAs) ? [bare, pointed, sayAs] : [bare, pointed];
      updateSpellings((previous) => [...previous.filter(([word]) => word !== bare), entry]);
      updateAvoided((previous) => previous.filter((word) => word !== bare));
    },
    [updateSpellings, updateAvoided],
  );

  /** Logs every fix, remembered or not, so patterns can later become rules. */
  const record = useCallback((fix: FixRecord) => updateHistory((previous) => [...previous, fix]), [updateHistory]);

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

  return {
    entries: spellings.items,
    avoidWords: avoided.items,
    history: history.items,
    save,
    remove,
    avoid,
    unavoid,
    record,
  };
}
