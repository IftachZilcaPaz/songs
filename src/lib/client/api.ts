import {
  ACCESS_CODE_HEADER,
  type ApiErrorBody,
  type AudioRequest,
  type LyricsRequest,
  type LyricsResponse,
  type Song,
} from "@/lib/songs/types";

export class ClientApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  502: "השרת לא הצליח להשלים את הבקשה. נסו שוב.",
  504: "השרת לא הגיב בזמן. נסו שוב.",
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {
    // Platform errors (e.g. a function timeout) are not JSON.
  }
  return STATUS_MESSAGES[response.status] ?? "משהו השתבש. נסו שוב.";
}

async function post(path: string, body: unknown, accessCode: string, signal?: AbortSignal): Promise<Response> {
  const headers: HeadersInit = { "content-type": "application/json" };
  if (accessCode) headers[ACCESS_CODE_HEADER] = accessCode;

  let response: Response;
  try {
    response = await fetch(path, { method: "POST", headers, body: JSON.stringify(body), signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ClientApiError("אין חיבור לשרת. בדקו את החיבור לאינטרנט.", 0);
  }
  if (!response.ok) throw new ClientApiError(await readError(response), response.status);
  return response;
}

export async function requestLyrics(input: LyricsRequest, accessCode: string, signal?: AbortSignal): Promise<Song> {
  const response = await post("/api/lyrics", input, accessCode, signal);
  return ((await response.json()) as LyricsResponse).song;
}

export async function requestAudio(input: AudioRequest, accessCode: string, signal?: AbortSignal): Promise<Blob> {
  const response = await post("/api/audio", input, accessCode, signal);
  const audio = await response.blob();
  if (audio.size === 0) throw new ClientApiError("התקבל קובץ אודיו ריק. נסו שוב.", response.status);
  return audio;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function errorMessage(error: unknown): string {
  return error instanceof ClientApiError ? error.message : "משהו השתבש. נסו שוב.";
}
