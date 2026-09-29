"use client";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "#create", label: "כתיבת שיר", icon: "✍️" },
  { href: "#songs", label: "השירים שלי", icon: "🎵" },
  { href: "#dictionary", label: "המילון שלי", icon: "📖" },
];

/** App navigation: a side rail on wide screens, a pill bar on phones. */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden="true">
          🎧
        </span>
        <span className="sidebar__hello">שלום! 👋</span>
      </div>

      <nav aria-label="ניווט">
        <ul className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a className="sidebar__link" href={item.href}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__tip">
        <span className="sidebar__tip-icon" aria-hidden="true">
          💡
        </span>
        <strong>טיפ</strong>
        <p>שירים עם שמות, מקומות ובדיחות פרטיות יוצאים הכי אישיים.</p>
      </div>
    </aside>
  );
}
