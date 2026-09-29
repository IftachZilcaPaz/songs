import { applyLexicon, splitWords } from "@/lib/hebrew/lexicon";
import { removeDisallowedDagesh, stripNiqqud } from "@/lib/hebrew/niqqud";
import { collectPointedWords } from "@/lib/hebrew/voice-text";
import type { Song } from "./types";

/** Identifies one word in a song: the n-th Hebrew word of a line in a section. */
export interface WordLocation {
  readonly sectionIndex: number;
  readonly lineIndex: number;
  readonly wordIndex: number;
}

export type FixScope = "line" | "song";

export class InvalidSpellingError extends Error {
  constructor(word: string, spelling: string) {
    super(`"${spelling}" is not a spelling of "${word}"`);
    this.name = "InvalidSpellingError";
  }
}

export function getWordAt(song: Song, { sectionIndex, lineIndex, wordIndex }: WordLocation): string | undefined {
  const line = song.sections[sectionIndex]?.voiceLines[lineIndex];
  if (line === undefined) return undefined;
  return splitWords(line).filter((segment) => segment.isWord)[wordIndex]?.text;
}

/** Replaces the n-th Hebrew word of a line, leaving punctuation and spacing untouched. */
export function replaceWordInLine(line: string, wordIndex: number, replacement: string): string {
  let current = -1;
  return splitWords(line)
    .map((segment) => (segment.isWord && ++current === wordIndex ? replacement : segment.text))
    .join("");
}

/**
 * Applies a new voice spelling for a word, either at one location or to every
 * occurrence in the song (prefixed forms included). The spelling must keep the
 * same letters; the display text is re-derived so it never drifts.
 */
export function applyWordFix(song: Song, location: WordLocation, spelling: string, scope: FixScope): Song {
  const word = getWordAt(song, location);
  if (word === undefined) return song;

  const pointed = removeDisallowedDagesh(spelling.trim());
  const bare = stripNiqqud(word);
  if (stripNiqqud(pointed) !== bare) throw new InvalidSpellingError(word, spelling);

  const everywhere = new Map([[bare, pointed]]);
  const sections = song.sections.map((section, sectionIndex) => {
    const voiceLines = section.voiceLines.map((line, lineIndex) => {
      if (scope === "song") return applyLexicon(line, everywhere);
      const isTarget = sectionIndex === location.sectionIndex && lineIndex === location.lineIndex;
      return isTarget ? replaceWordInLine(line, location.wordIndex, pointed) : line;
    });
    return { ...section, voiceLines, displayLines: voiceLines.map(stripNiqqud) };
  });

  const previewVoiceLines = scope === "song" ? song.previewVoiceLines.map((line) => applyLexicon(line, everywhere)) : song.previewVoiceLines;

  return {
    ...song,
    sections,
    previewVoiceLines,
    pointedWords: collectPointedWords(sections.flatMap((section) => section.voiceLines)),
  };
}
