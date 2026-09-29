import { z } from "zod";
import { VARIATION_IDS, type VariationId } from "./variations";

export const SECTION_KINDS = ["verse", "pre_chorus", "chorus", "bridge", "outro"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const SECTION_LABELS: Readonly<Record<SectionKind, string>> = {
  verse: "בית",
  pre_chorus: "טרום פזמון",
  chorus: "פזמון",
  bridge: "גשר",
  outro: "סיום",
};

export const SUBJECT_GENDERS = ["unspecified", "female", "male", "plural"] as const;
export type SubjectGender = (typeof SUBJECT_GENDERS)[number];

export const VOCALS = ["auto", "female", "male"] as const;
export type Vocal = (typeof VOCALS)[number];

export const AUDIO_MODES = ["preview", "full"] as const;
export type AudioMode = (typeof AUDIO_MODES)[number];

export interface SongSection {
  readonly kind: SectionKind;
  /** What the person reads: no niqqud at all. */
  readonly displayLines: readonly string[];
  /** What the singing engine receives: niqqud only where the voice rules require it. */
  readonly voiceLines: readonly string[];
}

export interface Song {
  readonly id: string;
  readonly variationId: VariationId;
  readonly title: string;
  readonly sections: readonly SongSection[];
  /** One or two voice lines for a short test clip before rendering the whole song. */
  readonly previewVoiceLines: readonly string[];
  readonly pointedWords: readonly string[];
  readonly checkByEar: readonly string[];
  readonly musicStyles: readonly string[];
  readonly warnings: readonly string[];
}

export const INPUT_TEXT_MIN = 10;
export const INPUT_TEXT_MAX = 5000;

export const LyricsRequestSchema = z.object({
  text: z.string().trim().min(INPUT_TEXT_MIN).max(INPUT_TEXT_MAX),
  variationId: z.enum(VARIATION_IDS),
  subjectGender: z.enum(SUBJECT_GENDERS).default("unspecified"),
});
export type LyricsRequest = z.input<typeof LyricsRequestSchema>;

/** Limits mirror the music engine's: at most 30 lines per section and 200 characters per line. */
const VoiceLine = z.string().trim().min(1).max(200);

export const AudioRequestSchema = z.object({
  variationId: z.enum(VARIATION_IDS),
  mode: z.enum(AUDIO_MODES),
  vocal: z.enum(VOCALS).default("auto"),
  sections: z
    .array(z.object({ kind: z.enum(SECTION_KINDS), voiceLines: z.array(VoiceLine).min(1).max(30) }))
    .min(1)
    .max(12),
  previewVoiceLines: z.array(VoiceLine).max(4).default([]),
  musicStyles: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
});
export type AudioRequest = z.input<typeof AudioRequestSchema>;
export type ValidAudioRequest = z.output<typeof AudioRequestSchema>;

/** Header carrying the optional access code that guards the paid APIs. */
export const ACCESS_CODE_HEADER = "x-access-code";

export interface LyricsResponse {
  readonly song: Song;
}

export interface ApiErrorBody {
  readonly error: string;
}
