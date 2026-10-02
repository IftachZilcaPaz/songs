"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A yes/no preference kept in this browser's storage; falls back to `initial`
 * when storage is unavailable. `ready` turns true once storage has been read,
 * so a stored choice never flashes its default first.
 */
export function useStoredFlag(key: string, initial: boolean) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser-only storage after mount
      if (stored === "true" || stored === "false") setValue(stored === "true");
    } catch {
      // Storage unavailable (private mode): keep the default.
    }
    setReady(true);
  }, [key]);

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // Storage unavailable: the choice lasts for this visit only.
      }
    },
    [key],
  );

  return [value, update, ready] as const;
}
