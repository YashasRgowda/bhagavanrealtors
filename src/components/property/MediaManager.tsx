"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUpload } from "@/components/wizard/MediaUpload";
import { Loader2, Trash2, Star, Play, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyMediaRow } from "@/lib/property/types";

/**
 * Manage the media already attached to a property: delete an item, promote one
 * to cover, or upload more. Deleting removes the underlying file too, so this
 * is a real delete rather than just hiding a row.
 */
export function MediaManager({
  propertyId,
  media,
}: {
  propertyId: string;
  media: PropertyMediaRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Delete failed");
      setConfirmId(null);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function makeCover(id: string) {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/media/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_cover: true }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Couldn't set cover");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {media.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map(m => {
            const busy = busyId === m.id;
            const confirming = confirmId === m.id;
            return (
              <div
                key={m.id}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-colors",
                  m.is_cover ? "border-foreground" : "border-border",
                )}
              >
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumb_url || m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2a2a28] to-[#0a0a0a]">
                    <Play className="h-6 w-6 fill-white/90 text-white/90" />
                  </div>
                )}

                {m.is_cover && (
                  <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-background">
                    Cover
                  </span>
                )}
                {m.type === "video" && !m.is_cover && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                    Video
                  </span>
                )}

                {/* Confirmation replaces the tile so a mis-tap can't delete a photo */}
                {confirming ? (
                  <div className="absolute inset-0 grid place-items-center gap-2 bg-[#0a0a0a]/85 p-3 text-center backdrop-blur-sm">
                    <p className="text-[0.6875rem] font-medium leading-snug text-white">
                      Delete this {m.type}?
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="rounded-md border border-white/25 px-2.5 py-1 text-[0.6875rem] font-medium text-white transition-colors hover:bg-white/10"
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md bg-[color:var(--danger)] px-2.5 py-1 text-[0.6875rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                    {!m.is_cover && m.type === "image" && (
                      <button
                        type="button"
                        onClick={() => makeCover(m.id)}
                        disabled={busy}
                        title="Make cover photo"
                        aria-label="Make cover photo"
                        className="grid h-8 w-8 place-items-center rounded-md bg-white/95 text-[#0a0a0a] transition-transform hover:scale-105 disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmId(m.id)}
                      title="Delete"
                      aria-label="Delete"
                      className="grid h-8 w-8 place-items-center rounded-md bg-white/95 text-[color:var(--danger)] transition-transform hover:scale-105"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-strong bg-muted/30 px-6 py-10 text-center">
          <ImageIcon className="mx-auto h-7 w-7 text-faint" strokeWidth={1.25} />
          <p className="mt-3.5 text-sm text-muted-foreground">
            No photos yet — the first photo you add becomes the cover.
          </p>
        </div>
      )}

      {err && (
        <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
          {err}
        </p>
      )}

      <div className="rule-fade" />

      {/* New uploads continue the existing sort order and never steal the cover */}
      <MediaUpload
        propertyId={propertyId}
        startIndex={media.length}
        showGrid={false}
        onChange={() => router.refresh()}
      />
    </div>
  );
}
