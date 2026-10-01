import { describe, expect, it } from "vitest";
import { formatMemoryExport } from "./memory-export";

describe("formatMemoryExport", () => {
  it("writes lexicon, avoid words and history in pasteable blocks", () => {
    const text = formatMemoryExport({
      lexicon: [["שקשוקה", "שקשוקָה"], ["קטן", "קָטָ֫ן", "ka-TAN"]],
      avoidWords: ["מהחלון"],
      history: [
        { before: "עולה", after: "עולֶה", line: "ריח של שקשוקה עולה מהחלון" },
        { before: "קטן", after: "קָטָ֫ן", line: "מלך של לול קטן", sayAs: "ka-TAN" },
      ],
    });
    const lines = text.split("\n");
    expect(lines).toContain("שקשוקה = שקשוקָה");
    expect(lines).toContain("מהחלון");
    expect(lines).toContain("עולה ← עולֶה | ריח של שקשוקה עולה מהחלון");
    expect(lines).toContain("קטן = קָטָ֫ן | ka-TAN");
    expect(lines).toContain("קטן ← קָטָ֫ן [ka-TAN] | מלך של לול קטן");
  });
});
