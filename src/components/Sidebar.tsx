"use client";

import type { ReactNode } from "react";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "#create",
    label: "כתיבת שיר",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v9.5h13V10" />
        <path d="M10 19.5v-5h4v5" />
      </svg>
    ),
  },
  {
    href: "#songs",
    label: "השירים שלי",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="17.5" cy="16" r="2.5" />
      </svg>
    ),
  },
  {
    href: "#dictionary",
    label: "המילון שלי",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
        <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
      </svg>
    ),
  },
];

/** App navigation: a side rail on wide screens, a pill bar on phones. */
export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__avatar">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static illustration */}
          <img src="/illustrations/roni-avatar.svg" alt="" width={236} height={236} />
        </span>
        <span className="sidebar__hello">היי, אני רונית! 👋</span>
      </div>

      <nav aria-label="ניווט">
        <ul className="sidebar__nav">
          {NAV_ITEMS.map((item, index) => (
            <li key={item.href}>
              <a className="sidebar__link" href={item.href} data-active={index === 0}>
                <span className="sidebar__link-icon" data-index={index} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__tip">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static illustration */}
        <img className="sidebar__tip-art float" src="/illustrations/crown.webp" alt="" width={210} height={198} />
        <strong>שיר מושלם</strong>
        <p>שמות, מקומות ובדיחות פרטיות הופכים שיר לאישי באמת.</p>
        <a className="button button--small" href="#create">
          לכתוב עכשיו
        </a>
      </div>
    </aside>
  );
}
