import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: z.string().trim().default("claude-opus-5-5"),
  LYRICS_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),
  ELEVENLABS_API_KEY: optional,
  ELEVENLABS_MUSIC_MODEL: z.enum(["music_v2", "music_v2_5"]).default("music_v2_5"),
  MUSIC_MAX_SONG_SECONDS: z.coerce.number().int().min(30).max(600).default(120),
  APP_ACCESS_CODE: optional,
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Parsed lazily so a misconfiguration fails the request that needs it, not the build. */
export function getEnv(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}

export function isAudioEnabled(): boolean {
  return Boolean(getEnv().ELEVENLABS_API_KEY);
}

export function isAccessCodeRequired(): boolean {
  return Boolean(getEnv().APP_ACCESS_CODE);
}
