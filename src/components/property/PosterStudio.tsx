"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Check, Download, ImageOff, Play, Share2, Sun, Moon, Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneIN } from "@/lib/format/phone";
import { buildPosterContent } from "@/lib/poster/content";
import { resolvePosterFonts, type PosterFonts } from "@/lib/poster/fonts";
import { CENTER, type Focal } from "@/lib/poster/photo";
import {
  ACCENT_DEFAULT, FORMATS, POSTER_TEMPLATES, renderPoster, posterFileName,
  resolveTheme, templateMeta,
  type FormatKey, type PosterTemplateKey, type ThemeKey,
} from "@/lib/poster/compose";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

/** Per-device, until profiles carries a brand colour of its own. */
const ACCENT_KEY = "poster:accent";

/** Stable identity, so the render effect isn't retriggered by a fresh []. */
const NO_PHOTOS: HTMLImageElement[] = [];

function storedAccent(): string {
  try { return window.localStorage.getItem(ACCENT_KEY) || ACCENT_DEFAULT; }
  catch { return ACCENT_DEFAULT; }   // private mode — the default is fine
}

/* ─────────────────────────── photo loading ─────────────────────────── */

/**
 * Everything is fetched through our own origin. A canvas that has drawn a
 * cross-origin image is tainted: `toBlob()` throws and the luminance sampling
 * behind the Cinematic scrim throws with it, so both Download and Share would
 * die silently. The poster-image route exists for exactly this.
 */
const photoSrc = (propertyId: string, mediaId: string) =>
  `/api/properties/${propertyId}/poster-image?m=${mediaId}`;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Grab a frame a little way in — the opening frames are usually black. */
function grabVideoFrame(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    let settled = false;
    const done = (img: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      v.removeAttribute("src");
      v.load();
      resolve(img);
    };
    const grab = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const cx = c.getContext("2d");
      if (!cx || !v.videoWidth) return done(null);
      cx.drawImage(v, 0, 0);
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = c.toDataURL("image/png");
    };
    v.onloadeddata = () => {
      v.onseeked = grab;
      try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch { grab(); }
    };
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = src;
  });
}

/* ──────────────────────────── the canvas ──────────────────────────── */

function PosterCanvas({
  template, format, theme, content, fonts, photos, focal, accent,
  displayWidth, pixelRatio = 1, className, canvasRef,
}: {
  template: PosterTemplateKey;
  format: FormatKey;
  theme: ThemeKey;
  content: ReturnType<typeof buildPosterContent>;
  fonts: PosterFonts | null;
  photos: HTMLImageElement[];
  focal: Focal;
  accent: string;
  displayWidth: number;
  pixelRatio?: number;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const { w, h } = FORMATS[format];

  useEffect(() => {
    if (!ref.current || !fonts) return;
    renderPoster(ref.current, {
      template, format, theme, content, fonts, photos, focal, accent, pixelRatio,
    });
  }, [ref, template, format, theme, content, fonts, photos, focal, accent, pixelRatio]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: displayWidth, height: (displayWidth * h) / w, display: "block" }}
    />
  );
}

/* ──────────────────────────── the studio ──────────────────────────── */

export function PosterStudio({
  prop, media, brandName, brandPhone, onClose,
}: {
  prop: PropertyRow;
  /** Every photo and video on the listing — the dealer picks the hero. */
  media: PropertyMediaRow[];
  brandName: string;
  brandPhone: string | null;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<PosterTemplateKey>("editorial");
  const [format, setFormat] = useState<FormatKey>("post");
  const [wantedTheme, setWantedTheme] = useState<ThemeKey>("light");
  const [accent, setAccent] = useState<string>(storedAccent);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (media.find(m => m.is_cover) ?? media[0])?.id ?? null,
  );
  const [loaded, setLoaded] = useState<{ key: string; images: HTMLImageElement[] } | null>(null);
  const [fonts, setFonts] = useState<PosterFonts | null>(null);
  const [busy, setBusy] = useState<null | "download" | "share">(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragFrame = useRef<number | null>(null);
  const displayProbe = useRef<HTMLSpanElement>(null);
  const sansProbe = useRef<HTMLSpanElement>(null);

  const meta = templateMeta(template);
  const theme = resolveTheme(template, wantedTheme);
  const selected = media.find(m => m.id === selectedId) ?? null;

  /* ── Fonts: loaded and verified before anything is drawn ── */
  useEffect(() => {
    let alive = true;
    resolvePosterFonts(displayProbe.current, sansProbe.current)
      .then(f => { if (alive) setFonts(f); });
    return () => { alive = false; };
  }, []);

  /* ── Accent, remembered per device ── */
  const changeAccent = (v: string) => {
    setAccent(v);
    try { window.localStorage.setItem(ACCENT_KEY, v); } catch { /* non-fatal */ }
  };

  /* ── Photos: the hero, plus the next few for Gallery ──
     The request is identified by a key and the result carries it back, so
     "still loading" is derived from the data rather than set from an effect
     — which is also what stops a slow video frame from landing on top of a
     photo the dealer has since moved on from. */
  const wantedCount = meta.photos;
  const mediaKey = media.map(m => m.id).join(",");
  const photoKey = `${prop.id}|${selectedId}|${wantedCount}|${mediaKey}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      const ordered = [
        ...media.filter(m => m.id === selectedId),
        ...media.filter(m => m.id !== selectedId && m.type === "image"),
      ].slice(0, wantedCount);

      const results = await Promise.all(ordered.map(m =>
        m.type === "video"
          ? grabVideoFrame(photoSrc(prop.id, m.id))
          : loadImage(photoSrc(prop.id, m.id)),
      ));
      if (!alive) return;
      setLoaded({
        key: photoKey,
        images: results.filter((x): x is HTMLImageElement => Boolean(x)),
      });
    })();
    return () => { alive = false; };
  }, [photoKey, prop.id, selectedId, wantedCount, media]);

  const fresh = loaded?.key === photoKey ? loaded : null;
  const photos = fresh?.images ?? NO_PHOTOS;
  const photoState: "loading" | "ready" | "none" =
    !fresh ? "loading" : fresh.images.length ? "ready" : "none";

  /* The focal point belongs to a photograph, so it is stored with the one it
     was set on. Switch heroes and the crop re-centres on its own. */
  const [focalFor, setFocalFor] = useState<{ id: string | null; focal: Focal }>(
    { id: null, focal: CENTER },
  );
  const focal = focalFor.id === selectedId ? focalFor.focal : CENTER;

  const content = useMemo(
    () => buildPosterContent(prop, {
      name: brandName,
      phone: brandPhone ? formatPhoneIN(brandPhone) : null,
    }),
    [prop, brandName, brandPhone],
  );

  const fileName = useMemo(
    () => posterFileName(prop.title ?? content.type, format),
    [prop.title, content.type, format],
  );

  /* ── Export: rendered fresh at 2×, never scaled up from the preview ── */
  const exportBlob = useCallback(async (): Promise<Blob | null> => {
    if (!fonts) return null;
    const canvas = document.createElement("canvas");
    renderPoster(canvas, {
      template, format, theme, content, fonts, photos, focal, accent, pixelRatio: 2,
    });
    return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  }, [fonts, template, format, theme, content, photos, focal, accent]);

  async function download() {
    setBusy("download"); setErr(null);
    try {
      const blob = await exportBlob();
      if (!blob) throw new Error("Couldn't create the image. Try again.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setDone("Saved to your downloads");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setBusy("share"); setErr(null);
    try {
      const blob = await exportBlob();
      if (!blob) throw new Error("Couldn't create the image. Try again.");
      const file = new File([blob], fileName, { type: "image/png" });

      // On a phone this hands the PNG straight to WhatsApp.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: content.type,
          text: `${content.type} — ${content.price.figure}${content.price.unit ? ` ${content.price.unit}` : ""}`,
        });
        setDone("Shared");
      } else {
        await download();
        setDone("Downloaded — attach it in WhatsApp Web");
      }
    } catch (e) {
      // Dismissing the share sheet is not an error worth showing.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 3200);
    return () => clearTimeout(t);
  }, [done]);

  const applyFocal = useCallback((clientX: number, clientY: number, box: DOMRect) => {
    setFocalFor({
      id: selectedId,
      focal: {
        x: Math.min(1, Math.max(0, (clientX - box.left) / box.width)),
        y: Math.min(1, Math.max(0, (clientY - box.top) / box.height)),
      },
    });
  }, [selectedId]);

  /* ── Focal point: drag the crop to what matters in the photograph ──
     Coalesced to one update per frame. A pointermove fires far faster than
     the compositor, and each one repaints a 1080px poster. */
  const moveFocal = useCallback((e: React.PointerEvent) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    const { clientX, clientY } = e;
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    dragFrame.current = requestAnimationFrame(() => {
      dragFrame.current = null;
      applyFocal(clientX, clientY, box);
    });
  }, [applyFocal]);

  /* The six thumbnails follow the crop at low priority, so redrawing them can
     never stall the poster the dealer is actually dragging. */
  const thumbFocal = useDeferredValue(focal);

  const rendering = fonts === null || photoState === "loading";
  const canExport = Boolean(fonts?.ready) && !rendering;
  const previewWidth = format === "post" ? 400 : 300;

  return (
    <Modal
      onClose={onClose}
      size="xl"
      eyebrow="Poster studio"
      title="Create a poster"
      description="Branded and ready for WhatsApp Status or Instagram. Your name and number are on every one."
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">
            {done ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-accent-text">
                <Check className="size-3.5" aria-hidden /> {done}
              </span>
            ) : fonts && !fonts.ready ? (
              <span className="font-medium text-danger-text">
                Brand fonts haven&apos;t loaded — saving now would give you the wrong typeface.
              </span>
            ) : (
              `${FORMATS[format].w * 2} × ${FORMATS[format].h * 2} px · PNG · 2×`
            )}
          </p>
          <div className="flex gap-2.5 sm:ml-auto">
            <Button variant="outline" size="lg" onClick={download} disabled={!canExport || busy !== null} loading={busy === "download"}>
              <Download aria-hidden /> Download
            </Button>
            <Button size="lg" onClick={share} disabled={!canExport || busy !== null} loading={busy === "share"}>
              <Share2 aria-hidden /> Share
            </Button>
          </div>
        </div>
      }
    >
      {/* Font probes — never shown, only measured. */}
      <span ref={displayProbe} className="font-poster absolute -z-10 opacity-0" aria-hidden>.</span>
      <span ref={sansProbe} className="font-sans absolute -z-10 opacity-0" aria-hidden>.</span>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ── Preview ── */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative flex w-full items-center justify-center rounded-lg border border-line bg-subtle p-6"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--fg) 6%, transparent) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          >
            <div
              ref={stageRef}
              className={cn(
                "relative touch-none rounded-lg shadow-lg ring-1 ring-black/5",
                photos.length > 0 && "cursor-crosshair",
              )}
              onPointerDown={e => {
                if (!photos.length) return;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                setDragging(true);
                moveFocal(e);
              }}
              onPointerMove={e => { if (dragging) moveFocal(e); }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
            >
              <PosterCanvas
                template={template}
                format={format}
                theme={theme}
                content={content}
                fonts={fonts}
                photos={photos}
                focal={focal}
                accent={accent}
                displayWidth={previewWidth}
                className="rounded-lg"
              />
              {/* Skeleton, never a blank flash or a jump. */}
              {rendering && (
                <div className="skeleton absolute inset-0 rounded-lg" aria-hidden />
              )}
              {dragging && (
                <span
                  className="pointer-events-none absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-lg"
                  style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
                  aria-hidden
                />
              )}
            </div>
          </div>

          {photoState === "none" ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <ImageOff className="size-4" aria-hidden />
              No photo on this listing — add one for a much stronger poster.
            </p>
          ) : photos.length > 0 ? (
            <p className="flex items-center gap-2 text-xs text-ink-subtle">
              <Crosshair className="size-3.5" aria-hidden />
              Drag on the poster to choose what the crop keeps
            </p>
          ) : null}
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-col gap-7">
          <section className="flex flex-col gap-3">
            <p className="text-micro uppercase text-ink-muted">Format</p>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(FORMATS) as FormatKey[]).map(k => {
                const active = format === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFormat(k)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors duration-160 ease-out-expo",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active
                        ? "border-accent bg-accent text-accent-fg shadow-sm"
                        : "border-line bg-elevated text-ink hover:border-line-strong hover:bg-subtle",
                    )}
                  >
                    <span className="block text-sm font-medium">{FORMATS[k].label}</span>
                    <span className={cn("mt-0.5 block text-xs", active ? "text-accent-fg/70" : "text-ink-muted")}>
                      {FORMATS[k].ratio}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-micro uppercase text-ink-muted">Template</p>
              {meta.photos > 1 && (
                <span className="text-xs text-ink-subtle">Uses your first {meta.photos} photos</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {POSTER_TEMPLATES.map(t => {
                const active = template === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTemplate(t.key)}
                    aria-pressed={active}
                    title={t.blurb}
                    className={cn(
                      "group overflow-hidden rounded-lg border p-1.5 text-left transition-colors duration-160 ease-out-expo",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active ? "border-accent bg-accent-subtle" : "border-line bg-elevated hover:border-line-strong",
                    )}
                  >
                    <div className="overflow-hidden rounded-sm bg-inset">
                      <PosterCanvas
                        template={t.key}
                        format={format}
                        theme={resolveTheme(t.key, wantedTheme)}
                        content={content}
                        fonts={fonts}
                        photos={photos}
                        focal={thumbFocal}
                        accent={accent}
                        displayWidth={128}
                        pixelRatio={0.3}
                        className="w-full"
                      />
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 block px-0.5 text-xs font-medium",
                        active ? "text-accent-text" : "text-ink-muted",
                      )}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <p className="text-micro uppercase text-ink-muted">Finish</p>
            <div className="flex items-center gap-2.5">
              <div className="inline-flex flex-1 items-center gap-1 rounded-md border border-line bg-subtle p-1">
                {(["light", "dark"] as ThemeKey[]).map(k => {
                  const allowed = meta.themes.includes(k);
                  const active = theme === k;
                  const Icon = k === "light" ? Sun : Moon;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!allowed}
                      onClick={() => setWantedTheme(k)}
                      aria-pressed={active}
                      title={allowed ? undefined : `${meta.label} is designed ${meta.themes[0]} only`}
                      className={cn(
                        "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm text-sm font-medium",
                        "transition-colors duration-160 ease-out-expo disabled:opacity-40",
                        active ? "bg-elevated text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {k === "light" ? "Light" : "Dark"}
                    </button>
                  );
                })}
              </div>
              <label
                className="flex h-11 shrink-0 items-center gap-2 rounded-md border border-line bg-elevated px-3"
                title="Your brand colour"
              >
                <span className="sr-only">Brand colour</span>
                <input
                  type="color"
                  value={accent}
                  onChange={e => changeAccent(e.target.value)}
                  className="size-6 cursor-pointer rounded-sm border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </section>

          {media.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-micro uppercase text-ink-muted">Photo</p>
                {selected?.type === "video" && (
                  <span className="text-xs text-ink-subtle">Frame taken from the video</span>
                )}
              </div>
              <ul className="grid grid-cols-5 gap-2">
                {media.map(m => {
                  const active = m.id === selectedId;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        aria-pressed={active}
                        aria-label={m.type === "video" ? "Use a frame from this video" : "Use this photo"}
                        className={cn(
                          "relative block aspect-square w-full overflow-hidden rounded-md border-2",
                          "transition-[border-color,opacity] duration-160 ease-out-expo",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          active ? "border-accent opacity-100" : "border-transparent opacity-55 hover:opacity-90",
                        )}
                      >
                        {m.type === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.thumb_url || m.url} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center bg-ink">
                            <Play className="size-4 fill-white text-white" aria-hidden />
                          </span>
                        )}
                        {active && (
                          <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-accent text-accent-fg">
                            <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!brandPhone && (
            <p className="rounded-md border border-line bg-subtle p-4 text-sm text-ink-muted">
              No contact number on your posters yet — set{" "}
              <strong className="font-medium text-ink">brand_phone</strong> on your profile so the
              Call button appears.
            </p>
          )}

          {err && (
            <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger-text">
              {err}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
