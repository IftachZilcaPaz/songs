import { describe, expect, it } from "vitest";
import { enforceSayAs } from "@/lib/hebrew/say-as";
import { buildFullSongPlan, buildPreviewPlan, pronunciationStyles } from "@/lib/music/plan";
import { toPronunciationGuide } from "./guide";
import { AudioRequestSchema } from "./types";

describe("toPronunciationGuide", () => {
  const lines = ["דַנָה, דַנָה", "שַקְשוּקה חמה"];

  it("keys each transliteration by its voice line", () => {
    const guide = toPronunciationGuide(
      { lines: [{ line: 0, say_as: " da-NA,  da-NA " }, { line: 1, say_as: "shak-shu-KA cha-MA" }] },
      lines,
      new Map(),
    );
    expect(guide).toEqual({ "דַנָה, דַנָה": "da-NA, da-NA", "שַקְשוּקה חמה": "shak-shu-KA cha-MA" });
  });

  it("drops unknown lines, duplicates and anything that is not plain Latin text", () => {
    const guide = toPronunciationGuide(
      {
        lines: [
          { line: 5, say_as: "ghost" },
          { line: 0, say_as: "da-NA" },
          { line: 0, say_as: "DA-na" },
          { line: 1, say_as: "שקשוקה" },
        ],
      },
      lines,
      new Map(),
    );
    expect(guide).toEqual({ "דַנָה, דַנָה": "da-NA" });
  });
});

describe("confirmed pronunciations", () => {
  const confirmed = new Map([
    ["שקשוקה", "shak-shu-KA"],
    ["דנה", "da-NA"],
  ]);

  it("replace the model's transliteration of known words, keeping punctuation", () => {
    expect(enforceSayAs(["דנה", "דנה", "שקשוקה", "חמה"], "DA-na, da-na shak-SHU-ka cha-MA!", confirmed)).toBe(
      "da-NA, da-NA shak-shu-KA cha-MA!",
    );
  });

  it("leave a transliteration alone when its words do not line up", () => {
    expect(enforceSayAs(["דנה", "שקשוקה"], "da na shak-SHU-ka", confirmed)).toBe("da na shak-SHU-ka");
  });

  it("are applied to every line of the guide", () => {
    const guide = toPronunciationGuide({ lines: [{ line: 0, say_as: "shak-SHU-ka cha-MA" }] }, ["שַקְשוּקה חמה"], confirmed);
    expect(guide).toEqual({ "שַקְשוּקה חמה": "shak-shu-KA cha-MA" });
  });
});

describe("pronunciation styles in the music plan", () => {
  const guide = { "ה": "HE", "ו": "vav" };
  const request = AudioRequestSchema.parse({
    variationId: "pop",
    mode: "full",
    sections: [
      { kind: "verse", voiceLines: ["א", "ב"] },
      { kind: "chorus", voiceLines: ["ה", "ו"] },
    ],
    previewVoiceLines: ["ו"],
    pronunciationGuide: guide,
  });

  it("numbers the hints by the line's position in its chunk", () => {
    expect(pronunciationStyles(["ו", "ז", "ה"], guide)).toEqual([
      "follow the Hebrew pronunciation guide exactly, stressed syllables in capitals",
      "lyric line 1 is pronounced: vav",
      "lyric line 3 is pronounced: HE",
    ]);
    expect(pronunciationStyles(["א"], guide)).toEqual([]);
  });

  it("adds the hints to the chunks that sing those lines only", () => {
    const [, verse, chorus] = buildFullSongPlan(request, 600_000);
    expect(verse!.positiveStyles.some((style) => style.startsWith("lyric line"))).toBe(false);
    expect(chorus!.positiveStyles).toContain("lyric line 2 is pronounced: vav");
    expect(buildPreviewPlan({ ...request, mode: "preview" })[0]!.positiveStyles).toContain("lyric line 1 is pronounced: vav");
  });

  it("sends no hints when the guide is off", () => {
    const plain = AudioRequestSchema.parse({ ...request, pronunciationGuide: undefined });
    expect(buildFullSongPlan(plain, 600_000).flatMap((chunk) => chunk.positiveStyles).some((style) => style.includes("pronounced"))).toBe(false);
  });
});
