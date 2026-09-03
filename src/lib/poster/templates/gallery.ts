/**
 * Gallery — one hero photograph over two thumbnails, then a compact block.
 *
 * The one template built for a listing with more than one good photo: three
 * rooms in a single story. It degrades honestly — with two photos the pair
 * below becomes one wide plate, with one it becomes Editorial with a taller
 * hero, and with none it falls back to the accent field like everything else.
 *
 * This is the one place the anatomy flexes: there is no spec strip. In a
 * composition whose entire job is to show three rooms, a band of specifications
 * competes with the photographs for the second read, and loses to them anyway.
 */

import { HAIRLINE_W, RADIUS, SPACE } from "../tokens";
import { hairline } from "../text";
import { drawPhoto, drawPhotoFallback } from "../photo";
import {
  accentRule, brandLockup, chip, chipOrigin, credit, drawStack, headline, price,
  stackHeight, type PartCtx, type Row, type Surface,
} from "./parts";
import type { TemplateArgs, TemplateReport } from "./types";

const GUTTER = SPACE.x2;
/** The thumbnail row's share of the photo stack. */
const THUMB_SHARE = 0.29;

const GAP = {
  photoToRule: SPACE.x6,
  ruleToPrice: SPACE.x3,
  priceToType: SPACE.x3,
  typeToBrand: SPACE.x5,
  brandToRule: SPACE.x3,
  ruleToCredit: SPACE.x2,
} as const;

export function gallery(a: TemplateArgs): TemplateReport {
  const { ctx, fmt, theme, accent } = a;
  const s: Surface = theme;
  const p: PartCtx = { ...a.parts, s };
  const x = fmt.margin;
  const w = fmt.w - fmt.margin * 2;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, fmt.w, fmt.h);

  const rows: Row[] = [
    { unit: accentRule(p) },
    { unit: price(p, w), gapBefore: GAP.ruleToPrice },
    { unit: headline(p, w), gapBefore: GAP.priceToType },
    { unit: brandLockup(p, w), gapBefore: GAP.typeToBrand },
  ];
  const creditUnit = credit(p, w);
  const infoH =
    stackHeight(rows) + GAP.brandToRule + HAIRLINE_W + GAP.ruleToCredit + creditUnit.h;

  const stackBottom = Math.max(
    fmt.photoBand[0] * fmt.h,
    Math.min(fmt.photoBand[1] * fmt.h, fmt.contentBottom - infoH - GAP.photoToRule),
  );
  /* Bleeding takes the grid to the canvas edge on Status: the same three
     photographs, roughly a third more of them visible. */
  const bleed = fmt.photoBleed;
  const gx = bleed ? 0 : x;
  const gw = bleed ? fmt.w : w;
  const gy = bleed ? 0 : fmt.margin;
  const radius = bleed ? 0 : RADIUS.photo;
  const stackH = stackBottom - gy;

  const photos = a.photos.slice(0, 3);
  const thumbs = photos.slice(1);
  const thumbH = thumbs.length ? Math.round(stackH * THUMB_SHARE) : 0;
  const heroH = stackH - (thumbs.length ? thumbH + GUTTER : 0);
  const heroBox = { x: gx, y: gy, w: gw, h: heroH };

  if (photos[0]) {
    drawPhoto(ctx, photos[0], heroBox,
      { radius, focal: a.focal, edge: bleed ? undefined : theme.photoEdge });
  } else {
    drawPhotoFallback(ctx, heroBox, accent, radius);
  }

  if (thumbs.length) {
    const cols = thumbs.length;
    const tw = (gw - GUTTER * (cols - 1)) / cols;
    thumbs.forEach((img, i) => {
      const box = { x: gx + i * (tw + GUTTER), y: gy + heroH + GUTTER, w: tw, h: thumbH };
      drawPhoto(ctx, img, box, { radius, edge: bleed ? undefined : theme.photoEdge });
    });
  }

  const origin = chipOrigin(fmt, heroBox);
  chip(p).draw(origin.x, origin.y);

  const after = drawStack(rows, x, stackBottom + GAP.photoToRule);
  const ruleY = after + GAP.brandToRule;
  hairline(ctx, x, ruleY, w, theme.hairline, HAIRLINE_W);
  creditUnit.draw(x, ruleY + HAIRLINE_W + GAP.ruleToCredit);

  return { photoBand: stackBottom / fmt.h, scrimPeak: null, photoLuminance: null };
}
