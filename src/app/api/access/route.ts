import { assertAccess, handleRoute } from "@/lib/server/http";

export const runtime = "nodejs";

/** Lets the entry screen check an access code before the studio opens. */
export const POST = handleRoute(async (request) => {
  assertAccess(request);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
});
