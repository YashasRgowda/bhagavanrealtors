"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X, AlertTriangle, ExternalLink, Check, HelpCircle } from "lucide-react";
import type { WizardState } from "./types";

type Patch = Partial<WizardState>;

export function GpsCapture({
  state, set,
}: {
  state: WizardState;
  set: (patch: Patch) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const hasCoords = state.latitude !== null && state.longitude !== null;
  const gmapsUrl = hasCoords ? `https://maps.google.com/?q=${state.latitude},${state.longitude}` : "#";
  const badAccuracy = accuracy !== null && accuracy > 30;
  const summary = [state.locality, state.city, state.pincode].filter(Boolean).join(" · ");

  async function geocodeAndApply(lat: number, lng: number, opts: { overwrite: boolean }) {
    set({ latitude: lat, longitude: lng });
    try {
      const res = await fetch("/api/geo/reverse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "reverse geocode failed");
      const g = await res.json() as {
        formatted_address: string | null;
        area: string | null;
        locality: string | null;
        city: string | null;
        pincode: string | null;
        provider: string;
      };
      setProvider(g.provider);

      const patch: Patch = { latitude: lat, longitude: lng };
      const attrPatch: Record<string, unknown> = { ...state.attributes };
      const shouldFill = (existing: unknown) => opts.overwrite || !existing;
      if (shouldFill(state.locality) && g.locality)     patch.locality = g.locality;
      if (shouldFill(state.city) && g.city)             patch.city = g.city;
      if (shouldFill(state.pincode) && g.pincode)       patch.pincode = g.pincode;
      if (shouldFill(attrPatch.area) && g.area)         attrPatch.area = g.area;
      if (shouldFill(state.address_text) && g.formatted_address) patch.address_text = g.formatted_address;
      patch.attributes = attrPatch;
      set(patch);
    } catch (e: unknown) {
      setErr(`Address lookup failed: ${e instanceof Error ? e.message : String(e)}. GPS saved — fill address manually.`);
    }
  }

  async function capture() {
    setErr(null); setAccuracy(null); setProvider(null);
    if (!("geolocation" in navigator)) { setErr("Location not supported on this browser."); return; }
    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setErr("GPS needs HTTPS. Use https:// or localhost."); return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setAccuracy(Math.round(pos.coords.accuracy));
        await geocodeAndApply(lat, lng, { overwrite: false });
        setBusy(false);
      },
      (posErr) => {
        setBusy(false);
        if (posErr.code === posErr.PERMISSION_DENIED)  setErr("Location permission blocked. Enable in browser settings.");
        else if (posErr.code === posErr.TIMEOUT)       setErr("Location timed out. Try again with better signal.");
        else                                           setErr(posErr.message || "Couldn't get your location.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  function parseCoords(input: string): { lat: number; lng: number } | { error: string } {
    const s = input.trim();
    if (!s) return { error: "" };
    if (/maps\.app\.goo\.gl/i.test(s)) {
      return { error: "Shortened links don't contain coordinates. Right-click the spot in Google Maps and copy the coordinates." };
    }
    const dd = s.match(/(-?\d{1,3}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})/);
    if (dd) {
      const lat = Number(dd[1]); const lng = Number(dd[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
      return { error: "Numbers out of range." };
    }
    const dms = s.match(/(\d{1,3})[°\s]+(\d{1,2})['\s]+([\d.]+)"?\s*([NS])[\s,]+(\d{1,3})[°\s]+(\d{1,2})['\s]+([\d.]+)"?\s*([EW])/i);
    if (dms) {
      const lat = dmsToDec(+dms[1], +dms[2], +dms[3], dms[4]);
      const lng = dmsToDec(+dms[5], +dms[6], +dms[7], dms[8]);
      return { lat, lng };
    }
    return { error: "Couldn't read coords. Format: '13.039485, 77.488576'" };
  }

  async function applyPastedCoords(text?: string) {
    const input = (text ?? pasteInput).trim();
    setPasteError(null); setErr(null);
    if (!input) return;
    const parsed = parseCoords(input);
    if ("error" in parsed) { if (parsed.error) setPasteError(parsed.error); return; }
    setBusy(true);
    setAccuracy(null);
    await geocodeAndApply(parsed.lat, parsed.lng, { overwrite: true });
    setBusy(false);
  }

  function clearCoords() {
    set({ latitude: null, longitude: null });
    setAccuracy(null); setProvider(null); setErr(null); setPasteInput(""); setPasteError(null);
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-sm">
      {/* Row 1: capture button + coords + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={hasCoords ? "outline" : "primary"} onClick={capture} disabled={busy} loading={busy}>
          <MapPin className="size-4" aria-hidden />
          {hasCoords ? "Re-capture" : "Capture current location"}
        </Button>
        {hasCoords && (
          <>
            <span className="tabular inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" strokeWidth={2} />
              {state.latitude!.toFixed(5)}, {state.longitude!.toFixed(5)}
              {accuracy !== null && <span className={badAccuracy ? "text-[color:var(--warning)]" : ""}> · ±{accuracy}m</span>}
            </span>
            <a href={gmapsUrl} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-0.5 text-xs font-medium text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-foreground">
              Google Maps <ExternalLink className="h-3 w-3" />
            </a>
            <button type="button" onClick={clearCoords}
                    className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs text-ink-muted transition-colors hover:text-danger-text">
              <X className="size-3.5" aria-hidden /> clear
            </button>
          </>
        )}
      </div>

      {/* Row 2: filled summary (only after capture) */}
      {hasCoords && summary && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            <strong>{summary}</strong>
            {provider && <span className="text-muted-foreground"> · via {provider === "mappls" ? "MapmyIndia" : provider === "osm" ? "OpenStreetMap" : provider}</span>}
          </span>
        </div>
      )}

      {/* Row 3: correction input (only after capture) */}
      {hasCoords && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            placeholder="Pin off? Paste corrected coords from Google Maps"
            value={pasteInput}
            onChange={(e) => { setPasteInput(e.target.value); setPasteError(null); }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (text) setTimeout(() => applyPastedCoords(text), 0);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPastedCoords(); } }}
            className="flex-1 font-mono text-xs"
            disabled={busy}
          />
          <button type="button"
                  onClick={() => setShowHelp(v => !v)}
                  className="grid size-11 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-inset hover:text-ink"
                  aria-label="How to get coordinates from Google Maps">
            <HelpCircle className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {/* Contextual help (toggled) */}
      {hasCoords && showHelp && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          In Google Maps: <strong>right-click the exact spot</strong> → coordinates appear at the top of the menu →
          click them to copy → paste here. Address auto-updates.
        </p>
      )}

      {/* Not yet captured — one-line hint */}
      {!hasCoords && (
        <p className="mt-2 text-xs text-muted-foreground">
          Stand in front of the property and tap. Address fields auto-fill — always verify.
        </p>
      )}

      {/* Errors */}
      {pasteError && (
        <p className="mt-1.5 text-xs text-[color:var(--danger)]">{pasteError}</p>
      )}
      {err && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-[color:var(--danger)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{err}
        </div>
      )}
    </div>
  );
}

function dmsToDec(deg: number, min: number, sec: number, hemi: string): number {
  const dec = deg + min / 60 + sec / 3600;
  return hemi === "S" || hemi === "W" ? -dec : dec;
}
