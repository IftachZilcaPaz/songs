/* eslint-disable @next/next/no-img-element -- static decorative illustrations */

/** Welcome banner: Ronit with her headphones, the invitation, and a plant, standing on a shelf. */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero__girl float-slow" src="/illustrations/roni-hero.svg" alt="" width={360} height={376} />
      <div className="hero__text">
        <h2 id="hero-title">בואו נכתוב שיר! ☀️</h2>
        <p>ספרו על מישהו שאתם אוהבים, ונהפוך את זה לשיר מקורי.</p>
        <a className="button button--primary" href="#create">
          <span aria-hidden="true">▶</span> מתחילים
        </a>
      </div>
      <img className="hero__plant" src="/illustrations/plant.webp" alt="" width={194} height={308} />
      <span className="hero__shelf" aria-hidden="true" />
    </section>
  );
}
