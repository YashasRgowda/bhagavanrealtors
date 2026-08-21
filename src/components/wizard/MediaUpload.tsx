"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { compressImage, makeThumbnail, validateVideo } from "@/lib/media/compress";
import { MEDIA_LIMITS, humanBytes } from "@/lib/media/limits";
import { Loader2, Upload, X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";

type UploadedItem = {
  id: string;
  type: "image" | "video";
  url: string;          // preview URL (blob) OR remote URL after upload
  storage_path: string;
  thumb_url?: string;
  bytes: number;
};

export function MediaUpload({
  propertyId,
  onChange,
  startIndex = 0,
  showGrid = true,
}: {
  propertyId: string;
  onChange?: (items: UploadedItem[]) => void;
  /** How many items the property already has. Keeps sort_order continuous and
   *  stops an edit-page upload from stealing the cover slot. */
  startIndex?: number;
  /** The edit screen renders its own grid of *all* media, so it hides this one. */
  showGrid?: boolean;
}) {
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      const next: UploadedItem[] = [];
      for (const f of Array.from(files)) {
        const kind: "image" | "video" = f.type.startsWith("video/") ? "video" : "image";

        let payload: File;
        let thumbFile: File | null = null;
        if (kind === "image") {
          payload = await compressImage(f);
          thumbFile = await makeThumbnail(payload);
        } else {
          await validateVideo(f);
          payload = f;
        }

        const uploaded = await signAndUpload(propertyId, payload, kind);
        let thumb_url: string | undefined;
        if (thumbFile) {
          const t = await signAndUpload(propertyId, thumbFile, "image");
          thumb_url = t.publicUrl;
        }
        const item: UploadedItem = {
          id: uploaded.path,
          type: kind,
          url: uploaded.publicUrl,
          storage_path: uploaded.path,
          thumb_url,
          bytes: payload.size,
        };
        // record in DB
        await fetch(`/api/properties/${propertyId}/media`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: kind,
            storage_path: item.storage_path,
            url: item.url,
            thumb_url: item.thumb_url ?? null,
            bytes: item.bytes,
            sort_order: startIndex + items.length + next.length,
            is_cover: startIndex + items.length + next.length === 0,
          }),
        });
        next.push(item);
      }
      const merged = [...items, ...next];
      setItems(merged);
      onChange?.(merged);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept={[...MEDIA_LIMITS.image.accept, ...MEDIA_LIMITS.video.accept].join(",")}
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
            disabled={busy}
          />
          <span className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-7 text-[0.9375rem] font-medium text-primary-foreground shadow-xs transition-colors hover:bg-[#242422]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Add photos / video
          </span>
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Images auto-compressed. Video max {MEDIA_LIMITS.video.maxBytes / 1024 / 1024} MB / {MEDIA_LIMITS.video.maxDurationSec}s.
        </p>
      </div>
      {err && (
        <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
          {err}
        </p>
      )}

      {showGrid && items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((it, i) => (
            <div key={it.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {it.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumb_url || it.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-faint">
                  <VideoIcon className="h-6 w-6" strokeWidth={1.5} />
                </div>
              )}
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-foreground px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-background">
                  Cover
                </span>
              )}
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                {humanBytes(it.bytes)}
              </span>
            </div>
          ))}
        </div>
      )}

      {showGrid && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-strong bg-muted/30 px-6 py-10 text-center">
          <ImageIcon className="mx-auto h-7 w-7 text-faint" strokeWidth={1.25} />
          <p className="mt-3.5 text-sm text-muted-foreground">
            No photos yet — the first photo you add becomes the cover.
          </p>
        </div>
      )}
    </div>
  );
}

async function signAndUpload(propertyId: string, file: File, kind: "image" | "video") {
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      propertyId, filename: file.name, contentType: file.type, kind, size: file.size,
    }),
  });
  if (!signRes.ok) throw new Error(`Upload sign failed: ${await signRes.text()}`);
  const target = await signRes.json() as { path: string; uploadUrl: string; token?: string; publicUrl: string };

  const put = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type, ...(target.token ? { "x-upsert": "true" } : {}) },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed: ${put.status} ${await put.text()}`);
  return target;
}
