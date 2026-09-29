import type { LexiconEntry } from "./types";

/** One pronunciation fix the user made by ear. */
export interface FixRecord {
  /** The word as it was in the voice line. */
  readonly before: string;
  /** The spelling the user picked. */
  readonly after: string;
  /** The line it was in, without niqqud, for context. */
  readonly line: string;
}

export interface PronunciationMemoryExport {
  readonly lexicon: readonly LexiconEntry[];
  readonly avoidWords: readonly string[];
  readonly history: readonly FixRecord[];
}

/**
 * Plain-text export of everything learned by ear. The first block uses the
 * rules/voice-lexicon.txt format and the second the rules/avoid-words.txt
 * format, so both can be pasted straight into the shared files.
 */
export function formatMemoryExport({ lexicon, avoidWords, history }: PronunciationMemoryExport): string {
  return [
    "# כתיבים שנבחרו באוזן (פורמט rules/voice-lexicon.txt)",
    ...lexicon.map(([bare, pointed]) => `${bare} = ${pointed}`),
    "",
    "# מילים שאף כתיב שלהן לא עבד (פורמט rules/avoid-words.txt)",
    ...avoidWords,
    "",
    "# היסטוריית תיקונים: לפני ← אחרי | השורה",
    ...history.map(({ before, after, line }) => `${before} ← ${after} | ${line}`),
  ].join("\n");
}
