"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A photo in a fixed-ratio frame.
 *
 * Three jobs: reserve the box before the bytes arrive so nothing shifts, fade
 * the image up over the placeholder rather than popping it in, and carry an
 * inset hairline so a white-walled interior shot doesn't bleed into a white
 * card.
 *
 * Still a plain <img>: switching to next/image needs `remotePatterns` for the
 * Supabase host in next.config.ts, which is build config rather than
 * presentation — flagged for approval. The swap is contained to this file.
 */
export function PlateImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  fallback,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  fallback?: React.ReactNode;
  sizes?: string;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // A cached image can finish decoding before React attaches onLoad, in which
  // case the handler never fires and the photo would stay at opacity 0.
  React.useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  if (!src) {
    return (
      <div className={cn("plate grid place-items-center text-ink-subtle", className)}>
        {fallback}
      </div>
    );
  }

  return (
    <div className={cn("plate", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        ref={imgRef}
        onLoad={() => setLoaded(true)}
        className={cn(
          "size-full object-cover",
          "transition-opacity duration-280 ease-out-expo",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}
