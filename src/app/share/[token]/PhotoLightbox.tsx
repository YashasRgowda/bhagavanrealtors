"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Full-screen viewer for a shared listing's photos.
 *
 * The hero sits at the top of the page and the rest of the grid sits well
 * below it, so a single component cannot own both without moving the layout
 * around. Instead the provider owns the photo list and the overlay, and each
 * slot renders a `LightboxPhoto` that opens it at the right index — the page
 * keeps exactly the composition it had.
 *
 * The brand watermark stays on in the viewer. These links are public, and the
 * larger the image on screen the more the mark is earning its place.
 */

export type SharePhoto = { id: string; url: string; thumb_url: string | null };

type Ctx = { open: (index: number) => void; count: number };
const LightboxCtx = createContext<Ctx>({ open: () => {}, count: 0 });

export function LightboxProvider({
  photos, brand, children,
}: {
  photos: SharePhoto[];
  brand: string;
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const value = useMemo<Ctx>(
    () => ({ open: (i) => setIndex(i), count: photos.length }),
    [photos.length],
  );
  return (
    <LightboxCtx.Provider value={value}>
      {children}
      {index !== null && (
        <Viewer
          photos={photos}
          brand={brand}
          index={index}
          onIndex={setIndex}
          onClose={() => setIndex(null)}
        />
      )}
    </LightboxCtx.Provider>
  );
}

/**
 * One photo in the page, as a real button. Keeps the same frame and watermark
 * the static version had, and adds a hover cue that it can be opened.
 */
export function LightboxPhoto({
  index, src, brand, alt, className, priority = false,
}: {
  index: number;
  src: string;
  brand: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const { open, count } = useContext(LightboxCtx);
  return (
    <button
      type="button"
      onClick={() => open(index)}
      aria-label={`Open photo ${index + 1} of ${count}`}
      className={`group relative block w-full cursor-zoom-in bg-muted ${className ?? ""}
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/[0.06]" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end p-3">
        <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-white/90 drop-shadow-sm">
          {brand.toUpperCase()}
        </span>
      </span>
    </button>
  );
}

/* ─────────────────────────────── viewer ─────────────────────────────── */

function Viewer({
  photos, brand, index, onIndex, onClose,
}: {
  photos: SharePhoto[];
  brand: string;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const many = photos.length > 1;
  const next = useCallback(() => onIndex((index + 1) % photos.length), [index, photos.length, onIndex]);
  const prev = useCallback(() => onIndex((index - 1 + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) next();
      else if (e.key === "ArrowLeft" && many) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, many]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const current = photos[index];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0a]/97 backdrop-blur-md animate-fade-up"
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-7">
        <span className="tabular text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-white/55">
          {index + 1} <span className="text-white/25">/</span> {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          autoFocus
          className="grid h-11 w-11 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-2 sm:px-16"
        onClick={e => e.stopPropagation()}
      >
        {many && <Nav side="left" onClick={prev} />}
        {/* The mark belongs to the photograph, so the frame has to shrink to the
            photograph — anchoring it to the stage left it stranded in the
            black space below a portrait shot. */}
        <div key={current.id} className="flex h-full w-full items-center justify-center animate-scale-in">
          <div className="relative h-fit max-h-full w-fit max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={`Photo ${index + 1}`}
              className="block max-h-full max-w-full rounded-lg object-contain drop-shadow-2xl"
            />
            <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-lg bg-gradient-to-t from-black/40 to-transparent" />
            <span className="pointer-events-none absolute bottom-3 right-4 text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-white/85">
              {brand.toUpperCase()}
            </span>
          </div>
        </div>
        {many && <Nav side="right" onClick={next} />}
      </div>

      {many && (
        <div className="shrink-0 px-5 pb-6 pt-3 sm:px-7" onClick={e => e.stopPropagation()}>
          <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all duration-200 ${
                  i === index ? "border-white opacity-100" : "border-transparent opacity-40 hover:opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb_url || p.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function Nav({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full
        bg-white/10 text-white backdrop-blur-sm transition-all duration-200
        hover:bg-white hover:text-[#0a0a0a]
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
        ${side === "left" ? "left-1 sm:left-4" : "right-1 sm:right-4"}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
