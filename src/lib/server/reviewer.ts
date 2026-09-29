import "server-only";
import { mergeLexicons } from "@/lib/hebrew/lexicon";
import { buildReviewSystemPrompt, buildReviewUserPrompt } from "@/lib/songs/prompt";
import { ReviewDraftSchema, toLineFixes, type LineFix } from "@/lib/songs/review";
import type { LexiconEntry, SubjectGender } from "@/lib/songs/types";
import { askClaude } from "./claude";
import { getVoiceRules } from "./voice-rules";

export interface ReviewInput {
  readonly text: string;
  readonly subjectGender: SubjectGender;
  readonly sections: readonly { readonly voiceLines: readonly string[] }[];
  readonly lexicon: readonly LexiconEntry[];
}

/**
 * A second pass over a finished song that only corrects niqqud, so words the
 * engine would mispronounce are caught before any audio is paid for.
 */
export async function reviewPronunciation({ text, subjectGender, sections, lexicon }: ReviewInput): Promise<LineFix[]> {
  const rules = await getVoiceRules();
  const draft = await askClaude({
    system: buildReviewSystemPrompt(rules.document, rules.lexicon),
    user: buildReviewUserPrompt(text, subjectGender, sections),
    schema: ReviewDraftSchema,
    effort: "medium",
    maxTokens: 8_000,
    refusalMessage: "בדיקת ההגייה לא הצליחה.",
  });
  return toLineFixes(draft, sections, mergeLexicons(rules.lexicon, new Map(lexicon)));
}
