"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, ImageOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINRShort } from "@/lib/format/currency";
import { formatArea } from "@/lib/format/area";
import { formatPhoneIN } from "@/lib/format/phone";
import { PROPERTY_TYPES } from "@/lib/property/enums";
import {
  POSTER_SIZES, POSTER_TEMPLATES, renderPoster, resolveFonts,
  type PosterData, type PosterFonts, type PosterSize, type PosterTemplate,
} from "@/lib/poster/render";
import type { PropertyRow } from "@/lib/property/types";

/** Renders one poster into a canvas sized for display. */
function PosterCanvas({
  template, size, data, fonts, displayWidth, className,
  canvasRef,
}: {
  template: PosterTemplate;
  size: PosterSize;
  data: PosterData;
  fonts: PosterFonts | null;
  displayWidth: number;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;
  const { w, h } = POSTER_SIZES[size];

  useEffect(() => {
    if (!ref.current || !fonts) return;
    renderPoster(ref.current, template, size, data, fonts);
  }, [ref, template, size, data, fonts]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: displayWidth, height: (displayWidth * h) / w, display: "block" }}
    />
  );
}

export function PosterStudio({
  prop, brandName, brandPhone, onClose,
}: {
  prop: PropertyRow;
  brandName: string;
  brandPhone: string | null;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<PosterTemplate>("editorial");
  const [size, setSize] = useState<PosterSize>("post");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "none">("loading");
  const [fonts, setFonts] = useState<PosterFonts | null>(null);
  const [busy, setBusy] = useState<null | "download" | "share">(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mainCanvas = useRef<HTMLCanvasElement>(null);
  const displayProbe = useRef<HTMLSpanElement>(null);
  const sansProbe = useRef<HTMLSpanElement>(null);

  // Wait for the brand webfonts before measuring, or canvas falls back to serif.
  useEffect(() => {
    let alive = true;
    (async () => {
      try { await document.fonts.ready; } catch { /* older browsers */ }
      if (alive) setFonts(resolveFonts(displayProbe.current, sansProbe.current));
    })();
    return () => { alive = false; };
  }, []);

  // Photo comes from our own origin so the canvas stays exportable.
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) { setPhoto(img); setPhotoState("ready"); } };
    img.onerror = () => { if (alive) setPhotoState("none"); };
    img.src = `/api/properties/${prop.id}/poster-image`;
    return () => { alive = false; };
  }, [prop.id]);

  const data: PosterData = useMemo(() => {
    const typeLabel =
      (PROPERTY_TYPES[prop.category] as ReadonlyArray<{ value: string; label: string }>)
        .find(t => t.value === prop.property_type)?.label ?? prop.property_type;

    const eyebrow =
      prop.transaction_type === "rent" ? "For Rent"
      : prop.transaction_type === "lease" ? "For Lease"
      : "For Sale";

    const specs = [
      prop.bhk ? (prop.bhk === "1RK" ? "1 RK" : `${prop.bhk} BHK`) : null,
      prop.area_value ? formatArea(prop.area_value, prop.area_unit) : null,
      typeLabel,
    ].filter(Boolean) as string[];

    return {
      photo,
      eyebrow,
      price: prop.price ? formatINRShort(prop.price) : "Price on request",
      priceSuffix: prop.price && prop.transaction_type === "rent" ? "/month" : undefined,
      title: prop.title || `${typeLabel} in ${prop.locality || prop.city || ""}`,
      locality: [prop.locality, prop.city].filter(Boolean).join(", "),
      specs: specs.slice(0, 3),
      brandName,
      brandPhone: brandPhone ? formatPhoneIN(brandPhone) : "",
    };
  }, [prop, photo, brandName, brandPhone]);

  const fileName = useMemo(() => {
    const base = (prop.title || "property")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    return `${base || "property"}-${size}.png`;
  }, [prop.title, size]);

  const toBlob = useCallback(
    () => new Promise<Blob | null>(resolve => {
      if (!mainCanvas.current) return resolve(null);
      mainCanvas.current.toBlob(resolve, "image/png");
    }),
    [],
  );

  async function download() {
    setBusy("download"); setErr(null);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("Could not create the image.");
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
      const blob = await toBlob();
      if (!blob) throw new Error("Could not create the image.");
      const file = new File([blob], fileName, { type: "image/png" });

      // Native share sheet carries the image straight into WhatsApp on phones.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: data.title,
          text: `${data.title} — ${data.price}`,
        });
        setDone("Shared");
      } else {
        await download();
        setDone("Downloaded — desktop can't share files directly, attach it in WhatsApp Web");
      }
    } catch (e) {
      // The user dismissing the share sheet is not an error worth showing.
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

  const ready = fonts !== null && photoState !== "loading";

  return (
    <Modal
      onClose={onClose}
      size="lg"
      eyebrow="Poster studio"
      title="Create a poster"
      description="Branded and ready for WhatsApp Status or Instagram. Your name and number are on every one."
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.6875rem] text-muted-foreground">
            {done ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Check className="h-3.5 w-3.5" /> {done}
              </span>
            ) : (
              `${POSTER_SIZES[size].w} × ${POSTER_SIZES[size].h} px · PNG`
            )}
          </p>
          <div className="flex gap-2.5 sm:ml-auto">
            <Button variant="outline" size="lg" onClick={download} disabled={!ready || busy !== null}>
              {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </Button>
            <Button size="lg" onClick={share} disabled={!ready || busy !== null}>
              {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Share
            </Button>
          </div>
        </div>
      }
    >
      {/* Font probes — never shown, only measured. */}
      <span ref={displayProbe} className="font-display absolute -z-10 opacity-0" aria-hidden>.</span>
      <span ref={sansProbe} className="font-sans absolute -z-10 opacity-0" aria-hidden>.</span>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {/* ── Preview ── */}
        <div className="flex flex-col items-center">
          <div
            className="relative flex w-full items-center justify-center rounded-xl border border-border bg-muted/50 p-6"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(10,10,10,0.055) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          >
            {!ready && (
              <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-muted/70 backdrop-blur-sm">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <PosterCanvas
              canvasRef={mainCanvas}
              template={template}
              size={size}
              data={data}
              fonts={fonts}
              displayWidth={size === "post" ? 288 : 232}
              className="rounded-lg shadow-lg ring-1 ring-black/5"
            />
          </div>

          {photoState === "none" && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ImageOff className="h-3.5 w-3.5" />
              No photo on this listing — add one for a much stronger poster.
            </p>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="space-y-6">
          <section className="space-y-2.5">
            <p className="eyebrow">Format</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(POSTER_SIZES) as PosterSize[]).map(k => {
                const active = size === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSize(k)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
                      active
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-card hover:border-foreground/35 hover:bg-muted/40",
                    )}
                  >
                    <span className="block text-[0.8125rem] font-medium">{POSTER_SIZES[k].label}</span>
                    <span className={cn("mt-0.5 block text-[0.6875rem]", active ? "text-background/60" : "text-muted-foreground")}>
                      {POSTER_SIZES[k].ratio}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="eyebrow">Template</p>
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
                      "group overflow-hidden rounded-lg border p-1.5 text-left transition-all duration-200",
                      active
                        ? "border-foreground bg-muted/50"
                        : "border-border bg-card hover:border-foreground/35",
                    )}
                  >
                    <div className="overflow-hidden rounded-md bg-muted">
                      <PosterCanvas
                        template={t.key}
                        size={size}
                        data={data}
                        fonts={fonts}
                        displayWidth={112}
                        className="w-full"
                      />
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 block px-0.5 text-[0.6875rem] font-medium",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {!brandPhone && (
            <p className="rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              No contact number on your posters yet — set <strong className="font-medium text-foreground">brand_phone</strong> in
              Settings so buyers can reach you.
            </p>
          )}

          {err && (
            <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
              {err}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
