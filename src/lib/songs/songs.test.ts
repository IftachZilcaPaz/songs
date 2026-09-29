import { describe, expect, it } from "vitest";
import { parseLexicon } from "@/lib/hebrew/lexicon";
import { buildFullSongPlan, buildPreviewPlan, CHUNK_MIN_MS, fitToDuration } from "@/lib/music/plan";
import type { SongDraft } from "./draft";
import { EmptySongError, finalizeSong } from "./finalize";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { AudioRequestSchema } from "./types";
import { getVariation } from "./variations";

const lexicon = parseLexicon("אחת = אחַת\nנסו = נסוּ");
const context = (id: string, avoidWords: ReadonlySet<string> = new Set()) => ({ variationId: "pop" as const, lexicon, avoidWords, id, seed: 7 });

const draft: SongDraft = {
  title: "דָנָה בת ארבעים",
  names: ["דָּנָה"],
  sections: [
    { kind: "verse", lines: ["דנה קמה בבוקר — רצה אחת", "  ", "עוד יום של שמחה"] },
    { kind: "chorus", lines: ["דָנָה, דָנָה", "נסו לעמוד בקצב"] },
    { kind: "bridge", lines: [] },
  ],
  preview_lines: ["דָנָה, דָנָה"],
  check_by_ear: ["דָנָה", "  "],
  music_styles: ["birthday celebration", "joyful"],
};

describe("finalizeSong", () => {
  const song = finalizeSong(draft, context("id-1"));

  it("derives display lines from voice lines without niqqud", () => {
    expect(song.sections).toHaveLength(2);
    expect(song.sections[0]!.voiceLines).toEqual(["דָנָה קמה בבוקר, רצה אחַת", "עוד יום של שמחה"]);
    expect(song.sections[0]!.displayLines).toEqual(["דנה קמה בבוקר, רצה אחת", "עוד יום של שמחה"]);
    expect(song.title).toBe("דנה בת ארבעים");
  });

  it("spells the name identically everywhere and applies the confirmed lexicon", () => {
    expect(song.sections[1]!.voiceLines).toEqual(["דָנָה, דָנָה", "נסוּ לעמוד בקצב"]);
    expect(song.checkByEar).toEqual(["דָנָה"]);
    expect(song.pointedWords).toEqual(expect.arrayContaining(["דָנָה", "אחַת", "נסוּ"]));
  });

  it("combines variation styles with song-specific moods", () => {
    expect(song.musicStyles).toEqual([...getVariation("pop").musicStyles, "birthday celebration", "joyful"]);
  });

  it("falls back to the chorus for the preview", () => {
    const withoutPreview = finalizeSong({ ...draft, preview_lines: [] }, context("id-2"));
    expect(withoutPreview.previewVoiceLines).toEqual(["דָנָה, דָנָה", "נסוּ לעמוד בקצב"]);
  });

  it("warns about avoided words that slipped through, including prefixed forms", () => {
    const warned = finalizeSong(draft, context("id-3", new Set(["שמחה", "קצב"])));
    expect(warned.warnings.at(-1)).toContain("שמחה, קצב");
  });

  it("rejects a draft without lyrics", () => {
    expect(() => finalizeSong({ ...draft, sections: [{ kind: "verse", lines: [" "] }] }, context("x"))).toThrow(EmptySongError);
  });
});

describe("prompts", () => {
  it("embeds the rules and lexicon in a request-independent system prompt", () => {
    const system = buildSystemPrompt("# כללים", lexicon);
    expect(system).toContain("# כללים");
    expect(system).toContain("אחת = אחַת");
    expect(system).not.toMatch(/[–—]/);
  });

  it("puts the variation and user text in the user turn", () => {
    const user = buildUserPrompt("דנה חוגגת", getVariation("rap"), "female");
    expect(user).toContain("<user_text>\nדנה חוגגת\n</user_text>");
    expect(user).toContain("ראפ");
    expect(user).toContain("feminine");
  });
});

describe("music plan", () => {
  const request = AudioRequestSchema.parse({
    variationId: "ballad",
    mode: "full",
    vocal: "female",
    sections: [
      { kind: "verse", voiceLines: ["א", "ב", "ג", "ד"] },
      { kind: "chorus", voiceLines: ["ה", "ו"] },
      { kind: "verse", voiceLines: ["ז", "ח"] },
    ],
    previewVoiceLines: ["ה"],
  });

  it("builds tagged, numbered sections framed by an intro and outro", () => {
    const plan = buildFullSongPlan(request, 600_000);
    expect(plan.map((chunk) => chunk.text.split("\n")[0])).toEqual(["[Intro]", "[Verse 1]", "[Chorus]", "[Verse 2]", "[Outro]"]);
    expect(plan[1]!.text).toBe("[Verse 1]\nא\nב\nג\nד");
    expect(plan[1]!.durationMs).toBe(4 * 4500 + 2000);
    expect(plan[1]!.positiveStyles).toEqual(expect.arrayContaining(["female lead vocals", "sung in Hebrew", "emotional pop ballad"]));
  });

  it("fits the song into the maximum duration", () => {
    const plan = buildFullSongPlan(request, 30_000);
    const total = plan.reduce((sum, chunk) => sum + chunk.durationMs, 0);
    expect(total).toBeLessThanOrEqual(30_000);
    expect(Math.min(...plan.map((chunk) => chunk.durationMs))).toBeGreaterThanOrEqual(CHUNK_MIN_MS);
  });

  it("never shrinks chunks below the engine minimum", () => {
    const chunks = [{ text: "a", durationMs: 10_000, positiveStyles: [], negativeStyles: [] }];
    expect(fitToDuration(chunks, 1_000)[0]!.durationMs).toBe(CHUNK_MIN_MS);
  });

  it("renders a short preview from the preview lines", () => {
    const [chunk, ...rest] = buildPreviewPlan({ ...request, mode: "preview" });
    expect(rest).toHaveLength(0);
    expect(chunk!.text).toBe("[Chorus]\nה");
    expect(chunk!.durationMs).toBeGreaterThanOrEqual(8_000);
    expect(chunk!.durationMs).toBeLessThanOrEqual(30_000);
  });
});
