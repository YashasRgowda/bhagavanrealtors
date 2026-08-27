"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { WizardShell } from "@/components/wizard/WizardShell";
import { ChoiceCard, ChoiceGrid } from "@/components/wizard/ChoiceCard";
import { DetailsForm } from "@/components/wizard/DetailsForm";
import { MediaUpload } from "@/components/wizard/MediaUpload";
import { WaitingBuyers } from "@/components/wizard/WaitingBuyers";
import { initialWizardState, type WizardState } from "@/components/wizard/types";
import { TRANSACTION_TYPES, CATEGORIES, PROPERTY_TYPES } from "@/lib/property/enums";
import { ArrowLeft, ArrowRight, Check, AlertTriangle } from "lucide-react";
import { isIndianPhoneLenient } from "@/lib/format/phone";
import { DUR, EASE_OUT, useMotionPrefs } from "@/lib/motion";

/**
 * Panels travel horizontally so "forward" and "back" are unmistakable.
 * 24px — enough to read as direction, not enough to delay a field becoming
 * usable. Defined at module scope so the object identity never changes.
 */
const PANEL = {
  enter: (d: number) => ({ opacity: 0, x: d * 24 }),
  center: { opacity: 1, x: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
} as const;

const LABELS = ["Deal", "Type", "Details", "Photos", "Review"];
const HEADINGS = ["Deal type", "Property type", "Property details", "Photos & video", "All done"];
const TOTAL = LABELS.length;

const DEAL_BLURB: Record<string, string> = {
  sale:  "One-time sale of the property",
  rent:  "Monthly rent + refundable deposit",
  lease: "Karnataka-style lump-sum lease",
};

export default function NewPropertyPage() {
  const router = useRouter();
  const m = useMotionPrefs();
  const [step, setStep] = useState(1);
  // Which way the next panel should travel in from. Forward = from the right.
  const [dir, setDir] = useState(1);
  const [state, setState] = useState<WizardState>(initialWizardState);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Fields only turn red once he has asked to be shown what is missing.
  const [touched, setTouched] = useState(false);
  const [pendingJump, setPendingJump] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = (patch: Partial<WizardState>) => setState(prev => ({ ...prev, ...patch }));

  /**
   * Move the cursor into the field a summary chip points at.
   *
   * Runs from an effect rather than the click handler on purpose: revealing
   * the inline messages re-renders the form, and focus applied before that
   * commit gets dropped. An effect fires after the DOM is settled, so the
   * measurement is right and the focus sticks.
   *
   * Also avoids `scrollIntoView` — the step panel carries an animating
   * `transform`, which that API resolves against and then silently no-ops.
   */
  useEffect(() => {
    if (!pendingJump) return;
    const el = document.getElementById(pendingJump);
    setPendingJump(null);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2;
    // Instant, not smooth: focusing the field cancels an in-flight smooth
    // scroll, which left the dealer with a focused input he still could not
    // see. Arriving immediately is also the right call for someone who just
    // said "show me what's missing".
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    el.focus({ preventScroll: true });
  }, [pendingJump]);

  const go = (next: number) => {
    setDir(next >= step ? 1 : -1);
    setStep(next);
  };

  const typeChoices = useMemo(() => {
    if (!state.category) return [];
    return (PROPERTY_TYPES[state.category] as ReadonlyArray<{ value: string; label: string; rentOnly?: boolean; saleOnly?: boolean }>)
      .filter(t => {
        if (state.transaction_type === "sale" && t.rentOnly) return false;
        if (state.transaction_type !== "sale" && t.saleOnly) return false;
        return true;
      });
  }, [state.category, state.transaction_type]);

  /**
   * Identical rules to before — only the shape changed. Each entry now carries
   * the field it belongs to and the id of its input, so the summary can put the
   * dealer's cursor straight into the box that needs him rather than leaving
   * him to hunt down a long form.
   */
  type FieldIssue = { field: string; anchor: string; message: string };

  function validationIssues(): FieldIssue[] {
    if (step !== 3) return [];
    const errs: FieldIssue[] = [];
    if (!state.price)
      errs.push({ field: "price", anchor: "f-price", message: "Add the price" });
    if (!state.area_value)
      errs.push({ field: "area_value", anchor: "f-area", message: "Add the area" });
    if (!state.area_unit)
      errs.push({ field: "area_unit", anchor: "f-area-unit", message: "Pick the area unit" });
    if (!state.locality)
      errs.push({ field: "locality", anchor: "f-locality", message: "Add the locality" });
    if (!state.contact.owner_phone)
      errs.push({ field: "owner_phone", anchor: "f-owner-phone", message: "Add the owner's phone number" });
    else if (!isIndianPhoneLenient(state.contact.owner_phone))
      errs.push({ field: "owner_phone", anchor: "f-owner-phone", message: "That phone number doesn't look right" });
    const needsBhk =
      state.category === "residential" &&
      ["flat", "villa", "builder_floor", "studio", "penthouse"].includes(state.property_type);
    if (needsBhk && !state.bhk)
      errs.push({ field: "bhk", anchor: "f-bhk", message: "Pick the BHK" });
    return errs;
  }

  function validationErrors(): string[] {
    return validationIssues().map(e => e.message);
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
      go(4);
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

  const issues = validationIssues();
  const errs = issues.map(e => e.message);
  const errorMap = Object.fromEntries(issues.map(e => [e.field, e.message]));

  /**
   * Scroll the field into view and put the cursor in it.
   *
   * Order matters: revealing the inline messages adds a line under several
   * fields, which pushes the target further down the page. Flip `touched`
   * first and wait two frames for React to commit and layout to settle, or the
   * scroll lands where the field *used* to be.
   */
  function jumpTo(anchor: string) {
    setTouched(true);
    setPendingJump(anchor);
  }

  return (
    <WizardShell
      step={step}
      total={TOTAL}
      labels={LABELS}
      heading={HEADINGS[step - 1]}
      actions={
        <>
          <Button
            variant="ghost"
            onClick={() => go(Math.max(1, step - 1))}
            disabled={step === 1 || busy}
          >
            <ArrowLeft aria-hidden /> Back
          </Button>

          <div className="ml-auto flex min-w-0">
            {step < 3 && (
              <Button size="lg" onClick={() => go(step + 1)} disabled={!canAdvance()}>
                Continue <ArrowRight aria-hidden />
              </Button>
            )}
            {step === 3 && (
              <Button size="lg" onClick={createDraft} disabled={!canAdvance() || busy} loading={busy}>
                {propertyId ? "Update & continue" : "Save & add photos"}
                <ArrowRight aria-hidden />
              </Button>
            )}
            {step === 4 && (
              <Button size="lg" onClick={() => go(5)}>
                Continue <ArrowRight aria-hidden />
              </Button>
            )}
            {step === 5 && (
              <Button size="lg" onClick={finish}>
                <Check aria-hidden /> View property
              </Button>
            )}
          </div>
        </>
      }
    >
      <motion.div
        key={step}
        custom={m.animate ? dir : 0}
        variants={PANEL}
        initial="enter"
        animate="center"
      >
          {/* ── 1 · Deal type ── */}
          {step === 1 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm text-ink-muted">
              Is this property for sale or for rent?
            </h2>
            <ChoiceGrid columns={3}>
              {TRANSACTION_TYPES.map(t => (
                <ChoiceCard
                  key={t.value}
                  label={t.label}
                  description={DEAL_BLURB[t.value]}
                  selected={state.transaction_type === t.value}
                  onSelect={() => set({ transaction_type: t.value })}
                />
              ))}
            </ChoiceGrid>
          </section>
          )}

          {/* ── 2 · Category + type ── */}
          {step === 2 && (
          <div className="flex flex-col gap-7">
            <section className="flex flex-col gap-3">
              <h2 className="text-micro uppercase text-ink-muted">Category</h2>
              <ChoiceGrid columns={3}>
                {CATEGORIES.map(c => (
                  <ChoiceCard
                    key={c.value}
                    label={c.label}
                    selected={state.category === c.value}
                    onSelect={() => set({ category: c.value, property_type: "" })}
                  />
                ))}
              </ChoiceGrid>
            </section>

            {state.category && (
              <motion.section
                initial={m.animate ? { opacity: 0, y: 8 } : { opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, ease: EASE_OUT }}
                className="flex flex-col gap-3"
              >
                <h2 className="text-micro uppercase text-ink-muted">Property type</h2>
                <ChoiceGrid columns={2}>
                  {typeChoices.map(t => (
                    <ChoiceCard
                      key={t.value}
                      label={t.label}
                      selected={state.property_type === t.value}
                      onSelect={() => set({ property_type: t.value })}
                    />
                  ))}
                </ChoiceGrid>
              </motion.section>
            )}
          </div>
          )}

          {/* ── 3 · Details ── */}
          {step === 3 && (
          <div className="flex flex-col gap-5">
            {/* At the top, not the foot. The old summary sat below a very long
                form, so the only way to discover what was missing was to fill
                everything and scroll to the end. */}
            {issues.length > 0 && (
              <div className="rounded-lg border border-danger/30 bg-danger-subtle p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-danger-text">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  {issues.length} thing{issues.length === 1 ? "" : "s"} left to fill
                </p>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {issues.map(e => (
                    <li key={e.field + e.message}>
                      <button
                        type="button"
                        onClick={() => jumpTo(e.anchor)}
                        className="inline-flex min-h-9 items-center rounded-md border border-danger/30 bg-elevated px-3 text-sm font-medium text-danger-text transition-colors pointer-coarse:min-h-11 hover:bg-danger-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {e.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DetailsForm
              state={state}
              set={set}
              propertyId={propertyId}
              errors={touched ? errorMap : undefined}
            />
          </div>
          )}

          {/* ── 4 · Media ── */}
          {step === 4 && propertyId && (
          <section className="flex flex-col gap-5">
            <p className="text-sm text-ink-muted">
              The first photo becomes the cover. Add as many as you like — you can
              reorder them later.
            </p>
            <MediaUpload propertyId={propertyId} />
          </section>
          )}

          {/* ── 5 · Done ── */}
          {step === 5 && (
          <section className="text-center">
            <motion.div
              initial={m.animate ? { scale: 0.8, opacity: 0 } : { opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 24, mass: 0.7 }}
              className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-accent-fg"
            >
              <Check className="size-6" strokeWidth={2.5} aria-hidden />
            </motion.div>
            <h2 className="mt-6 text-h2 text-ink">All set</h2>
            <p className="mx-auto mt-2.5 max-w-sm text-sm text-ink-muted">
              Your property is live in the catalogue and ready to share.
            </p>

            {propertyId && (
              <WaitingBuyers
                propertyId={propertyId}
                title={state.title || "a new property"}
              />
            )}
          </section>
          )}

          {err && (
          <p className="mt-5 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger-text">
            {err}
          </p>
          )}
      </motion.div>
    </WizardShell>
  );
}
