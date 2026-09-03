"use client";

/**
 * Font readiness — the fix for the single biggest reason the old posters read
 * cheap, and the thing that must never produce a false negative.
 *
 * `document.fonts.ready` alone is not enough. It resolves once the fonts the
 * document is *currently using* have settled, which on a route that has not
 * painted a single glyph of the display face resolves immediately — and the
 * canvas then rasterises the metric-adjusted fallback serif, with its
 * old-style descending numerals. That is the "unstyled HTML" look.
 *
 * So we do three things instead of one:
 *   1. read the real, hashed family names the app itself renders with,
 *   2. explicitly `load()` every weight the templates actually draw,
 *   3. `check()` each one afterwards and report failure honestly.
 *
 * Resolution deliberately owns its own probe elements. An earlier version took
 * them as arguments, and the Studio passed refs to spans that lived inside a
 * portal which renders `null` on its first pass — so the refs were still null
 * when the effect ran, every load reported failure, and Download and Share sat
 * disabled forever behind a warning that was simply wrong. Nothing here may
 * depend on another component's mount order.
 */

import type { PosterFonts } from "./text";
import { TYPE } from "./tokens";

export type { PosterFonts } from "./text";

/**
 * The utilities the app itself sets the poster faces with. Naming them as
 * literals here also keeps Tailwind generating both, independently of whether
 * any component happens to use them in JSX.
 */
const DISPLAY_CLASS = "font-poster";
const SANS_CLASS = "font-sans";

/**
 * next/font writes these on <html>. Only consulted if the utilities resolve to
 * nothing — `@theme inline` inlines a token's value into the utility rule and
 * does not always emit the custom property, so neither source is guaranteed on
 * its own and we try both.
 */
const DISPLAY_VAR = "--font-poster-family";
const SANS_VAR = "--font-inter";

const FALLBACK: PosterFonts = {
  display: 'ui-serif, Georgia, "Times New Roman", serif',
  sans: "system-ui, sans-serif",
  ready: false,
};

/**
 * next/font emits a stack: `Fraunces, "Fraunces Fallback", ui-serif, …`.
 * `check()` against the whole stack always passes — the fallback is always
 * available — so we isolate the first family and ask about that one.
 */
function primaryFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "");
}

const quote = (family: string) => (/[^\w-]/.test(family) ? `"${family}"` : family);

/** Measure what a class actually resolves to, then clean up after itself. */
function familyFromClass(className: string): string {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = ".";
  // Off-screen rather than display:none — a non-rendered element is not
  // guaranteed to resolve or trigger a webfont in every engine.
  el.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden";
  document.body.appendChild(el);
  const stack = getComputedStyle(el).fontFamily;
  el.remove();
  return stack;
}

function resolveFamily(className: string, cssVar: string): string {
  const fromClass = primaryFamily(familyFromClass(className));
  if (fromClass) return fromClass;
  const root = getComputedStyle(document.documentElement);
  return primaryFamily(root.getPropertyValue(cssVar));
}

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

/**
 * Resolve and guarantee the poster faces. Safe to call again — the Studio
 * offers a retry, so a transient failure is never permanent.
 */
export async function resolvePosterFonts(): Promise<PosterFonts> {
  if (typeof document === "undefined" || !("fonts" in document)) return FALLBACK;

  const display = resolveFamily(DISPLAY_CLASS, DISPLAY_VAR);
  const sans = resolveFamily(SANS_CLASS, SANS_VAR);
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
