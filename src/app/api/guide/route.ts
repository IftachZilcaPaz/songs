import { mapClaudeError } from "@/lib/server/claude";
import { writePronunciationGuide } from "@/lib/server/guide";
import { assertAccess, handleRoute, readJson } from "@/lib/server/http";
import { GuideRequestSchema, type GuideResponse } from "@/lib/songs/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleRoute(async (request) => {
  assertAccess(request);
  const input = GuideRequestSchema.parse(await readJson(request));
  const body: GuideResponse = { guide: await writePronunciationGuide(input.lines) };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}, mapClaudeError);
