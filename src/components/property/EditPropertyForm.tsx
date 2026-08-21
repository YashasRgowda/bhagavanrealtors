"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailsForm } from "@/components/wizard/DetailsForm";
import { MediaManager } from "./MediaManager";
import { initialWizardState, type WizardState } from "@/components/wizard/types";
import { isIndianPhoneLenient } from "@/lib/format/phone";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import type { PropertyRow, PropertyMediaRow } from "@/lib/property/types";

type ContactRow = Record<string, unknown> | null;

/** Map the saved rows back into the shape DetailsForm already knows how to edit. */
function toWizardState(prop: PropertyRow, contact: ContactRow): WizardState {
  const c = (contact ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));
  const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));

  return {
    ...initialWizardState,
    transaction_type: prop.transaction_type,
    category: prop.category,
    property_type: prop.property_type,
    title: prop.title,
    description: prop.description,
    city: prop.city,
    locality: prop.locality,
    address_text: prop.address_text,
    pincode: prop.pincode,
    latitude: prop.latitude,
    longitude: prop.longitude,
    price: prop.price,
    price_unit: prop.price_unit,
    deposit: prop.deposit,
    is_negotiable: prop.is_negotiable ?? true,
    area_value: prop.area_value,
    area_unit: prop.area_unit ?? "sqft",
    bhk: prop.bhk,
    source: prop.source ?? "walkin",
    attributes: prop.attributes ?? {},
    contact: {
      owner_name: str(c.owner_name),
      owner_phone: str(c.owner_phone),
      owner_alt_phone: str(c.owner_alt_phone),
      brokerage_expected: num(c.brokerage_expected),
      private_notes: str(c.private_notes),
      owner_father: str(c.owner_father),
      owner_pan: str(c.owner_pan),
      owner_aadhaar: str(c.owner_aadhaar),
      is_nri: Boolean(c.is_nri),
      nri_country: str(c.nri_country),
      bank_name: str(c.bank_name),
      bank_account: str(c.bank_account),
      bank_ifsc: str(c.bank_ifsc),
      has_coowner: Boolean(c.has_coowner),
      coowner_name: str(c.coowner_name),
      coowner_relation: str(c.coowner_relation),
      coowner_pan: str(c.coowner_pan),
      coowner_aadhaar: str(c.coowner_aadhaar),
    },
  };
}

export function EditPropertyForm({
  prop,
  contact,
  media,
}: {
  prop: PropertyRow;
  contact: ContactRow;
  media: PropertyMediaRow[];
}) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(() => toWizardState(prop, contact));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...patch }));
    setSaved(false);
  };

  function validationErrors(): string[] {
    const errs: string[] = [];
    if (!state.price)                                          errs.push("Price is required");
    if (!state.area_value)                                     errs.push("Area is required");
    if (!state.locality)                                       errs.push("Locality is required");
    if (!state.contact.owner_phone)                            errs.push("Owner phone is required");
    else if (!isIndianPhoneLenient(state.contact.owner_phone)) errs.push("Owner phone doesn't look valid");
    const needsBhk =
      state.category === "residential" &&
      ["flat", "villa", "builder_floor", "studio", "penthouse"].includes(state.property_type);
    if (needsBhk && !state.bhk)                                errs.push("BHK is required");
    return errs;
  }

  const errs = validationErrors();

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/properties/${prop.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transaction_type: state.transaction_type,
          category: state.category,
          property_type: state.property_type,
          title: state.title,
          description: state.description,
          city: state.city,
          locality: state.locality,
          address_text: state.address_text,
          pincode: state.pincode,
          latitude: state.latitude,
          longitude: state.longitude,
          price: state.price,
          price_unit: state.transaction_type === "rent" ? "per_month" : "total",
          deposit: state.deposit,
          is_negotiable: state.is_negotiable,
          area_value: state.area_value,
          area_unit: state.area_unit,
          bhk: state.bhk,
          source: state.source,
          attributes: state.attributes,
          contact: {
            owner_name: state.contact.owner_name || null,
            owner_phone: state.contact.owner_phone || null,
            owner_alt_phone: state.contact.owner_alt_phone || null,
            brokerage_expected: state.contact.brokerage_expected ?? null,
            private_notes: state.contact.private_notes || null,
            owner_father: state.contact.owner_father || null,
            owner_pan: state.contact.owner_pan || null,
            owner_aadhaar: state.contact.owner_aadhaar || null,
            is_nri: state.contact.is_nri,
            nri_country: state.contact.nri_country || null,
            bank_name: state.contact.bank_name || null,
            bank_account: state.contact.bank_account || null,
            bank_ifsc: state.contact.bank_ifsc || null,
            has_coowner: state.contact.has_coowner,
            coowner_name: state.contact.coowner_name || null,
            coowner_relation: state.contact.coowner_relation || null,
            coowner_pan: state.contact.coowner_pan || null,
            coowner_aadhaar: state.contact.coowner_aadhaar || null,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      setSaved(true);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* ── Photos & video ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="eyebrow">Photos &amp; video</CardTitle>
          <p className="text-xs text-muted-foreground">
            Hover a tile to make it the cover or delete it. Deleting removes the file permanently.
          </p>
        </CardHeader>
        <CardContent>
          <MediaManager propertyId={prop.id} media={media} />
        </CardContent>
      </Card>

      {/* ── Details ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="eyebrow">Listing details</CardTitle>
          <p className="text-xs text-muted-foreground">
            Price, area, location and the private owner contact.
          </p>
        </CardHeader>
        <CardContent className="pt-1">
          <DetailsForm state={state} set={set} propertyId={prop.id} />
        </CardContent>
      </Card>

      {errs.length > 0 && (
        <div className="rounded-lg border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 p-4 text-sm">
          <p className="font-medium text-[color:var(--danger)]">Fix these before saving</p>
          <ul className="mt-2 space-y-1 text-[color:var(--danger)]/85">
            {errs.map(e => <li key={e}>· {e}</li>)}
          </ul>
        </div>
      )}

      {err && (
        <p className="rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
          {err}
        </p>
      )}

      {/* ── Sticky save bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl pb-safe md:pb-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3.5">
          <Link
            href={`/properties/${prop.id}`}
            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Discard
          </Link>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <Button size="lg" onClick={save} disabled={busy || errs.length > 0}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
