import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyLexicon, containsWord, parseLexicon, parseWordList } from "./lexicon";
import { removeDisallowedDagesh } from "./niqqud";

/**
 * Guards the hand-edited files in rules/: run `npm test` after every learning
 * round to catch a typo before it reaches a song.
 */
const read = (file: string) => readFileSync(new URL(`../../../rules/${file}`, import.meta.url), "utf8");

const lexicon = parseLexicon(read("voice-lexicon.txt"));
const contextWords = parseWordList(read("context-words.txt"));
const avoidWords = parseWordList(read("avoid-words.txt"));

describe("rules files", () => {
  it("parse without errors", () => {
    expect(lexicon.size).toBeGreaterThan(0);
    expect(contextWords.size).toBeGreaterThan(0);
    expect(read("pronunciation-rules.md").trim().length).toBeGreaterThan(0);
  });

  it("keep context-dependent words out of the fixed lexicon", () => {
    expect([...lexicon.keys()].filter((word) => containsWord(word, contextWords))).toEqual([]);
  });

  it("do not both fix and avoid the same word", () => {
    expect([...avoidWords].filter((word) => lexicon.has(word))).toEqual([]);
  });

  it("only use dagesh in ב, כ, פ", () => {
    for (const [, pointed] of lexicon) expect(removeDisallowedDagesh(pointed)).toBe(pointed);
  });

  it("apply the confirmed spellings from this learning round", () => {
    expect(applyLexicon("ריח של שקשוקה ובלב מרתון", lexicon)).toBe("ריח של שַקְשוּקה ובַּלֵב מַרָתוֹן");
    expect(containsWord("ולך", contextWords)).toBe(true);
    expect(applyLexicon("ובבוקר היא רצה", lexicon)).toBe("ובַּבּוֹקֶר היא רצה");
  });
});
