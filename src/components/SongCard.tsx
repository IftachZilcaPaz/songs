"use client";

import { useState } from "react";
import { splitWords } from "@/lib/hebrew/lexicon";
import { applyWordFix, type WordLocation } from "@/lib/songs/edit";
import { SECTION_LABELS, type Song, type SongSection, type Vocal } from "@/lib/songs/types";
import type { Variation } from "@/lib/songs/variations";
import { AudioStatus } from "./AudioStatus";
import { PronunciationFixer, type PronunciationChoice } from "./PronunciationFixer";
import type { SongResult } from "./useSongBatch";
import { songAudioRequest, useAudioRender } from "./useSongAudio";

interface SongContext {
  readonly audioEnabled: boolean;
  readonly vocal: Vocal;
  readonly accessCode: string;
  /** Called with the edited song after a pronunciation fix. */
  readonly onSongChange: (song: Song) => void;
  /** Remembers a spelling for future songs. */
  readonly onRememberSpelling: (spelling: string) => void;
}

interface SongCardProps extends SongContext {
  readonly variation: Variation;
  readonly result: SongResult;
  readonly onRegenerate: () => void;
}

export function SongCard({ variation, result, onRegenerate, ...context }: SongCardProps) {
  return (
    <article className="card" aria-busy={result.status === "loading"}>
      <header className="card__header">
        <span className="card__tag">{variation.label}</span>
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

      {result.status === "done" && <SongBody song={result.song} onRegenerate={onRegenerate} {...context} />}
    </article>
  );
}

interface SongBodyProps extends SongContext {
  readonly song: Song;
  readonly onRegenerate: () => void;
}

function lyricsAsText(song: Song): string {
  const sections = song.sections.map((section) => `${SECTION_LABELS[section.kind]}\n${section.displayLines.join("\n")}`);
  return [song.title, ...sections].join("\n\n");
}

const sameLocation = (a: WordLocation | null, b: WordLocation) =>
  a !== null && a.sectionIndex === b.sectionIndex && a.lineIndex === b.lineIndex && a.wordIndex === b.wordIndex;

function SongBody({ song, onRegenerate, onSongChange, onRememberSpelling, ...audio }: SongBodyProps) {
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
    onSongChange(applyWordFix(song, location, spelling, scope));
    if (remember) onRememberSpelling(spelling);
    setSelected(null);
  };

  return (
    <>
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
        <button type="button" className="button button--ghost" onClick={toggleFixing} aria-pressed={fixing}>
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

      {audio.audioEnabled && <SongAudio song={song} vocal={audio.vocal} accessCode={audio.accessCode} />}
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

function SongAudio({ song, vocal, accessCode }: { readonly song: Song; readonly vocal: Vocal; readonly accessCode: string }) {
  const { state, render } = useAudioRender(accessCode);
  const loading = state.status === "loading";
  const suffix = state.status === "ready" && state.mode === "preview" ? " (דוגמה)" : "";

  return (
    <div className="audio">
      <div className="card__actions">
        <button type="button" className="button button--secondary" disabled={loading} onClick={() => render(songAudioRequest(song, vocal, "preview"))}>
          השמעת דוגמה קצרה
        </button>
        <button type="button" className="button" disabled={loading} onClick={() => render(songAudioRequest(song, vocal, "full"))}>
          יצירת השיר המלא
        </button>
      </div>
      <p className="audio__hint">כדאי להתחיל בדוגמה: שומעים את השם ואת המילים הבעייתיות לפני שמייצרים את כל השיר.</p>
      <AudioStatus
        state={state}
        loadingText={state.status === "loading" ? AUDIO_LOADING_TEXT[state.mode] : ""}
        fileName={`${song.title}${suffix}.mp3`}
      />
    </div>
  );
}
