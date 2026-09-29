import "server-only";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { SongDraftSchema } from "@/lib/songs/draft";
import { EmptySongError, finalizeSong } from "@/lib/songs/finalize";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/songs/prompt";
import type { Song, SubjectGender } from "@/lib/songs/types";
import { getVariation, type VariationId } from "@/lib/songs/variations";
import { getEnv } from "./env";
import { PublicError } from "./http";
import { getVoiceRules } from "./voice-rules";

/** Stays under the 60 second function limit on Netlify. */
const REQUEST_TIMEOUT_MS = 55_000;
const MAX_OUTPUT_TOKENS = 16_000;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  const apiKey = getEnv().ANTHROPIC_API_KEY;
  if (!apiKey) throw new PublicError(503, "יצירת מילים לא הוגדרה בשרת (חסר ANTHROPIC_API_KEY).");
  client ??= new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  return client;
}

export interface WriteSongInput {
  readonly text: string;
  readonly variationId: VariationId;
  readonly subjectGender: SubjectGender;
}

export async function writeSong({ text, variationId, subjectGender }: WriteSongInput): Promise<Song> {
  const { ANTHROPIC_MODEL, LYRICS_EFFORT } = getEnv();
  const anthropic = getClient();
  const rules = await getVoiceRules();

  const message = await anthropic.beta.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    // On a safety decline the API re-runs the request on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: LYRICS_EFFORT, format: betaZodOutputFormat(SongDraftSchema) },
    system: [
      {
        type: "text",
        text: buildSystemPrompt(rules.document, rules.lexicon),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(text, getVariation(variationId), subjectGender) }],
  });

  if (message.stop_reason === "refusal") {
    throw new PublicError(422, "לא הצלחנו לכתוב שיר מהטקסט הזה. נסו לנסח אותו אחרת.");
  }
  if (message.stop_reason === "max_tokens" || !message.parsed_output) {
    throw new PublicError(502, "השיר יצא לא שלם. נסו שוב.");
  }

  try {
    return finalizeSong(message.parsed_output, variationId, rules.lexicon, randomUUID());
  } catch (error) {
    if (error instanceof EmptySongError) throw new PublicError(502, "השיר יצא ריק. נסו שוב.");
    throw error;
  }
}

/** Maps Claude API errors to user-facing errors; unknown errors fall through. */
export function mapLyricistError(error: unknown): PublicError | undefined {
  if (error instanceof Anthropic.RateLimitError) return new PublicError(429, "יש עומס כרגע. נסו שוב בעוד דקה.");
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new PublicError(504, "הכתיבה לקחה יותר מדי זמן. נסו שוב.");
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[lyricist] Claude API credentials rejected", error.message);
    return new PublicError(503, "שירות כתיבת המילים לא מוגדר כראוי.");
  }
  if (error instanceof Anthropic.APIError) {
    console.error("[lyricist] Claude API error", error.status, error.message);
    return new PublicError(502, "שירות כתיבת המילים לא זמין כרגע. נסו שוב.");
  }
  return undefined;
}
