import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { getEnv } from "./env";
import { PublicError } from "./http";

/** Stays under the 60 second function limit on Netlify. */
const REQUEST_TIMEOUT_MS = 55_000;

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  const apiKey = getEnv().ANTHROPIC_API_KEY;
  if (!apiKey) throw new PublicError(503, "שירות הכתיבה לא הוגדר בשרת (חסר ANTHROPIC_API_KEY).");
  client ??= new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  return client;
}

export interface StructuredRequest<Schema extends z.ZodType> {
  /** Identical across requests, so it is served from the prompt cache. */
  readonly system: string;
  readonly user: string;
  readonly schema: Schema;
  readonly effort: Effort;
  readonly maxTokens: number;
  /** User-facing message when the model declines. */
  readonly refusalMessage: string;
}

/** One structured-output call to Claude; returns the parsed object or throws a user-facing error. */
export async function askClaude<Schema extends z.ZodType>(request: StructuredRequest<Schema>): Promise<z.infer<Schema>> {
  const message = await getClient().beta.messages.parse({
    model: getEnv().ANTHROPIC_MODEL,
    max_tokens: request.maxTokens,
    // On a safety decline the API re-runs the request on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: request.effort, format: betaZodOutputFormat(request.schema) },
    system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: request.user }],
  });

  if (message.stop_reason === "refusal") throw new PublicError(422, request.refusalMessage);
  if (message.stop_reason === "max_tokens" || !message.parsed_output) {
    throw new PublicError(502, "התשובה יצאה לא שלמה. נסו שוב.");
  }
  return message.parsed_output as z.infer<Schema>;
}

/** Maps Claude API errors to user-facing errors; unknown errors fall through. */
export function mapClaudeError(error: unknown): PublicError | undefined {
  if (error instanceof Anthropic.RateLimitError) return new PublicError(429, "יש עומס כרגע. נסו שוב בעוד דקה.");
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new PublicError(504, "זה לקח יותר מדי זמן. נסו שוב.");
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[claude] API credentials rejected", error.message);
    return new PublicError(503, "שירות הכתיבה לא מוגדר כראוי.");
  }
  if (error instanceof Anthropic.APIError) {
    console.error("[claude] API error", error.status, error.message);
    return new PublicError(502, "שירות הכתיבה לא זמין כרגע. נסו שוב.");
  }
  return undefined;
}
