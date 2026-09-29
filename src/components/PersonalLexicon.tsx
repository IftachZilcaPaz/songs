"use client";

import type { LexiconEntry } from "@/lib/songs/types";

interface PersonalLexiconProps {
  readonly entries: readonly LexiconEntry[];
  readonly avoidWords: readonly string[];
  readonly onRemove: (bare: string) => void;
  readonly onUnavoid: (bare: string) => void;
}

/** What this browser has learned by ear; every new song applies it automatically. */
export function PersonalLexicon({ entries, avoidWords, onRemove, onUnavoid }: PersonalLexiconProps) {
  const total = entries.length + avoidWords.length;
  if (total === 0) return null;

  return (
    <details className="panel lexicon">
      <summary>המילון שלי ({total.toLocaleString("he-IL")})</summary>

      {entries.length > 0 && (
        <section className="lexicon__group">
          <h2 className="lexicon__title">כתיבים שבחרתם באוזן</h2>
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
        </section>
      )}

      {avoidWords.length > 0 && (
        <section className="lexicon__group">
          <h2 className="lexicon__title">מילים שלא ייכנסו לשירים חדשים</h2>
          <ul className="lexicon__list">
            {avoidWords.map((word) => (
              <li key={word} className="lexicon__item">
                <span className="lexicon__pointed">{word}</span>
                <button type="button" className="button button--ghost" onClick={() => onUnavoid(word)} aria-label={`החזרת ${word}`}>
                  החזרה
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </details>
  );
}
