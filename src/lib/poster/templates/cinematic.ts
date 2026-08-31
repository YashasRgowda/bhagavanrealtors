/**
 * Cinematic — full-bleed photography, everything set in the scrim.
 *
 * The striking one, and therefore the one that must never have illegible text.
 * Two things guarantee that:
 *
 *   1. The scrim is a six-stop eased ramp, not a two-stop band. A two-stop
 *      gradient leaves a visible seam across the photo, which is the single
 *      clearest tell of a filled-in template.
 *   2. Its peak opacity is not a constant. The mean luminance of the pixels
 *      that actually land under the type is measured, and the scrim deepens
 *      to match — so a blown-out midday exterior and a dim interior both end
 *      up with white text over the same effective contrast.
 */

import { ON_PHOTO, PHOTO, HAIRLINE_W, SPACE } from "../tokens";
import { hairline } from "../text";
import {
  contrastRatio, drawPhoto, drawPhotoFallback, drawScrim, regionLuminance,
  relativeLuminance, scrimPeakFor,
} from "../photo";
import {
  brandLockup, chip, credit, drawStack, headline, price, specStrip,
  stackHeight, type PartCtx, type Row, type Surface,
} from "./parts";
import type { TemplateArgs, TemplateReport } from "./types";

const GAP = {
  priceToType: SPACE.x3,
  typeToSpecs: SPACE.x4,
  specsToBrand: SPACE.x5,
  brandToRule: SPACE.x3,
  ruleToCredit: SPACE.x2,
  /** The plateau starts just above the first line, never behind it. */
  scrimLead: SPACE.x2,
} as const;

const SURFACE: Surface = {
  ink: ON_PHOTO.ink,
  inkMuted: ON_PHOTO.inkMuted,
  hairline: ON_PHOTO.hairline,
  credit: ON_PHOTO.credit,
  ctaFill: ON_PHOTO.ctaFill,
  ctaInk: ON_PHOTO.ctaInk,
  ctaBorder: ON_PHOTO.ctaBorder,
};

export function cinematic(a: TemplateArgs): TemplateReport {
  const { ctx, fmt, accent } = a;
  const p: PartCtx = { ...a.parts, s: SURFACE };
  const x = fmt.margin;
  const w = fmt.w - fmt.margin * 2;
  const box = { x: 0, y: 0, w: fmt.w, h: fmt.h };

  /* ── Measure the bottom-anchored stack before anything is drawn ── */
  const rows: Row[] = [
    { unit: price(p, w) },
    { unit: headline(p, w), gapBefore: GAP.priceToType },
  ];
  const strip = specStrip(p, w);
  if (strip.h > 0) rows.push({ unit: strip, gapBefore: GAP.typeToSpecs });
  rows.push({ unit: brandLockup(p, w), gapBefore: GAP.specsToBrand });

  const creditUnit = credit(p, w);
  const blockH =
    stackHeight(rows) + GAP.brandToRule + HAIRLINE_W + GAP.ruleToCredit + creditUnit.h;
  const top = fmt.contentBottom - blockH;

  /* ── Photo ── */
  let scrimPeak: number | null = null;
  let photoLuminance: number | null = null;
  const photo = a.photos[0] ?? null;
  if (photo) {
    drawPhoto(ctx, photo, box, { focal: a.focal });

    // Measure only the pixels the type will actually sit on — the plateau
    // region — so the correction answers the right question.
    const plateauTop = top - GAP.scrimLead;
    const lum = regionLuminance(photo, box, {
      x: 0, y: plateauTop / fmt.h, w: 1, h: (fmt.h - plateauTop) / fmt.h,
    }, a.focal);
    scrimPeak = scrimPeakFor(lum);
    photoLuminance = lum;
    drawScrim(ctx, box, {
      rampTop: plateauTop - PHOTO.scrimRamp, plateauTop, peak: scrimPeak,
    });
  } else {
    // No photo is not a broken poster: an accent field carrying the price.
    drawPhotoFallback(ctx, box, accent);
    drawScrim(ctx, box, {
      rampTop: top - PHOTO.scrimRamp, plateauTop: top - GAP.scrimLead,
      peak: PHOTO.scrimMin,
    });
  }

  /* ── Chip, top-left, inside the safe area ── */
  chip(p).draw(x, fmt.contentTop);

  /* ── The stack ── */
  const after = drawStack(rows, x, top);
  const ruleY = after + GAP.brandToRule;
  hairline(ctx, x, ruleY, w, SURFACE.hairline, HAIRLINE_W);
  creditUnit.draw(x, ruleY + HAIRLINE_W + GAP.ruleToCredit);

  return { photoBand: 1, scrimPeak, photoLuminance };
}

/**
 * Contrast of white type over the scrimmed photo, for the render report.
 * The scrim composites (8,12,14) over the photo at `peak`, so the effective
 * backdrop luminance is a straight blend.
 */
export function scrimmedContrast(photoLuminance: number, peak: number): number {
  const scrim = relativeLuminance(8, 12, 14);
  const backdrop = photoLuminance * (1 - peak) + scrim * peak;
  return contrastRatio(1, backdrop);
}
