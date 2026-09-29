"use client";

import { useCallback, useEffect, useState } from "react";

function read<T>(key: string, isItem: (value: unknown) => value is T): T[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: readonly T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage unavailable (private mode): the list lasts for this visit only.
  }
}

/**
 * A list kept in this browser's storage, validated on read and capped at
 * `max` items (the oldest are dropped first).
 */
export function useStoredList<T>(key: string, isItem: (value: unknown) => value is T, max: number) {
  const [items, setItems] = useState<readonly T[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser-only storage after mount
    setItems(read(key, isItem));
  }, [key, isItem]);

  const update = useCallback(
    (next: (previous: readonly T[]) => readonly T[]) => {
      setItems((previous) => {
        const updated = next(previous).slice(-max);
        write(key, updated);
        return updated;
      });
    },
    [key, max],
  );

  return { items, update };
}
