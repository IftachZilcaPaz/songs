"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { INPUT_TEXT_MAX, INPUT_TEXT_MIN, type SubjectGender, type Vocal } from "@/lib/songs/types";
import {
  DEFAULT_VARIATION_IDS,
  getVariation,
  MAX_VARIATIONS_PER_REQUEST,
  VARIATIONS,
  type VariationId,
} from "@/lib/songs/variations";
import { AccessGate } from "./AccessGate";
import { ChipGroup, MultiChipGroup, type ChipOption } from "./ChipGroup";
import { DiscoverBanner } from "./DiscoverBanner";
import { Hero } from "./Hero";
import { PersonalLexicon } from "./PersonalLexicon";
import { Sidebar } from "./Sidebar";
import { SongCard } from "./SongCard";
import { StatTiles, type Stat } from "./StatTiles";
import { Tour } from "./Tour";
import { VARIATION_THEMES } from "./theme";
import { usePersonalLexicon } from "./usePersonalLexicon";
import { useSongBatch } from "./useSongBatch";
import { useStoredFlag } from "./useStoredFlag";

const ACCESS_CODE_STORAGE_KEY = "songs.accessCode";

const GENDER_OPTIONS: readonly ChipOption<SubjectGender>[] = [
  { value: "unspecified", label: "לזהות מהטקסט" },
  { value: "female", label: "עליה" },
  { value: "male", label: "עליו" },
  { value: "plural", label: "עליהם" },
];

const VOCAL_OPTIONS: readonly ChipOption<Vocal>[] = [
  { value: "auto", label: "לבחירת המנוע" },
  { value: "female", label: "זמרת" },
  { value: "male", label: "זמר" },
];

type GuideChoice = "on" | "off";

const GUIDE_OPTIONS: readonly ChipOption<GuideChoice>[] = [
  { value: "on", label: "עם הגייה באנגלית", hint: "כל שורה נשלחת גם באותיות לטיניות" },
  { value: "off", label: "בלי", hint: "רק הטקסט המנוקד" },
];

const VARIATION_OPTIONS: readonly ChipOption<VariationId>[] = VARIATIONS.map((variation) => ({
  value: variation.id,
  label: variation.label,
  hint: variation.blurb,
  ...VARIATION_THEMES[variation.id],
}));

function readStoredAccessCode(): string {
  try {
    return window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeAccessCode(code: string): void {
  try {
    window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code);
  } catch {
    // Storage can be unavailable (private mode); the code then lasts for this visit only.
  }
}

interface SongStudioProps {
  readonly audioEnabled: boolean;
  readonly accessCodeRequired: boolean;
}

export function SongStudio({ audioEnabled, accessCodeRequired }: SongStudioProps) {
  const [text, setText] = useState("");
  const [subjectGender, setSubjectGender] = useState<SubjectGender>("unspecified");
  const [variationIds, setVariationIds] = useState<readonly VariationId[]>(DEFAULT_VARIATION_IDS);
  const [vocal, setVocal] = useState<Vocal>("auto");
  const [pronunciationGuide, setPronunciationGuide] = useStoredFlag("songs.pronunciationGuide", true);
  // New users get the tour once; anyone can replay it from the top bar.
  const [tourSeen, setTourSeen, tourReady] = useStoredFlag("songs.tourSeen", false);
  const [tourReplay, setTourReplay] = useState(false);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const [accessCode, setAccessCode] = useState("");
  // "checking" until browser storage is read, so a returning user never sees the entry screen flash.
  const [gate, setGate] = useState<"checking" | "locked" | "open">(accessCodeRequired ? "checking" : "open");
  const lexicon = usePersonalLexicon();
  const singer = useMemo(() => ({ vocal, pronunciationGuide, lexicon: lexicon.entries }), [vocal, pronunciationGuide, lexicon.entries]);
  const memory = useMemo(() => ({ lexicon: lexicon.entries, avoidWords: lexicon.avoidWords }), [lexicon.entries, lexicon.avoidWords]);
  const { results, generate, regenerate, replaceSong, isBusy } = useSongBatch(accessCode, memory);

  useEffect(() => {
    if (!accessCodeRequired) return;
    const stored = readStoredAccessCode();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser-only storage after mount
    setAccessCode(stored);
    setGate(stored ? "open" : "locked");
  }, [accessCodeRequired]);

  const unlock = (code: string) => {
    storeAccessCode(code);
    setAccessCode(code);
    setGate("open");
  };

  const trimmedLength = text.trim().length;
  const canSubmit =
    trimmedLength >= INPUT_TEXT_MIN &&
    trimmedLength <= INPUT_TEXT_MAX &&
    variationIds.length > 0 &&
    !isBusy;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    generate(variationIds, { text: text.trim(), subjectGender });
  };

  const songsWritten = [...results.values()].filter((result) => result.status === "done").length;
  const stats: readonly Stat[] = [
    { label: "שירים בסבב הזה", value: songsWritten, hint: `מתוך ${results.size.toLocaleString("he-IL")} גרסאות`, icon: "icon-music", tone: "sage" },
    { label: "כתיבים שאהבתם", value: lexicon.entries.length, hint: "במילון שלי", icon: "icon-heart", tone: "peach" },
    { label: "תיקוני הגייה", value: lexicon.history.length, hint: "נשמרו לסבב הלמידה", icon: "icon-clock", tone: "butter" },
    { label: "סגנונות נבחרים", value: variationIds.length, hint: `עד ${MAX_VARIATIONS_PER_REQUEST} בכל פעם`, icon: "icon-flame", tone: "sky" },
  ];

  const closeTour = (start: boolean) => {
    setTourSeen(true);
    setTourReplay(false);
    // After the dialog closes, which hands focus back to whatever had it before.
    if (start) requestAnimationFrame(() => textArea.current?.focus());
  };

  if (gate === "checking") return null;
  if (gate === "locked") return <AccessGate onUnlock={unlock} />;

  return (
    <div className="app">
      <Sidebar />

      <main className="studio">
        <header className="topbar">
          <h1>השירונית של רונית</h1>
          <button type="button" className="topbar__help" onClick={() => setTourReplay(true)}>
            <span className="topbar__help-icon" aria-hidden="true">
              ?
            </span>
            איך זה עובד?
          </button>
          <span className="topbar__avatar" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static illustration */}
            <img src="/illustrations/roni-avatar.svg" alt="" width={236} height={236} />
          </span>
        </header>

        <Hero />

        <StatTiles stats={stats} />

        <form id="create" className="panel" onSubmit={onSubmit}>
          <h2 className="panel__title">
            <span className="panel__icon" aria-hidden="true">
              ✍️
            </span>
            על מי השיר?
          </h2>
          <label className="field">
            <span className="field__label">ספרו לנו על מי או על מה השיר</span>
            <textarea
              ref={textArea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={INPUT_TEXT_MAX}
              rows={8}
              placeholder="למשל: דנה חוגגת ארבעים. היא אמא לשלושה, רצה מרתונים, מכינה את השקשוקה הכי טובה בשכונה ותמיד מאחרת בעשר דקות..."
              required
            />
            <span className="field__meta">
              {trimmedLength < INPUT_TEXT_MIN
                ? `לפחות ${INPUT_TEXT_MIN} תווים. ככל שיש יותר פרטים, השיר אישי יותר.`
                : `${trimmedLength.toLocaleString("he-IL")} מתוך ${INPUT_TEXT_MAX.toLocaleString("he-IL")} תווים`}
            </span>
          </label>

          <ChipGroup legend="השיר הוא..." options={GENDER_OPTIONS} value={subjectGender} onChange={setSubjectGender} />

          <MultiChipGroup
            legend={`סגנונות (עד ${MAX_VARIATIONS_PER_REQUEST})`}
            options={VARIATION_OPTIONS}
            value={variationIds}
            onChange={setVariationIds}
            max={MAX_VARIATIONS_PER_REQUEST}
          />

          {audioEnabled && <ChipGroup legend="מי ישיר?" options={VOCAL_OPTIONS} value={vocal} onChange={setVocal} />}
          {audioEnabled && (
            <ChipGroup
              legend="הנחיית הגייה לזמר"
              options={GUIDE_OPTIONS}
              value={pronunciationGuide ? "on" : "off"}
              onChange={(choice) => setPronunciationGuide(choice === "on")}
            />
          )}

          <button type="submit" className="button button--primary" disabled={!canSubmit}>
            {isBusy ? "כותבים..." : variationIds.length > 1 ? `כתבו ${variationIds.length} גרסאות` : "כתבו שיר"}
          </button>
        </form>

        <section id="songs" className="songs" aria-labelledby="songs-title">
          <h2 id="songs-title" className="section-title">
            השירים שלי
          </h2>
          {results.size === 0 && <p className="empty">השירים שתכתבו יופיעו כאן.</p>}
          <div className="results" aria-live="polite">
            {[...results].map(([id, result]) => (
              <SongCard
                key={id}
                variation={getVariation(id)}
                result={result}
                onRegenerate={() => regenerate(id)}
                onSongChange={(song) => replaceSong(id, song)}
                onRememberSpelling={lexicon.save}
                onFixRecorded={lexicon.record}
                onAvoidWord={lexicon.avoid}
                audioEnabled={audioEnabled}
                singer={singer}
                accessCode={accessCode}
              />
            ))}
          </div>
        </section>

        <DiscoverBanner />

        <PersonalLexicon
          entries={lexicon.entries}
          avoidWords={lexicon.avoidWords}
          history={lexicon.history}
          onRemove={lexicon.remove}
          onUnavoid={lexicon.unavoid}
        />
      </main>

      {(tourReplay || (tourReady && !tourSeen)) && <Tour audioEnabled={audioEnabled} onClose={closeTour} />}
    </div>
  );
}
