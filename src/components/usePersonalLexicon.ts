"use client";

import { useCallback, useEffect, useState } from "react";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import { MAX_PERSONAL_LEXICON_ENTRIES, type LexiconEntry } from "@/lib/songs/types";

const STORAGE_KEY = "songs.lexicon";

function isEntry(value: unknown): value is LexiconEntry {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string" &&
    stripNiqqud(value[1]) === value[0]
  );
}

function read(): LexiconEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function write(entries: readonly LexiconEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage unavailable (private mode): the dictionary lasts for this visit only.
  }
}

/**
 * Spellings the user picked by ear, kept in this browser and sent with every
 * new song so the same word is never mispronounced twice.
 */
export function usePersonalLexicon() {
  const [entries, setEntries] = useState<readonly LexiconEntry[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser-only storage after mount
    setEntries(read());
  }, []);

  const update = useCallback((next: (previous: readonly LexiconEntry[]) => LexiconEntry[]) => {
    setEntries((previous) => {
      const updated = next(previous);
      write(updated);
      return updated;
    });
  }, []);

  const save = useCallback(
    (pointed: string) => {
      const bare = stripNiqqud(pointed);
      update((previous) =>
        [...previous.filter(([word]) => word !== bare), [bare, pointed] as LexiconEntry].slice(-MAX_PERSONAL_LEXICON_ENTRIES),
      );
    },
    [update],
  );

  const remove = useCallback((bare: string) => update((previous) => previous.filter(([word]) => word !== bare)), [update]);

  return { entries, save, remove };
}
