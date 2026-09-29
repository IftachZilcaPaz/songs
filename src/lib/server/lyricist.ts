import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { mergeLexicons } from "@/lib/hebrew/lexicon";
import { SongDraftSchema } from "@/lib/songs/draft";
import { EmptySongError, finalizeSong } from "@/lib/songs/finalize";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/songs/prompt";
import { MAX_SEED, type LexiconEntry, type Song, type SubjectGender } from "@/lib/songs/types";
import { getVariation, type VariationId } from "@/lib/songs/variations";
import { askClaude } from "./claude";
import { getEnv } from "./env";
import { PublicError } from "./http";
import { getVoiceRules } from "./voice-rules";

export interface WriteSongInput {
  readonly text: string;
  readonly variationId: VariationId;
  readonly subjectGender: SubjectGender;
  /** Spellings the user picked by ear; they override the shared lexicon. */
  readonly lexicon: readonly LexiconEntry[];
}

export async function writeSong({ text, variationId, subjectGender, lexicon }: WriteSongInput): Promise<Song> {
  const rules = await getVoiceRules();

  const draft = await askClaude({
    system: buildSystemPrompt(rules.document, rules.lexicon),
    user: buildUserPrompt(text, getVariation(variationId), subjectGender),
    schema: SongDraftSchema,
    effort: getEnv().LYRICS_EFFORT,
    maxTokens: 16_000,
    refusalMessage: "לא הצלחנו לכתוב שיר מהטקסט הזה. נסו לנסח אותו אחרת.",
  });

  try {
    const identity = { id: randomUUID(), seed: randomInt(MAX_SEED) };
    return finalizeSong(draft, variationId, mergeLexicons(rules.lexicon, new Map(lexicon)), identity);
  } catch (error) {
    if (error instanceof EmptySongError) throw new PublicError(502, "השיר יצא ריק. נסו שוב.");
    throw error;
  }
}
