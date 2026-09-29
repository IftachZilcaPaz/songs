import { describe, expect, it } from "vitest";
import { splitWords } from "@/lib/hebrew/lexicon";
import { applyWordFix, getWordAt, InvalidSpellingError, replaceWordInLine } from "./edit";
import { toPronunciationOptions } from "./pronunciation";
import { LyricsRequestSchema, type Song } from "./types";

const song: Song = {
  id: "s",
  variationId: "pop",
  title: "דנה",
  sections: [
    {
      kind: "verse",
      voiceLines: ["ריח של שקשוקה עולה מהחלון", "היא עולה, השקשוקה מוכנה"],
      displayLines: ["ריח של שקשוקה עולה מהחלון", "היא עולה, השקשוקה מוכנה"],
    },
    { kind: "chorus", voiceLines: ["שקשוקה!"], displayLines: ["שקשוקה!"] },
  ],
  previewVoiceLines: ["ריח של שקשוקה עולה מהחלון"],
  pointedWords: [],
  checkByEar: [],
  musicStyles: [],
  warnings: [],
  seed: 7,
};

describe("splitWords", () => {
  it("round-trips and marks Hebrew words", () => {
    const segments = splitWords("היא עולה, השקשוקה!");
    expect(segments.map((segment) => segment.text).join("")).toBe("היא עולה, השקשוקה!");
    expect(segments.filter((segment) => segment.isWord).map((segment) => segment.text)).toEqual(["היא", "עולה", "השקשוקה"]);
  });
});

describe("applyWordFix", () => {
  it("finds a word by location", () => {
    expect(getWordAt(song, { sectionIndex: 0, lineIndex: 0, wordIndex: 3 })).toBe("עולה");
    expect(getWordAt(song, { sectionIndex: 5, lineIndex: 0, wordIndex: 0 })).toBeUndefined();
  });

  it("fixes one occurrence only when scoped to the line", () => {
    const fixed = applyWordFix(song, { sectionIndex: 0, lineIndex: 0, wordIndex: 3 }, "עולֶה", "line");
    expect(fixed.sections[0]!.voiceLines).toEqual(["ריח של שקשוקה עולֶה מהחלון", "היא עולה, השקשוקה מוכנה"]);
    expect(fixed.sections[0]!.displayLines[0]).toBe("ריח של שקשוקה עולה מהחלון");
    expect(fixed.pointedWords).toEqual(["עולֶה"]);
    expect(fixed.previewVoiceLines).toEqual(song.previewVoiceLines);
  });

  it("fixes every occurrence, prefixed forms and preview included, when scoped to the song", () => {
    const fixed = applyWordFix(song, { sectionIndex: 0, lineIndex: 0, wordIndex: 2 }, "שקשוקָה", "song");
    expect(fixed.sections[0]!.voiceLines).toEqual(["ריח של שקשוקָה עולה מהחלון", "היא עולה, השקשוקָה מוכנה"]);
    expect(fixed.sections[1]!.voiceLines).toEqual(["שקשוקָה!"]);
    expect(fixed.previewVoiceLines).toEqual(["ריח של שקשוקָה עולה מהחלון"]);
  });

  it("rejects a spelling with different letters and strips a forbidden dagesh", () => {
    const location = { sectionIndex: 0, lineIndex: 0, wordIndex: 3 };
    expect(() => applyWordFix(song, location, "עולים", "line")).toThrow(InvalidSpellingError);
    expect(applyWordFix(song, location, "עוֹלֶּה", "line").sections[0]!.voiceLines[0]).toContain("עוֹלֶה");
  });

  it("replaces by word index without touching punctuation", () => {
    expect(replaceWordInLine("היא עולה, השקשוקה!", 2, "השקשוקָה")).toBe("היא עולה, השקשוקָה!");
  });
});

describe("toPronunciationOptions", () => {
  it("keeps distinct, same-letter options that differ from the rejected spelling", () => {
    const options = toPronunciationOptions(
      {
        options: [
          { spelling: "שקשוקָה", hint: "הטעמה בסוף", say_as: "shak-shu-KA" },
          { spelling: "שקשוקָה", hint: "כפילות", say_as: "x" },
          { spelling: "שקשוקה", hint: "כמו המקור", say_as: "x" },
          { spelling: "שקשוקות", hint: "מילה אחרת", say_as: "x" },
          { spelling: "שַׁקְשׁוּקָּה", hint: "ניקוד מלא", say_as: "shak-SHU-ka" },
        ],
      },
      "שקשוקה",
    );
    expect(options.map((option) => option.spelling)).toEqual(["שקשוקָה", "שַׁקְשׁוּקָה"]);
    expect(options[0]).toEqual({ spelling: "שקשוקָה", hint: "הטעמה בסוף", sayAs: "shak-shu-KA" });
  });
});

describe("personal lexicon in lyrics requests", () => {
  const base = { text: "דנה חוגגת ארבעים", variationId: "pop" };

  it("accepts matching entries and defaults to none", () => {
    expect(LyricsRequestSchema.parse(base).lexicon).toEqual([]);
    expect(LyricsRequestSchema.parse({ ...base, lexicon: [["שקשוקה", "שקשוקָה"]] }).lexicon).toEqual([["שקשוקה", "שקשוקָה"]]);
  });

  it("rejects entries whose letters differ", () => {
    expect(() => LyricsRequestSchema.parse({ ...base, lexicon: [["שקשוקה", "שקשוקות"]] })).toThrow();
  });
});
