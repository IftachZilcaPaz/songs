import "server-only";
import { tokenizeHebrewWords } from "@/lib/hebrew/lexicon";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import type { SayAsMap } from "@/lib/hebrew/say-as";
import { GuideDraftSchema, toPronunciationGuide } from "@/lib/songs/guide";
import { buildGuideSystemPrompt, buildGuideUserPrompt } from "@/lib/songs/prompt";
import type { LexiconEntry, PronunciationGuide } from "@/lib/songs/types";
import { askClaude } from "./claude";
import { effectiveSayAs, getVoiceRules } from "./voice-rules";

/** Only the confirmed pronunciations of words these lines actually sing. */
function pronunciationsFor(lines: readonly string[], confirmed: SayAsMap): SayAsMap {
  const words = new Set(lines.flatMap((line) => tokenizeHebrewWords(stripNiqqud(line))));
  return new Map([...confirmed].filter(([bare]) => words.has(bare)));
}

/**
 * Transliterates voice lines for the singing engine, following their niqqud;
 * words with a confirmed pronunciation always get exactly that one.
 */
export async function writePronunciationGuide(lines: readonly string[], personal: readonly LexiconEntry[]): Promise<PronunciationGuide> {
  const unique = [...new Set(lines)];
  const rules = await getVoiceRules();
  const confirmed = pronunciationsFor(unique, effectiveSayAs(rules, personal));
  const draft = await askClaude({
    system: buildGuideSystemPrompt(rules),
    user: buildGuideUserPrompt(unique, confirmed),
    schema: GuideDraftSchema,
    effort: "low",
    maxTokens: 8_000,
    refusalMessage: "הכנת ההגייה באנגלית לא הצליחה.",
  });
  return toPronunciationGuide(draft, unique, confirmed);
}
