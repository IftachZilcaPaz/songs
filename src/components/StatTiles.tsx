import type { Tone } from "./theme";

export interface Stat {
  readonly label: string;
  readonly value: number;
  readonly hint: string;
  readonly icon: string;
  readonly tone: Tone;
}

/** Small counters of real app data (nothing here is decorative). */
export function StatTiles({ stats }: { readonly stats: readonly Stat[] }) {
  return (
    <section className="stats" aria-label="נתונים">
      {stats.map((stat) => (
        <div key={stat.label} className="stat" data-tone={stat.tone}>
          <span className="stat__icon" aria-hidden="true">
            {stat.icon}
          </span>
          <span className="stat__label">{stat.label}</span>
          <span className="stat__value">{stat.value.toLocaleString("he-IL")}</span>
          <span className="stat__hint">{stat.hint}</span>
        </div>
      ))}
    </section>
  );
}
