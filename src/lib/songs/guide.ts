import { z } from "zod";
import { MAX_SAY_AS_LENGTH, type PronunciationGuide } from "./types";

export const GuideDraftSchema = z.object({
  lines: z.array(
    z.object({
      line: z.number().int().describe("Line number, as given in the input."),
      say_as: z.string().describe('How the line sounds in Latin letters, stressed syllables in capitals, e.g. "da-NA, da-NA, ha-YOM at bat ar-ba-IM".'),
    }),
  ),
});

export type GuideDraft = z.infer<typeof GuideDraftSchema>;

/** Latin letters, syllable hyphens, spaces and light punctuation only: no Hebrew, no markup. */
const SAY_AS = /^[A-Za-z][A-Za-z' ,.!?-]*$/u;

/**
 * Keeps only well-formed transliterations of lines that were actually asked
 * for, keyed by the exact voice line.
 */
export function toPronunciationGuide(draft: GuideDraft, lines: readonly string[]): PronunciationGuide {
  const guide: Record<string, string> = {};
  for (const { line, say_as } of draft.lines) {
    const voiceLine = lines[line];
    const sayAs = say_as.trim().replace(/\s+/gu, " ");
    if (voiceLine === undefined || voiceLine in guide || sayAs.length > MAX_SAY_AS_LENGTH || !SAY_AS.test(sayAs)) continue;
    guide[voiceLine] = sayAs;
  }
  return guide;
}
