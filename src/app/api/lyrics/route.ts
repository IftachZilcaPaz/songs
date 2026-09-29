import { assertAccess, handleRoute, readJson } from "@/lib/server/http";
import { mapLyricistError, writeSong } from "@/lib/server/lyricist";
import { LyricsRequestSchema, type LyricsResponse } from "@/lib/songs/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleRoute(async (request) => {
  assertAccess(request);
  const input = LyricsRequestSchema.parse(await readJson(request));
  const body: LyricsResponse = { song: await writeSong(input) };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}, mapLyricistError);
