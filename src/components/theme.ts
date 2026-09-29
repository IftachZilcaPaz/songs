import type { VariationId } from "@/lib/songs/variations";

/** Pastel tones defined as CSS tokens in globals.css (`--tone-<name>` and `--tone-<name>-ink`). */
export type Tone = "sage" | "peach" | "butter" | "sky" | "lilac" | "coral";

export interface VariationTheme {
  readonly tone: Tone;
  readonly icon: string;
}

/** Presentation only: how each variation looks in the studio. */
export const VARIATION_THEMES: Readonly<Record<VariationId, VariationTheme>> = {
  ballad: { tone: "lilac", icon: "💗" },
  pop: { tone: "peach", icon: "🎉" },
  mizrahi: { tone: "butter", icon: "🥁" },
  rap: { tone: "sky", icon: "🎤" },
  funny: { tone: "coral", icon: "😂" },
  kids: { tone: "butter", icon: "🧸" },
  rock: { tone: "sky", icon: "🎸" },
  folk: { tone: "sage", icon: "🪕" },
};

const DEFAULT_THEME: VariationTheme = { tone: "sage", icon: "🎵" };

export function getVariationTheme(id: string): VariationTheme {
  return (VARIATION_THEMES as Readonly<Record<string, VariationTheme>>)[id] ?? DEFAULT_THEME;
}
