import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyLexicon, lexiconFromPointedWords, mergeLexicons, parseLexicon, tokenizeHebrewWords } from "./lexicon";
import { hasNiqqud, removeDisallowedDagesh, stripNiqqud } from "./niqqud";
import { collectPointedWords, findVoiceIssues, prepareVoiceLine } from "./voice-text";

const lexicon = parseLexicon(readFileSync(new URL("../../../rules/voice-lexicon.txt", import.meta.url), "utf8"));

describe("stripNiqqud", () => {
  it("removes points but keeps letters and maqaf", () => {
    expect(stripNiqqud("תַסְרִיט")).toBe("תסריט");
    expect(stripNiqqud("בֵּית־סֵפֶר")).toBe("בית־ספר");
    expect(hasNiqqud("שלום")).toBe(false);
    expect(hasNiqqud("נסוּ")).toBe(true);
  });
});

describe("removeDisallowedDagesh", () => {
  it("removes dagesh outside ב/כ/פ, as in the rules table", () => {
    expect(removeDisallowedDagesh("תַּסְרִיט")).toBe("תַסְרִיט");
    expect(removeDisallowedDagesh("נַסּוּ")).toBe("נַסוּ");
    expect(removeDisallowedDagesh("מְסוּדָּר")).toBe("מְסוּדָר");
    expect(removeDisallowedDagesh("אֲמִיתִיִּים")).toBe("אֲמִיתִיִים");
  });

  it("keeps dagesh in ב/כ/פ and keeps shuruk", () => {
    expect(removeDisallowedDagesh("בְּחִינָם")).toBe("בְּחִינָם");
    expect(removeDisallowedDagesh("קִיבַּלְתִי")).toBe("קִיבַּלְתִי");
    expect(removeDisallowedDagesh("כְּמוֹ פֶּה")).toBe("כְּמוֹ פֶּה");
    expect(removeDisallowedDagesh("טִיוּל וּמְחִירִים")).toBe("טִיוּל וּמְחִירִים");
  });

  it("removes dagesh from a vav that carries a vowel (not a shuruk)", () => {
    expect(removeDisallowedDagesh("צִוָּה")).toBe("צִוָה");
  });
});

describe("lexicon", () => {
  it("parses the confirmed lexicon file", () => {
    expect(lexicon.get("אחת")).toBe("אחַת");
    expect(lexicon.get("תסריט")).toBe("תַסְרִיט");
  });

  it("rejects entries whose pointed form does not match the bare word", () => {
    expect(() => parseLexicon("אחת = אחַד")).toThrow(/line 1/);
    expect(() => parseLexicon("no separator")).toThrow(/line 1/);
  });

  it("replaces words regardless of their existing pointing and keeps prefixes", () => {
    expect(applyLexicon("אַחַת ואחת ובאחת", lexicon)).toBe("אחַת ואחַת ובאחַת");
    expect(applyLexicon("בנסו, שנסו.", lexicon)).toBe("בנסוּ, שנסוּ.");
  });

  it("does not treat an unrelated word as prefix + entry", () => {
    expect(applyLexicon("תאחת", lexicon)).toBe("תאחת");
  });

  it("builds a name lexicon so a name is spelled the same everywhere", () => {
    const names = lexiconFromPointedWords(["דָּנָה", "ג'ניפר"]);
    expect(names.get("דנה")).toBe("דָנָה");
    expect(names.has("ג'ניפר")).toBe(false);
    expect(applyLexicon("לדנה ודנה", names)).toBe("לדָנָה ודָנָה");
  });

  it("lets later lexicons win", () => {
    const merged = mergeLexicons(new Map([["אחת", "אַחַת"]]), lexicon);
    expect(merged.get("אחת")).toBe("אחַת");
  });

  it("tokenizes words with a geresh", () => {
    expect(tokenizeHebrewWords("שלום ג'ניפר!")).toEqual(["שלום", "ג'ניפר"]);
  });
});

describe("prepareVoiceLine", () => {
  it("replaces long dashes, fixes dagesh and applies the lexicon", () => {
    expect(prepareVoiceLine("  היא אחת — ויחידה ", lexicon)).toBe("היא אחַת, ויחידה");
    expect(prepareVoiceLine("התַּסְרִיט – שלנו", lexicon)).toBe("התַסְרִיט, שלנו");
  });

  it("collects pointed words once", () => {
    expect(collectPointedWords(["אחַת ואחַת", "נסוּ"])).toEqual(["אחַת", "ואחַת", "נסוּ"]);
  });
});

describe("findVoiceIssues", () => {
  it("flags digits and latin letters", () => {
    const warnings = findVoiceIssues(["חוגגת 40 שנה", "עם Netflix"]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain("40");
    expect(warnings[1]).toContain("Netflix");
  });

  it("returns nothing for clean lines", () => {
    expect(findVoiceIssues(["חוגגת ארבעים שנה"])).toEqual([]);
  });
});
