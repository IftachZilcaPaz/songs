import { HEBREW_LETTERS, HEBREW_MARKS, removeDisallowedDagesh, stripNiqqud } from "./niqqud";

/** Maps a bare (unpointed) word to its confirmed voice spelling. */
export type Lexicon = ReadonlyMap<string, string>;

/** One-letter prefixes that stay in front of a lexicon word ("ואחַת", "בנסוּ"). */
const PREFIX_LETTERS = new Set(["ה", "ו", "ב", "ל", "מ", "ש", "כ"]);
const MAX_PREFIX_LENGTH = 2;

const WORD_CHARS = `[${HEBREW_LETTERS}${HEBREW_MARKS}]+`;
/** A Hebrew word, including an inner geresh as in ג'ניפר. */
const WORD = new RegExp(`${WORD_CHARS}(?:['׳]${WORD_CHARS})*`, "gu");

export function tokenizeHebrewWords(text: string): string[] {
  return text.match(WORD) ?? [];
}

/**
 * Parses the lexicon file format: one `bare = pointed` entry per line.
 * Blank lines and lines starting with `#` are ignored.
 */
export function parseLexicon(source: string): Lexicon {
  const entries = new Map<string, string>();
  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const separator = line.indexOf("=");
    const bare = line.slice(0, separator).trim();
    const pointed = line.slice(separator + 1).trim();
    if (separator < 0 || !bare || !pointed) {
      throw new Error(`Invalid lexicon line ${index + 1}: "${rawLine}"`);
    }
    if (stripNiqqud(pointed) !== bare) {
      throw new Error(`Lexicon line ${index + 1}: "${pointed}" is not a pointed form of "${bare}"`);
    }
    entries.set(bare, pointed);
  });
  return entries;
}

/** Builds lexicon entries from pointed names, so a name is spelled the same way everywhere. */
export function lexiconFromPointedWords(words: readonly string[]): Lexicon {
  const entries = new Map<string, string>();
  for (const word of words.flatMap(tokenizeHebrewWords)) {
    const pointed = removeDisallowedDagesh(word);
    if (pointed !== stripNiqqud(pointed)) entries.set(stripNiqqud(pointed), pointed);
  }
  return entries;
}

/** Later lexicons win on conflicts. */
export function mergeLexicons(...lexicons: readonly Lexicon[]): Lexicon {
  return new Map(lexicons.flatMap((lexicon) => [...lexicon]));
}

function lookup(bare: string, lexicon: Lexicon): string | undefined {
  const exact = lexicon.get(bare);
  if (exact) return exact;

  for (let length = 1; length <= MAX_PREFIX_LENGTH && length < bare.length; length++) {
    const prefix = bare.slice(0, length);
    if (![...prefix].every((letter) => PREFIX_LETTERS.has(letter))) break;
    const match = lexicon.get(bare.slice(length));
    if (match) return prefix + match;
  }
  return undefined;
}

/** Replaces every word found in the lexicon (with or without a prefix) by its confirmed spelling. */
export function applyLexicon(text: string, lexicon: Lexicon): string {
  if (lexicon.size === 0) return text;
  return text.replace(WORD, (word) => lookup(stripNiqqud(word), lexicon) ?? word);
}
