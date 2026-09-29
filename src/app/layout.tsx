import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-rubik" });

export const metadata: Metadata = {
  title: "סטודיו לשירים",
  description: "כותבים על מישהו, ומקבלים שיר מקורי בעברית בכמה סגנונות.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6eee4" },
    { media: "(prefers-color-scheme: dark)", color: "#221c19" },
  ],
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body>{children}</body>
    </html>
  );
}
