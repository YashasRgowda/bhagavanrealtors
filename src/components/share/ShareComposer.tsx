"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2, Copy, Check, ExternalLink, Share2, Eye, EyeOff, ShieldOff, Play, MessageCircle } from "lucide-react";
import { Modal, ModalStep } from "@/components/ui/modal";
import { SHARE_PRESETS, FIELD_LABELS, type ShareFields, type SharePresetKey } from "@/lib/share/presets";
import type { PropertyMediaRow } from "@/lib/property/types";

type Preset = SharePresetKey | "custom";

export function ShareComposer({
  propertyId, media, onClose,
}: {
  propertyId: string;
  media: PropertyMediaRow[];
  onClose: () => void;
}) {
  const router = useRouter();

  const [preset, setPreset] = useState<Preset>("teaser");
  const [fields, setFields] = useState<ShareFields>(SHARE_PRESETS.teaser.fields);
  const [hideOwner, setHideOwner] = useState(true);
  const [hideAddress, setHideAddress] = useState(true);
  const [expiresDays, setExpiresDays] = useState<string>(""); // "" = never
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>(() => {
    // Teaser default: cover only.
    const cover = media.find(m => m.is_cover) ?? media[0];
    return cover ? [cover.id] : [];
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const applyPreset = (key: Preset) => {
    setPreset(key);
    if (key === "custom") return;
    const p = SHARE_PRESETS[key];
    setFields(p.fields);
    setHideOwner(p.hide_owner);
    setHideAddress(p.hide_address);
    // Reset media selection based on preset's media policy.
    if (p.media === "cover_only") {
      const cover = media.find(m => m.is_cover) ?? media[0];
      setSelectedMediaIds(cover ? [cover.id] : []);
    } else if (p.media === "photos") {
      setSelectedMediaIds(media.filter(m => m.type === "image").map(m => m.id));
    } else {
      setSelectedMediaIds(media.map(m => m.id));
    }
  };

  const toggleField = (k: keyof ShareFields) => {
    setPreset("custom");
    setFields(prev => ({ ...prev, [k]: !prev[k] }));
  };
  const toggleMedia = (id: string) => {
    setPreset("custom");
    setSelectedMediaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const shareableFieldKeys = useMemo(
    () => Object.keys(FIELD_LABELS).filter(k => k !== "photos" && k !== "video") as (keyof ShareFields)[],
    [],
  );

  async function generate() {
    setBusy(true); setErr(null); setCopied(false);
    try {
      const res = await fetch(`/api/properties/${propertyId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preset,
          fields,
          media_ids: selectedMediaIds,
          hide_owner: hideOwner,
          hide_address: hideAddress,
          expires_in_days: expiresDays ? Number(expiresDays) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create link");
      const { url } = await res.json() as { url: string };
      setShareUrl(url);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappText = shareUrl
    ? `Check out this property: ${shareUrl}`
    : "";
  const includedCount = shareableFieldKeys.filter(k => Boolean(fields[k])).length;

  return (
    <Modal
      onClose={onClose}
      size="lg"
      icon={
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-muted text-foreground">
          {shareUrl ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" strokeWidth={1.75} />}
        </span>
      }
      eyebrow={shareUrl ? "Ready to send" : "Private share"}
      title={shareUrl ? "Share link ready" : "Share this property"}
      description={
        shareUrl
          ? "Only what you ticked is visible. Your brand phone is the only contact on the page."
          : "Nothing is shared unless you tick it. The owner's name and number never leave this app."
      }
      footer={
        shareUrl ? (
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => setShareUrl(null)}>Create another link</Button>
            <Button size="lg" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="tabular text-[0.6875rem] text-muted-foreground">
              {includedCount} detail{includedCount === 1 ? "" : "s"} · {selectedMediaIds.length} of {media.length} photo{media.length === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2.5 sm:ml-auto">
              <Button variant="outline" size="lg" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button size="lg" onClick={generate} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Generate link
              </Button>
            </div>
          </div>
        )
      }
    >
      {shareUrl ? (
        <ShareResult url={shareUrl} whatsappText={whatsappText} copied={copied} onCopy={copyLink} />
      ) : (
        <div className="space-y-7">
          {/* ─── 1. Preset ─── */}
          <ModalStep
            n={1}
            title="Pick a preset"
            aside={preset === "custom" ? "Customised" : undefined}
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(Object.keys(SHARE_PRESETS) as SharePresetKey[]).map(k => {
                const p = SHARE_PRESETS[k];
                const active = preset === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => applyPreset(k)}
                    className={`rounded-lg border p-3.5 text-left text-sm transition-all duration-200 ${
                      active
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-card hover:border-foreground/35 hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-semibold">{p.label}</p>
                    <p className={`mt-1.5 text-xs leading-relaxed ${active ? "text-background/60" : "text-muted-foreground"}`}>
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </ModalStep>

          {/* ─── 2. Fields ─── */}
          <ModalStep n={2} title="What to include" aside={`${includedCount} selected`}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {shareableFieldKeys.map(k => {
                const on = Boolean(fields[k]);
                return (
                  <label
                    key={k}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-[0.8125rem] transition-all duration-200 ${
                      on
                        ? "border-foreground bg-muted/50 font-medium"
                        : "border-border bg-card hover:border-foreground/30 hover:bg-muted/25"
                    }`}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleField(k)} className="mt-px h-4 w-4 shrink-0" />
                    <span className="min-w-0 leading-snug">{FIELD_LABELS[k]}</span>
                  </label>
                );
              })}
            </div>
          </ModalStep>

          {/* ─── 3. Media ─── */}
          {media.length > 0 && (
            <ModalStep n={3} title="Photos & video" aside={`${selectedMediaIds.length} / ${media.length} selected`}>
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
                {media.map(m => {
                  const selected = selectedMediaIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMedia(m.id)}
                      aria-pressed={selected}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        selected ? "border-foreground" : "border-transparent opacity-45 hover:opacity-90"
                      }`}
                    >
                      {m.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumb_url || m.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2a2a28] to-[#0a0a0a]">
                          <Play className="h-4 w-4 fill-white/90 text-white/90" />
                        </div>
                      )}
                      {selected && (
                        <div className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow-sm">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      {m.is_cover && (
                        <span className="absolute left-1 top-1 rounded bg-black/65 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white">
                          Cover
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ModalStep>
          )}

          {/* ─── 4. Privacy ─── */}
          <ModalStep n={4} title="Privacy locks">
            <div className="space-y-2.5">
              <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3.5 transition-all duration-200 ${hideOwner ? "border-foreground bg-muted/50" : "border-border bg-card hover:border-foreground/30"}`}>
                <input type="checkbox" checked={hideOwner} onChange={e => { setHideOwner(e.target.checked); setPreset("custom"); }} className="mt-px h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium">
                    <ShieldOff className="h-3.5 w-3.5" /> Hide owner name &amp; phone
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Recommended always ON. Your brand phone shows as the only contact.
                  </span>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3.5 transition-all duration-200 ${hideAddress ? "border-foreground bg-muted/50" : "border-border bg-card hover:border-foreground/30"}`}>
                <input type="checkbox" checked={hideAddress} onChange={e => { setHideAddress(e.target.checked); setPreset("custom"); }} className="mt-px h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium">
                    {hideAddress ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} Hide exact street address
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Turn OFF only for trusted buyers ready to visit.
                  </span>
                </span>
              </label>
            </div>
          </ModalStep>

          {/* ─── 5. Expiry ─── */}
          <ModalStep n={5} title="Expiry" aside="Optional">
            <Select value={expiresDays} onChange={e => setExpiresDays(e.target.value)} className="sm:max-w-[16rem]">
              <option value="">Never — revoke manually</option>
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </Select>
          </ModalStep>

          {err && (
            <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
              {err}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function ShareResult({ url, whatsappText, copied, onCopy }: {
  url: string; whatsappText: string; copied: boolean; onCopy: () => void;
}) {
  const waHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-2.5">Your link</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <Input value={url} readOnly className="border-0 bg-transparent font-mono text-xs shadow-none" />
          <Button size="sm" variant={copied ? "default" : "outline"} onClick={onCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <a href={waHref} target="_blank" rel="noreferrer" className="block">
          <Button variant="outline" size="lg" className="w-full">
            <MessageCircle className="h-4 w-4" /> Send on WhatsApp
          </Button>
        </a>
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <Button variant="outline" size="lg" className="w-full">
            <ExternalLink className="h-4 w-4" /> Preview as buyer
          </Button>
        </a>
      </div>

      <p className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
        <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
        You can revoke this link at any time from the property page — anyone holding it will
        immediately see &ldquo;no longer available&rdquo;.
      </p>
    </div>
  );
}
