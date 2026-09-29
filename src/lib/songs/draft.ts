import { z } from "zod";
import { SECTION_KINDS } from "./types";

/** The structured output requested from the lyricist model. */
export const SongDraftSchema = z.object({
  title: z.string().describe("Short Hebrew song title, no niqqud."),
  names: z
    .array(z.string())
    .describe("Every person's name exactly as written in the voice lines (pointed per the rules). Empty if none."),
  sections: z
    .array(
      z.object({
        kind: z.enum(SECTION_KINDS),
        lines: z.array(z.string()).describe("Voice version of each sung line."),
      }),
    )
    .describe("Song sections in performance order. A repeated chorus appears again with identical lines."),
  preview_lines: z
    .array(z.string())
    .describe("One or two voice lines from the song containing the name and the riskiest words."),
  check_by_ear: z.array(z.string()).describe("The name and any word whose stress you are unsure of, as in the voice lines."),
  music_styles: z
    .array(z.string())
    .describe("Two to four short English mood tags specific to this song, not genre names."),
});

export type SongDraft = z.infer<typeof SongDraftSchema>;
