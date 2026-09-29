import "server-only";
import { ElevenLabsClient, ElevenLabsError, ElevenLabsTimeoutError } from "@elevenlabs/elevenlabs-js";
import type { MusicChunk } from "@/lib/music/plan";
import { getEnv } from "./env";
import { PublicError } from "./http";

/** Leaves headroom under the 60 second function limit on Netlify. */
const REQUEST_TIMEOUT_SECONDS = 55;

export const AUDIO_CONTENT_TYPE = "audio/mpeg";

let client: ElevenLabsClient | undefined;

function getClient(): ElevenLabsClient {
  const apiKey = getEnv().ELEVENLABS_API_KEY;
  if (!apiKey) throw new PublicError(503, "יצירת אודיו לא הוגדרה בשרת (חסר ELEVENLABS_API_KEY).");
  client ??= new ElevenLabsClient({ apiKey, timeoutInSeconds: REQUEST_TIMEOUT_SECONDS, maxRetries: 0 });
  return client;
}

/** Starts rendering and returns the MP3 as a stream, so playback data flows while it is generated. */
export async function composeSong(chunks: readonly MusicChunk[], signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  return getClient().music.stream(
    {
      modelId: getEnv().ELEVENLABS_MUSIC_MODEL,
      outputFormat: "mp3_44100_128",
      compositionPlan: {
        chunks: chunks.map((chunk) => ({
          text: chunk.text,
          durationMs: chunk.durationMs,
          positiveStyles: [...chunk.positiveStyles],
          negativeStyles: [...chunk.negativeStyles],
        })),
      },
    },
    { abortSignal: signal },
  );
}

/** Maps ElevenLabs errors to user-facing errors; unknown errors fall through. */
export function mapComposerError(error: unknown): PublicError | undefined {
  if (error instanceof ElevenLabsTimeoutError) return new PublicError(504, "יצירת האודיו לקחה יותר מדי זמן. נסו שיר קצר יותר.");
  if (!(error instanceof ElevenLabsError)) return undefined;

  console.error("[composer] ElevenLabs error", error.statusCode, error.message);
  switch (error.statusCode) {
    case 401:
    case 403:
      return new PublicError(503, "שירות האודיו לא מוגדר כראוי.");
    case 422:
      return new PublicError(422, "שירות האודיו דחה את המילים. נסו לערוך אותן ולנסות שוב.");
    case 429:
      return new PublicError(429, "יש עומס על שירות האודיו. נסו שוב בעוד דקה.");
    default:
      return new PublicError(502, "שירות האודיו לא זמין כרגע. נסו שוב.");
  }
}
