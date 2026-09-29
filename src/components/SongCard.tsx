"use client";

import { useState } from "react";
import { SECTION_LABELS, type Song, type SongSection, type Vocal } from "@/lib/songs/types";
import type { Variation } from "@/lib/songs/variations";
import type { SongResult } from "./useSongBatch";
import { useSongAudio, type AudioState } from "./useSongAudio";

interface SongCardProps {
  readonly variation: Variation;
  readonly result: SongResult;
  readonly onRegenerate: () => void;
  readonly audioEnabled: boolean;
  readonly vocal: Vocal;
  readonly accessCode: string;
}

export function SongCard({ variation, result, onRegenerate, ...audio }: SongCardProps) {
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

      {result.status === "done" && <SongBody song={result.song} onRegenerate={onRegenerate} {...audio} />}
    </article>
  );
}

interface SongBodyProps {
  readonly song: Song;
  readonly onRegenerate: () => void;
  readonly audioEnabled: boolean;
  readonly vocal: Vocal;
  readonly accessCode: string;
}

function lyricsAsText(song: Song): string {
  const sections = song.sections.map((section) => `${SECTION_LABELS[section.kind]}\n${section.displayLines.join("\n")}`);
  return [song.title, ...sections].join("\n\n");
}

function SongBody({ song, onRegenerate, audioEnabled, vocal, accessCode }: SongBodyProps) {
  const [showVoice, setShowVoice] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lyricsAsText(song));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="lyrics">
        {song.sections.map((section, index) => (
          <LyricsSection key={index} section={section} showVoice={showVoice} />
        ))}
      </div>

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

      {audioEnabled && <SongAudio song={song} vocal={vocal} accessCode={accessCode} />}
    </>
  );
}

function LyricsSection({ section, showVoice }: { readonly section: SongSection; readonly showVoice: boolean }) {
  const lines = showVoice ? section.voiceLines : section.displayLines;
  return (
    <section className="lyrics__section" data-kind={section.kind}>
      <h3 className="lyrics__label">{SECTION_LABELS[section.kind]}</h3>
      {lines.map((line, index) => (
        <p key={index} className="lyrics__line">
          {line}
        </p>
      ))}
    </section>
  );
}

const AUDIO_LOADING_TEXT = {
  preview: "מייצרים דוגמה קצרה...",
  full: "מייצרים את השיר המלא. זה יכול לקחת עד דקה...",
} as const;

function SongAudio({ song, vocal, accessCode }: { readonly song: Song; readonly vocal: Vocal; readonly accessCode: string }) {
  const { state, render } = useSongAudio(song, vocal, accessCode);
  const loading = state.status === "loading";

  return (
    <div className="audio">
      <div className="card__actions">
        <button type="button" className="button button--secondary" disabled={loading} onClick={() => render("preview")}>
          השמעת דוגמה קצרה
        </button>
        <button type="button" className="button" disabled={loading} onClick={() => render("full")}>
          יצירת השיר המלא
        </button>
      </div>
      <p className="audio__hint">כדאי להתחיל בדוגמה: שומעים את השם ואת המילים הבעייתיות לפני שמייצרים את כל השיר.</p>
      <AudioStatus state={state} title={song.title} />
    </div>
  );
}

function AudioStatus({ state, title }: { readonly state: AudioState; readonly title: string }) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <p className="card__status pulse">{AUDIO_LOADING_TEXT[state.mode]}</p>;
    case "error":
      return (
        <p className="card__error" role="alert">
          {state.message}
        </p>
      );
    case "ready":
      return (
        <div className="audio__player">
          <audio controls src={state.url} autoPlay />
          <a className="button button--ghost" href={state.url} download={`${title}${state.mode === "preview" ? " (דוגמה)" : ""}.mp3`}>
            הורדה
          </a>
        </div>
      );
  }
}
