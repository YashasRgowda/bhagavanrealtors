"use client";

/**
 * Font readiness — the fix for the single biggest reason the old posters read
 * cheap.
 *
 * `document.fonts.ready` alone is not enough. It resolves once the fonts the
 * document is *currently using* have settled, which on a route that has not
 * painted a single glyph of the display face resolves immediately — and the
 * canvas then rasterises the metric-adjusted fallback serif, with its
 * old-style descending numerals. That is the "unstyled HTML" look.
 *
 * So we do three things instead of one:
 *   1. read the real, hashed family names off probe elements in the DOM,
 *   2. explicitly `load()` every weight/size pair the templates actually draw,
 *   3. `check()` each one afterwards and report failure honestly.
 *
 * If step 3 fails the Studio must block export rather than hand the dealer a
 * poster set in Times.
 */

import type { PosterFonts } from "./text";
import { TYPE } from "./tokens";

export type { PosterFonts } from "./text";

/**
 * next/font emits a stack: `__Fraunces_abc, __Fraunces_Fallback_abc, serif`.
 * `check()` on the whole stack always passes — the fallback is always
 * available — so we have to isolate the first family and ask about that one.
 */
function primaryFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "");
}

const quote = (family: string) => (/[^\w-]/.test(family) ? `"${family}"` : family);

/** Every weight the templates draw, at a size large enough to matter. */
function specs(display: string, sans: string): string[] {
  const weights = { display: new Set<number>(), sans: new Set<number>() };
  for (const token of Object.values(TYPE)) {
    weights[token.face as "display" | "sans"].add(token.weight);
  }
  return [
    ...[...weights.display].map(w => `${w} 122px ${quote(display)}`),
    ...[...weights.sans].map(w => `${w} 44px ${quote(sans)}`),
  ];
}

const FALLBACK: PosterFonts = {
  display: 'ui-serif, Georgia, "Times New Roman", serif',
  sans: "system-ui, sans-serif",
  ready: false,
};

/**
 * Resolve and guarantee the poster faces.
 *
 * `displayEl` / `sansEl` are hidden probe nodes carrying `font-poster` and
 * `font-sans`, so the hashed family names come from the same place the app's
 * CSS gets them and can never drift from the loaded @font-face rules.
 */
export async function resolvePosterFonts(
  displayEl: Element | null,
  sansEl: Element | null,
): Promise<PosterFonts> {
  if (typeof document === "undefined" || !("fonts" in document)) return FALLBACK;

  const display = displayEl ? primaryFamily(getComputedStyle(displayEl).fontFamily) : "";
  const sans = sansEl ? primaryFamily(getComputedStyle(sansEl).fontFamily) : "";
  if (!display || !sans) return FALLBACK;

  const wanted = specs(display, sans);
  await Promise.all(
    wanted.map(spec => document.fonts.load(spec).catch(() => undefined)),
  );
  try { await document.fonts.ready; } catch { /* older browsers */ }

  const ready = wanted.every(spec => {
    try { return document.fonts.check(spec); } catch { return false; }
  });

  return {
    display: `${quote(display)}, ${FALLBACK.display}`,
    sans: `${quote(sans)}, ${FALLBACK.sans}`,
    ready,
  };
}
