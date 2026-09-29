/* eslint-disable @next/next/no-img-element -- static 3D icons */
import type { Tone } from "./theme";

export interface Stat {
  readonly label: string;
  readonly value: number;
  readonly hint: string;
  /** File name in /public/illustrations, without extension. */
  readonly icon: string;
  readonly tone: Tone;
}

/** Counters of real app data (nothing here is decorative). */
export function StatTiles({ stats }: { readonly stats: readonly Stat[] }) {
  return (
    <section className="stats" aria-label="נתונים">
      {stats.map((stat) => (
        <div key={stat.label} className="stat" data-tone={stat.tone}>
          <img className="stat__icon" src={`/illustrations/${stat.icon}.webp`} alt="" width={141} height={141} />
          <span className="stat__label">{stat.label}</span>
          <span className="stat__value">{stat.value.toLocaleString("he-IL")}</span>
          <span className="stat__hint">{stat.hint}</span>
        </div>
      ))}
    </section>
  );
}
