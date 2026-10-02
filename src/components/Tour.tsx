"use client";

/* eslint-disable @next/next/no-img-element -- static decorative illustrations */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MAX_VARIATIONS_PER_REQUEST, VARIATIONS } from "@/lib/songs/variations";
import { VARIATION_THEMES, type Tone } from "./theme";

interface TourStep {
  readonly id: string;
  readonly tone: Tone;
  readonly title: string;
  readonly body: string;
  readonly visual: ReactNode;
  /** Shown only when the server can render audio. */
  readonly needsAudio?: boolean;
}

const DEMO_STYLES = VARIATIONS.slice(0, 4).map((variation) => ({ ...variation, ...VARIATION_THEMES[variation.id] }));

const STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    tone: "peach",
    title: "ברוכים הבאים לשירונית של רונית!",
    body: "כותבים כמה שורות על מישהו שאוהבים, ומקבלים שיר מקורי בעברית, בכמה סגנונות, עם זמר או זמרת. ככה זה עובד:",
    visual: (
      <div className="tour-demo tour-demo--welcome">
        <img className="tour-demo__roni float-slow" src="/illustrations/roni-hero.svg" alt="" width={360} height={376} />
        <span className="tour-demo__spark tour-demo__spark--a">✨</span>
        <span className="tour-demo__spark tour-demo__spark--b">🎵</span>
        <span className="tour-demo__spark tour-demo__spark--c">💛</span>
      </div>
    ),
  },
  {
    id: "write",
    tone: "butter",
    title: "מספרים על מי השיר",
    body: "כותבים חופשי: שם, גיל, תחביבים, בדיחות פרטיות ורגעים משותפים. ככל שיש יותר פרטים, השיר אישי יותר. בוחרים גם אם השיר עליה, עליו או עליהם.",
    visual: (
      <div className="tour-demo tour-demo--write">
        <div className="tour-demo__textarea">
          <span className="tour-demo__typing">דנה חוגגת ארבעים, רצה מרתונים ומכינה שקשוקה...</span>
        </div>
        <div className="tour-demo__chips">
          <span className="tour-demo__chip">עליו</span>
          <span className="tour-demo__chip tour-demo__chip--pick">עליה</span>
          <span className="tour-demo__chip">עליהם</span>
        </div>
      </div>
    ),
  },
  {
    id: "styles",
    tone: "lilac",
    title: "בוחרים סגנונות",
    body: `בלדה, פופ, מזרחית, ראפ ועוד. אפשר לבחור עד ${MAX_VARIATIONS_PER_REQUEST}, וכל סגנון יוצא שיר נפרד. לוחצים "כתבו שיר", וזהו.`,
    visual: (
      <div className="tour-demo tour-demo--styles">
        {DEMO_STYLES.map((style, index) => (
          <span key={style.id} className="tour-demo__style" data-tone={style.tone} style={{ animationDelay: `${0.4 + index * 0.45}s` }}>
            <span aria-hidden="true">{style.icon}</span>
            {style.label}
          </span>
        ))}
        <span className="tour-demo__submit">כתבו {DEMO_STYLES.length} גרסאות</span>
      </div>
    ),
  },
  {
    id: "writing",
    tone: "sage",
    title: "רונית כותבת ובודקת הגייה",
    body: "כל גרסה נכתבת עם ניקוד שמיועד לזמר, ומיד אחר כך עוברת בדיקת הגייה אוטומטית שמתקנת מילים שעלולות להישמע לא נכון.",
    visual: (
      <div className="tour-demo tour-demo--writing">
        <div className="tour-demo__card">
          <strong>דָנָה בת ארבעים</strong>
          <span className="tour-demo__line" style={{ animationDelay: "0.3s" }}>קמה עם הזריחה, יוצאת לריצה</span>
          <span className="tour-demo__line" style={{ animationDelay: "0.9s" }}>ריח של שַקְשוּקה עולה מהחלון</span>
          <span className="tour-demo__line" style={{ animationDelay: "1.5s" }}>דָנָה, דָנָה, היום את בת ארבעים</span>
          <span className="tour-demo__badge">✓ ההגייה נבדקה</span>
        </div>
      </div>
    ),
  },
  {
    id: "listen",
    tone: "sky",
    needsAudio: true,
    title: "שומעים דוגמה, ואז שיר שלם",
    body: 'קודם "השמעת דוגמה קצרה": שומעים את השם ואת המילים הקשות, בזול ומהר. נשמע טוב? "יצירת השיר המלא", ואפשר להוריד את הקובץ ולשלוח.',
    visual: (
      <div className="tour-demo tour-demo--listen">
        <div className="tour-demo__player">
          <span className="tour-demo__play" aria-hidden="true">▶</span>
          <span className="tour-demo__wave" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => (
              <i key={index} style={{ animationDelay: `${(index % 5) * 0.12}s` }} />
            ))}
          </span>
        </div>
        <div className="tour-demo__buttons">
          <span className="tour-demo__btn tour-demo__btn--soft">השמעת דוגמה קצרה</span>
          <span className="tour-demo__btn">יצירת השיר המלא</span>
        </div>
      </div>
    ),
  },
  {
    id: "fix",
    tone: "coral",
    title: "מתקנים מילה שנשמעה לא נכון",
    body: 'לוחצים "תיקון הגייה" ואז על המילה. מקבלים כמה כתיבים, שומעים כל אחד ובוחרים. "המילון שלי" זוכר את הבחירה לשירים הבאים.',
    visual: (
      <div className="tour-demo tour-demo--fix">
        <p className="tour-demo__lyric">
          ריח של <mark>שקשוקה</mark> עולה מהחלון
        </p>
        <div className="tour-demo__options">
          <span className="tour-demo__option">
            שקשוּקה <small dir="ltr">shak-SHU-ka</small>
          </span>
          <span className="tour-demo__option tour-demo__option--pick">
            שַקְשוּקה <small dir="ltr">shak-shu-KA</small>
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "ready",
    tone: "peach",
    title: "מוכנים? בואו נכתוב!",
    body: 'אפשר לחזור להסבר הזה בכל רגע, מהכפתור "איך זה עובד?" שלמעלה.',
    visual: (
      <div className="tour-demo tour-demo--ready">
        <img className="tour-demo__avatar float" src="/illustrations/roni-avatar.svg" alt="" width={236} height={236} />
        {["🎉", "🎶", "✨", "💛", "🎤", "🎉"].map((emoji, index) => (
          <span key={index} className="tour-demo__confetti" style={{ animationDelay: `${index * 0.25}s`, insetInlineStart: `${10 + index * 15}%` }}>
            {emoji}
          </span>
        ))}
      </div>
    ),
  },
];

interface TourProps {
  readonly audioEnabled: boolean;
  /** Called when the tour ends; `start` is true when the user chose to start writing. */
  readonly onClose: (start: boolean) => void;
}

/** Step-by-step introduction for new users, shown as a modal dialog. Mount it only while it is open. */
export function Tour({ audioEnabled, onClose }: TourProps) {
  const steps = STEPS.filter((step) => audioEnabled || !step.needsAudio);
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const step = steps[index]!;
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // showModal focuses the first control (skip); start on the main action instead.
    primary.current?.focus();
  }, []);

  const go = (next: number) => setIndex(Math.min(Math.max(next, 0), steps.length - 1));

  // Right-to-left: the left arrow moves forward.
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft") go(index + 1);
    if (event.key === "ArrowRight") go(index - 1);
  };

  return (
    <dialog
      ref={dialog}
      className="tour"
      data-tone={step.tone}
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        onClose(false);
      }}
    >
      <button type="button" className="tour__skip" onClick={() => onClose(false)}>
        דילוג
      </button>

      <div className="tour__stage" key={step.id} aria-hidden="true">
        {step.visual}
      </div>

      <div className="tour__content" key={`${step.id}-text`}>
        {!isFirst && !isLast && (
          <span className="tour__count">
            שלב {index} מתוך {steps.length - 2}
          </span>
        )}
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>
      </div>

      <footer className="tour__footer">
        <div className="tour__dots" role="group" aria-label="שלבי ההסבר">
          {steps.map((candidate, candidateIndex) => (
            <button
              key={candidate.id}
              type="button"
              className="tour__dot"
              aria-current={candidateIndex === index ? "step" : undefined}
              aria-label={`שלב ${candidateIndex + 1}: ${candidate.title}`}
              onClick={() => go(candidateIndex)}
            />
          ))}
        </div>
        <div className="tour__nav">
          {!isFirst && (
            <button type="button" className="button button--ghost" onClick={() => go(index - 1)}>
              הקודם
            </button>
          )}
          {isLast ? (
            <button ref={primary} type="button" className="button" onClick={() => onClose(true)} autoFocus>
              מתחילים לכתוב
            </button>
          ) : (
            <button ref={primary} type="button" className="button" onClick={() => go(index + 1)}>
              {isFirst ? "בואו נראה" : "הבא"}
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}
