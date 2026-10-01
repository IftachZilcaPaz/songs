import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsWord, mergeLexicons, parseLexicon, parseLexiconSayAs, parseWordList, type Lexicon } from "@/lib/hebrew/lexicon";
import type { SayAsMap } from "@/lib/hebrew/say-as";
import type { PromptRules } from "@/lib/songs/prompt";
import type { LexiconEntry } from "@/lib/songs/types";

const RULES_DIR = path.join(process.cwd(), "rules");

export interface VoiceRules extends PromptRules {
  /** Words confirmed by ear to be sung wrongly whatever the niqqud; new songs avoid them. */
  readonly avoidWords: ReadonlySet<string>;
  /** Words whose reading depends on context; a stored spelling is never applied to them automatically. */
  readonly contextWords: ReadonlySet<string>;
}

let pending: Promise<VoiceRules> | undefined;

async function load(): Promise<VoiceRules> {
  const read = (file: string) => readFile(path.join(RULES_DIR, file), "utf8");
  const [document, pronunciationRules, lexiconSource, avoidSource, contextSource] = await Promise.all([
    read("HEBREW_VOICE_RULES_FOR_BOTS.md"),
    read("pronunciation-rules.md"),
    read("voice-lexicon.txt"),
    read("avoid-words.txt"),
    read("context-words.txt"),
  ]);

  const contextWords = parseWordList(contextSource);
  const lexicon = parseLexicon(lexiconSource);
  // Curated keys are whole words, so they are compared exactly: prefix matching would flag מלך as מ + לך.
  const conflicts = [...lexicon.keys()].filter((word) => contextWords.has(word));
  if (conflicts.length > 0) {
    throw new Error(`voice-lexicon.txt must not contain context-dependent words: ${conflicts.join(", ")}`);
  }

  return {
    document,
    pronunciationRules,
    lexicon,
    lexiconSayAs: parseLexiconSayAs(lexiconSource),
    avoidWords: parseWordList(avoidSource),
    contextWords,
  };
}

/** Loaded once per server instance; a failed load is retried on the next call. */
export function getVoiceRules(): Promise<VoiceRules> {
  pending ??= load().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

/**
 * The shared lexicon plus the user's own spellings (which win on conflicts),
 * minus context-dependent words, whose spelling must follow each line.
 */
export function effectiveLexicon(rules: VoiceRules, personal: readonly LexiconEntry[]): Lexicon {
  return mergeLexicons(rules.lexicon, new Map(ownEntries(rules, personal).map(([bare, pointed]) => [bare, pointed])));
}

/**
 * Latin pronunciations matching `effectiveLexicon`: a word the user respelled
 * takes the user's pronunciation, or none, never the shared one for a spelling
 * it no longer has.
 */
export function effectiveSayAs(rules: VoiceRules, personal: readonly LexiconEntry[]): SayAsMap {
  const merged = new Map(rules.lexiconSayAs);
  for (const [bare, , sayAs] of ownEntries(rules, personal)) {
    if (sayAs) merged.set(bare, sayAs);
    else merged.delete(bare);
  }
  return merged;
}

function ownEntries(rules: VoiceRules, personal: readonly LexiconEntry[]): readonly LexiconEntry[] {
  return personal.filter(([bare]) => !containsWord(bare, rules.contextWords));
}
