"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Play, Expand, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyMediaRow } from "@/lib/property/types";

/**
 * Ask the browser for the frame at 0.1s rather than the very first frame, which
 * is often black. Helps for fast-start videos; see VideoThumb for why it can't
 * be relied on in general.
 */
function posterFrame(url: string): string {
  return url.includes("#") ? url : `${url}#t=0.1`;
}

/**
 * Editorial mosaic + full-screen lightbox.
 *
 * Layout note: every tile carries `min-h-0` and `overflow-hidden`. Grid items
 * default to `min-height: auto`, which means an image's intrinsic height wins
 * over the track size and stretches the row — that is what was blowing the
 * gallery out of its container and leaving dead space beside it.
 */
export function PropertyGallery({
  media,
  title,
}: {
  media: PropertyMediaRow[];
  title: string;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (media.length === 0) {
    return (
      <div className="grid h-[52vw] max-h-[20rem] place-items-center rounded-xl border border-dashed border-border-strong bg-card text-center">
        <div>
          <ImageIcon className="mx-auto h-7 w-7 text-faint" strokeWidth={1.25} />
          <p className="mt-3 text-sm text-muted-foreground">No photos yet</p>
        </div>
      </div>
    );
  }

  const [hero, ...others] = media;
  const tiles = others.slice(0, 2);
  const hiddenCount = media.length - 1 - tiles.length;

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          // Explicit heights at every breakpoint — never rely on intrinsic media size.
          "h-[72vw] max-h-[30rem] sm:h-[22rem] lg:h-[27rem]",
          // Phone: hero across the top, side tiles sharing one row beneath.
          // sm+: hero fills a 2-col block on the left, side tiles stack right.
          tiles.length > 0 && "grid-cols-2 grid-rows-[1.6fr_1fr] sm:grid-cols-3 sm:grid-rows-2",
        )}
      >
        {/* ── Hero ── */}
        <Tile
          item={hero}
          alt={title}
          onOpen={() => setOpenAt(0)}
          priority
          className={cn(
            tiles.length > 0 && "col-span-2 row-span-1 sm:row-span-2",
          )}
        >
          {media.length > 1 && (
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover/tile:opacity-100">
              <Expand className="h-3 w-3" /> View all {media.length}
            </span>
          )}
        </Tile>

        {/* ── Side tiles ── */}
        {tiles.map((m, i) => {
          const isLast = i === tiles.length - 1;
          return (
            <Tile
              key={m.id}
              item={m}
              alt={title}
              onOpen={() => setOpenAt(i + 1)}
              className={cn(
                "row-span-1 sm:col-span-1",
                // A lone side tile spans the full width on phones and the whole
                // right column on desktop; a pair splits the row between them.
                tiles.length === 1 ? "col-span-2 sm:row-span-2" : "col-span-1 sm:row-span-1",
              )}
            >
              {isLast && hiddenCount > 0 && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[1px] transition-colors duration-300 group-hover/tile:bg-black/45">
                  <span className="font-display text-2xl text-white">+{hiddenCount}</span>
                </span>
              )}
            </Tile>
          );
        })}
      </div>

      {openAt !== null && (
        <Lightbox
          media={media}
          index={openAt}
          alt={title}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}

/* ─────────────────────────── Tile ─────────────────────────── */

function Tile({
  item,
  alt,
  onOpen,
  className,
  children,
  priority,
}: {
  item: PropertyMediaRow;
  alt: string;
  onOpen: () => void;
  className?: string;
  children?: React.ReactNode;
  priority?: boolean;
}) {
  const isVideo = item.type === "video";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={isVideo ? `Play video of ${alt}` : `View photo of ${alt}`}
      className={cn(
        "group/tile relative min-h-0 min-w-0 overflow-hidden rounded-lg border border-border bg-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {isVideo ? (
        <VideoThumb url={item.url} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={alt}
          // The mosaic is always above the fold and never more than three tiles,
          // so lazy-loading only buys us empty boxes on first paint.
          loading="eager"
          fetchPriority={priority ? "high" : "auto"}
          className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover/tile:scale-[1.04]"
        />
      )}

      {/* Hover wash — subtle, keeps it feeling considered rather than flat */}
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/tile:bg-black/[0.06]" />

      {isVideo && (
        <>
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
            Video
          </span>
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-xl transition-transform duration-300 group-hover/tile:scale-110">
              <Play className="ml-1 h-5 w-5 fill-[#0a0a0a] text-[#0a0a0a]" />
            </span>
          </span>
        </>
      )}

      {children}
    </button>
  );
}

/**
 * Video thumbnail.
 *
 * We can't count on getting a frame: Supabase's public storage doesn't
 * advertise byte-range support, and phone-recorded MP4s usually keep their
 * metadata at the end of the file — so the browser would have to download the
 * entire clip before it could paint a single pixel. Instead we show a designed
 * dark placeholder immediately, and fade a real frame in over it *if* one
 * happens to decode (small or fast-start videos). Either way the tile looks
 * intentional rather than like a broken black box.
 */
function VideoThumb({ url }: { url: string }) {
  const [hasFrame, setHasFrame] = useState(false);

  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#2a2a28] via-[#161615] to-[#0a0a0a]"
      />
      <video
        src={posterFrame(url)}
        preload="metadata"
        muted
        playsInline
        tabIndex={-1}
        onLoadedData={() => setHasFrame(true)}
        className={cn(
          "pointer-events-none relative h-full w-full object-cover transition-all duration-500 ease-out",
          "group-hover/tile:scale-[1.04]",
          hasFrame ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

/* ───────────────────────── Lightbox ───────────────────────── */

function Lightbox({
  media,
  index,
  alt,
  onIndex,
  onClose,
}: {
  media: PropertyMediaRow[];
  index: number;
  alt: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const current = media[index];
  const many = media.length > 1;

  const next = useCallback(
    () => onIndex((index + 1) % media.length),
    [index, media.length, onIndex],
  );
  const prev = useCallback(
    () => onIndex((index - 1 + media.length) % media.length),
    [index, media.length, onIndex],
  );

  useEffect(() => setMounted(true), []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) next();
      else if (e.key === "ArrowLeft" && many) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, many]);

  // Lock background scroll while open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — media ${index + 1} of ${media.length}`}
      className="fixed inset-0 z-[100] flex flex-col bg-[#0a0a0a]/97 backdrop-blur-md animate-fade-up"
      onClick={onClose}
    >
      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-7">
        <span className="tabular text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-white/55">
          {index + 1} <span className="text-white/25">/</span> {media.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Stage ── */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-16"
        onClick={e => e.stopPropagation()}
      >
        {many && (
          <NavButton side="left" onClick={prev} />
        )}

        {/* `key` remounts on change, replaying the entrance animation and
            tearing down any playing video so audio never bleeds across slides. */}
        <div key={current.id} className="flex h-full w-full items-center justify-center animate-scale-in">
          {current.type === "video" ? (
            <video
              src={current.url}
              controls
              autoPlay
              playsInline
              // Fill the stage rather than max-*: until metadata arrives the
              // element has no intrinsic size and would collapse to ~300x150.
              className="h-full w-full rounded-lg bg-black object-contain shadow-2xl"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt={alt}
              // Fill the stage rather than sitting small in a large void —
              // these are compressed WebPs, often well under 1000px wide.
              className="h-full w-full rounded-lg object-contain drop-shadow-2xl"
            />
          )}
        </div>

        {many && <NavButton side="right" onClick={next} />}
      </div>

      {/* ── Thumbnail strip ── */}
      {many && (
        <div className="shrink-0 px-5 pb-6 pt-4 sm:px-7" onClick={e => e.stopPropagation()}>
          <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Go to item ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all duration-200",
                  i === index
                    ? "border-white opacity-100"
                    : "border-transparent opacity-40 hover:opacity-80",
                )}
              >
                {m.type === "video" ? (
                  <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2a2a28] to-[#0a0a0a]">
                    <Play className="h-3.5 w-3.5 fill-white text-white" />
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumb_url || m.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full",
        "bg-white/10 text-white backdrop-blur-sm transition-all duration-200",
        "hover:bg-white hover:text-[#0a0a0a]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        side === "left" ? "left-1 sm:left-4" : "right-1 sm:right-4",
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
