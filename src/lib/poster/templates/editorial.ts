/**
 * Editorial — the flagship.
 *
 * Photo seated inside the margin with a 24px radius, then a generous card of
 * type beneath it. The old version left a large hole in that card because the
 * photo took a fixed share of the canvas and whatever was left over became
 * dead space. Here the relationship is inverted: the info block is measured
 * first — it is intrinsic, it is exactly as tall as its content needs — and
 * the photo takes the remainder, clamped to the format's allowed band.
 *
 * So the card always ends where the content ends, and the photo is never
 * asked to fill a gap it did not create.
 */

import { HAIRLINE_W, SPACE } from "../tokens";
import { hairline } from "../text";
import { drawPhoto, drawPhotoFallback } from "../photo";
import {
  accentRule, brandLockup, chip, chipOrigin, credit, drawStack, headline,
  heroPhotoBox, heroPhotoStyle, price, specStrip, stackHeight,
  type PartCtx, type Row, type Surface,
} from "./parts";
import type { TemplateArgs, TemplateReport } from "./types";

/** Gaps, named so the rhythm is legible rather than a column of numbers. */
const GAP = {
  photoToRule: SPACE.x6,   // 48
  ruleToPrice: SPACE.x3,   // 24
  priceToType: SPACE.x3,   // 24
  typeToSpecs: SPACE.x4,   // 32
  specsToBrand: SPACE.x5,  // 40
  brandToRule: SPACE.x3,   // 24
  ruleToCredit: SPACE.x2,  // 16
} as const;

export function editorial(a: TemplateArgs): TemplateReport {
  const { ctx, fmt, theme, accent } = a;
  const s: Surface = theme;
  const p: PartCtx = { ...a.parts, s };
  const x = fmt.margin;
  const w = fmt.w - fmt.margin * 2;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, fmt.w, fmt.h);

  /* ── Measure the info block first ── */
  const rows: Row[] = [
    { unit: accentRule(p) },
    { unit: price(p, w), gapBefore: GAP.ruleToPrice },
    { unit: headline(p, w), gapBefore: GAP.priceToType },
  ];
  const strip = specStrip(p, w);
  if (strip.h > 0) rows.push({ unit: strip, gapBefore: GAP.typeToSpecs });
  rows.push({ unit: brandLockup(p, w), gapBefore: GAP.specsToBrand });

  const creditUnit = credit(p, w);
  const infoH =
    stackHeight(rows) + GAP.brandToRule + HAIRLINE_W + GAP.ruleToCredit + creditUnit.h;

  /* ── The photo takes what is left, inside the format's allowed band ── */
  const wanted = fmt.contentBottom - infoH - GAP.photoToRule;
  const photoBottom = Math.max(
    fmt.photoBand[0] * fmt.h,
    Math.min(fmt.photoBand[1] * fmt.h, wanted),
  );
  const box = heroPhotoBox(fmt, photoBottom);

  const photo = a.photos[0] ?? null;
  const style = heroPhotoStyle(fmt, theme.photoEdge);
  if (photo) drawPhoto(ctx, photo, box, { ...style, focal: a.focal });
  else drawPhotoFallback(ctx, box, accent, style.radius);

  /* Chip sits on the photo: it is the one element that must survive the squint
     test, and colour-on-photograph is where it does that. On Status it is
     pushed clear of the profile band. */
  const origin = chipOrigin(fmt, box);
  chip(p).draw(origin.x, origin.y);

  /* ── The card ── */
  const afterStack = drawStack(rows, x, photoBottom + GAP.photoToRule);
  const ruleY = afterStack + GAP.brandToRule;
  hairline(ctx, x, ruleY, w, theme.hairline, HAIRLINE_W);
  creditUnit.draw(x, ruleY + HAIRLINE_W + GAP.ruleToCredit);

  return { photoBand: photoBottom / fmt.h, scrimPeak: null, photoLuminance: null };
}
