/**
 * Poster renderer — entry point.
 *
 * Every template is a pure function of (content, brand, format, theme). None
 * of them reach for global state, and none of them know what resolution they
 * are being rasterised at: the device-pixel-ratio transform is applied here,
 * so template code always works in 1080-wide artboard space.
 */

import { ACCENT_DEFAULT, FORMATS, THEMES, type FormatKey, type ThemeKey } from "./tokens";
import type { PosterFonts } from "./text";
import type { PosterContent } from "./content";
import { CENTER, type Focal } from "./photo";
import type { TemplateArgs, TemplateReport } from "./templates/types";
import { editorial } from "./templates/editorial";
import { cinematic } from "./templates/cinematic";
import { split } from "./templates/split";
import { gallery } from "./templates/gallery";
import { frame } from "./templates/frame";
import { noir } from "./templates/noir";

export type PosterTemplateKey =
  | "editorial" | "cinematic" | "split" | "gallery" | "frame" | "noir";

export type PosterTemplateMeta = {
  key: PosterTemplateKey;
  label: string;
  blurb: string;
  /** Themes this composition is designed for. The Studio offers only these. */
  themes: ThemeKey[];
  /** How many photographs it can actually use. */
  photos: number;
};

/** Short, human, evocative — the names a dealer would use out loud. */
export const POSTER_TEMPLATES: PosterTemplateMeta[] = [
  { key: "editorial", label: "Editorial", blurb: "Photo above, type on a card below", themes: ["light", "dark"], photos: 1 },
  { key: "cinematic", label: "Cinematic", blurb: "Full-bleed photo, type in the scrim", themes: ["dark"], photos: 1 },
  { key: "split",     label: "Split",     blurb: "Half photograph, half ink",         themes: ["dark"], photos: 1 },
  { key: "gallery",   label: "Gallery",   blurb: "A hero and two rooms beneath it",   themes: ["light", "dark"], photos: 3 },
  { key: "frame",     label: "Frame",     blurb: "A print, matted and quiet",         themes: ["light", "dark"], photos: 1 },
  { key: "noir",      label: "Noir",      blurb: "Price first, photograph second",    themes: ["dark"], photos: 1 },
];

const RENDERERS: Record<PosterTemplateKey, (a: TemplateArgs) => TemplateReport> = {
  editorial, cinematic, split, gallery, frame, noir,
};

export const templateMeta = (key: PosterTemplateKey): PosterTemplateMeta =>
  POSTER_TEMPLATES.find(t => t.key === key) ?? POSTER_TEMPLATES[0];

/** The theme this template will actually render in, given a requested one. */
export function resolveTheme(key: PosterTemplateKey, wanted: ThemeKey): ThemeKey {
  const allowed = templateMeta(key).themes;
  return allowed.includes(wanted) ? wanted : allowed[0];
}

export type RenderOptions = {
  template: PosterTemplateKey;
  format: FormatKey;
  theme: ThemeKey;
  content: PosterContent;
  fonts: PosterFonts;
  /** Best first. Gallery uses up to three; everything else uses the first. */
  photos?: HTMLImageElement[];
  focal?: Focal;
  accent?: string;
  /** 2 for export, 1 for the live preview, ~0.25 for picker thumbnails. */
  pixelRatio?: number;
};

export type RenderResult = TemplateReport & {
  width: number;
  height: number;
  /** False when a real webfont did not load — the export must be blocked. */
  fontsReady: boolean;
};

export function renderPoster(
  canvas: HTMLCanvasElement,
  o: RenderOptions,
): RenderResult | null {
  const fmt = FORMATS[o.format];
  const ratio = o.pixelRatio ?? 1;

  canvas.width = Math.round(fmt.w * ratio);
  canvas.height = Math.round(fmt.h * ratio);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, fmt.w, fmt.h);
  ctx.imageSmoothingQuality = "high";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const accent = o.accent || ACCENT_DEFAULT;
  const report = RENDERERS[o.template]({
    ctx,
    fmt,
    theme: THEMES[resolveTheme(o.template, o.theme)],
    accent,
    photos: (o.photos ?? []).filter(Boolean),
    focal: o.focal ?? CENTER,
    parts: { ctx, fonts: o.fonts, c: o.content, accent },
  });

  return { ...report, width: canvas.width, height: canvas.height, fontsReady: o.fonts.ready };
}

/** Export filename: readable, safe, and carrying the format. */
export function posterFileName(title: string | null, format: FormatKey): string {
  const base = (title || "property")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `${base || "property"}-${FORMATS[format].label.toLowerCase()}.png`;
}

export { FORMATS, THEMES, ACCENT_DEFAULT } from "./tokens";
export type { FormatKey, ThemeKey } from "./tokens";
