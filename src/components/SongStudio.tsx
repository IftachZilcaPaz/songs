"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { INPUT_TEXT_MAX, INPUT_TEXT_MIN, type SubjectGender, type Vocal } from "@/lib/songs/types";
import {
  DEFAULT_VARIATION_IDS,
  getVariation,
  MAX_VARIATIONS_PER_REQUEST,
  VARIATIONS,
  type VariationId,
} from "@/lib/songs/variations";
import { ChipGroup, MultiChipGroup, type ChipOption } from "./ChipGroup";
import { PersonalLexicon } from "./PersonalLexicon";
import { SongCard } from "./SongCard";
import { usePersonalLexicon } from "./usePersonalLexicon";
import { useSongBatch } from "./useSongBatch";

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

const VARIATION_OPTIONS: readonly ChipOption<VariationId>[] = VARIATIONS.map((variation) => ({
  value: variation.id,
  label: variation.label,
  hint: variation.blurb,
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
  const [accessCode, setAccessCode] = useState("");
  const lexicon = usePersonalLexicon();
  const memory = useMemo(() => ({ lexicon: lexicon.entries, avoidWords: lexicon.avoidWords }), [lexicon.entries, lexicon.avoidWords]);
  const { results, generate, regenerate, replaceSong, isBusy } = useSongBatch(accessCode, memory);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from browser-only storage after mount
    if (accessCodeRequired) setAccessCode(readStoredAccessCode());
  }, [accessCodeRequired]);

  const trimmedLength = text.trim().length;
  const canSubmit =
    trimmedLength >= INPUT_TEXT_MIN &&
    trimmedLength <= INPUT_TEXT_MAX &&
    variationIds.length > 0 &&
    (!accessCodeRequired || accessCode.length > 0) &&
    !isBusy;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (accessCodeRequired) storeAccessCode(accessCode);
    generate(variationIds, { text: text.trim(), subjectGender });
  };

  return (
    <main className="studio">
      <header className="hero">
        <h1>סטודיו לשירים</h1>
        <p>כתבו על מישהו או על משהו, בחרו סגנונות, וקבלו שיר מקורי בכמה גרסאות.</p>
      </header>

      <form className="panel" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">על מי או על מה השיר?</span>
          <textarea
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

        {accessCodeRequired && (
          <label className="field field--inline">
            <span className="field__label">קוד גישה</span>
            <input
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.trim())}
              autoComplete="off"
              required
            />
          </label>
        )}

        <button type="submit" className="button button--primary" disabled={!canSubmit}>
          {isBusy ? "כותבים..." : variationIds.length > 1 ? `כתבו ${variationIds.length} גרסאות` : "כתבו שיר"}
        </button>
      </form>

      {results.size > 0 && (
        <section className="results" aria-live="polite">
          {[...results].map(([id, result]) => (
            <SongCard
              key={id}
              variation={getVariation(id)}
              result={result}
              onRegenerate={() => regenerate(id)}
              onSongChange={(song) => replaceSong(id, song)}
              onRememberSpelling={lexicon.save}
              onAvoidWord={lexicon.avoid}
              audioEnabled={audioEnabled}
              vocal={vocal}
              accessCode={accessCode}
            />
          ))}
        </section>
      )}

      <PersonalLexicon
        entries={lexicon.entries}
        avoidWords={lexicon.avoidWords}
        onRemove={lexicon.remove}
        onUnavoid={lexicon.unavoid}
      />
    </main>
  );
}
