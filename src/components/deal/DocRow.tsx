"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, Check, FileText, ExternalLink, X } from "lucide-react";
import { humanBytes } from "@/lib/media/limits";
import type { DocRowValue } from "@/lib/deal/types";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*";

export function DocRow({
  dealId, stageKey, fieldName, label, value, onChange,
}: {
  dealId: string;
  stageKey: string;
  fieldName: string;
  label: string;
  value: DocRowValue | undefined;
  onChange: (next: DocRowValue) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setErr(null); setBusy(true);
    try {
      const signRes = await fetch(`/api/deals/${dealId}/upload/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage: stageKey,
          field: fieldName,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });
      if (!signRes.ok) throw new Error((await signRes.text()) || "Sign failed");
      const target = await signRes.json() as { path: string; uploadUrl: string; publicUrl: string; token?: string };

      const put = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream", ...(target.token ? { "x-upsert": "true" } : {}) },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

      onChange({
        ok: true,
        storage_path: target.path,
        filename: file.name,
        bytes: file.size,
        uploaded_at: new Date().toISOString(),
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const hasFile = Boolean(value?.storage_path);
  const ok = Boolean(value?.ok);
  const publicUrl = value?.storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET || "property-media"}/${value.storage_path}`
    : null;

  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => onChange({ ...(value ?? {}), ok: e.target.checked })}
          className="h-4 w-4 shrink-0"
        />
        <span className="flex-1 text-sm">{label}</span>
        {ok && !hasFile && (
          <Check className="h-4 w-4 text-[color:var(--success)]" />
        )}
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-transparent px-2 py-1 text-xs hover:bg-muted">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          <span>{hasFile ? "Replace" : "Attach"}</span>
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {hasFile && publicUrl && (
        <div className="mt-2 flex items-center gap-2 rounded bg-muted/60 px-2 py-1.5 text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="flex-1 truncate underline-offset-2 hover:underline">
            {value?.filename ?? "attachment"}
          </a>
          {value?.bytes ? <span className="text-muted-foreground">{humanBytes(value.bytes)}</span> : null}
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={() => onChange({ ok: value?.ok, storage_path: undefined, filename: undefined, bytes: undefined })}
            className="text-muted-foreground hover:text-[color:var(--danger)]"
            aria-label="Remove attachment"
            title="Remove attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-[color:var(--danger)]">{err}</p>}
    </div>
  );
}
