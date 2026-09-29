import { z } from "zod";
import { splitWords, type Lexicon } from "@/lib/hebrew/lexicon";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import { collectPointedWords, prepareVoiceLine } from "@/lib/hebrew/voice-text";
import type { Song } from "./types";

export const ReviewDraftSchema = z.object({
  fixes: z
    .array(
      z.object({
        section: z.number().int().describe("Section number, as given in the input."),
        line: z.number().int().describe("Line number within the section, as given in the input."),
        voice: z.string().describe("The whole corrected line: same letters, spaces and punctuation; only niqqud changes."),
        reason: z.string().describe("Up to ten plain Hebrew words explaining the fix."),
      }),
    )
    .describe("Only the lines that need a change. Empty when the song is fine."),
});

export type ReviewDraft = z.infer<typeof ReviewDraftSchema>;

/** A validated, niqqud-only correction of one voice line. */
export interface LineFix {
  readonly sectionIndex: number;
  readonly lineIndex: number;
  readonly voiceLine: string;
  /** The words whose spelling changed, as they now appear in the line. */
  readonly words: readonly string[];
  readonly reason: string;
}

type SectionLines = readonly { readonly voiceLines: readonly string[] }[];

function changedWords(before: string, after: string): string[] {
  const beforeWords = splitWords(before).filter((segment) => segment.isWord);
  return splitWords(after)
    .filter((segment) => segment.isWord)
    .filter((segment, index) => segment.text !== beforeWords[index]?.text)
    .map((segment) => segment.text);
}

/**
 * Keeps only corrections that are safe to apply: the line exists, the letters
 * are unchanged (so the lyrics and rhymes stay exactly as written), and the
 * mechanical voice rules still hold after the change.
 */
export function toLineFixes(draft: ReviewDraft, sections: SectionLines, lexicon: Lexicon): LineFix[] {
  const seen = new Set<string>();
  const fixes: LineFix[] = [];

  for (const fix of draft.fixes) {
    const original = sections[fix.section]?.voiceLines[fix.line];
    const key = `${fix.section}:${fix.line}`;
    if (original === undefined || seen.has(key)) continue;

    const voiceLine = prepareVoiceLine(fix.voice, lexicon);
    if (voiceLine === original || stripNiqqud(voiceLine) !== stripNiqqud(original)) continue;

    seen.add(key);
    fixes.push({
      sectionIndex: fix.section,
      lineIndex: fix.line,
      voiceLine,
      words: changedWords(original, voiceLine),
      reason: fix.reason.trim().slice(0, 120),
    });
  }
  return fixes;
}

/** Applies line corrections to a song, including preview lines that quote a corrected line. */
export function applyLineFixes(song: Song, fixes: readonly LineFix[]): Song {
  if (fixes.length === 0) return song;

  const replacements = new Map<string, string>();
  const sections = song.sections.map((section, sectionIndex) => {
    const voiceLines = section.voiceLines.map((line, lineIndex) => {
      const fix = fixes.find((candidate) => candidate.sectionIndex === sectionIndex && candidate.lineIndex === lineIndex);
      if (!fix) return line;
      replacements.set(line, fix.voiceLine);
      return fix.voiceLine;
    });
    return { ...section, voiceLines, displayLines: voiceLines.map(stripNiqqud) };
  });

  return {
    ...song,
    sections,
    previewVoiceLines: song.previewVoiceLines.map((line) => replacements.get(line) ?? line),
    pointedWords: collectPointedWords(sections.flatMap((section) => section.voiceLines)),
  };
}
