import "server-only";
import { tokenizeHebrewWords } from "@/lib/hebrew/lexicon";
import { PronunciationDraftSchema, toPronunciationOptions } from "@/lib/songs/pronunciation";
import { buildPronunciationSystemPrompt, buildPronunciationUserPrompt } from "@/lib/songs/prompt";
import type { PronunciationOption } from "@/lib/songs/types";
import { askClaude } from "./claude";
import { PublicError } from "./http";
import { getVoiceRules } from "./voice-rules";

/** Suggests alternative voice spellings for a word the user heard sung wrongly. */
export async function suggestPronunciations(word: string, line: string): Promise<PronunciationOption[]> {
  const tokens = tokenizeHebrewWords(word);
  if (tokens.length !== 1 || tokens[0] !== word) throw new PublicError(400, "אפשר לתקן רק מילה אחת בעברית.");

  const rules = await getVoiceRules();
  const draft = await askClaude({
    system: buildPronunciationSystemPrompt(rules.document, rules.lexicon),
    user: buildPronunciationUserPrompt(word, line),
    schema: PronunciationDraftSchema,
    effort: "low",
    maxTokens: 4_000,
    refusalMessage: "לא הצלחנו להציע הגייה למילה הזו.",
  });

  const options = toPronunciationOptions(draft, word);
  if (options.length === 0) throw new PublicError(502, "לא נמצאו אפשרויות חדשות למילה הזו. נסו שוב.");
  return options;
}
