/**
 * Latin pronunciation ("say as") of Hebrew lyrics: syllables split by hyphens,
 * stressed syllables in capitals ("shak-shu-KA"). The singing engine follows it
 * alongside the pointed text.
 */

/** Bare Hebrew word -> confirmed Latin pronunciation. */
export type SayAsMap = ReadonlyMap<string, string>;

export const MAX_WORD_SAY_AS_LENGTH = 40;

/** Latin letters, syllable hyphens, spaces and light punctuation only: no Hebrew, no markup. */
const SAY_AS = /^[A-Za-z][A-Za-z' ,.!?-]*$/u;
const TRAILING_PUNCTUATION = /^(.*?)([,.!?]*)$/u;

export function isSayAs(text: string): boolean {
  return SAY_AS.test(text);
}

/** A single word's pronunciation: no spaces or punctuation, so it can replace one token of a line. */
export function isWordSayAs(text: string): boolean {
  return text.length <= MAX_WORD_SAY_AS_LENGTH && /^[A-Za-z][A-Za-z'-]*$/u.test(text);
}

/**
 * Puts the confirmed pronunciation of known words into a line's transliteration.
 * `words` are the line's bare Hebrew words; the transliteration must have one
 * token per word, otherwise it is returned unchanged rather than misaligned.
 */
export function enforceSayAs(words: readonly string[], sayAs: string, confirmed: SayAsMap): string {
  if (confirmed.size === 0) return sayAs;
  const tokens = sayAs.split(" ");
  if (tokens.length !== words.length) return sayAs;
  return tokens
    .map((token, index) => {
      const known = confirmed.get(words[index]!);
      if (!known) return token;
      const [, , punctuation = ""] = TRAILING_PUNCTUATION.exec(token) ?? [];
      return known + punctuation;
    })
    .join(" ");
}
