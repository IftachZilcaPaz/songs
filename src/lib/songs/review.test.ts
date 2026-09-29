import { describe, expect, it } from "vitest";
import { parseLexicon } from "@/lib/hebrew/lexicon";
import { buildReviewUserPrompt } from "./prompt";
import { applyLineFixes, toLineFixes } from "./review";
import type { Song } from "./types";

const lexicon = parseLexicon("שקשוקה = שקשוקָה");

const song: Song = {
  id: "s",
  variationId: "pop",
  title: "דנה",
  sections: [
    {
      kind: "verse",
      voiceLines: ["ריח של שקשוקָה עולה מהחלון", "היא רואה את הים"],
      displayLines: ["ריח של שקשוקה עולה מהחלון", "היא רואה את הים"],
    },
    { kind: "chorus", voiceLines: ["דָנָה, דָנָה"], displayLines: ["דנה, דנה"] },
  ],
  previewVoiceLines: ["ריח של שקשוקָה עולה מהחלון"],
  pointedWords: ["שקשוקָה", "דָנָה"],
  checkByEar: [],
  musicStyles: [],
  warnings: [],
  seed: 7,
};

describe("toLineFixes", () => {
  it("accepts niqqud-only fixes and reports the changed words", () => {
    const fixes = toLineFixes(
      { fixes: [{ section: 0, line: 0, voice: "ריח של שקשוקָה עולֶה מהחלון", reason: "ריח הוא זכר" }] },
      song.sections,
      lexicon,
    );
    expect(fixes).toEqual([
      { sectionIndex: 0, lineIndex: 0, voiceLine: "ריח של שקשוקָה עולֶה מהחלון", words: ["עולֶה"], reason: "ריח הוא זכר" },
    ]);
  });

  it("rejects changed letters, unknown lines, no-ops and duplicates", () => {
    const fixes = toLineFixes(
      {
        fixes: [
          { section: 0, line: 1, voice: "היא ראתה את הים", reason: "letters changed" },
          { section: 4, line: 0, voice: "x", reason: "no such line" },
          { section: 1, line: 0, voice: "דָנָה, דָנָה", reason: "unchanged" },
          { section: 0, line: 1, voice: "היא רואָה את הים", reason: "first" },
          { section: 0, line: 1, voice: "היא רוֹאָה את הים", reason: "duplicate" },
        ],
      },
      song.sections,
      lexicon,
    );
    expect(fixes.map((fix) => fix.reason)).toEqual(["first"]);
  });

  it("keeps confirmed lexicon spellings and the dagesh rule even if the reviewer changes them", () => {
    const [fix] = toLineFixes(
      { fixes: [{ section: 0, line: 0, voice: "רֵיחַ של שַׁקְשׁוּקָּה עולֶה מהחלון", reason: "r" }] },
      song.sections,
      lexicon,
    );
    expect(fix!.voiceLine).toBe("רֵיחַ של שקשוקָה עולֶה מהחלון");
  });
});

describe("applyLineFixes", () => {
  it("updates voice lines, preview lines quoting them, and pointed words", () => {
    const fixed = applyLineFixes(song, [
      { sectionIndex: 0, lineIndex: 0, voiceLine: "ריח של שקשוקָה עולֶה מהחלון", words: ["עולֶה"], reason: "r" },
    ]);
    expect(fixed.sections[0]!.voiceLines[0]).toBe("ריח של שקשוקָה עולֶה מהחלון");
    expect(fixed.sections[0]!.displayLines[0]).toBe("ריח של שקשוקה עולה מהחלון");
    expect(fixed.previewVoiceLines).toEqual(["ריח של שקשוקָה עולֶה מהחלון"]);
    expect(fixed.pointedWords).toContain("עולֶה");
  });

  it("returns the same song when there is nothing to fix", () => {
    expect(applyLineFixes(song, [])).toBe(song);
  });
});

describe("buildReviewUserPrompt", () => {
  it("numbers every line so fixes can be matched back", () => {
    const prompt = buildReviewUserPrompt("דנה חוגגת", "female", song.sections);
    expect(prompt).toContain("[section 0, line 1] היא רואה את הים");
    expect(prompt).toContain("[section 1, line 0] דָנָה, דָנָה");
  });
});
