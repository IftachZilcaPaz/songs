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

export interface TextSegment {
  readonly text: string;
  readonly isWord: boolean;
}

/** Splits text into Hebrew words and the separators between them; joining the segments restores the text. */
export function splitWords(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), isWord: false });
    segments.push({ text: match[0], isWord: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), isWord: false });
  return segments;
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

/**
 * Finds a known word in a bare token, either exactly or after up to two
 * one-letter prefixes (ה, ו, ב, ל, מ, ש, כ).
 */
export function matchWithPrefix<T>(bare: string, find: (word: string) => T | undefined): { prefix: string; match: T } | undefined {
  const exact = find(bare);
  if (exact !== undefined) return { prefix: "", match: exact };

  for (let length = 1; length <= MAX_PREFIX_LENGTH && length < bare.length; length++) {
    const prefix = bare.slice(0, length);
    if (![...prefix].every((letter) => PREFIX_LETTERS.has(letter))) break;
    const match = find(bare.slice(length));
    if (match !== undefined) return { prefix, match };
  }
  return undefined;
}

/** True when the bare token is one of the words, alone or after a one-letter prefix. */
export function containsWord(bare: string, words: ReadonlySet<string>): boolean {
  return matchWithPrefix(bare, (word) => (words.has(word) ? word : undefined)) !== undefined;
}

function lookup(bare: string, lexicon: Lexicon): string | undefined {
  const found = matchWithPrefix(bare, (word) => lexicon.get(word));
  return found && found.prefix + found.match;
}

/** Normalizes a single bare Hebrew word, or returns undefined if the input is not one. */
export function asBareWord(text: string): string | undefined {
  const tokens = tokenizeHebrewWords(stripNiqqud(text.trim()));
  return tokens.length === 1 && tokens[0] === stripNiqqud(text.trim()) ? tokens[0] : undefined;
}

/** Parses a word-list file: one bare Hebrew word per line; blank lines and `#` comments are ignored. */
export function parseWordList(source: string): ReadonlySet<string> {
  const words = new Set<string>();
  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const word = asBareWord(line);
    if (!word) throw new Error(`Word list line ${index + 1}: "${rawLine}" is not a single Hebrew word`);
    words.add(word);
  });
  return words;
}

/** Replaces every word found in the lexicon (with or without a prefix) by its confirmed spelling. */
export function applyLexicon(text: string, lexicon: Lexicon): string {
  if (lexicon.size === 0) return text;
  return text.replace(WORD, (word) => lookup(stripNiqqud(word), lexicon) ?? word);
}
