/**
 * Photo with a subtle bottom-right watermark showing the agent's brand.
 * Server-rendered — no interactivity needed.
 */
export function PhotoWithWatermark({ src, brand, className }: {
  src: string;
  brand: string;
  className?: string;
}) {
  return (
    <div className={`relative bg-muted ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end p-3">
        <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-white/90 drop-shadow-sm">
          {brand.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
