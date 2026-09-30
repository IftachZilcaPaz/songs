import "server-only";
import { GuideDraftSchema, toPronunciationGuide } from "@/lib/songs/guide";
import { buildGuideSystemPrompt, buildGuideUserPrompt } from "@/lib/songs/prompt";
import type { PronunciationGuide } from "@/lib/songs/types";
import { askClaude } from "./claude";
import { getVoiceRules } from "./voice-rules";

/** Transliterates voice lines for the singing engine, following their niqqud. */
export async function writePronunciationGuide(lines: readonly string[]): Promise<PronunciationGuide> {
  const unique = [...new Set(lines)];
  const draft = await askClaude({
    system: buildGuideSystemPrompt(await getVoiceRules()),
    user: buildGuideUserPrompt(unique),
    schema: GuideDraftSchema,
    effort: "low",
    maxTokens: 8_000,
    refusalMessage: "הכנת ההגייה באנגלית לא הצליחה.",
  });
  return toPronunciationGuide(draft, unique);
}
