"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WizardShell } from "@/components/wizard/WizardShell";
import { DetailsForm } from "@/components/wizard/DetailsForm";
import { MediaUpload } from "@/components/wizard/MediaUpload";
import { initialWizardState, type WizardState } from "@/components/wizard/types";
import { TRANSACTION_TYPES, CATEGORIES, PROPERTY_TYPES } from "@/lib/property/enums";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { isIndianMobile, isIndianPhoneLenient } from "@/lib/format/phone";

const LABELS = ["Deal", "Type", "Details", "Photos", "Review"];
const HEADINGS = ["Deal type", "Property type", "Property details", "Photos & video", "All done"];
const TOTAL = LABELS.length;

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialWizardState);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (patch: Partial<WizardState>) => setState(prev => ({ ...prev, ...patch }));

  const typeChoices = useMemo(() => {
    if (!state.category) return [];
    return (PROPERTY_TYPES[state.category] as ReadonlyArray<{ value: string; label: string; rentOnly?: boolean; saleOnly?: boolean }>)
      .filter(t => {
        if (state.transaction_type === "sale" && t.rentOnly) return false;
        if (state.transaction_type !== "sale" && t.saleOnly) return false;
        return true;
      });
  }, [state.category, state.transaction_type]);

  function validationErrors(): string[] {
    if (step !== 3) return [];
    const errs: string[] = [];
    if (!state.price)                                              errs.push("Price is required");
    if (!state.area_value)                                         errs.push("Area is required");
    if (!state.area_unit)                                          errs.push("Area unit is required");
    if (!state.locality)                                           errs.push("Locality is required");
    if (!state.contact.owner_phone)                                errs.push("Owner phone is required");
    else if (!isIndianPhoneLenient(state.contact.owner_phone))     errs.push("Owner phone doesn't look valid");
    const needsBhk =
      state.category === "residential" &&
      ["flat", "villa", "builder_floor", "studio", "penthouse"].includes(state.property_type);
    if (needsBhk && !state.bhk)                                    errs.push("BHK is required");
    return errs;
  }

  function canAdvance(): boolean {
    if (step === 1) return !!state.transaction_type;
    if (step === 2) return !!state.category && !!state.property_type;
    if (step === 3) return validationErrors().length === 0;
    return true;
  }

  async function createDraft() {
    setBusy(true); setErr(null);
    try {
      // Second (or later) trip through this step? Update the existing row instead
      // of creating a duplicate. Fixes the bug where hitting Back then Save again
      // was inserting a new property every time.
      const isUpdate = propertyId !== null;
      const url = isUpdate ? `/api/properties/${propertyId}` : "/api/properties";
      const method = isUpdate ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
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
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      setPropertyId(id);
      setStep(4);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    router.replace(`/properties/${propertyId}`);
    router.refresh();
  }

  return (
    <WizardShell step={step} total={TOTAL} labels={LABELS} heading={HEADINGS[step - 1]}>
      <Card>
        <CardContent className="p-5 sm:p-7">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-[0.9375rem] font-medium text-muted-foreground">
                Is this property for sale or rent?
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TRANSACTION_TYPES.map(t => {
                  const selected = state.transaction_type === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => set({ transaction_type: t.value })}
                      className={`rounded-lg border p-4 text-left transition-all duration-200 ${
                        selected
                          ? "border-foreground bg-foreground text-background shadow-sm"
                          : "border-border bg-card hover:border-foreground/35 hover:bg-muted/40"
                      }`}
                    >
                      <div className="font-display text-lg leading-tight">{t.label}</div>
                      <div className={`mt-1.5 text-xs leading-relaxed ${selected ? "text-background/60" : "text-muted-foreground"}`}>
                        {t.value === "sale" && "One-time sale of the property"}
                        {t.value === "rent" && "Monthly rent + refundable deposit"}
                        {t.value === "lease" && "Karnataka-style lump-sum lease"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="eyebrow">Category</h2>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(c => {
                    const selected = state.category === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => set({ category: c.value, property_type: "" })}
                        className={`rounded-md border px-3 py-3.5 text-sm font-medium transition-all duration-200 ${
                          selected
                            ? "border-foreground bg-foreground text-background shadow-sm"
                            : "border-border bg-card hover:border-foreground/35 hover:bg-muted/40"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {state.category && (
                <div className="space-y-3">
                  <h2 className="eyebrow">Property type</h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {typeChoices.map(t => {
                      const selected = state.property_type === t.value;
                      return (
                        <button
                          key={t.value}
                          onClick={() => set({ property_type: t.value })}
                          className={`rounded-md border px-3 py-3 text-[0.8125rem] leading-snug transition-all duration-200 ${
                            selected
                              ? "border-foreground bg-foreground font-medium text-background shadow-sm"
                              : "border-border bg-card hover:border-foreground/35 hover:bg-muted/40"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <>
              <DetailsForm state={state} set={set} propertyId={propertyId} />
              {(() => {
                const errs = validationErrors();
                if (errs.length === 0) return null;
                return (
                  <div className="mt-5 rounded-lg border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 p-4 text-sm">
                    <p className="font-medium text-[color:var(--danger)]">Still needed before you can continue</p>
                    <ul className="mt-2 space-y-1 text-[color:var(--danger)]/85">
                      {errs.map(e => <li key={e}>· {e}</li>)}
                    </ul>
                  </div>
                );
              })()}
            </>
          )}

          {step === 4 && propertyId && (
            <div className="space-y-5">
              <p className="text-[0.9375rem] text-muted-foreground">
                The first photo becomes the cover. Add as many as you like — you can reorder later.
              </p>
              <MediaUpload propertyId={propertyId} />
            </div>
          )}

          {step === 5 && (
            <div className="py-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
                <Check className="h-6 w-6" strokeWidth={2} />
              </div>
              <h2 className="mt-6 font-display text-2xl leading-tight">All set</h2>
              <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Your property is live in the catalogue and ready to share.
              </p>
            </div>
          )}

          {err && (
            <p className="mt-5 rounded-md border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/5 px-3 py-2.5 text-sm text-[color:var(--danger)]">
              {err}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Nav */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1 || busy}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {step < 3 && (
          <Button size="lg" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {step === 3 && (
          <Button size="lg" onClick={createDraft} disabled={!canAdvance() || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {propertyId ? "Update & continue" : "Save & add photos"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
        {step === 4 && (
          <Button size="lg" onClick={() => setStep(5)}>Continue <ArrowRight className="h-4 w-4" /></Button>
        )}
        {step === 5 && (
          <Button size="lg" onClick={finish}><Check className="h-4 w-4" /> View property</Button>
        )}
      </div>
    </WizardShell>
  );
}
