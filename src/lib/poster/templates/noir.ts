/**
 * Noir — type first, photograph second.
 *
 * Every other template opens with the image. This one opens with the number,
 * which is what makes it read as a brochure for something expensive rather
 * than as a listing: the price is an assertion, and the photograph is the
 * evidence offered afterwards.
 *
 * Deep charcoal, an inset plate with a hairline so a bright interior cannot
 * bleed into the ground, and the accent used exactly three times — chip,
 * avatar, signature dot.
 */

import { HAIRLINE_W, RADIUS, SPACE, THEMES } from "../tokens";
import { hairline } from "../text";
import { drawPhoto, drawPhotoFallback } from "../photo";
import {
  brandLockup, chip, credit, drawStack, headline, price, specStrip,
  stackHeight, type PartCtx, type Row, type Surface,
} from "./parts";
import type { TemplateArgs, TemplateReport } from "./types";

const GAP = {
  chipToPrice: SPACE.x5,
  priceToType: SPACE.x3,
  typeToPhoto: SPACE.x6,
  photoToSpecs: SPACE.x6,
  specsToBrand: SPACE.x5,
  brandToRule: SPACE.x3,
  ruleToCredit: SPACE.x2,
} as const;

export function noir(a: TemplateArgs): TemplateReport {
  const { ctx, fmt, accent } = a;
  // Noir owns its ground: always the dark palette, whatever the Studio's
  // theme toggle says, because a light Noir is simply Frame.
  const theme = THEMES.dark;
  const s: Surface = theme;
  const p: PartCtx = { ...a.parts, s };
  const x = fmt.margin;
  const w = fmt.w - fmt.margin * 2;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, fmt.w, fmt.h);

  /* ── Type leads ── */
  const head: Row[] = [
    { unit: chip(p) },
    { unit: price(p, w), gapBefore: GAP.chipToPrice },
    { unit: headline(p, w), gapBefore: GAP.priceToType },
  ];
  const headBottom = drawStack(head, x, fmt.contentTop);

  /* ── Footer, measured from the floor ── */
  const foot: Row[] = [];
  const strip = specStrip(p, w);
  if (strip.h > 0) foot.push({ unit: strip });
  foot.push({ unit: brandLockup(p, w), gapBefore: foot.length ? GAP.specsToBrand : 0 });

  const creditUnit = credit(p, w);
  const footH =
    stackHeight(foot) + GAP.brandToRule + HAIRLINE_W + GAP.ruleToCredit + creditUnit.h;
  const footTop = fmt.contentBottom - footH;

  /* ── The photograph takes everything between them ── */
  const bleed = fmt.photoBleed;
  const top = headBottom + GAP.typeToPhoto;
  const box = {
    x: bleed ? 0 : x,
    y: top,
    w: bleed ? fmt.w : w,
    h: footTop - GAP.photoToSpecs - top,
  };
  const radius = bleed ? 0 : RADIUS.photo;
  const photo = a.photos[0] ?? null;
  if (photo) {
    drawPhoto(ctx, photo, box,
      { radius, focal: a.focal, edge: bleed ? undefined : theme.photoEdge });
  } else {
    drawPhotoFallback(ctx, box, accent, radius);
  }

  const after = drawStack(foot, x, footTop);
  const ruleY = after + GAP.brandToRule;
  hairline(ctx, x, ruleY, w, theme.hairline, HAIRLINE_W);
  creditUnit.draw(x, ruleY + HAIRLINE_W + GAP.ruleToCredit);

  return { photoBand: (box.y + box.h) / fmt.h, scrimPeak: null, photoLuminance: null };
}
