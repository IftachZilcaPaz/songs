import { buildFullSongPlan, buildPreviewPlan } from "@/lib/music/plan";
import { AUDIO_CONTENT_TYPE, composeSong, mapComposerError } from "@/lib/server/composer";
import { getEnv } from "@/lib/server/env";
import { assertAccess, handleRoute, readJson } from "@/lib/server/http";
import { AudioRequestSchema } from "@/lib/songs/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleRoute(async (request) => {
  assertAccess(request);
  const input = AudioRequestSchema.parse(await readJson(request));
  const chunks =
    input.mode === "preview" ? buildPreviewPlan(input) : buildFullSongPlan(input, getEnv().MUSIC_MAX_SONG_SECONDS * 1000);

  const audio = await composeSong(chunks, input.seed, request.signal);
  return new Response(audio, {
    headers: { "content-type": AUDIO_CONTENT_TYPE, "cache-control": "no-store" },
  });
}, mapComposerError);
