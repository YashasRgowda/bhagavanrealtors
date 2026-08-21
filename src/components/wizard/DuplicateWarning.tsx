"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type Nearby = {
  id: string;
  title: string | null;
  locality: string | null;
  status: string;
  distance_m: number;
};

/**
 * Fires whenever lat/lng changes. Warns if any of this owner's properties are
 * already within 50m — very likely the same property. Non-blocking; just a heads-up.
 */
export function DuplicateWarning({
  lat, lng, excludePropertyId,
}: {
  lat: number | null;
  lng: number | null;
  /** When the wizard has already saved this property once, exclude it so the
   *  warning doesn't fire on the property's own coordinates. */
  excludePropertyId?: string | null;
}) {
  const [nearby, setNearby] = useState<Nearby[]>([]);

  useEffect(() => {
    if (lat === null || lng === null) { setNearby([]); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/geo/duplicate-check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lat, lng, radiusMetres: 50, excludePropertyId: excludePropertyId ?? null }),
        });
        if (!res.ok) return;
        const { nearby } = await res.json() as { nearby: Nearby[] };
        if (alive) setNearby(nearby);
      } catch { /* silent — this is advisory */ }
    })();
    return () => { alive = false; };
  }, [lat, lng, excludePropertyId]);

  if (nearby.length === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
      <div className="min-w-0 flex-1 text-[color:var(--warning)]">
        <p className="font-medium">Possible duplicate — you already have a property near here.</p>
        <ul className="mt-1 space-y-0.5">
          {nearby.map(n => (
            <li key={n.id} className="text-xs">
              • {n.distance_m}m away —{" "}
              <Link href={`/properties/${n.id}`} target="_blank" className="underline hover:text-foreground">
                {n.title ?? "Untitled property"}
              </Link>
              {n.locality && <span className="text-[color:var(--warning)]/80"> · {n.locality}</span>}
              <span className="ml-1 text-[color:var(--warning)]/60">({n.status})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
