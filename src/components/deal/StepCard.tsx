"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, RevealPanel, ToggleRow } from "@/components/ui/form";
import { DocRow } from "./DocRow";
import { Check, ChevronDown, ChevronRight, Loader2, AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINRShort } from "@/lib/format/currency";
import { KA_RATES, type StageMeta, type FieldMeta } from "@/lib/deal/stages";
import { missingForStage, requiredFieldsForStage, OPTIONAL_STAGES, type DealCtx } from "@/lib/deal/validation";
import type { StepValue, DocRowValue } from "@/lib/deal/types";

/** Human heading for each toggle-revealed group of fields. */
const GROUP_TITLES: Record<string, string> = {
  has_cobuyer:      "Co-buyer details",
  has_coowner:      "Co-owner details",
  is_nri:           "NRI details",
  form_16b_issued:  "Form 16B",
};

export function StepCard({
  dealId, stage, index, value, defaultOpen, ctx,
}: {
  dealId: string;
  stage: StageMeta;
  index: number;
  value: StepValue | undefined;
  defaultOpen?: boolean;
  ctx: DealCtx;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen ?? !value?.done);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, unknown>>(value?.values ?? {});

  const doneOnServer = !!value?.done;

  // Effective context — reflects the values being edited in THIS card right now,
  // so required-field flags update live as the dealer types.
  const effSaleValue =
    stage.key === "buyer_found" && local.agreed_price ? Number(local.agreed_price)
    : stage.key === "sale_deed" && local.final_value ? Number(local.final_value)
    : ctx.saleValue;
  const effCtx: DealCtx = {
    ...ctx,
    saleValue: effSaleValue,
    hasCobuyer: Boolean(local.has_cobuyer),
    hasCoowner: Boolean(local.has_coowner),
    isNri: Boolean(local.is_nri),
  };

  const requiredSet = new Set(requiredFieldsForStage(stage.key, local, effCtx));
  const missing = missingForStage(stage.key, local, effCtx);
  const isOptional = OPTIONAL_STAGES.includes(stage.key);
  const liveComplete = isOptional || missing.length === 0;

  function setField(name: string, v: unknown) {
    setLocal(prev => {
      const next = { ...prev, [name]: v };
      // ── Smart calc: auto-fill 1% TDS when "applicable" is switched on ──
      if (stage.key === "tds" && name === "applicable" && v === true) {
        const sv = effSaleValue;
        if (sv > 0 && !next.tds_amount) {
          next.tds_amount = Math.round((sv * KA_RATES.tds_pct) / 100);
        }
      }
      return next;
    });
  }

  function applyKarnatakaDefaults() {
    const sv = effSaleValue;
    if (sv <= 0) { setErr("Enter the sale value first (in the Sale deed / Buyer stage)."); return; }
    const stamp = Math.round((sv * KA_RATES.stamp_duty_pct) / 100);
    const reg = Math.round((sv * KA_RATES.registration_pct) / 100);
    const cess = Math.round((stamp * KA_RATES.cess_pct_of_stamp) / 100);
    setLocal(prev => ({ ...prev, stamp_amount: stamp, reg_amount: reg, cess }));
    setErr(null);
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage: stage.key, values: local }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Fields that no toggle controls — these lay out in the main grid.
  const baseFields = stage.fields.filter(f => !f.showIf);

  // Fields revealed by a toggle, bucketed under the toggle that owns them.
  // Rendering these inside their own panel (rather than letting them fall into
  // the main grid) is what keeps "Co-buyer name" from landing beside an
  // unrelated field the moment the checkbox is ticked.
  const groups = new Map<string, FieldMeta[]>();
  for (const f of stage.fields) {
    if (!f.showIf) continue;
    const list = groups.get(f.showIf.field) ?? [];
    list.push(f);
    groups.set(f.showIf.field, list);
  }

  const isGroupOpen = (parent: string) => {
    const child = groups.get(parent)?.[0];
    const other = local[parent];
    if (child?.showIf?.equals !== undefined) return other === child.showIf.equals;
    return Boolean(other);
  };

  // Stage-specific soft warnings
  const khataType = String(local.khata_type ?? "");
  const showEkhataWarning = stage.key === "khata" && khataType !== "" && khataType !== "E" && khataType !== "A";
  const showNriWarning = stage.key === "seller_info" && Boolean(local.is_nri);
  const showTdsHint = stage.key === "tds" && !local.applicable;
  const sellerPrefilled = stage.key === "seller_info" && Boolean(local._prefilled_from_owner);

  return (
    <Card className={cn("transition-colors duration-300", doneOnServer && "border-border-strong bg-muted/40")}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3.5 rounded-xl p-5 text-left transition-colors hover:bg-muted/30"
      >
        <span className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors",
          doneOnServer
            ? "border-foreground bg-foreground text-background"
            : "border-border-strong bg-card text-faint",
        )}>
          {doneOnServer ? <Check className="h-4 w-4" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[0.875rem] font-semibold tracking-[-0.015em]">{stage.title}</p>
            {doneOnServer && <Badge variant="success">Complete</Badge>}
            {!doneOnServer && isOptional && <Badge variant="muted">Optional</Badge>}
            {!doneOnServer && !isOptional && missing.length > 0 && (
              <Badge variant="warning">{missing.length} required left</Badge>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{stage.hint}</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <CardContent className="pt-0">
          {sellerPrefilled && (
            <Hint>
              Seller name auto-filled from the property owner record. Fill in KYC (PAN, Aadhaar), bank details,
              and co-owner / NRI status below.
            </Hint>
          )}
          <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
            {baseFields.map(f => {
              const owned = groups.get(f.name);
              const fullWidth =
                f.kind === "textarea" || f.kind === "doc_row" || f.kind === "checkbox";
              return (
                <React.Fragment key={f.name}>
                  <div className={cn(fullWidth && "sm:col-span-2")}>
                    {renderField(f, local[f.name], v => setField(f.name, v), {
                      dealId,
                      stageKey: stage.key,
                      required: requiredSet.has(f.name),
                    })}
                  </div>

                  {/* A toggle's dependants sit directly beneath it, in their own panel */}
                  {owned && isGroupOpen(f.name) && (
                    <div className="sm:col-span-2">
                      <RevealPanel title={GROUP_TITLES[f.name] ?? "Details"}>
                        {owned.map(sub => (
                          <div
                            key={sub.name}
                            className={cn(
                              (sub.kind === "textarea" || sub.kind === "doc_row") && "sm:col-span-2",
                            )}
                          >
                            {renderField(sub, local[sub.name], v => setField(sub.name, v), {
                              dealId,
                              stageKey: stage.key,
                              required: requiredSet.has(sub.name),
                            })}
                          </div>
                        ))}
                      </RevealPanel>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Smart action buttons */}
          {stage.key === "stamp_reg" && (
            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" onClick={applyKarnatakaDefaults}>
                <Sparkles className="h-4 w-4" /> Fill Karnataka defaults ({KA_RATES.stamp_duty_pct}% stamp · {KA_RATES.registration_pct}% reg)
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Auto-fills from the sale value. Verify against the actual challan — rates vary by value & property type.
              </p>
            </div>
          )}

          {showEkhataWarning && (
            <Warning>
              Since Oct 2024, a valid <strong>E-Khata</strong> is effectively required to register a property in Bengaluru.
              Convert before the registration step.
            </Warning>
          )}
          {showNriWarning && (
            <Warning>
              Seller is NRI: TDS is <strong>20%+</strong> (not 1%) and <strong>Form 15CA/CB</strong> is required from the buyer.
              Loop in a CA / lawyer early — this is the #1 cause of NRI deals stalling at registration.
            </Warning>
          )}
          {showTdsHint && (
            <Hint>
              TDS applies only if the sale value crosses ₹50 Lakh. If yours does, tick <em>TDS applicable</em> and file
              Form 26QB <strong>before</strong> registration — otherwise the buyer will get an income-tax notice later.
            </Hint>
          )}

          {/* Live "still needs" list */}
          {!isOptional && missing.length > 0 && (
            <div className="mt-3 rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-3 text-sm">
              <p className="font-medium text-[color:var(--warning)]">Still required in this step:</p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[color:var(--warning)]/90">
                {missing.map(m => <li key={m.field}>• {m.label}</li>)}
              </ul>
            </div>
          )}

          {err && <p className="mt-3 text-sm text-[color:var(--danger)]">{err}</p>}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {liveComplete
                ? "All set — Save to record it."
                : "Fill the required fields, then Save."}
            </span>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Field renderer ─── */

function renderField(
  f: FieldMeta,
  value: unknown,
  setValue: (v: unknown) => void,
  ctx: { dealId: string; stageKey: string; required?: boolean },
) {
  if (f.kind === "checkbox") {
    return (
      <ToggleRow
        checked={Boolean(value)}
        onChange={setValue}
        label={f.label}
        hint={f.hint}
        required={ctx.required}
      />
    );
  }

  if (f.kind === "doc_row") {
    return (
      <DocRow
        dealId={ctx.dealId}
        stageKey={ctx.stageKey}
        fieldName={f.name}
        label={f.label + (ctx.required ? " *" : "")}
        value={(value as DocRowValue | undefined) ?? undefined}
        onChange={(v) => setValue(v)}
      />
    );
  }

  return (
    <Field label={f.label} required={ctx.required} hint={f.hint}>
      {f.kind === "textarea" && (
        <Textarea
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => setValue(e.target.value)}
          placeholder={f.placeholder}
        />
      )}
      {f.kind === "select" && (
        <Select
          value={String(value ?? "")}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">—</option>
          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
      {f.kind === "date" && (
        <Input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      {f.kind === "text" && (
        <Input
          value={String(value ?? "")}
          onChange={(e) => setValue(e.target.value)}
          placeholder={f.placeholder}
        />
      )}
      {f.kind === "pattern_text" && (
        <PatternTextInput value={String(value ?? "")} onChange={setValue} placeholder={f.placeholder} pattern={f.pattern} />
      )}
      {(f.kind === "number" || f.kind === "number_rupees") && (
        <>
          <Input
            inputMode="numeric"
            value={String(value ?? "")}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setValue(raw ? Number(raw) : "");
            }}
            placeholder={f.placeholder}
          />
          {f.kind === "number_rupees" && value ? (
            <p className="mt-1 text-xs text-muted-foreground">{formatINRShort(Number(value))}</p>
          ) : null}
        </>
      )}

    </Field>
  );
}

function PatternTextInput({ value, onChange, placeholder, pattern }: {
  value: string; onChange: (v: string) => void; placeholder?: string; pattern?: string;
}) {
  const upper = value.toUpperCase();
  const re = pattern ? new RegExp(pattern) : null;
  const isEmpty = value.trim() === "";
  const isValid = !re || re.test(upper);
  return (
    <>
      <Input
        value={upper}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={placeholder}
        className={cn(!isEmpty && !isValid && "border-[color:var(--danger)]")}
        spellCheck={false}
      />
      {!isEmpty && !isValid && (
        <p className="mt-1 text-xs text-[color:var(--danger)]">Format looks off — double-check.</p>
      )}
    </>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
      <div className="text-[color:var(--warning)]">{children}</div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
