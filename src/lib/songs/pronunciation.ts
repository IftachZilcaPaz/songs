import { z } from "zod";
import { removeDisallowedDagesh, stripNiqqud } from "@/lib/hebrew/niqqud";
import type { PronunciationOption } from "./types";

export const MAX_PRONUNCIATION_OPTIONS = 4;

export const PronunciationDraftSchema = z.object({
  options: z
    .array(
      z.object({
        spelling: z.string().describe("The same word, same letters, pointed to force one reading."),
        hint: z.string().describe("Up to eight Hebrew words: how this spelling should sound."),
        say_as: z.string().describe('Latin transliteration, stressed syllable in capitals, e.g. "shak-shu-KA".'),
      }),
    )
    .describe("Three or four distinct spellings, most likely correct first."),
});

export type PronunciationDraft = z.infer<typeof PronunciationDraftSchema>;

/**
 * Keeps only usable options: same letters as the original word, dagesh rules
 * enforced, no duplicates, and different from the spelling the user rejected.
 */
export function toPronunciationOptions(draft: PronunciationDraft, word: string): PronunciationOption[] {
  const bare = stripNiqqud(word);
  const seen = new Set([word]);
  const options: PronunciationOption[] = [];

  for (const option of draft.options) {
    const spelling = removeDisallowedDagesh(option.spelling.trim());
    if (stripNiqqud(spelling) !== bare || seen.has(spelling)) continue;
    seen.add(spelling);
    options.push({ spelling, hint: option.hint.trim().slice(0, 80), sayAs: option.say_as.trim().slice(0, 40) });
  }
  return options.slice(0, MAX_PRONUNCIATION_OPTIONS);
}
