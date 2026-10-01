import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyLexicon, containsWord, parseLexicon, parseLexiconEntries, parseLexiconSayAs, parseWordList } from "./lexicon";
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
    expect([...lexicon.keys()].filter((word) => contextWords.has(word))).toEqual([]);
  });

  it("do not both fix and avoid the same word", () => {
    expect([...avoidWords].filter((word) => lexicon.has(word))).toEqual([]);
  });

  it("only use dagesh in ב, כ, פ, and never on a ב after a ו or ב prefix", () => {
    for (const [, pointed] of lexicon) expect(removeDisallowedDagesh(pointed)).toBe(pointed);
  });

  it("apply the confirmed spellings from the learning rounds", () => {
    expect(applyLexicon("ריח של שקשוקה ומרתון", lexicon)).toBe("ריח של שַקְשוּקה ומַרָתוֹן");
    expect(containsWord("ולך", contextWords)).toBe(true);
    expect(applyLexicon("ובבוקר היא רצה", lexicon)).toBe("ובַּבוֹקֶר היא רצה");
    expect(applyLexicon("יש לו אישה הכי יפה בעולם", lexicon)).toBe("יֵשׁ לוֹ אִישָׁה הֲכִי יפה בָּעוֹלָם");
  });

  it("carry a Latin pronunciation for the confirmed words", () => {
    const sayAs = parseLexiconSayAs(read("voice-lexicon.txt"));
    expect(sayAs.get("שקשוקה")).toBe("shak-shu-KA");
    expect(sayAs.get("קטן")).toBe("ka-TAN");
    // Every word with a Latin form has its stressed syllable in capitals.
    for (const [word, latin] of sayAs) expect(latin, word).toMatch(/[A-Z]{2,}|^[A-Z]/u);
  });

  it("reject a malformed Latin pronunciation", () => {
    expect(parseLexiconEntries("קטן = קָטָן | ka-TAN")).toEqual([{ bare: "קטן", pointed: "קָטָן", sayAs: "ka-TAN" }]);
    expect(() => parseLexicon("קטן = קָטָן | קטן")).toThrow(/line 1/);
    expect(() => parseLexicon("קטן = קָטָן | ka TAN")).toThrow(/line 1/);
    expect(() => parseLexicon("קטן = קָטָן | ka-TAN | x")).toThrow(/line 1/);
  });

  it("leave context-dependent words to the writer", () => {
    for (const word of ["בלב", "מחכה", "שעושה", "לעולם", "מעבר", "אוסף"]) expect(contextWords.has(word)).toBe(true);
    // A prefix keeps the writer's pointing, so a context word built on a lexicon word keeps its meaning.
    expect(applyLexicon("לְעולם ולָעולם", lexicon)).toBe("לְעוֹלָם ולָעוֹלָם");
    // מלך is a word of its own, not מ + לך.
    expect(applyLexicon("מלך הלול", lexicon)).toBe("מֶלֶךְ הַלוּל");
  });
});
