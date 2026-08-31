/**
 * Poster design tokens — the single source of truth for every poster.
 *
 * Templates consume these and nothing else: there is not one raw pixel value,
 * hex code or font size inside a template file. That is what makes six
 * different compositions read as one studio rather than six templates.
 *
 * Everything is authored in ARTBOARD SPACE — 1080px wide, whatever the export
 * ratio. Both formats are 1080 wide, so the type scale never rescales; only
 * the vertical budget changes. The renderer applies the device-pixel-ratio
 * transform, so template code never thinks about export resolution.
 */

export type FormatKey = "post" | "status";
export type ThemeKey = "light" | "dark";

/* ───────────────────────────── spacing ───────────────────────────── */

/** 8px base unit. Every gap in every template is one of these. */
export const SPACE = {
  x1: 8, x2: 16, x3: 24, x4: 32, x5: 40, x6: 48,
  x8: 64, x10: 80, x12: 96, x16: 128,
} as const;

/* ───────────────────────────── formats ───────────────────────────── */

export type Format = {
  key: FormatKey;
  label: string;
  ratio: string;
  w: number;
  h: number;
  /** Outer margin. Only full-bleed photography may cross it. */
  margin: number;
  /** First y any content may occupy. */
  contentTop: number;
  /** Last y any content may occupy. */
  contentBottom: number;
  /**
   * Last y that PRICE / PHONE / BRAND may occupy. Below this the platform's
   * own chrome may cover it — on a Post that is only the caption UI, so the
   * Svayam credit is allowed to live between criticalBottom and contentBottom.
   */
  criticalBottom: number;
  /**
   * Allowed range for the photo block's bottom edge, as a fraction of canvas
   * height. The photo is the flex element: the info block is measured first,
   * the photo takes what is left, clamped to this range.
   */
  photoBand: [min: number, max: number];
};

/**
 * Safe zones are enforced constants, not guesses.
 *
 * WhatsApp Status overlays the top ~14% (profile row + timestamp) and the
 * bottom ~14% (reply bar) of a 1080×1920 frame — 269px each. Instagram covers
 * roughly the lower 120px of a 4:5 post with caption UI in some surfaces, and
 * nothing at the top.
 */
export const FORMATS: Record<FormatKey, Format> = {
  post: {
    key: "post", label: "Post", ratio: "4:5", w: 1080, h: 1350,
    margin: 72,
    contentTop: 72,
    contentBottom: 1350 - 72,    // 1278
    criticalBottom: 1350 - 120,  // 1230
    photoBand: [0.44, 0.62],
  },
  status: {
    key: "status", label: "Status", ratio: "9:16", w: 1080, h: 1920,
    margin: 80,
    contentTop: 300,             // clears the 269px profile band with slack
    contentBottom: 1640,         // clears the 269px reply bar with slack
    criticalBottom: 1640,
    photoBand: [0.40, 0.60],
  },
};

/* ─────────────────────────── typography ─────────────────────────── */

export type Face = "display" | "sans";

export type TypeToken = {
  size: number;
  weight: number;
  /** em, applied per-glyph so it works in every browser. */
  track: number;
  /** Multiplier on size for the drawn line box. */
  lh: number;
  face: Face;
  upper?: boolean;
  /** Draw digits on a fixed advance — real tabular figures on canvas. */
  tabular?: boolean;
};

/**
 * The scale. Two sizes maximum are ever visible inside one grouping; if a
 * block needs three it is grouped wrong.
 */
export const TYPE = {
  /** The hero. Auto-fits down to `priceMin` before it would ever wrap. */
  price:      { size: 122, weight: 700, track: -0.030, lh: 0.98, face: "display", tabular: true },
  /** "Lakh" / "Cr" — part of the figure, so it stays in the display face. */
  priceUnit:  { size: 63,  weight: 500, track: -0.010, lh: 1.00, face: "display" },
  /** "/month" / "Lease" — a qualifier on the figure, not part of it. */
  pricePeriod:{ size: 26,  weight: 600, track:  0.060, lh: 1.00, face: "sans", upper: true },
  type:       { size: 44,  weight: 600, track: -0.015, lh: 1.14, face: "sans" },
  locality:   { size: 32,  weight: 500, track:  0,     lh: 1.22, face: "sans" },
  specLabel:  { size: 20,  weight: 500, track:  0.140, lh: 1.00, face: "sans", upper: true },
  specValue:  { size: 31,  weight: 600, track: -0.010, lh: 1.06, face: "sans", tabular: true },
  chip:       { size: 22,  weight: 600, track:  0.120, lh: 1.00, face: "sans", upper: true },
  brandName:  { size: 30,  weight: 600, track: -0.010, lh: 1.10, face: "sans" },
  brandInitial:{size: 34,  weight: 600, track:  0,     lh: 1.00, face: "sans" },
  cta:        { size: 27,  weight: 600, track:  0.010, lh: 1.00, face: "sans", tabular: true },
  credit:     { size: 18,  weight: 500, track:  0.100, lh: 1.00, face: "sans", upper: true },
} satisfies Record<string, TypeToken>;

/** Auto-fit floor for the price. Below this we would fail the squint test. */
export const PRICE_MIN_SIZE = 84;
/** Auto-fit floor for the credit — a narrow column shrinks it, never cuts it. */
export const CREDIT_MIN_SIZE = 15;

/* ───────────────────────────── colour ───────────────────────────── */

export type Theme = {
  key: ThemeKey;
  surface: string;
  ink: string;
  inkMuted: string;
  hairline: string;
  /** The Svayam signature. Deliberately recessed — see credit notes. */
  credit: string;
  /** Fill + ink for the CTA pill on this surface. */
  ctaFill: string;
  ctaInk: string;
  ctaBorder: string;
  /** Inset hairline drawn on photo blocks so a bright photo can't bleed out. */
  photoEdge: string;
};

export const THEMES: Record<ThemeKey, Theme> = {
  light: {
    key: "light",
    surface:   "#FBFAF8",              // warm off-white; pure white reads clinical
    ink:       "#0E1518",              // never pure black
    inkMuted:  "#5C696F",              // 5.4:1 on surface
    hairline:  "rgba(14,21,24,0.10)",
    credit:    "rgba(14,21,24,0.55)",  // 4.0:1 — top of the §8 range
    ctaFill:   "transparent",
    ctaInk:    "#0E1518",
    ctaBorder: "rgba(14,21,24,0.24)",
    photoEdge: "rgba(14,21,24,0.10)",
  },
  dark: {
    key: "dark",
    surface:   "#101617",
    ink:       "#F4F7F7",
    inkMuted:  "rgba(244,247,247,0.62)",
    hairline:  "rgba(255,255,255,0.14)",
    credit:    "rgba(255,255,255,0.48)",
    ctaFill:   "transparent",
    ctaInk:    "#F4F7F7",
    ctaBorder: "rgba(255,255,255,0.28)",
    photoEdge: "rgba(255,255,255,0.10)",
  },
};

/** Text sitting inside a scrim over photography. Always this, never theme ink. */
export const ON_PHOTO = {
  ink:       "#FFFFFF",
  inkMuted:  "rgba(255,255,255,0.74)",
  hairline:  "rgba(255,255,255,0.20)",
  credit:    "rgba(255,255,255,0.48)",
  ctaFill:   "#FBFAF8",
  ctaInk:    "#0E1518",
  ctaBorder: "transparent",
} as const;

/** The one accent. Overridden per agent; this is the default. */
export const ACCENT_DEFAULT = "#0A5C4A";
export const ON_ACCENT = "#FFFFFF";

/**
 * Status chip fills. Muted and sophisticated — a bright red "FOR SALE" is the
 * fastest way to make a poster look like a classified ad.
 * `sale` resolves to the agent's accent so the poster carries their colour.
 */
export const CHIP_FILL: Record<string, string | null> = {
  sale:   null,        // → accent
  rent:   "#1B4B7A",   // deep blue,  9.0:1 with white
  lease:  "#5A2E63",   // deep plum, 10.5:1 with white
  closed: "#3A4448",   // graphite
};

/* ───────────────────────────── shape ───────────────────────────── */

export const RADIUS = {
  card:  32,
  photo: 24,
  pill:  999,
} as const;

export const HAIRLINE_W = 1.5;

/** The editorial mark that opens every info block. */
export const RULE = { w: 64, h: 4 } as const;

/* ─────────────────────── photo treatment ─────────────────────── */

export const PHOTO = {
  /** Uniform grade so a warm interior and a cool exterior feel like one brand. */
  grade: "saturate(1.04) contrast(1.06) brightness(0.99)",
  /** Never upscale a small photo past this. */
  maxUpscale: 1.5,
  /**
   * Scrim strength. `scrimBase` is what a correctly-exposed photo gets; the
   * measured luminance under the type moves it within the floor and ceiling.
   * The floor matters as much as the ceiling — a dim photo that gets the same
   * heavy scrim as a blown-out one is a photo you have thrown away.
   */
  scrimBase: 0.74,
  scrimMin: 0.55,
  scrimMax: 0.93,
  /** How hard luminance pushes the scrim, per unit of luminance. */
  scrimResponse: 0.55,
  /**
   * Mean relative luminance of the region under the text at which no
   * correction is applied. Above it the scrim deepens; below it, it lifts.
   */
  luminanceTarget: 0.34,
  /**
   * Length of the falloff above the type, in artboard px. The ramp has to
   * finish BEFORE the text starts — a gradient still climbing behind the
   * price is what puts white type on a raw photo.
   */
  scrimRamp: 300,
} as const;

/* ─────────────────────────── the credit ─────────────────────────── */

export const CREDIT_TEXT = "Designed with Svayam.ai · 8095762180";
/** A 12px accent dot precedes it — a maker's mark, not a watermark. */
export const CREDIT_DOT = 12;
