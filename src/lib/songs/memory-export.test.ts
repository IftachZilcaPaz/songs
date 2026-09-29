import { describe, expect, it } from "vitest";
import { formatMemoryExport } from "./memory-export";

describe("formatMemoryExport", () => {
  it("writes lexicon, avoid words and history in pasteable blocks", () => {
    const text = formatMemoryExport({
      lexicon: [["שקשוקה", "שקשוקָה"]],
      avoidWords: ["מהחלון"],
      history: [{ before: "עולה", after: "עולֶה", line: "ריח של שקשוקה עולה מהחלון" }],
    });
    const lines = text.split("\n");
    expect(lines).toContain("שקשוקה = שקשוקָה");
    expect(lines).toContain("מהחלון");
    expect(lines).toContain("עולה ← עולֶה | ריח של שקשוקה עולה מהחלון");
  });
});
