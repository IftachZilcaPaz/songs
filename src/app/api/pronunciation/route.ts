import { mapClaudeError } from "@/lib/server/claude";
import { assertAccess, handleRoute, readJson } from "@/lib/server/http";
import { suggestPronunciations } from "@/lib/server/pronouncer";
import { PronunciationRequestSchema, type PronunciationResponse } from "@/lib/songs/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleRoute(async (request) => {
  assertAccess(request);
  const { word, line } = PronunciationRequestSchema.parse(await readJson(request));
  const body: PronunciationResponse = { options: await suggestPronunciations(word, line) };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}, mapClaudeError);
