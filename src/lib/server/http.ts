import "server-only";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { ACCESS_CODE_HEADER, type ApiErrorBody } from "@/lib/songs/types";
import { getEnv } from "./env";

/** An error whose message is safe to show to the user. */
export class PublicError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PublicError";
  }
}

export function errorResponse(status: number, message: string): Response {
  const body: ApiErrorBody = { error: message };
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function assertAccess(request: Request): void {
  const expected = getEnv().APP_ACCESS_CODE;
  if (!expected) return;
  if (!safeEqual(request.headers.get(ACCESS_CODE_HEADER) ?? "", expected)) {
    throw new PublicError(401, "קוד הגישה שגוי.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new PublicError(400, "הבקשה לא תקינה.");
  }
}

/**
 * Wraps a route handler: known errors become user-facing JSON errors,
 * provider-specific errors are delegated to `mapError`, and anything else
 * is logged and reported generically.
 */
export function handleRoute(
  handler: (request: Request) => Promise<Response>,
  mapError: (error: unknown) => PublicError | undefined = () => undefined,
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ZodError) return errorResponse(400, "חלק מהשדות חסרים או לא תקינים.");
      const known = error instanceof PublicError ? error : mapError(error);
      if (known) return errorResponse(known.status, known.message);
      console.error(`[${new URL(request.url).pathname}]`, error);
      return errorResponse(500, "משהו השתבש. נסו שוב בעוד רגע.");
    }
  };
}
