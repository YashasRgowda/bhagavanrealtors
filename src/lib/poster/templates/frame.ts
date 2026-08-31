/**
 * Frame — a print, matted.
 *
 * The quietest of the six and usually the most expensive-looking, because the
 * only thing it spends is space. The border is deliberately wider than the
 * system margin — that widened mat IS the template's identity, and it is the
 * one place a poster is allowed to look like it is not selling anything.
 *
 * Everything below the print is set at the same sizes as every other template.
 * It reads as whisper-quiet not because the type shrank but because there is
 * so much paper around it.
 */

import { HAIRLINE_W, RADIUS, SPACE } from "../tokens";
import { hairline } from "../text";
import { drawPhoto, drawPhotoFallback } from "../photo";
import {
  brandLockup, chip, credit, drawStack, headline, price, specStrip,
  stackHeight, type PartCtx, type Row, type Surface,
} from "./parts";
import type { TemplateArgs, TemplateReport } from "./types";

/** The mat. Wider than the system margin on purpose. */
const MAT = 120;

const GAP = {
  photoToPrice: SPACE.x6 - SPACE.x1,   // 40
  priceToType: SPACE.x3,
  typeToSpecs: SPACE.x5,
  specsToBrand: SPACE.x6,
  brandToRule: SPACE.x3,
  ruleToCredit: SPACE.x2,
} as const;

export function frame(a: TemplateArgs): TemplateReport {
  const { ctx, fmt, theme, accent } = a;
  const s: Surface = theme;
  const p: PartCtx = { ...a.parts, s };
  const mat = Math.max(MAT, fmt.margin);
  const x = mat;
  const w = fmt.w - mat * 2;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, fmt.w, fmt.h);

  const rows: Row[] = [
    { unit: price(p, w) },
    { unit: headline(p, w), gapBefore: GAP.priceToType },
  ];
  const strip = specStrip(p, w);
  if (strip.h > 0) rows.push({ unit: strip, gapBefore: GAP.typeToSpecs });
  rows.push({ unit: brandLockup(p, w), gapBefore: GAP.specsToBrand });

  const creditUnit = credit(p, w);
  const infoH =
    stackHeight(rows) + GAP.brandToRule + HAIRLINE_W + GAP.ruleToCredit + creditUnit.h;

  const photoBottom = Math.max(
    fmt.photoBand[0] * fmt.h,
    Math.min(fmt.photoBand[1] * fmt.h, fmt.contentBottom - infoH - GAP.photoToPrice),
  );
  const box = { x, y: mat, w, h: photoBottom - mat };

  const photo = a.photos[0] ?? null;
  if (photo) drawPhoto(ctx, photo, box, { radius: RADIUS.photo, focal: a.focal, edge: theme.photoEdge });
  else drawPhotoFallback(ctx, box, accent, RADIUS.photo);

  chip(p).draw(box.x + SPACE.x4, Math.max(box.y + SPACE.x4, fmt.contentTop));

  const after = drawStack(rows, x, photoBottom + GAP.photoToPrice);
  const ruleY = after + GAP.brandToRule;
  hairline(ctx, x, ruleY, w, theme.hairline, HAIRLINE_W);
  creditUnit.draw(x, ruleY + HAIRLINE_W + GAP.ruleToCredit);

  return { photoBand: photoBottom / fmt.h, scrimPeak: null, photoLuminance: null };
}
