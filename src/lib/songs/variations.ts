/**
 * Catalog of song variations. Shared by the UI (labels) and the server
 * (writing brief for the lyricist, style tags for the music engine).
 */

export interface Variation {
  readonly id: string;
  /** Hebrew label shown to the user. */
  readonly label: string;
  /** Short Hebrew description shown to the user. */
  readonly blurb: string;
  /** Writing brief for the lyricist model. */
  readonly brief: string;
  /** English style tags for the music engine. */
  readonly musicStyles: readonly string[];
  /** Approximate sung duration of one lyric line, used to size song sections. */
  readonly secondsPerLine: number;
}

export const VARIATIONS = [
  {
    id: "ballad",
    label: "בלדה מרגשת",
    blurb: "שקטה, חמה ונוגעת ללב",
    brief:
      "A tender, heartfelt ballad. Sincere love and gratitude, warm concrete imagery from the text. Slow tempo, so keep lines short and let them breathe.",
    musicStyles: ["emotional pop ballad", "piano and strings", "slow tempo, 70 bpm", "intimate warm vocals", "chorus builds up", "great production quality"],
    secondsPerLine: 4.5,
  },
  {
    id: "pop",
    label: "פופ שמח",
    blurb: "קליט, אנרגטי ומלא חיוך",
    brief:
      "Upbeat, catchy, feel-good Israeli pop. A simple, memorable chorus hook built around the name. Light and joyful.",
    musicStyles: ["upbeat Israeli pop", "catchy hook", "bright synths and acoustic guitar", "120 bpm", "energetic vocals", "great production quality"],
    secondsPerLine: 3.2,
  },
  {
    id: "mizrahi",
    label: "מזרחית ים תיכונית",
    blurb: "שמחה של חתונה ויום הולדת",
    brief:
      "A festive Mediterranean (Mizrahi) celebration song. Warm blessings, a call-and-response chorus the whole party can sing, dance-floor energy.",
    musicStyles: ["Mediterranean Mizrahi pop", "darbuka and oud", "festive dance groove", "115 bpm", "expressive ornamented vocals", "great production quality"],
    secondsPerLine: 3.4,
  },
  {
    id: "rap",
    label: "ראפ",
    blurb: "חד, שנון ועם פלואו",
    brief:
      "Hebrew hip-hop. Punchy, witty verses with internal rhymes on stressed syllables and a confident flow. The chorus is a short, sung chant.",
    musicStyles: ["Israeli hip hop", "boom bap drums", "punchy bass", "95 bpm", "confident rap vocals", "melodic sung chorus", "great production quality"],
    secondsPerLine: 2.8,
  },
  {
    id: "funny",
    label: "הומוריסטי",
    blurb: "צחוק באהבה, בלי לפגוע",
    brief:
      "An affectionate, humorous song. Playful exaggeration of real details from the text and gentle teasing, never mean and never crude. It should end warmly.",
    musicStyles: ["comedic pop song", "bouncy ukulele and brass", "playful, 110 bpm", "cheeky theatrical vocals", "great production quality"],
    secondsPerLine: 3.2,
  },
  {
    id: "kids",
    label: "שיר ילדים",
    blurb: "פשוט, חוזר ועם מחיאות כפיים",
    brief:
      "A children's sing-along. Very simple words, lots of repetition, a clap-along chorus a small child can learn after one listen.",
    musicStyles: ["children's sing-along", "xylophone and hand claps", "cheerful, 105 bpm", "friendly clear vocals", "great production quality"],
    secondsPerLine: 3.4,
  },
  {
    id: "rock",
    label: "רוק",
    blurb: "גיטרות, עוצמה ופזמון לצעוק ביחד",
    brief:
      "Anthemic Israeli rock. Driving and proud, with a big shout-along chorus.",
    musicStyles: ["anthemic Israeli rock", "distorted electric guitars", "driving drums, 130 bpm", "powerful vocals", "stadium chorus", "great production quality"],
    secondsPerLine: 3.0,
  },
  {
    id: "folk",
    label: "זמר עברי",
    blurb: "אקוסטי, נוסטלגי ומספר סיפור",
    brief:
      "A nostalgic Israeli singer-songwriter song in the spirit of classic Hebrew folk. Acoustic storytelling, poetic but plain Hebrew.",
    musicStyles: ["acoustic Israeli folk", "nylon guitar and accordion", "nostalgic, 85 bpm", "warm storytelling vocals", "great production quality"],
    secondsPerLine: 4.0,
  },
] as const satisfies readonly Variation[];

export type VariationId = (typeof VARIATIONS)[number]["id"];

export const VARIATION_IDS = VARIATIONS.map((variation) => variation.id) as [VariationId, ...VariationId[]];

export const DEFAULT_VARIATION_IDS: readonly VariationId[] = ["ballad", "pop", "mizrahi"];

export const MAX_VARIATIONS_PER_REQUEST = 4;

const VARIATIONS_BY_ID: ReadonlyMap<string, Variation> = new Map(VARIATIONS.map((variation) => [variation.id, variation]));

export function getVariation(id: VariationId): Variation {
  const variation = VARIATIONS_BY_ID.get(id);
  if (!variation) throw new Error(`Unknown variation: ${id}`);
  return variation;
}
