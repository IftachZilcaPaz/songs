import { z } from "zod";
import { asBareWord } from "@/lib/hebrew/lexicon";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import type { LineFix } from "./review";
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
  /** Reused for every rendering of this song, so a re-render sounds as close as possible to the last one. */
  readonly seed: number;
}

export const MAX_SEED = 2_147_483_647;

export const INPUT_TEXT_MIN = 10;
export const INPUT_TEXT_MAX = 5000;

export const MAX_PERSONAL_LEXICON_ENTRIES = 200;

/** A `[bare, pointed]` pair whose pointed form keeps exactly the same letters. */
export const LexiconEntrySchema = z
  .tuple([z.string().trim().min(1).max(40), z.string().trim().min(1).max(80)])
  .refine(([bare, pointed]) => stripNiqqud(pointed) === bare, "pointed form must match the bare word");
export type LexiconEntry = z.infer<typeof LexiconEntrySchema>;

export const MAX_AVOID_WORDS = 200;

/** A single bare Hebrew word the singing engine keeps mispronouncing. */
export const AvoidWordSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((word) => asBareWord(word) === word, "must be a single Hebrew word without niqqud");

export const LyricsRequestSchema = z.object({
  text: z.string().trim().min(INPUT_TEXT_MIN).max(INPUT_TEXT_MAX),
  variationId: z.enum(VARIATION_IDS),
  subjectGender: z.enum(SUBJECT_GENDERS).default("unspecified"),
  /** Spellings the user picked by ear; applied to every new song. */
  lexicon: z.array(LexiconEntrySchema).max(MAX_PERSONAL_LEXICON_ENTRIES).default([]),
  /** Words the user found the engine cannot sing; new songs avoid them. */
  avoidWords: z.array(AvoidWordSchema).max(MAX_AVOID_WORDS).default([]),
});
export type LyricsRequest = z.input<typeof LyricsRequestSchema>;

/** Limits mirror the music engine's: at most 30 lines per section and 200 characters per line. */
const VoiceLine = z.string().trim().min(1).max(200);

export const MAX_GUIDE_LINES = 120;
export const MAX_SAY_AS_LENGTH = 200;

/**
 * How each voice line sounds, in Latin letters with the stressed syllables in
 * capitals ("da-NA, da-NA"), keyed by the exact voice line. A line whose
 * spelling changed no longer matches its key, so a stale guide is never sent.
 */
export const PronunciationGuideSchema = z
  .record(VoiceLine, z.string().trim().min(1).max(MAX_SAY_AS_LENGTH))
  .refine((guide) => Object.keys(guide).length <= MAX_GUIDE_LINES, `at most ${MAX_GUIDE_LINES} lines`);
export type PronunciationGuide = Readonly<Record<string, string>>;

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
  seed: z.number().int().min(0).max(MAX_SEED).optional(),
  /** Sent to the engine as per-line style hints when present. */
  pronunciationGuide: PronunciationGuideSchema.default({}),
});
export type AudioRequest = z.input<typeof AudioRequestSchema>;
export type ValidAudioRequest = z.output<typeof AudioRequestSchema>;

export const PronunciationRequestSchema = z.object({
  /** The word as it appears in the voice line (may carry niqqud). */
  word: z.string().trim().min(1).max(40),
  /** The full voice line, for context (gender, meaning). */
  line: z.string().trim().min(1).max(200),
});
export type PronunciationRequest = z.input<typeof PronunciationRequestSchema>;

export interface PronunciationOption {
  /** The word pointed for the voice engine; same letters as the original. */
  readonly spelling: string;
  /** Short Hebrew explanation of how this spelling should sound. */
  readonly hint: string;
  /** Latin transliteration with the stressed syllable in capitals, e.g. "shak-shu-KA". */
  readonly sayAs: string;
}

export interface PronunciationResponse {
  readonly options: readonly PronunciationOption[];
}

export const ReviewRequestSchema = z.object({
  /** What the song is about, for meaning and gender. */
  text: z.string().trim().min(INPUT_TEXT_MIN).max(INPUT_TEXT_MAX),
  subjectGender: z.enum(SUBJECT_GENDERS).default("unspecified"),
  sections: z.array(z.object({ voiceLines: z.array(VoiceLine).min(1).max(30) })).min(1).max(12),
  lexicon: z.array(LexiconEntrySchema).max(MAX_PERSONAL_LEXICON_ENTRIES).default([]),
});
export type ReviewRequest = z.input<typeof ReviewRequestSchema>;

export interface ReviewResponse {
  readonly fixes: readonly LineFix[];
}

export const GuideRequestSchema = z.object({
  lines: z.array(VoiceLine).min(1).max(MAX_GUIDE_LINES),
});
export type GuideRequest = z.input<typeof GuideRequestSchema>;

export interface GuideResponse {
  readonly guide: PronunciationGuide;
}

/** Header carrying the optional access code that guards the paid APIs. */
export const ACCESS_CODE_HEADER = "x-access-code";

export interface LyricsResponse {
  readonly song: Song;
}

export interface ApiErrorBody {
  readonly error: string;
}
