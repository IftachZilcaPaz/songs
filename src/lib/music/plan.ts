import type { SectionKind, ValidAudioRequest, Vocal } from "@/lib/songs/types";
import { getVariation } from "@/lib/songs/variations";

/** One chunk of a music composition plan (provider-neutral). */
export interface MusicChunk {
  readonly text: string;
  readonly durationMs: number;
  readonly positiveStyles: readonly string[];
  readonly negativeStyles: readonly string[];
}

export const CHUNK_MIN_MS = 3_000;
export const CHUNK_MAX_MS = 120_000;
const INTRO_MS = 6_000;
const OUTRO_MS = 6_000;
const SECTION_PADDING_MS = 2_000;
const PREVIEW_PADDING_MS = 3_000;
const PREVIEW_MIN_MS = 8_000;
const PREVIEW_MAX_MS = 30_000;

const SECTION_TAGS: Readonly<Record<SectionKind, string>> = {
  verse: "Verse",
  pre_chorus: "Pre-Chorus",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
};

const SECTION_STYLES: Readonly<Record<SectionKind, readonly string[]>> = {
  verse: ["storytelling verse", "restrained arrangement"],
  pre_chorus: ["rising tension", "building up"],
  chorus: ["full arrangement", "memorable sing-along hook"],
  bridge: ["contrasting bridge", "emotional peak"],
  outro: ["gentle resolution"],
};

const VOCAL_STYLES: Readonly<Record<Vocal, readonly string[]>> = {
  auto: [],
  female: ["female lead vocals"],
  male: ["male lead vocals"],
};

const LANGUAGE_STYLES = ["sung in Hebrew", "clear Hebrew diction"];
const NEGATIVE_STYLES = ["English lyrics"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

function globalStyles(request: ValidAudioRequest): string[] {
  const styles = request.musicStyles.length > 0 ? request.musicStyles : getVariation(request.variationId).musicStyles;
  return [...new Set([...styles, ...VOCAL_STYLES[request.vocal], ...LANGUAGE_STYLES])];
}

function sungDurationMs(lineCount: number, secondsPerLine: number, paddingMs: number): number {
  return lineCount * secondsPerLine * 1000 + paddingMs;
}

/** A short clip of one or two lines, to hear the name and risky words before paying for the full song. */
export function buildPreviewPlan(request: ValidAudioRequest): MusicChunk[] {
  const lines = request.previewVoiceLines.length > 0 ? request.previewVoiceLines : request.sections[0]!.voiceLines.slice(0, 2);
  const { secondsPerLine } = getVariation(request.variationId);
  return [
    {
      text: [`[${SECTION_TAGS.chorus}]`, ...lines].join("\n"),
      durationMs: clamp(sungDurationMs(lines.length, secondsPerLine, PREVIEW_PADDING_MS), PREVIEW_MIN_MS, PREVIEW_MAX_MS),
      positiveStyles: globalStyles(request),
      negativeStyles: NEGATIVE_STYLES,
    },
  ];
}

/**
 * Scales chunk durations down proportionally so the song fits `maxTotalMs`,
 * never going below the engine's minimum chunk length.
 */
export function fitToDuration(chunks: readonly MusicChunk[], maxTotalMs: number): MusicChunk[] {
  const total = chunks.reduce((sum, chunk) => sum + chunk.durationMs, 0);
  if (total <= maxTotalMs) return [...chunks];
  const ratio = maxTotalMs / total;
  return chunks.map((chunk) => ({ ...chunk, durationMs: clamp(chunk.durationMs * ratio, CHUNK_MIN_MS, CHUNK_MAX_MS) }));
}

export function buildFullSongPlan(request: ValidAudioRequest, maxTotalMs: number): MusicChunk[] {
  const { secondsPerLine } = getVariation(request.variationId);
  const styles = globalStyles(request);
  const counters = new Map<SectionKind, number>();

  const sungChunks = request.sections.map((section): MusicChunk => {
    const occurrence = (counters.get(section.kind) ?? 0) + 1;
    counters.set(section.kind, occurrence);
    const tag = section.kind === "verse" ? `${SECTION_TAGS.verse} ${occurrence}` : SECTION_TAGS[section.kind];
    return {
      text: [`[${tag}]`, ...section.voiceLines].join("\n"),
      durationMs: clamp(sungDurationMs(section.voiceLines.length, secondsPerLine, SECTION_PADDING_MS), CHUNK_MIN_MS, CHUNK_MAX_MS),
      positiveStyles: [...styles, ...SECTION_STYLES[section.kind]],
      negativeStyles: NEGATIVE_STYLES,
    };
  });

  const intro: MusicChunk = { text: "[Intro]", durationMs: INTRO_MS, positiveStyles: [...styles, "instrumental intro"], negativeStyles: NEGATIVE_STYLES };
  const outro: MusicChunk = { text: "[Outro]", durationMs: OUTRO_MS, positiveStyles: [...styles, "instrumental ending"], negativeStyles: NEGATIVE_STYLES };

  return fitToDuration([intro, ...sungChunks, outro], maxTotalMs);
}
