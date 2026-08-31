import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

/* One family, four weights. The display treatment is tracking + weight,
   not a second typeface — see the type scale in globals.css. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Poster-only display face.
 *
 * A poster is print, not interface — a serif beside Inter is what makes a
 * listing read as expensive rather than as a screenshot.
 *
 * Fraunces, variable, for three reasons that all show up on the canvas:
 * its default figures are lining (the old fallback serif rendered old-style
 * numerals with descenders, which is most of why prices looked cheap); it
 * carries a real weight axis, so the price can be 700 and its unit 500 from
 * one file; and its optical-size axis means a 122px price gets genuinely
 * display-cut letterforms rather than a scaled-up text face.
 *
 * `preload: false` keeps it off every route that never renders a poster.
 * The Studio explicitly loads and verifies each weight before it draws —
 * see lib/poster/fonts.ts for why `document.fonts.ready` is not enough.
 */
const posterSerif = Fraunces({
  variable: "--font-poster-family",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Bhagvan Realtors — Property Manager",
  description: "Your private property second brain.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bhagvan Realtors" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fcfcfa",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${posterSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
