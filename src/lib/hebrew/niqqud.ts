/**
 * Low-level Hebrew niqqud utilities.
 *
 * "Marks" are the points and cantillation signs that attach to a letter.
 * Punctuation-like signs in the Hebrew block (maqaf U+05BE, paseq U+05C0,
 * sof pasuq U+05C3, nun hafukha U+05C6) are deliberately excluded.
 */

export const HEBREW_LETTERS = "א-ת";
export const HEBREW_MARKS = "֑-ׇֽֿׁׂׅׄ";

const DAGESH = "ּ";
/** Letters where a dagesh changes the sound (b/v, k/kh, p/f) and is therefore allowed. */
const HARD_SOUND_LETTERS = new Set(["ב", "כ", "ך", "פ", "ף"]);
const VAV = "ו";
/** Vowel points (sheva through qubuts, plus qamats qatan). */
const VOWEL_POINT = /[ְ-ׇֻ]/u;

const MARKS_GLOBAL = new RegExp(`[${HEBREW_MARKS}]`, "gu");
const MARK_SINGLE = new RegExp(`[${HEBREW_MARKS}]`, "u");
const LETTER_WITH_MARKS = new RegExp(`([${HEBREW_LETTERS}])([${HEBREW_MARKS}]+)`, "gu");

export function stripNiqqud(text: string): string {
  return text.replace(MARKS_GLOBAL, "");
}

export function hasNiqqud(text: string): boolean {
  return MARK_SINGLE.test(text);
}

/**
 * Removes every dagesh except where it changes the sound (בּ כּ פּ) and keeps
 * shuruk (וּ), which is a vowel rather than a dagesh. A dagesh elsewhere makes
 * voice engines move the stress to the wrong syllable.
 */
export function removeDisallowedDagesh(text: string): string {
  return text.replace(LETTER_WITH_MARKS, (cluster, letter: string, marks: string) => {
    if (!marks.includes(DAGESH) || HARD_SOUND_LETTERS.has(letter)) return cluster;
    const isShuruk = letter === VAV && !VOWEL_POINT.test(marks);
    return isShuruk ? cluster : letter + marks.replaceAll(DAGESH, "");
  });
}
