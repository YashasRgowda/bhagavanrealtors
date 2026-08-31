/**
 * Photo pipeline.
 *
 * Listing photos are shot on phones, in bad light, by people who are not
 * photographers. The job here is to make ANY of them look intentional, and to
 * guarantee that text placed over one is legible — measured, not hoped for.
 */

import { PHOTO, HAIRLINE_W } from "./tokens";
import { roundRectPath } from "./text";

export type Box = { x: number; y: number; w: number; h: number };
/** Normalised focal point, 0..1. Centre by default; draggable in the Studio. */
export type Focal = { x: number; y: number };

export const CENTER: Focal = { x: 0.5, y: 0.45 };

/**
 * `object-fit: cover` with a focal point. Returns the source rect to sample.
 * Never stretches, never letterboxes.
 */
export function coverSource(img: HTMLImageElement, box: Box, focal: Focal) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const imgRatio = iw / ih;
  const boxRatio = box.w / box.h;

  let sw = iw, sh = ih;
  if (imgRatio > boxRatio) sw = ih * boxRatio;   // wider — crop the sides
  else sh = iw / boxRatio;                        // taller — crop top/bottom

  const sx = clamp((iw - sw) * focal.x, 0, iw - sw);
  const sy = clamp((ih - sh) * focal.y, 0, ih - sh);
  return { sx, sy, sw, sh };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** True when the browser honours `ctx.filter` — Safari only got it in 17. */
function supportsFilter(ctx: CanvasRenderingContext2D): boolean {
  try {
    const prev = ctx.filter;
    ctx.filter = "saturate(1.04)";
    const ok = ctx.filter !== "none";
    ctx.filter = prev;
    return ok;
  } catch { return false; }
}

/**
 * Draw a photo into a box: cover-cropped to the focal point, uniformly graded
 * so every listing feels like it came from one brand, and closed with an inset
 * hairline so a white-walled interior cannot bleed into a white card.
 */
export function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: Box,
  opts: { radius?: number; focal?: Focal; edge?: string } = {},
) {
  const { sx, sy, sw, sh } = coverSource(img, box, opts.focal ?? CENTER);

  ctx.save();
  if (opts.radius) { roundRectPath(ctx, box.x, box.y, box.w, box.h, opts.radius); ctx.clip(); }
  const graded = supportsFilter(ctx);
  if (graded) ctx.filter = PHOTO.grade;
  ctx.drawImage(img, sx, sy, sw, sh, box.x, box.y, box.w, box.h);
  if (graded) ctx.filter = "none";
  ctx.restore();

  if (opts.edge) {
    ctx.save();
    roundRectPath(
      ctx,
      box.x + HAIRLINE_W / 2, box.y + HAIRLINE_W / 2,
      box.w - HAIRLINE_W, box.h - HAIRLINE_W,
      Math.max(0, (opts.radius ?? 0) - HAIRLINE_W / 2),
    );
    ctx.strokeStyle = opts.edge;
    ctx.lineWidth = HAIRLINE_W;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * A photo-less listing still has to look designed, not broken: a flat accent
 * field with a soft directional wash, which the typographic-only fallback
 * poster sits on.
 */
export function drawPhotoFallback(
  ctx: CanvasRenderingContext2D,
  box: Box,
  accent: string,
  radius = 0,
) {
  ctx.save();
  if (radius) { roundRectPath(ctx, box.x, box.y, box.w, box.h, radius); ctx.clip(); }
  ctx.fillStyle = accent;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const wash = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  wash.addColorStop(0, "rgba(255,255,255,0.10)");
  wash.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = wash;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

/* ───────────────────────── luminance & scrim ───────────────────────── */

const lumCache = new WeakMap<HTMLImageElement, ImageData | null>();

/** Downsample once per image; every region query then reads from the cache. */
function sample(img: HTMLImageElement): ImageData | null {
  if (lumCache.has(img)) return lumCache.get(img) ?? null;
  let data: ImageData | null = null;
  try {
    const W = 64;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const H = Math.max(1, Math.round((W * ih) / iw));
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const cx = c.getContext("2d", { willReadFrequently: true });
    if (cx) { cx.drawImage(img, 0, 0, W, H); data = cx.getImageData(0, 0, W, H); }
  } catch {
    // A tainted canvas would throw here. Photos are proxied through our own
    // origin precisely so that never happens; if it somehow does, we fall back
    // to the deepest scrim rather than guessing.
    data = null;
  }
  lumCache.set(img, data);
  return data;
}

const srgbToLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance, 0..1. */
export const relativeLuminance = (r: number, g: number, b: number) =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

export const contrastRatio = (l1: number, l2: number) =>
  (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

/**
 * Mean relative luminance of a normalised region of the image, accounting for
 * the same cover-crop the poster will draw — so we measure the pixels that
 * actually end up under the text, not the pixels that get cropped away.
 * Returns 1 (assume worst case: bright) when the image cannot be read.
 */
export function regionLuminance(
  img: HTMLImageElement,
  box: Box,
  region: { x: number; y: number; w: number; h: number },
  focal: Focal = CENTER,
): number {
  const data = sample(img);
  if (!data) return 1;

  const src = coverSource(img, box, focal);
  const scale = data.width / (img.naturalWidth || img.width);

  // Region is normalised against the drawn box; map it back into source space.
  const x0 = Math.floor((src.sx + src.sw * region.x) * scale);
  const y0 = Math.floor((src.sy + src.sh * region.y) * scale);
  const x1 = Math.ceil((src.sx + src.sw * (region.x + region.w)) * scale);
  const y1 = Math.ceil((src.sy + src.sh * (region.y + region.h)) * scale);

  let total = 0, n = 0;
  for (let y = Math.max(0, y0); y < Math.min(data.height, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(data.width, x1); x++) {
      const i = (y * data.width + x) * 4;
      total += relativeLuminance(data.data[i], data.data[i + 1], data.data[i + 2]);
      n++;
    }
  }
  return n ? total / n : 1;
}

/**
 * Bottom-anchored scrim: an eased ramp ABOVE the type, then a plateau behind
 * it.
 *
 * This geometry is the whole point. A single gradient spanning the lower half
 * of the poster is still climbing when it reaches the price — which is how you
 * end up with white display type sitting on a raw, bright photograph. So the
 * falloff is given its own run of ~300px and has to be finished before the
 * first line of type; everything from there down sits at full strength.
 *
 * The ramp uses six eased stops rather than two: a two-stop gradient leaves a
 * visible seam across the image, and a seam is the clearest tell of a
 * filled-in template. The plateau deepens very slightly toward the bottom
 * edge, so it reads as light falling off rather than as a panel laid on top.
 */
export function drawScrim(
  ctx: CanvasRenderingContext2D,
  box: Box,
  opts: { rampTop: number; plateauTop: number; peak: number },
) {
  const rampTop = Math.max(box.y, opts.rampTop);
  const plateauTop = Math.max(rampTop + 1, opts.plateauTop);
  const bottom = box.y + box.h;
  const rgba = (a: number) => `rgba(8,12,14,${Math.min(1, a).toFixed(3)})`;

  const ramp = ctx.createLinearGradient(0, rampTop, 0, plateauTop);
  const stops: Array<[number, number]> = [
    [0, 0], [0.20, 0.06], [0.38, 0.20], [0.56, 0.45], [0.74, 0.72], [0.88, 0.90], [1, 1],
  ];
  for (const [t, k] of stops) ramp.addColorStop(t, rgba(k * opts.peak));
  ctx.fillStyle = ramp;
  ctx.fillRect(box.x, rampTop, box.w, plateauTop - rampTop);

  const plateau = ctx.createLinearGradient(0, plateauTop, 0, bottom);
  plateau.addColorStop(0, rgba(opts.peak));
  plateau.addColorStop(1, rgba(opts.peak * 1.08));
  ctx.fillStyle = plateau;
  ctx.fillRect(box.x, plateauTop, box.w, bottom - plateauTop);
}

/**
 * How opaque the plateau has to be for white type to clear its contrast floor
 * over this photograph — and no more. A dim photo is lifted toward the floor
 * so the image survives; a blown-out one is pushed toward the ceiling so the
 * type does.
 */
export function scrimPeakFor(luminance: number): number {
  const peak =
    PHOTO.scrimBase + (luminance - PHOTO.luminanceTarget) * PHOTO.scrimResponse;
  return Math.min(PHOTO.scrimMax, Math.max(PHOTO.scrimMin, peak));
}
