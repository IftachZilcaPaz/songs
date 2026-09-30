"use client";

/* eslint-disable @next/next/no-img-element -- static decorative illustrations */
import { useState, type FormEvent } from "react";
import { errorMessage, verifyAccessCode } from "@/lib/client/api";

interface AccessGateProps {
  readonly onUnlock: (code: string) => void;
}

/** Entry screen shown when the studio is protected by an access code. */
export function AccessGate({ onUnlock }: AccessGateProps) {
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    setError(null);
    try {
      await verifyAccessCode(trimmed);
      onUnlock(trimmed);
    } catch (caught) {
      setError(errorMessage(caught));
      setChecking(false);
    }
  };

  return (
    <div className="gate">
      <img className="gate__plant gate__plant--a" src="/illustrations/login-plant-a.webp" alt="" width={348} height={900} />
      <img className="gate__plant gate__plant--b" src="/illustrations/login-plant-b.webp" alt="" width={342} height={990} />

      <main className="gate__stage">
        <img className="gate__scene float-slow" src="/illustrations/roni-gate.svg" alt="" width={620} height={404} />

        <form className="gate__card" onSubmit={onSubmit}>
          <h1>ברוכים הבאים!</h1>
          <p className="gate__subtitle">הזינו את קוד הגישה כדי להיכנס לשירונית</p>

          <label className="gate__field">
            <span className="gate__field-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4.5" y="10.5" width="15" height="10.5" rx="3" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="visually-hidden">קוד גישה</span>
            <input
              type={visible ? "text" : "password"}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="קוד גישה"
              autoComplete="off"
              autoFocus
              required
            />
            <button
              type="button"
              className="gate__eye"
              onClick={() => setVisible((value) => !value)}
              aria-label={visible ? "הסתרת הקוד" : "הצגת הקוד"}
              aria-pressed={visible}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {!visible && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </label>

          {error && (
            <p className="gate__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button--gradient" disabled={checking || !code.trim()}>
            {checking ? "בודקים..." : "כניסה"}
          </button>

          <p className="gate__footer">אין לכם קוד? בקשו אותו ממי ששיתף אתכם.</p>
        </form>
      </main>
    </div>
  );
}
