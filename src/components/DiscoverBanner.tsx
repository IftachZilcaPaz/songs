/* eslint-disable @next/next/no-img-element -- static decorative illustration */

/** Closing invitation to write another song. */
export function DiscoverBanner() {
  return (
    <section className="discover" aria-label="שיר נוסף">
      <img className="discover__star wiggle" src="/illustrations/star.webp" alt="" width={228} height={216} />
      <p className="discover__text">
        יש עוד מישהו שמגיע לו שיר? ✨
        <span>כמה משפטים עליו, וזה מתחיל.</span>
      </p>
      <a className="button button--sage" href="#create">
        שיר חדש
      </a>
    </section>
  );
}
