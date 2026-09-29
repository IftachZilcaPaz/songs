import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseLexicon, parseWordList, type Lexicon } from "@/lib/hebrew/lexicon";

const RULES_DIR = path.join(process.cwd(), "rules");

export interface VoiceRules {
  /** The full rules document, given to the lyricist verbatim. */
  readonly document: string;
  /** Confirmed-by-ear spellings, enforced on every voice line. */
  readonly lexicon: Lexicon;
  /** Words confirmed by ear to be sung wrongly whatever the niqqud; new songs avoid them. */
  readonly avoidWords: ReadonlySet<string>;
}

let pending: Promise<VoiceRules> | undefined;

async function load(): Promise<VoiceRules> {
  const [document, lexiconSource, avoidSource] = await Promise.all([
    readFile(path.join(RULES_DIR, "HEBREW_VOICE_RULES_FOR_BOTS.md"), "utf8"),
    readFile(path.join(RULES_DIR, "voice-lexicon.txt"), "utf8"),
    readFile(path.join(RULES_DIR, "avoid-words.txt"), "utf8"),
  ]);
  return { document, lexicon: parseLexicon(lexiconSource), avoidWords: parseWordList(avoidSource) };
}

/** Loaded once per server instance; a failed load is retried on the next call. */
export function getVoiceRules(): Promise<VoiceRules> {
  pending ??= load().catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
