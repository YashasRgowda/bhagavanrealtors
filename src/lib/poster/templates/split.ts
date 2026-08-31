/**
 * Split — photography down one side, a solid panel of type down the other.
 *
 * The most graphic of the six, and the one that works hardest for commercial
 * listings, where the photograph is often a shutter or a frontage that does
 * not reward being given the whole canvas.
 *
 * The narrow column is what makes this template a test of the system rather
 * than a new drawing: the price auto-fits, the spec strip drops to two cells,
 * the brand lockup stacks, and the signature sizes itself down instead of
 * losing the phone number. Not one of those is a special case written here.
 */

import { HAIRLINE_W, ON_PHOTO, SPACE } from "../tokens";
import { hairline } from "../text";
import { drawPhoto, drawPhotoFallback } from "../photo";
import {
  brandLockup, chip, credit, drawStack, headline, price, specStrip,
  stackHeight, type PartCtx, type Row, type Surface,
} from "./parts";
import type { TemplateArgs, TemplateReport } from "./types";

/** The photo's share of the width. Just over half, so the panel reads as the
 *  deliberate half rather than the leftover one. */
const PHOTO_SHARE = 0.52;
const PANEL_PAD = SPACE.x8 - SPACE.x1;   // 56

const GAP = {
  chipToPrice: SPACE.x5,
  priceToType: SPACE.x3,
  typeToSpecs: SPACE.x4,
  specsToBrand: SPACE.x5,
  brandToRule: SPACE.x3,
  ruleToCredit: SPACE.x2,
} as const;

const PANEL: Surface = {
  ink: ON_PHOTO.ink,
  inkMuted: ON_PHOTO.inkMuted,
  hairline: ON_PHOTO.hairline,
  credit: ON_PHOTO.credit,
  ctaFill: ON_PHOTO.ctaFill,
  ctaInk: ON_PHOTO.ctaInk,
  ctaBorder: ON_PHOTO.ctaBorder,
};

export function split(a: TemplateArgs): TemplateReport {
  const { ctx, fmt, accent } = a;
  const p: PartCtx = { ...a.parts, s: PANEL };
  const photo = a.photos[0] ?? null;

  const photoW = Math.round(fmt.w * PHOTO_SHARE);
  const panelX = photoW;
  const panelW = fmt.w - photoW;
  const x = panelX + PANEL_PAD;
  const w = panelW - PANEL_PAD * 2;

  const photoBox = { x: 0, y: 0, w: photoW, h: fmt.h };
  if (photo) drawPhoto(ctx, photo, photoBox, { focal: a.focal });
  else drawPhotoFallback(ctx, photoBox, accent);

  // The panel: near-black rather than the theme surface, so the photograph
  // keeps every bit of colour it has and the type keeps every bit of contrast.
  ctx.fillStyle = "#0C1113";
  ctx.fillRect(panelX, 0, panelW, fmt.h);

  /* The panel's content is centred in it, not pinned to the floor. Pinning
     left a 570px void under the chip that read as a gap rather than as space
     — and negative space only reads as deliberate when it is balanced. */
  const rows: Row[] = [
    { unit: chip(p) },
    { unit: price(p, w), gapBefore: GAP.chipToPrice },
    { unit: headline(p, w), gapBefore: GAP.priceToType },
  ];
  const strip = specStrip(p, w, 2);
  if (strip.h > 0) rows.push({ unit: strip, gapBefore: GAP.typeToSpecs });
  rows.push({ unit: brandLockup(p, w), gapBefore: GAP.specsToBrand });

  const creditUnit = credit(p, w);
  const blockH =
    stackHeight(rows) + GAP.brandToRule + HAIRLINE_W + GAP.ruleToCredit + creditUnit.h;

  const top = fmt.contentTop + (fmt.contentBottom - fmt.contentTop - blockH) / 2;
  const after = drawStack(rows, x, top);
  const ruleY = after + GAP.brandToRule;
  hairline(ctx, x, ruleY, w, PANEL.hairline, HAIRLINE_W);
  creditUnit.draw(x, ruleY + HAIRLINE_W + GAP.ruleToCredit);

  return { photoBand: 1, scrimPeak: null, photoLuminance: null };
}
