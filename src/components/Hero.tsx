/** Welcome banner with a small decorative record-player illustration. */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__text">
        <h2 id="hero-title">בואו נכתוב שיר ✨</h2>
        <p>ספרו על מישהו שאתם אוהבים, בחרו סגנונות, וקבלו שיר מקורי בעברית בכמה גרסאות.</p>
        <a className="button button--primary" href="#create">
          <span aria-hidden="true">▶</span> מתחילים
        </a>
      </div>
      <svg className="hero__art" viewBox="0 0 200 160" aria-hidden="true" focusable="false">
        <ellipse cx="100" cy="146" rx="78" ry="8" className="hero__shadow" />
        <rect x="28" y="70" width="144" height="70" rx="18" className="hero__box" />
        <circle cx="92" cy="92" r="40" className="hero__record" />
        <circle cx="92" cy="92" r="28" className="hero__groove" />
        <circle cx="92" cy="92" r="12" className="hero__label" />
        <circle cx="92" cy="92" r="3" className="hero__spindle" />
        <path d="M150 58 L150 96 L128 110" className="hero__arm" />
        <circle cx="150" cy="56" r="7" className="hero__knob" />
        <path d="M40 40 v-22 l16 -5 v22" className="hero__note" />
        <circle cx="36" cy="40" r="5" className="hero__note-head" />
        <circle cx="52" cy="35" r="5" className="hero__note-head" />
        <path d="M168 26 v-16" className="hero__note" />
        <circle cx="164" cy="27" r="5" className="hero__note-head" />
      </svg>
    </section>
  );
}
