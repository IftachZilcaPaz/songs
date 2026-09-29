import { lexiconFromPointedWords, mergeLexicons, type Lexicon } from "@/lib/hebrew/lexicon";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import { collectPointedWords, findVoiceIssues, prepareVoiceLine } from "@/lib/hebrew/voice-text";
import type { SongDraft } from "./draft";
import type { Song, SongSection } from "./types";
import { getVariation, type VariationId } from "./variations";

const MAX_SECTIONS = 12;
const MAX_LINES_PER_SECTION = 30;
const MAX_LINE_LENGTH = 200;
const MAX_PREVIEW_LINES = 2;
const MAX_EXTRA_STYLES = 4;
const MAX_STYLE_LENGTH = 60;

export class EmptySongError extends Error {
  constructor() {
    super("The lyricist returned a song without lyrics");
    this.name = "EmptySongError";
  }
}

const unique = (values: readonly string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

function prepareLines(lines: readonly string[], lexicon: Lexicon, limit: number): string[] {
  return lines
    .map((line) => prepareVoiceLine(line, lexicon).slice(0, MAX_LINE_LENGTH).trim())
    .filter(Boolean)
    .slice(0, limit);
}

/**
 * Turns the model's draft into a Song: enforces the mechanical voice rules,
 * keeps names and confirmed words spelled consistently, and derives the
 * display text from the voice text so the two never drift apart.
 */
export function finalizeSong(draft: SongDraft, variationId: VariationId, baseLexicon: Lexicon, id: string): Song {
  // Confirmed-by-ear spellings take precedence over the model's pointing of names.
  const lexicon = mergeLexicons(lexiconFromPointedWords(draft.names), baseLexicon);

  const sections: SongSection[] = draft.sections
    .map((section) => {
      const voiceLines = prepareLines(section.lines, lexicon, MAX_LINES_PER_SECTION);
      return { kind: section.kind, voiceLines, displayLines: voiceLines.map(stripNiqqud) };
    })
    .filter((section) => section.voiceLines.length > 0)
    .slice(0, MAX_SECTIONS);

  if (sections.length === 0) throw new EmptySongError();

  const allVoiceLines = sections.flatMap((section) => section.voiceLines);
  const previewVoiceLines = prepareLines(draft.preview_lines, lexicon, MAX_PREVIEW_LINES);
  const fallbackPreview = (sections.find((section) => section.kind === "chorus") ?? sections[0]!).voiceLines;

  const extraStyles = draft.music_styles
    .map((style) => style.trim().slice(0, MAX_STYLE_LENGTH))
    .slice(0, MAX_EXTRA_STYLES);

  return {
    id,
    variationId,
    title: stripNiqqud(draft.title).trim() || "שיר בלי שם",
    sections,
    previewVoiceLines: previewVoiceLines.length > 0 ? previewVoiceLines : fallbackPreview.slice(0, MAX_PREVIEW_LINES),
    pointedWords: collectPointedWords(allVoiceLines),
    checkByEar: unique([...draft.names, ...draft.check_by_ear].map((word) => prepareVoiceLine(word, lexicon))),
    musicStyles: unique([...getVariation(variationId).musicStyles, ...extraStyles]),
    warnings: findVoiceIssues([...allVoiceLines, ...previewVoiceLines]),
  };
}
