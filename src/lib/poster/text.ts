/**
 * Canvas typography primitives.
 *
 * Canvas 2D has no `font-variant-numeric`, so tabular lining figures — the
 * thing the brief calls non-negotiable, and the thing that makes numbers look
 * engineered rather than typed — have to be laid out by hand. `drawText` does
 * exactly that: digits are drawn on a fixed advance equal to the widest
 * numeral, everything else keeps its natural width.
 *
 * Tracking is also applied per glyph rather than through `ctx.letterSpacing`,
 * which only landed in Safari 17.4 and would silently do nothing on an older
 * phone — producing a poster that is subtly wrong on exactly the device the
 * dealer is holding.
 */

import type { Face, TypeToken } from "./tokens";

export type PosterFonts = {
  /** Resolved CSS family for the display face. */
  display: string;
  /** Resolved CSS family for the UI face. */
  sans: string;
  /** False when a real webfont did not load — export must be blocked. */
  ready: boolean;
};

export type Align = "left" | "center" | "right";

const familyFor = (fonts: PosterFonts, face: Face) =>
  face === "display" ? fonts.display : fonts.sans;

/** Apply a type token to the context. Returns the resolved pixel size. */
export function applyType(
  ctx: CanvasRenderingContext2D,
  fonts: PosterFonts,
  token: TypeToken,
  sizeOverride?: number,
): number {
  const size = sizeOverride ?? token.size;
  ctx.font = `${token.weight} ${size}px ${familyFor(fonts, token.face)}`;
  return size;
}

const prepare = (text: string, token: TypeToken) =>
  token.upper ? text.toUpperCase() : text;

/** Widest numeral at the current font — the tabular cell width. */
function digitAdvance(ctx: CanvasRenderingContext2D): number {
  let w = 0;
  for (const d of "0123456789") w = Math.max(w, ctx.measureText(d).width);
  return w;
}

const isDigit = (ch: string) => ch >= "0" && ch <= "9";

type Laid = { chars: string[]; widths: number[]; advance: number; total: number };

function layout(
  ctx: CanvasRenderingContext2D,
  text: string,
  token: TypeToken,
  size: number,
): Laid {
  const chars = [...prepare(text, token)];
  const advance = token.tabular ? digitAdvance(ctx) : 0;
  const widths = chars.map(ch =>
    token.tabular && isDigit(ch) ? advance : ctx.measureText(ch).width,
  );
  const tracking = token.track * size;
  const total =
    widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);
  return { chars, widths, advance, total };
}

/**
 * Measure a token'd string. Assumes the caller has already called `applyType`
 * (or passes `size`, in which case it applies the type itself).
 */
export function measureText(
  ctx: CanvasRenderingContext2D,
  fonts: PosterFonts,
  token: TypeToken,
  text: string,
  sizeOverride?: number,
): number {
  const size = applyType(ctx, fonts, token, sizeOverride);
  return layout(ctx, text, token, size).total;
}

/**
 * Draw a token'd string. `y` is the TOP of the line box; the baseline is
 * derived from the token's line height, so stacking blocks never depends on
 * whatever `textBaseline` the previous call happened to leave behind.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  fonts: PosterFonts,
  token: TypeToken,
  text: string,
  x: number,
  y: number,
  opts: { align?: Align; color?: string; size?: number } = {},
): number {
  const align = opts.align ?? "left";
  const size = applyType(ctx, fonts, token, opts.size);
  const { chars, widths, advance, total } = layout(ctx, text, token, size);
  const tracking = token.track * size;

  if (opts.color) ctx.fillStyle = opts.color;
  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Optical baseline: cap height sits ~0.74 of the em below the line-box top.
  const baseline = y + size * 0.74;
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;

  chars.forEach((ch, i) => {
    if (token.tabular && isDigit(ch)) {
      // Centre the glyph inside its fixed cell — that is what tabular means.
      const glyph = ctx.measureText(ch).width;
      ctx.fillText(ch, cx + (advance - glyph) / 2, baseline);
    } else {
      ctx.fillText(ch, cx, baseline);
    }
    cx += widths[i] + tracking;
  });

  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
  return total;
}

/** Drawn height of one line of this token. */
export const lineHeight = (token: TypeToken, sizeOverride?: number) =>
  Math.round((sizeOverride ?? token.size) * token.lh);

/**
 * Greedy wrap, truncating the final line with a real ellipsis on a word
 * boundary wherever possible — never mid-word.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  fonts: PosterFonts,
  token: TypeToken,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  applyType(ctx, fonts, token);
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const width = (s: string) => layout(ctx, s, token, token.size).total;
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= maxWidth || !line) { line = next; continue; }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) { line = ""; break; }
  }
  if (line && lines.length < maxLines) lines.push(line);

  const last = lines[lines.length - 1];
  const overflowed = words.join(" ") !== lines.join(" ");
  if (last && (overflowed || width(last) > maxWidth)) {
    let trimmed = last;
    // Drop whole words first, only chipping characters as a last resort.
    while (trimmed.includes(" ") && width(`${trimmed}…`) > maxWidth) {
      trimmed = trimmed.slice(0, trimmed.lastIndexOf(" "));
    }
    while (trimmed.length > 1 && width(`${trimmed}…`) > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    lines[lines.length - 1] = `${trimmed.trimEnd()}…`;
  }
  return lines;
}

/**
 * Largest size at which `text` fits `maxWidth` on one line.
 *
 * This is what stops ₹1,25,00,000 from wrapping or overflowing: the price
 * never breaks, it steps down in 2px increments until it fits.
 */
export function fitSize(
  ctx: CanvasRenderingContext2D,
  fonts: PosterFonts,
  token: TypeToken,
  text: string,
  maxWidth: number,
  minSize: number,
): number {
  let size = token.size;
  while (size > minSize && measureText(ctx, fonts, token, text, size) > maxWidth) {
    size -= 2;
  }
  return size;
}

/* ───────────────────────────── shapes ───────────────────────────── */

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number, fill: string,
) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number, stroke: string, width: number,
) {
  roundRectPath(ctx, x + width / 2, y + width / 2, w - width, h - width, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** A hairline rule. Never a border — 1.5px at 10–14% opacity. */
export function hairline(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, color: string, thickness: number,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, thickness);
}
