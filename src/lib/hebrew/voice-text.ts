import { applyLexicon, matchWithPrefix, tokenizeHebrewWords, type Lexicon } from "./lexicon";
import { hasNiqqud, removeDisallowedDagesh, stripNiqqud } from "./niqqud";

const LONG_DASH = /\s*[–—]\s*/gu;
const DIGITS = /\d+(?:[.,]\d+)*/gu;
const LATIN_WORD = /[A-Za-z][A-Za-z'-]*/gu;

/**
 * Enforces the mechanical voice rules on a single line: no long dash,
 * dagesh only where it changes the sound, and confirmed lexicon spellings.
 */
export function prepareVoiceLine(line: string, lexicon: Lexicon): string {
  const withoutDashes = line.replace(LONG_DASH, ", ");
  return applyLexicon(removeDisallowedDagesh(withoutDashes), lexicon)
    .replace(/\s+/gu, " ")
    .replace(/^[,\s]+|[,\s]+$/gu, "")
    .trim();
}

export function collectPointedWords(lines: readonly string[]): string[] {
  const words = lines.flatMap(tokenizeHebrewWords).filter(hasNiqqud);
  return [...new Set(words)];
}

/** Words from the avoid list that appear in the lines (with or without a prefix), in their bare form. */
export function findAvoidedWords(lines: readonly string[], avoid: ReadonlySet<string>): string[] {
  if (avoid.size === 0) return [];
  const found = lines
    .flatMap(tokenizeHebrewWords)
    .map((word) => matchWithPrefix(stripNiqqud(word), (candidate) => (avoid.has(candidate) ? candidate : undefined))?.match)
    .filter((word): word is string => word !== undefined);
  return [...new Set(found)];
}

/** Human-readable (Hebrew) warnings for rule violations that cannot be fixed mechanically. */
export function findVoiceIssues(lines: readonly string[]): string[] {
  const text = lines.join("\n");
  const unique = (matches: RegExpMatchArray | null) => [...new Set(matches ?? [])];

  const warnings: string[] = [];
  const digits = unique(text.match(DIGITS));
  if (digits.length > 0) {
    warnings.push(`יש מספרים בספרות (${digits.join(", ")}). כדאי לכתוב אותם במילים.`);
  }
  const latin = unique(text.match(LATIN_WORD));
  if (latin.length > 0) {
    warnings.push(`יש מילים באותיות לועזיות (${latin.join(", ")}). כדאי לכתוב אותן באותיות עבריות.`);
  }
  return warnings;
}
