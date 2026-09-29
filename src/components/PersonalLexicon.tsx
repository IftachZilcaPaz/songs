"use client";

import type { LexiconEntry } from "@/lib/songs/types";

interface PersonalLexiconProps {
  readonly entries: readonly LexiconEntry[];
  readonly onRemove: (bare: string) => void;
}

/** The spellings this browser remembers; each new song applies them automatically. */
export function PersonalLexicon({ entries, onRemove }: PersonalLexiconProps) {
  if (entries.length === 0) return null;
  return (
    <details className="panel lexicon">
      <summary>המילון שלי ({entries.length.toLocaleString("he-IL")})</summary>
      <p className="field__meta">כתיבים שבחרתם באוזן. כל שיר חדש משתמש בהם אוטומטית.</p>
      <ul className="lexicon__list">
        {entries.map(([bare, pointed]) => (
          <li key={bare} className="lexicon__item">
            <span>{bare}</span>
            <span aria-hidden="true">←</span>
            <span className="lexicon__pointed">{pointed}</span>
            <button type="button" className="button button--ghost" onClick={() => onRemove(bare)} aria-label={`הסרת ${bare}`}>
              הסרה
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
