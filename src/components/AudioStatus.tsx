"use client";

import type { AudioState } from "./useSongAudio";

interface AudioStatusProps {
  readonly state: AudioState;
  readonly loadingText: string;
  /** Offers a download link when set. */
  readonly fileName?: string;
  readonly autoPlay?: boolean;
}

export function AudioStatus({ state, loadingText, fileName, autoPlay = true }: AudioStatusProps) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <p className="card__status pulse">{loadingText}</p>;
    case "error":
      return (
        <p className="card__error" role="alert">
          {state.message}
        </p>
      );
    case "ready":
      return (
        <div className="audio__player">
          <audio controls src={state.url} autoPlay={autoPlay} />
          {fileName && (
            <a className="button button--ghost" href={state.url} download={fileName}>
              הורדה
            </a>
          )}
        </div>
      );
  }
}
