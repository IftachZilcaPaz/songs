import { mapClaudeError } from "@/lib/server/claude";
import { assertAccess, handleRoute, readJson } from "@/lib/server/http";
import { reviewPronunciation } from "@/lib/server/reviewer";
import { ReviewRequestSchema, type ReviewResponse } from "@/lib/songs/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handleRoute(async (request) => {
  assertAccess(request);
  const input = ReviewRequestSchema.parse(await readJson(request));
  const body: ReviewResponse = { fixes: await reviewPronunciation(input) };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}, mapClaudeError);
