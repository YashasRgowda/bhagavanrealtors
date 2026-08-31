/**
 * The shared vocabulary every template composes from.
 *
 * This file is what makes six compositions read as one studio: the chip, the
 * price lockup, the spec strip, the brand lockup and the Svayam signature are
 * drawn by exactly one piece of code each. A template chooses WHERE they go
 * and on WHAT surface — never how they look.
 *
 * Every part is a measured unit: it reports its height before it draws, so a
 * template can solve its vertical rhythm honestly instead of guessing at
 * coordinates and leaving the dead space the old Editorial had.
 */

import {
  CHIP_FILL, CREDIT_DOT, CREDIT_MIN_SIZE, HAIRLINE_W, ON_ACCENT, PRICE_MIN_SIZE,
  RADIUS, RULE, SPACE, TYPE,
} from "../tokens";
import {
  drawText, fillRoundRect, fitSize, hairline, lineHeight, measureText,
  strokeRoundRect, wrapText, type PosterFonts,
} from "../text";
import type { PosterContent } from "../content";

/** The palette a part draws with — a theme, or the on-photo palette. */
export type Surface = {
  ink: string;
  inkMuted: string;
  hairline: string;
  credit: string;
  ctaFill: string;
  ctaInk: string;
  ctaBorder: string;
};

/** A measured, positionable block. Height is known before anything is drawn. */
export type Unit = { w: number; h: number; draw: (x: number, y: number) => void };

export type PartCtx = {
  ctx: CanvasRenderingContext2D;
  fonts: PosterFonts;
  c: PosterContent;
  accent: string;
  s: Surface;
};

/* ─────────────────────────── status chip ─────────────────────────── */

const CHIP_PAD_X = 26;
const CHIP_H = 44;

/** "FOR SALE" as a designed pill — never plain floating text. */
export function chip(p: PartCtx): Unit {
  const label = p.c.chip.label;
  const textW = measureText(p.ctx, p.fonts, TYPE.chip, label);
  const w = textW + CHIP_PAD_X * 2;
  const fill = CHIP_FILL[p.c.chip.fillKey] ?? p.accent;
  return {
    w, h: CHIP_H,
    draw(x, y) {
      fillRoundRect(p.ctx, x, y, w, CHIP_H, RADIUS.pill, fill);
      drawText(p.ctx, p.fonts, TYPE.chip, label,
        x + CHIP_PAD_X, y + (CHIP_H - TYPE.chip.size * 0.74) / 2 - TYPE.chip.size * 0.09,
        { color: ON_ACCENT });
    },
  };
}

/* ──────────────────────── the editorial mark ──────────────────────── */

/** 64×4 accent rule. The one repeated signature across the light templates. */
export function accentRule(p: PartCtx): Unit {
  return {
    w: RULE.w, h: RULE.h,
    draw(x, y) { p.ctx.fillStyle = p.accent; p.ctx.fillRect(x, y, RULE.w, RULE.h); },
  };
}

/* ────────────────────────── the price lockup ────────────────────────── */

/**
 * Figure + unit + period, on one optical baseline.
 *
 * The figure never wraps: it steps down from 122px in 2px increments until it
 * fits the column, which is what keeps ₹1,25,00,000 on one line. The unit
 * scales with it at 0.52×, so the lockup keeps its proportions at every size.
 */
export function price(p: PartCtx, maxWidth: number): Unit {
  const { figure, unit, period, onRequest } = p.c.price;
  const gapUnit = 0.09;   // em of the figure
  const gapPeriod = SPACE.x2;

  const figureWidth = (s: number) => {
    let w = measureText(p.ctx, p.fonts, TYPE.price, figure, s);
    if (unit) w += s * gapUnit + measureText(p.ctx, p.fonts, TYPE.priceUnit, unit, s * 0.52);
    return w;
  };
  const periodWidth = () =>
    period ? gapPeriod + measureText(p.ctx, p.fonts, TYPE.pricePeriod, period) : 0;

  // "Price on request" is words, not a figure — set it at the headline scale.
  let size = onRequest
    ? fitSize(p.ctx, p.fonts, TYPE.price, figure, maxWidth, PRICE_MIN_SIZE) * 0.62
    : TYPE.price.size;

  if (!onRequest) {
    while (size > PRICE_MIN_SIZE && figureWidth(size) + periodWidth() > maxWidth) size -= 2;
  }

  /* At the floor the figure still wins: in a narrow column the qualifier drops
     to its own line rather than pushing the number off the canvas — and rather
     than shrinking it below the size the squint test needs. */
  const stackPeriod = Boolean(period) && figureWidth(size) + periodWidth() > maxWidth;
  if (!onRequest) {
    // If even the figure alone overflows, it must still fit the artboard.
    while (size > PRICE_MIN_SIZE * 0.76 && figureWidth(size) > maxWidth) size -= 2;
  }

  const h = lineHeight(TYPE.price, size)
    + (stackPeriod ? SPACE.x1 + lineHeight(TYPE.pricePeriod) : 0);

  return {
    w: maxWidth, h,
    draw(x, y) {
      let cx = x;
      cx += drawText(p.ctx, p.fonts, TYPE.price, figure, cx, y, { color: p.s.ink, size });
      // Baseline-align the smaller pieces against the figure's baseline.
      if (unit) {
        const us = size * 0.52;
        cx += size * gapUnit;
        cx += drawText(p.ctx, p.fonts, TYPE.priceUnit, unit,
          cx, y + 0.74 * (size - us), { color: p.s.inkMuted, size: us });
      }
      if (period && !stackPeriod) {
        cx += gapPeriod;
        drawText(p.ctx, p.fonts, TYPE.pricePeriod, period,
          cx, y + 0.74 * (size - TYPE.pricePeriod.size), { color: p.s.inkMuted });
      } else if (period) {
        drawText(p.ctx, p.fonts, TYPE.pricePeriod, period,
          x, y + lineHeight(TYPE.price, size) + SPACE.x1, { color: p.s.inkMuted });
      }
    },
  };
}

/* ───────────────────────── type + locality ───────────────────────── */

/** Second read and third read, as one measured unit so the gap is constant. */
export function headline(p: PartCtx, maxWidth: number): Unit {
  const typeLines = wrapText(p.ctx, p.fonts, TYPE.type, p.c.type, maxWidth, 2);
  const localityLines = p.c.locality
    ? wrapText(p.ctx, p.fonts, TYPE.locality, p.c.locality, maxWidth, 2)
    : [];
  const typeH = typeLines.length * lineHeight(TYPE.type);
  const localityH = localityLines.length * lineHeight(TYPE.locality);
  const gap = localityLines.length ? SPACE.x1 : 0;

  return {
    w: maxWidth, h: typeH + gap + localityH,
    draw(x, y) {
      let cy = y;
      for (const line of typeLines) {
        drawText(p.ctx, p.fonts, TYPE.type, line, x, cy, { color: p.s.ink });
        cy += lineHeight(TYPE.type);
      }
      cy += gap;
      for (const line of localityLines) {
        drawText(p.ctx, p.fonts, TYPE.locality, line, x, cy, { color: p.s.inkMuted });
        cy += lineHeight(TYPE.locality);
      }
    },
  };
}

/* ────────────────────────── the spec strip ────────────────────────── */

const STRIP_PAD_Y = SPACE.x3;
const STRIP_CELL_PAD = 28;

/**
 * The fix for the loose grey lines: one band, two or three cells, divided by
 * vertical hairlines, each a small uppercase label over a larger value.
 * Missing specs are dropped upstream, so a cell is never empty.
 */
export function specStrip(p: PartCtx, width: number, limit = 3): Unit {
  const cells = p.c.specs.slice(0, limit);
  const labelH = lineHeight(TYPE.specLabel);
  const valueH = lineHeight(TYPE.specValue);
  const inner = labelH + SPACE.x1 + valueH;
  const h = HAIRLINE_W * 2 + STRIP_PAD_Y * 2 + inner;
  if (!cells.length) return { w: width, h: 0, draw: () => {} };

  return {
    w: width, h,
    draw(x, y) {
      hairline(p.ctx, x, y, width, p.s.hairline, HAIRLINE_W);
      hairline(p.ctx, x, y + h - HAIRLINE_W, width, p.s.hairline, HAIRLINE_W);

      const cw = width / cells.length;
      cells.forEach((cell, i) => {
        const cx = x + i * cw + (i === 0 ? 0 : STRIP_CELL_PAD);
        const top = y + HAIRLINE_W + STRIP_PAD_Y;
        if (i > 0) {
          p.ctx.fillStyle = p.s.hairline;
          p.ctx.fillRect(x + i * cw, top, HAIRLINE_W, inner);
        }
        drawText(p.ctx, p.fonts, TYPE.specLabel, cell.label, cx, top, { color: p.s.inkMuted });
        drawText(p.ctx, p.fonts, TYPE.specValue, cell.value, cx, top + labelH + SPACE.x1,
          { color: p.s.ink });
      });
    },
  };
}

/* ───────────────────────── the brand lockup ───────────────────────── */

const AVATAR = 64;
const CTA_H = 60;
const CTA_PAD_X = 28;

/**
 * Avatar + business name on the left, the call action on the right, on one
 * baseline grid — one unit, not a bar bolted to the foot of the poster.
 *
 * The phone number lives only in the pill. Printing it twice (once as a label,
 * once as a button) is the kind of duplication that reads as a template.
 */
export function brandLockup(p: PartCtx, width: number, opts: { stacked?: boolean } = {}): Unit {
  const { name, initial, phone } = p.c.brand;
  const ctaLabel = phone ? `Call ${phone}` : null;
  const ctaW = ctaLabel
    ? measureText(p.ctx, p.fonts, TYPE.cta, ctaLabel) + CTA_PAD_X * 2
    : 0;

  /* A narrow column cannot hold the avatar, the name and the pill on one
     line. Rather than shrink the phone — the one thing that must never
     shrink — the same unit stacks: identity above, action below. */
  const inline = !opts.stacked && (!ctaW || AVATAR + SPACE.x3 + 120 + SPACE.x3 + ctaW <= width);
  const nameMax = inline
    ? width - AVATAR - SPACE.x3 - (ctaW ? ctaW + SPACE.x3 : 0)
    : width - AVATAR - SPACE.x3;
  const nameLine = wrapText(p.ctx, p.fonts, TYPE.brandName, name, Math.max(80, nameMax), 1)[0] ?? name;
  const height = inline || !ctaLabel ? AVATAR : AVATAR + SPACE.x2 + CTA_H;

  return {
    w: width, h: height,
    draw(x, y) {
      // Avatar — the agent's initial set in the accent, when there is no logo.
      p.ctx.beginPath();
      p.ctx.arc(x + AVATAR / 2, y + AVATAR / 2, AVATAR / 2, 0, Math.PI * 2);
      p.ctx.fillStyle = p.accent;
      p.ctx.fill();
      const initialW = measureText(p.ctx, p.fonts, TYPE.brandInitial, initial);
      drawText(p.ctx, p.fonts, TYPE.brandInitial, initial,
        x + AVATAR / 2 - initialW / 2,
        y + (AVATAR - TYPE.brandInitial.size * 0.74) / 2 - TYPE.brandInitial.size * 0.08,
        { color: ON_ACCENT });

      drawText(p.ctx, p.fonts, TYPE.brandName, nameLine,
        x + AVATAR + SPACE.x3,
        y + (AVATAR - lineHeight(TYPE.brandName)) / 2,
        { color: p.s.ink });

      if (ctaLabel) {
        const cx = inline ? x + width - ctaW : x;
        const cy = inline ? y + (AVATAR - CTA_H) / 2 : y + AVATAR + SPACE.x2;
        const pillW = inline ? ctaW : width;
        if (p.s.ctaFill !== "transparent") {
          fillRoundRect(p.ctx, cx, cy, pillW, CTA_H, RADIUS.pill, p.s.ctaFill);
        } else if (p.s.ctaBorder !== "transparent") {
          strokeRoundRect(p.ctx, cx, cy, pillW, CTA_H, RADIUS.pill, p.s.ctaBorder, HAIRLINE_W);
        }
        drawText(p.ctx, p.fonts, TYPE.cta, ctaLabel,
          inline ? cx + CTA_PAD_X : cx + (pillW - measureText(p.ctx, p.fonts, TYPE.cta, ctaLabel)) / 2,
          cy + (CTA_H - TYPE.cta.size * 0.74) / 2 - TYPE.cta.size * 0.09,
          { color: p.s.ctaInk });
      }
    },
  };
}

/* ──────────────────────── the Svayam signature ──────────────────────── */

/**
 * A designer's signature, not a watermark: a 12px accent dot, then the credit
 * set small, uppercase and letterspaced at ~0.5 opacity. Readable when someone
 * goes looking for it, recessed when they are not.
 */
export function credit(p: PartCtx, width: number): Unit {
  /* Truncating the signature would be worse than setting it a point smaller,
     so in a narrow column it fits itself rather than losing the number. */
  const avail = width - CREDIT_DOT - SPACE.x2;
  const size = fitSize(p.ctx, p.fonts, TYPE.credit, p.c.credit, avail, CREDIT_MIN_SIZE);
  const h = Math.max(CREDIT_DOT, lineHeight(TYPE.credit, size));
  return {
    w: width, h,
    draw(x, y) {
      p.ctx.beginPath();
      p.ctx.arc(x + CREDIT_DOT / 2, y + h / 2, CREDIT_DOT / 2, 0, Math.PI * 2);
      p.ctx.fillStyle = p.accent;
      p.ctx.globalAlpha = 0.75;
      p.ctx.fill();
      p.ctx.globalAlpha = 1;
      drawText(p.ctx, p.fonts, TYPE.credit, p.c.credit,
        x + CREDIT_DOT + SPACE.x2, y + (h - size * 0.74) / 2 - size * 0.06,
        { color: p.s.credit, size });
    },
  };
}

/* ─────────────────────────── stack helper ─────────────────────────── */

export type Row = { unit: Unit; gapBefore?: number };

/** Total height of a stack, gaps included. Measured before anything draws. */
export const stackHeight = (rows: Row[]) =>
  rows.reduce((sum, r, i) => sum + (i === 0 ? 0 : r.gapBefore ?? 0) + r.unit.h, 0);

/** Draw a stack downward from `y`. Returns the y it finished at. */
export function drawStack(rows: Row[], x: number, y: number): number {
  let cy = y;
  rows.forEach((r, i) => {
    if (i > 0) cy += r.gapBefore ?? 0;
    r.unit.draw(x, cy);
    cy += r.unit.h;
  });
  return cy;
}
