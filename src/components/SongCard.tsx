"use client";

import { useState } from "react";
import { splitWords } from "@/lib/hebrew/lexicon";
import { applyWordFix, getWordAt, type WordLocation } from "@/lib/songs/edit";
import type { FixRecord } from "@/lib/songs/memory-export";
import { SECTION_LABELS, type AudioMode, type Song, type SongSection, type Vocal } from "@/lib/songs/types";
import type { Variation } from "@/lib/songs/variations";
import { AudioStatus } from "./AudioStatus";
import { PronunciationFixer, type PronunciationChoice } from "./PronunciationFixer";
import { useHebrewSpeech } from "./useHebrewSpeech";
import { getVariationTheme } from "./theme";
import type { ReviewState, SongResult } from "./useSongBatch";
import { songAudioRequest, useAudioRender } from "./useSongAudio";

interface SongContext {
  readonly audioEnabled: boolean;
  readonly vocal: Vocal;
  readonly accessCode: string;
  /** Called with the edited song after a pronunciation fix. */
  readonly onSongChange: (song: Song) => void;
  /** Remembers a spelling for future songs. */
  readonly onRememberSpelling: (spelling: string) => void;
  /** Logs a fix (before, after, line) for later review. */
  readonly onFixRecorded: (fix: FixRecord) => void;
  /** Keeps a word the engine cannot sing out of future songs. */
  readonly onAvoidWord: (word: string) => void;
}

interface SongCardProps extends SongContext {
  readonly variation: Variation;
  readonly result: SongResult;
  readonly onRegenerate: () => void;
}

export function SongCard({ variation, result, onRegenerate, ...context }: SongCardProps) {
  const theme = getVariationTheme(variation.id);
  return (
    <article className="card" data-tone={theme.tone} aria-busy={result.status === "loading"}>
      <header className="card__header">
        <span className="card__tag">
          <span className="card__tag-icon" aria-hidden="true">
            {theme.icon}
          </span>
          {variation.label}
        </span>
        {result.status === "done" && <h2 className="card__title">{result.song.title}</h2>}
      </header>

      {result.status === "loading" && <p className="card__status pulse">כותבים את השיר...</p>}

      {result.status === "error" && (
        <div className="card__error" role="alert">
          <p>{result.message}</p>
          <button type="button" className="button button--ghost" onClick={onRegenerate}>
            נסו שוב
          </button>
        </div>
      )}

      {result.status === "done" && <SongBody song={result.song} review={result.review} onRegenerate={onRegenerate} {...context} />}
    </article>
  );
}

interface SongBodyProps extends SongContext {
  readonly song: Song;
  readonly review: ReviewState;
  readonly onRegenerate: () => void;
}

function lyricsAsText(song: Song): string {
  const sections = song.sections.map((section) => `${SECTION_LABELS[section.kind]}\n${section.displayLines.join("\n")}`);
  return [song.title, ...sections].join("\n\n");
}

const sameLocation = (a: WordLocation | null, b: WordLocation) =>
  a !== null && a.sectionIndex === b.sectionIndex && a.lineIndex === b.lineIndex && a.wordIndex === b.wordIndex;

function SongBody({ song, review, onRegenerate, onSongChange, onRememberSpelling, onFixRecorded, onAvoidWord, ...audio }: SongBodyProps) {
  // Edits and paid audio wait for the pronunciation review, which may still change the lyrics.
  const reviewing = review.status === "running";
  const [showVoice, setShowVoice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [selected, setSelected] = useState<WordLocation | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lyricsAsText(song));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const toggleFixing = () => {
    setFixing((value) => !value);
    setSelected(null);
  };

  const applyChoice = (location: WordLocation, { spelling, scope, remember }: PronunciationChoice) => {
    const before = getWordAt(song, location);
    const line = song.sections[location.sectionIndex]?.displayLines[location.lineIndex];
    onSongChange(applyWordFix(song, location, spelling, scope));
    if (remember) onRememberSpelling(spelling);
    if (before !== undefined && line !== undefined) onFixRecorded({ before, after: spelling, line });
    setSelected(null);
  };

  return (
    <>
      <ReviewNotice review={review} />

      {fixing && <p className="notice">לחצו על מילה שלא נשמעה טוב, ותקבלו כמה דרכים לכתוב אותה לשמיעה ולבחירה.</p>}

      <div className="lyrics">
        {song.sections.map((section, sectionIndex) => (
          <LyricsSection
            key={sectionIndex}
            section={section}
            showVoice={showVoice}
            selectedWord={selected?.sectionIndex === sectionIndex ? selected : null}
            onWordClick={
              fixing
                ? (lineIndex, wordIndex) => {
                    const location = { sectionIndex, lineIndex, wordIndex };
                    setSelected((current) => (sameLocation(current, location) ? null : location));
                  }
                : undefined
            }
          />
        ))}
      </div>

      {selected && (
        <PronunciationFixer
          key={`${selected.sectionIndex}:${selected.lineIndex}:${selected.wordIndex}`}
          song={song}
          location={selected}
          vocal={audio.vocal}
          accessCode={audio.accessCode}
          audioEnabled={audio.audioEnabled}
          onChoose={(choice) => applyChoice(selected, choice)}
          onAvoid={(word) => {
            onAvoidWord(word);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {song.warnings.length > 0 && (
        <ul className="notice notice--warning">
          {song.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {song.checkByEar.length > 0 && (
        <p className="notice">
          <strong>לבדיקה באוזן:</strong> {song.checkByEar.join(" · ")}
        </p>
      )}

      <div className="card__actions">
        <button type="button" className="button button--ghost" onClick={toggleFixing} aria-pressed={fixing} disabled={reviewing}>
          {fixing ? "סיום תיקון הגייה" : "תיקון הגייה"}
        </button>
        <button type="button" className="button button--ghost" onClick={copy}>
          {copied ? "הועתק" : "העתקת המילים"}
        </button>
        <button type="button" className="button button--ghost" onClick={() => setShowVoice((value) => !value)} aria-pressed={showVoice}>
          {showVoice ? "טקסט לתצוגה" : "טקסט לקול"}
        </button>
        <button type="button" className="button button--ghost" onClick={onRegenerate}>
          גרסה חדשה
        </button>
      </div>

      <SongSpeech song={song} />

      {audio.audioEnabled && <SongAudio song={song} vocal={audio.vocal} accessCode={audio.accessCode} disabled={reviewing} />}
    </>
  );
}

interface LyricsSectionProps {
  readonly section: SongSection;
  readonly showVoice: boolean;
  readonly selectedWord: WordLocation | null;
  /** When set, words become buttons (pronunciation-fix mode). */
  readonly onWordClick?: (lineIndex: number, wordIndex: number) => void;
}

function LyricsSection({ section, showVoice, selectedWord, onWordClick }: LyricsSectionProps) {
  const lines = showVoice ? section.voiceLines : section.displayLines;
  return (
    <section className="lyrics__section" data-kind={section.kind}>
      <h3 className="lyrics__label">{SECTION_LABELS[section.kind]}</h3>
      {lines.map((line, lineIndex) => (
        <p key={lineIndex} className="lyrics__line">
          {onWordClick ? (
            <ClickableLine
              line={line}
              selectedWordIndex={selectedWord?.lineIndex === lineIndex ? selectedWord.wordIndex : null}
              onWordClick={(wordIndex) => onWordClick(lineIndex, wordIndex)}
            />
          ) : (
            line
          )}
        </p>
      ))}
    </section>
  );
}

interface ClickableLineProps {
  readonly line: string;
  readonly selectedWordIndex: number | null;
  readonly onWordClick: (wordIndex: number) => void;
}

function ClickableLine({ line, selectedWordIndex, onWordClick }: ClickableLineProps) {
  let wordIndex = -1;
  return splitWords(line).map((segment, index) => {
    if (!segment.isWord) return <span key={index}>{segment.text}</span>;
    const current = ++wordIndex;
    return (
      <button
        key={index}
        type="button"
        className="word"
        aria-pressed={current === selectedWordIndex}
        onClick={() => onWordClick(current)}
      >
        {segment.text}
      </button>
    );
  });
}

const AUDIO_LOADING_TEXT = {
  preview: "מייצרים דוגמה קצרה...",
  full: "מייצרים את השיר המלא. זה יכול לקחת עד דקה...",
} as const;

function ReviewNotice({ review }: { readonly review: ReviewState }) {
  switch (review.status) {
    case "running":
      return <p className="notice pulse">בודקים את ההגייה של כל שורה לפני השמיעה...</p>;
    case "failed":
      return <p className="notice">בדיקת ההגייה לא הצליחה ({review.message}). אפשר להמשיך כרגיל.</p>;
    case "done":
      if (review.fixes.length === 0) return <p className="notice">בדיקת ההגייה עברה על כל השורות ולא מצאה בעיות.</p>;
      return (
        <details className="notice">
          <summary>
            בדיקת ההגייה תיקנה {review.fixes.length.toLocaleString("he-IL")}{" "}
            {review.fixes.length === 1 ? "שורה" : "שורות"} (רק ניקוד, המילים לא השתנו)
          </summary>
          <ul className="review__list">
            {review.fixes.map((fix) => (
              <li key={`${fix.sectionIndex}:${fix.lineIndex}`}>
                <strong>{fix.words.join(", ")}</strong>: {fix.reason}
              </li>
            ))}
          </ul>
        </details>
      );
  }
}

/** Free read-aloud with the device's Hebrew voice, to check the voice text before paying for audio. */
function SongSpeech({ song }: { readonly song: Song }) {
  const { supported, speaking, speak, stop } = useHebrewSpeech();
  if (!supported) return null;
  return (
    <div className="card__actions">
      <button
        type="button"
        className="button button--ghost"
        onClick={() => (speaking ? stop() : speak(song.sections.flatMap((section) => section.voiceLines)))}
        aria-pressed={speaking}
      >
        {speaking ? "עצירת ההקראה" : "הקראה חינמית של הניקוד"}
      </button>
      <span className="audio__hint">בודקת מה הניקוד אומר, לא איך הזמר ישיר.</span>
    </div>
  );
}

interface SongAudioProps {
  readonly song: Song;
  readonly vocal: Vocal;
  readonly accessCode: string;
  readonly disabled: boolean;
}

function SongAudio({ song, vocal, accessCode, disabled }: SongAudioProps) {
  const { state, render } = useAudioRender(accessCode);
  // The song object is replaced on every pronunciation fix, so identity tells us the audio is outdated.
  const [renderedSong, setRenderedSong] = useState<Song | null>(null);
  const loading = state.status === "loading" || disabled;
  const suffix = state.status === "ready" && state.mode === "preview" ? " (דוגמה)" : "";
  const outdated = state.status === "ready" && renderedSong !== song;

  const renderSong = (mode: AudioMode) => {
    setRenderedSong(song);
    void render(songAudioRequest(song, vocal, mode));
  };

  return (
    <div className="audio">
      <div className="card__actions">
        <button type="button" className="button button--secondary" disabled={loading} onClick={() => renderSong("preview")}>
          השמעת דוגמה קצרה
        </button>
        <button type="button" className="button" disabled={loading} onClick={() => renderSong("full")}>
          {outdated ? "יצירה מחדש עם התיקונים" : "יצירת השיר המלא"}
        </button>
      </div>
      {outdated ? (
        <p className="notice notice--warning">
          המילים השתנו מאז שההקלטה נוצרה. אפשר להמשיך לתקן מילים, ובסוף ליצור את השיר מחדש פעם אחת.
        </p>
      ) : (
        <p className="audio__hint">כדאי להתחיל בדוגמה: שומעים את השם ואת המילים הבעייתיות לפני שמייצרים את כל השיר.</p>
      )}
      <AudioStatus
        state={state}
        loadingText={state.status === "loading" ? AUDIO_LOADING_TEXT[state.mode] : ""}
        fileName={`${song.title}${suffix}.mp3`}
        autoPlay={!outdated}
      />
    </div>
  );
}
