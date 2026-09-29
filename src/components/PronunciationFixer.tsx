"use client";

import { useEffect, useState } from "react";
import { errorMessage, isAbortError, requestPronunciationOptions } from "@/lib/client/api";
import { stripNiqqud } from "@/lib/hebrew/niqqud";
import { getWordAt, replaceWordInLine, type FixScope, type WordLocation } from "@/lib/songs/edit";
import type { PronunciationOption, Song, Vocal } from "@/lib/songs/types";
import { AudioStatus } from "./AudioStatus";
import { useHebrewSpeech } from "./useHebrewSpeech";
import { lineAudioRequest, useAudioRender } from "./useSongAudio";

type OptionsState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly options: readonly PronunciationOption[] }
  | { readonly status: "error"; readonly message: string };

export interface PronunciationChoice {
  readonly spelling: string;
  readonly scope: FixScope;
  readonly remember: boolean;
}

interface PronunciationFixerProps {
  readonly song: Song;
  readonly location: WordLocation;
  readonly vocal: Vocal;
  readonly accessCode: string;
  readonly audioEnabled: boolean;
  readonly onChoose: (choice: PronunciationChoice) => void;
  /** No spelling works: keep this word out of future songs. */
  readonly onAvoid: (word: string) => void;
  readonly onClose: () => void;
}

/**
 * Suggests alternative spellings for one word, lets the user hear each one
 * sung in its line, and applies the one that sounds right.
 * Mount with a `key` per word so its state starts fresh.
 */
export function PronunciationFixer({ song, location, vocal, accessCode, audioEnabled, onChoose, onAvoid, onClose }: PronunciationFixerProps) {
  const word = getWordAt(song, location) ?? "";
  const line = song.sections[location.sectionIndex]?.voiceLines[location.lineIndex] ?? "";

  const [attempt, setAttempt] = useState(0);
  const [options, setOptions] = useState<OptionsState>({ status: "loading" });
  const [everywhere, setEverywhere] = useState(true);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    requestPronunciationOptions({ word, line }, accessCode, controller.signal)
      .then((result) => setOptions({ status: "ready", options: result }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setOptions({ status: "error", message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [word, line, accessCode, attempt]);

  const retry = () => {
    setOptions({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  const choose = (spelling: string) => onChoose({ spelling, scope: everywhere ? "song" : "line", remember });
  const lineWith = (spelling: string) => replaceWordInLine(line, location.wordIndex, spelling);

  return (
    <section className="fixer" aria-label={`תיקון הגייה: ${stripNiqqud(word)}`}>
      <header className="fixer__header">
        <h3>
          תיקון הגייה: <span className="fixer__word">{stripNiqqud(word)}</span>
        </h3>
        <button type="button" className="button button--ghost" onClick={onClose}>
          סגירה
        </button>
      </header>
      <p className="fixer__line">{stripNiqqud(line)}</p>

      {audioEnabled && (
        <OptionRow label="הכתיב הנוכחי" spelling={word} line={line} song={song} vocal={vocal} accessCode={accessCode} audioEnabled />
      )}

      {options.status === "loading" && <p className="card__status pulse">מחפשים דרכים אחרות לכתוב את המילה...</p>}

      {options.status === "error" && (
        <div className="card__error" role="alert">
          <p>{options.message}</p>
          <button type="button" className="button button--ghost" onClick={retry}>
            נסו שוב
          </button>
        </div>
      )}

      {options.status === "ready" && (
        <>
          {options.options.map((option) => (
            <OptionRow
              key={option.spelling}
              label={option.hint}
              sayAs={option.sayAs}
              spelling={option.spelling}
              line={lineWith(option.spelling)}
              song={song}
              vocal={vocal}
              accessCode={accessCode}
              audioEnabled={audioEnabled}
              onChoose={() => choose(option.spelling)}
            />
          ))}

          <div className="fixer__settings">
            <label className="check">
              <input type="checkbox" checked={everywhere} onChange={(event) => setEverywhere(event.target.checked)} />
              להחליף בכל השיר (אחרת רק בשורה הזו)
            </label>
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              לזכור את הכתיב הזה לשירים הבאים
            </label>
            <button type="button" className="button button--ghost" onClick={retry}>
              אפשרויות אחרות
            </button>
          </div>
        </>
      )}

      {options.status !== "loading" && (
        <button type="button" className="button button--ghost fixer__avoid" onClick={() => onAvoid(stripNiqqud(word))}>
          אף אפשרות לא עובדת: לא להשתמש במילה הזו בשירים הבאים
        </button>
      )}
    </section>
  );
}

interface OptionRowProps {
  readonly label: string;
  readonly sayAs?: string;
  readonly spelling: string;
  /** The line with this spelling in place, for the sung audition. */
  readonly line: string;
  readonly song: Song;
  readonly vocal: Vocal;
  readonly accessCode: string;
  readonly audioEnabled: boolean;
  readonly onChoose?: () => void;
}

function OptionRow({ label, sayAs, spelling, line, song, vocal, accessCode, audioEnabled, onChoose }: OptionRowProps) {
  const { state, render } = useAudioRender(accessCode);
  const speech = useHebrewSpeech();

  return (
    <div className="option" data-current={!onChoose}>
      <div className="option__text">
        <span className="option__spelling">{spelling}</span>
        {sayAs && (
          <span className="option__say" dir="ltr">
            {sayAs}
          </span>
        )}
        <span className="option__hint">{label}</span>
      </div>
      <div className="option__actions">
        {speech.supported && (
          <button
            type="button"
            className="button button--ghost"
            onClick={() => speech.speak([line])}
            title="הקראה חינמית: בודקת את הניקוד, לא את השירה"
          >
            הקראת הניקוד
          </button>
        )}
        {audioEnabled && (
          <button
            type="button"
            className="button button--secondary"
            disabled={state.status === "loading"}
            onClick={() => render(lineAudioRequest(song, vocal, line))}
          >
            השמעה
          </button>
        )}
        {onChoose && (
          <button type="button" className="button" onClick={onChoose}>
            בחירה
          </button>
        )}
      </div>
      <AudioStatus state={state} loadingText="מייצרים שורה לשמיעה..." />
    </div>
  );
}
