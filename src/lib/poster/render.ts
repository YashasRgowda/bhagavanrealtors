/**
 * Poster renderer — draws a share-ready property poster onto a canvas.
 *
 * Everything is authored against a 1080px-wide artboard and scaled from there,
 * so the same code produces a crisp 4:5 feed post and a 9:16 status story.
 *
 * Drawn client-side on purpose: the app compresses photos to WebP, which
 * Satori / next-og cannot decode, and the browser already has the brand fonts
 * loaded. See the poster-image route for why the photo comes from our origin.
 */

export type PosterTemplate = "editorial" | "overlay" | "frame" | "noir";
export type PosterSize = "post" | "status";

export const POSTER_SIZES: Record<PosterSize, { w: number; h: number; label: string; ratio: string }> = {
  post:   { w: 1080, h: 1350, label: "Post",   ratio: "4:5"  },
  status: { w: 1080, h: 1920, label: "Status", ratio: "9:16" },
};

export const POSTER_TEMPLATES: { key: PosterTemplate; label: string; blurb: string }[] = [
  { key: "editorial", label: "Editorial", blurb: "Photo above, details below" },
  { key: "overlay",   label: "Overlay",   blurb: "Full-bleed photo, text on top" },
  { key: "frame",     label: "Gallery",   blurb: "Framed print, centred" },
  { key: "noir",      label: "Noir",      blurb: "Dark, luxury feel" },
];

export type PosterData = {
  photo: HTMLImageElement | null;
  eyebrow: string;
  price: string;
  priceSuffix?: string;
  title: string;
  locality: string;
  specs: string[];
  brandName: string;
  brandPhone: string;
};

export type PosterFonts = { display: string; sans: string };

const INK = "#0a0a0a";
const PAPER = "#fafaf9";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/* ─────────────────────── drawing helpers ─────────────────────── */

/** object-fit: cover, so photos never distort. */
function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (ir > br) {            // image wider than box — crop sides
    sw = img.naturalHeight * br;
    sx = (img.naturalWidth - sw) / 2;
  } else {                  // taller — crop top/bottom, biased slightly up
    sh = img.naturalWidth / br;
    sy = (img.naturalHeight - sh) * 0.4;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Placeholder so a photo-less property still produces a usable poster. */
function drawPhotoFallback(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, dark: boolean,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  if (dark) { g.addColorStop(0, "#2a2a28"); g.addColorStop(1, "#0a0a0a"); }
  else      { g.addColorStop(0, "#eceae6"); g.addColorStop(1, "#d8d5cf"); }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Letter-spaced text, drawn per glyph so it works in every browser. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, spacing: number,
  align: "left" | "center" | "right" = "left",
) {
  const chars = [...text];
  const total = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0)
    + spacing * Math.max(0, chars.length - 1);
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  ctx.textAlign = prev;
  return total;
}

/** Greedy word wrap, truncating the last line with an ellipsis. */
function wrapLines(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);

  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) {
      while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last.trimEnd() + "…";
    }
  }
  return lines;
}

/** Price with its unit suffix set smaller and in the sans face. */
function drawPrice(
  ctx: CanvasRenderingContext2D,
  data: PosterData, fonts: PosterFonts,
  x: number, y: number, size: number, color: string,
  align: "left" | "center" = "left",
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${fonts.display}`;
  const priceW = ctx.measureText(data.price).width;
  const sufSize = Math.round(size * 0.28);
  let sufW = 0;
  if (data.priceSuffix) {
    ctx.font = `500 ${sufSize}px ${fonts.sans}`;
    sufW = ctx.measureText(data.priceSuffix).width + size * 0.1;
  }
  const startX = align === "center" ? x - (priceW + sufW) / 2 : x;

  ctx.font = `${size}px ${fonts.display}`;
  ctx.fillText(data.price, startX, y);
  if (data.priceSuffix) {
    ctx.font = `500 ${sufSize}px ${fonts.sans}`;
    ctx.globalAlpha = 0.62;
    ctx.fillText(data.priceSuffix, startX + priceW + size * 0.1, y + size * 0.72);
    ctx.globalAlpha = 1;
  }
}

/** Outlined spec chips (3 BHK · 1,200 sq.ft …). */
function drawChips(
  ctx: CanvasRenderingContext2D,
  chips: string[], fonts: PosterFonts,
  x: number, y: number, s: number, stroke: string, text: string,
) {
  ctx.font = `500 ${Math.round(26 * s)}px ${fonts.sans}`;
  const padX = 22 * s, h = 56 * s, gap = 12 * s, r = 28 * s;
  let cx = x;
  for (const chip of chips) {
    const w = ctx.measureText(chip).width + padX * 2;
    ctx.beginPath();
    ctx.roundRect(cx, y, w, h, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.textBaseline = "middle";
    ctx.fillText(chip, cx + padX, y + h / 2);
    ctx.textBaseline = "top";
    cx += w + gap;
  }
}

/* ─────────────────────────── templates ─────────────────────────── */

type Ctx = {
  ctx: CanvasRenderingContext2D;
  w: number; h: number; s: number;      // s = scale relative to the 1080 artboard
  d: PosterData; f: PosterFonts;
};

/** Photo on top, details on paper below, solid ink footer. */
function editorial({ ctx, w, h, s, d, f }: Ctx) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  const padX = 72 * s;
  const footerH = 148 * s;
  const topGap = 76 * s;

  // Measure the copy first, then size the photo to whatever is left. Fixing the
  // photo height instead lets a two-line title run straight into the footer.
  ctx.font = `600 ${Math.round(38 * s)}px ${f.sans}`;
  const titleLines = wrapLines(ctx, d.title, w - padX * 2, 2);
  const contentH = 52 * s + 122 * s + titleLines.length * 50 * s + 14 * s + 44 * s;
  const photoH = clamp(
    h - (topGap + contentH + 40 * s + footerH),
    h * 0.34,
    h * 0.66,
  );

  if (d.photo) coverDraw(ctx, d.photo, 0, 0, w, photoH);
  else drawPhotoFallback(ctx, 0, 0, w, photoH, false);

  let y = photoH + topGap;

  ctx.textBaseline = "top";
  ctx.fillStyle = "#74746e";
  ctx.font = `600 ${Math.round(22 * s)}px ${f.sans}`;
  drawTracked(ctx, d.eyebrow.toUpperCase(), padX, y, 5 * s);
  y += 52 * s;

  drawPrice(ctx, d, f, padX, y, Math.round(104 * s), INK);
  y += 122 * s;

  ctx.fillStyle = INK;
  ctx.font = `600 ${Math.round(38 * s)}px ${f.sans}`;
  for (const line of titleLines) {
    ctx.fillText(line, padX, y);
    y += 50 * s;
  }

  y += 14 * s;
  ctx.fillStyle = "#74746e";
  ctx.font = `400 ${Math.round(30 * s)}px ${f.sans}`;
  const meta = [d.locality, ...d.specs].filter(Boolean).join("   ·   ");
  ctx.fillText(wrapLines(ctx, meta, w - padX * 2, 1)[0] ?? "", padX, y);

  // Footer
  ctx.fillStyle = INK;
  ctx.fillRect(0, h - footerH, w, footerH);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.round(44 * s)}px ${f.display}`;
  ctx.fillText(d.brandName, padX, h - footerH / 2);
  if (d.brandPhone) {
    ctx.font = `500 ${Math.round(30 * s)}px ${f.sans}`;
    ctx.globalAlpha = 0.72;
    ctx.textAlign = "right";
    ctx.fillText(d.brandPhone, w - padX, h - footerH / 2);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "top";
}

/** Full-bleed photo with everything set over a deep gradient. */
function overlay({ ctx, w, h, s, d, f }: Ctx) {
  if (d.photo) coverDraw(ctx, d.photo, 0, 0, w, h);
  else drawPhotoFallback(ctx, 0, 0, w, h, true);

  const g = ctx.createLinearGradient(0, h * 0.3, 0, h);
  g.addColorStop(0, "rgba(10,10,10,0)");
  g.addColorStop(0.45, "rgba(10,10,10,0.55)");
  g.addColorStop(1, "rgba(10,10,10,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const padX = 72 * s;

  // Status pill, top-left
  ctx.textBaseline = "top";
  ctx.font = `600 ${Math.round(22 * s)}px ${f.sans}`;
  const label = d.eyebrow.toUpperCase();
  const chars = [...label];
  const labelW = chars.reduce((t, c) => t + ctx.measureText(c).width, 0) + 5 * s * (chars.length - 1);
  const pillW = labelW + 44 * s, pillH = 58 * s;
  ctx.beginPath();
  ctx.roundRect(padX, 72 * s, pillW, pillH, 29 * s);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  drawTracked(ctx, label, padX + 22 * s, 72 * s + pillH / 2, 5 * s);
  ctx.textBaseline = "top";

  // Content stack, anchored to the bottom
  const bottom = h - 78 * s;
  ctx.fillStyle = "#ffffff";

  ctx.font = `500 ${Math.round(30 * s)}px ${f.sans}`;
  ctx.globalAlpha = 0.75;
  ctx.textBaseline = "alphabetic";
  if (d.brandPhone) {
    ctx.textAlign = "right";
    ctx.fillText(d.brandPhone, w - padX, bottom);
    ctx.textAlign = "left";
  }
  ctx.globalAlpha = 1;
  ctx.font = `${Math.round(44 * s)}px ${f.display}`;
  ctx.fillText(d.brandName, padX, bottom);

  const ruleY = bottom - 62 * s;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(padX, ruleY);
  ctx.lineTo(w - padX, ruleY);
  ctx.stroke();

  let y = ruleY - 46 * s;
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 ${Math.round(30 * s)}px ${f.sans}`;
  ctx.globalAlpha = 0.8;
  const meta = [d.locality, ...d.specs].filter(Boolean).join("   ·   ");
  ctx.fillText(wrapLines(ctx, meta, w - padX * 2, 1)[0] ?? "", padX, y);
  ctx.globalAlpha = 1;

  y -= 58 * s;
  ctx.font = `600 ${Math.round(38 * s)}px ${f.sans}`;
  const titleLines = wrapLines(ctx, d.title, w - padX * 2, 2);
  for (let i = titleLines.length - 1; i >= 0; i--) {
    ctx.fillText(titleLines[i], padX, y);
    y -= 50 * s;
  }

  y -= 22 * s;
  ctx.textBaseline = "alphabetic";
  drawPrice(ctx, d, f, padX, y, Math.round(120 * s), "#ffffff");
  ctx.textBaseline = "top";
}

/** Framed square print on paper — quiet and gallery-like. */
function frame({ ctx, w, h, s, d, f }: Ctx) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  const m = 72 * s;
  const photoW = w - m * 2;
  const topGap = 70 * s;
  // Reserves the pinned brand block at the foot of the poster.
  const bottomReserve = 210 * s;

  ctx.font = `600 ${Math.round(34 * s)}px ${f.sans}`;
  const titleLines = wrapLines(ctx, d.title, photoW, 2);
  const contentH = 54 * s + 112 * s + titleLines.length * 46 * s + 10 * s + 40 * s;
  // Square is the ideal for a feed post; on a 9:16 story let it grow taller so
  // the extra height becomes photo rather than an empty band above the brand.
  const photoH = clamp(h - m - topGap - contentH - bottomReserve, 320 * s, photoW * 1.22);

  if (d.photo) coverDraw(ctx, d.photo, m, m, photoW, photoH);
  else drawPhotoFallback(ctx, m, m, photoW, photoH, false);
  ctx.strokeStyle = "rgba(10,10,10,0.12)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.strokeRect(m + 0.5, m + 0.5, photoW - 1, photoH - 1);

  const cx = w / 2;
  let y = m + photoH + topGap;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#74746e";
  ctx.font = `600 ${Math.round(22 * s)}px ${f.sans}`;
  drawTracked(ctx, d.eyebrow.toUpperCase(), cx, y, 5 * s, "center");
  y += 54 * s;

  drawPrice(ctx, d, f, cx, y, Math.round(92 * s), INK, "center");
  y += 112 * s;

  ctx.fillStyle = INK;
  ctx.font = `600 ${Math.round(34 * s)}px ${f.sans}`;
  for (const line of titleLines) {
    ctx.fillText(line, cx, y);
    y += 46 * s;
  }

  y += 10 * s;
  ctx.fillStyle = "#74746e";
  ctx.font = `400 ${Math.round(28 * s)}px ${f.sans}`;
  const meta = [d.locality, ...d.specs].filter(Boolean).join("   ·   ");
  ctx.fillText(wrapLines(ctx, meta, w - m * 2, 1)[0] ?? "", cx, y);

  // Brand pinned to the bottom
  const brandY = h - 96 * s;
  ctx.strokeStyle = "rgba(10,10,10,0.14)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(m, brandY - 40 * s);
  ctx.lineTo(w - m, brandY - 40 * s);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = `${Math.round(40 * s)}px ${f.display}`;
  ctx.fillText(d.brandName, cx, brandY);
  if (d.brandPhone) {
    ctx.fillStyle = "#74746e";
    ctx.font = `500 ${Math.round(27 * s)}px ${f.sans}`;
    ctx.fillText(d.brandPhone, cx, brandY + 50 * s);
  }
  ctx.textAlign = "left";
}

/** Near-black artboard with an inset photo — the luxury option. */
function noir({ ctx, w, h, s, d, f }: Ctx) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);

  const m = 64 * s;
  const pw = w - m * 2;
  const topGap = 72 * s;
  const bottomReserve = 175 * s;

  ctx.font = `600 ${Math.round(36 * s)}px ${f.sans}`;
  const titleLines = wrapLines(ctx, d.title, pw, 2);
  const contentH =
    54 * s + 126 * s + titleLines.length * 48 * s
    + (d.locality ? 54 * s : 0)
    + (d.specs.length ? 92 * s : 0);
  // 4:3 is the target on a feed post — shrink it rather than let the chips hit
  // the brand rule, and let it grow on a story so there is no black void.
  const ph = clamp(h - m - topGap - contentH - bottomReserve, 300 * s, pw * 1.35);

  if (d.photo) coverDraw(ctx, d.photo, m, m, pw, ph);
  else drawPhotoFallback(ctx, m, m, pw, ph, true);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.strokeRect(m + 0.5, m + 0.5, pw - 1, ph - 1);

  let y = m + ph + topGap;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `600 ${Math.round(22 * s)}px ${f.sans}`;
  drawTracked(ctx, d.eyebrow.toUpperCase(), m, y, 5 * s);
  y += 54 * s;

  drawPrice(ctx, d, f, m, y, Math.round(104 * s), "#ffffff");
  y += 126 * s;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${Math.round(36 * s)}px ${f.sans}`;
  for (const line of titleLines) {
    ctx.fillText(line, m, y);
    y += 48 * s;
  }

  if (d.locality) {
    y += 8 * s;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `400 ${Math.round(28 * s)}px ${f.sans}`;
    ctx.fillText(d.locality, m, y);
    y += 46 * s;
  }

  if (d.specs.length) {
    y += 18 * s;
    drawChips(ctx, d.specs, f, m, y, s, "rgba(255,255,255,0.24)", "rgba(255,255,255,0.85)");
  }

  // Brand pinned to the bottom
  const brandY = h - 92 * s;
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(m, brandY - 38 * s);
  ctx.lineTo(w - m, brandY - 38 * s);
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.round(42 * s)}px ${f.display}`;
  ctx.fillText(d.brandName, m, brandY + 6 * s);
  if (d.brandPhone) {
    ctx.font = `500 ${Math.round(29 * s)}px ${f.sans}`;
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.textAlign = "right";
    ctx.fillText(d.brandPhone, w - m, brandY + 6 * s);
    ctx.textAlign = "left";
  }
  ctx.textBaseline = "top";
}

const RENDERERS: Record<PosterTemplate, (c: Ctx) => void> = {
  editorial, overlay, frame, noir,
};

/* ──────────────────────────── entry ──────────────────────────── */

export function renderPoster(
  canvas: HTMLCanvasElement,
  template: PosterTemplate,
  size: PosterSize,
  data: PosterData,
  fonts: PosterFonts,
) {
  const { w, h } = POSTER_SIZES[size];
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  RENDERERS[template]({ ctx, w, h, s: w / 1080, d: data, f: fonts });
}

/**
 * The brand faces are loaded by next/font under hashed family names, so read
 * the resolved names off the DOM rather than hard-coding them.
 */
export function resolveFonts(displayEl: Element | null, sansEl: Element | null): PosterFonts {
  const display = displayEl ? getComputedStyle(displayEl).fontFamily : "";
  const sans = sansEl ? getComputedStyle(sansEl).fontFamily : "";
  return {
    display: display || "Georgia, serif",
    sans: sans || "system-ui, sans-serif",
  };
}
