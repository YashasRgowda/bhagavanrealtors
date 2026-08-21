/**
 * Deal completeness rules — the single source of truth for "what must be filled".
 *
 * A stage is COMPLETE when all its required fields (given the deal context) are
 * filled. A deal can only be CLOSED (marked Sold) when every non-optional stage
 * is complete. This is what stops a dealer from clicking "done" on an empty form.
 */

import { STAGES, KA_RATES, type StageKey } from "./stages";
import type { DealRow, DocRowValue } from "./types";

export type DealCtx = {
  saleValue: number;      // final sale value → drives TDS/PAN thresholds
  hasCobuyer: boolean;
  hasCoowner: boolean;
  isNri: boolean;
  loanUsed: boolean;
};

export type MissingField = { field: string; label: string };
export type MissingAcrossDeal = { stage: StageKey; stageTitle: string; field: string; label: string };

/** Stages that are never required to close a deal (buyer paid cash → no loan; mutation lags registration). */
export const OPTIONAL_STAGES: StageKey[] = ["loan", "mutation"];

/** Build the cross-stage context needed to evaluate conditional requirements. */
export function buildCtx(deal: Pick<DealRow, "steps" | "agreed_amount">): DealCtx {
  const bf = (deal.steps?.buyer_found?.values ?? {}) as Record<string, unknown>;
  const sd = (deal.steps?.sale_deed?.values ?? {}) as Record<string, unknown>;
  const si = (deal.steps?.seller_info?.values ?? {}) as Record<string, unknown>;
  const loan = (deal.steps?.loan?.values ?? {}) as Record<string, unknown>;

  const saleValue = Number(sd.final_value || bf.agreed_price || deal.agreed_amount || 0);
  return {
    saleValue,
    hasCobuyer: Boolean(bf.has_cobuyer),
    hasCoowner: Boolean(si.has_coowner),
    isNri: Boolean(si.is_nri),
    loanUsed: Boolean(loan.bank || loan.sanction_amount),
  };
}

/** The required field names for a stage, after applying conditional logic. */
function requiredFieldNames(stageKey: StageKey, values: Record<string, unknown>, ctx: DealCtx): string[] {
  const overThreshold = ctx.saleValue >= KA_RATES.tds_threshold_rupees;

  switch (stageKey) {
    case "buyer_found": {
      const req = ["buyer_name", "buyer_phone", "agreed_price", "buyer_aadhaar"];
      if (overThreshold) req.push("buyer_pan");        // PAN mandatory when sale > ₹50L (TDS)
      if (values.has_cobuyer) req.push("cobuyer_name");
      return req;
    }
    case "seller_info": {
      const req = ["seller_name", "seller_pan", "seller_aadhaar", "bank_account", "bank_ifsc"];
      if (values.has_coowner) req.push("coowner_name");
      if (values.is_nri) req.push("nri_country");
      return req;
    }
    case "token":      return ["amount", "date", "mode"];
    case "agreement":  return ["date"];
    case "docs":       return ["sale_deed", "ec", "khata_cert", "tax_receipt"]; // the core legal set
    case "khata":      return ["khata_type"];
    case "sale_deed":  return ["final_value", "date"];
    case "stamp_reg":  return ["stamp_amount", "reg_amount", "date"];
    case "tds":        return overThreshold ? ["applicable", "tds_amount", "challan_no", "deducted_on"] : [];
    case "register":   return ["sro", "date", "kaveri_ref"];
    case "possession": return ["possession_date", "brokerage_received", "brokerage_date"];
    case "loan":       return [];
    case "mutation":   return [];
    default:           return [];
  }
}

/** Public: the required field names for a stage (for marking labels with *). */
export function requiredFieldsForStage(stageKey: StageKey, values: Record<string, unknown>, ctx: DealCtx): string[] {
  return requiredFieldNames(stageKey, values, ctx);
}

/** Is a single field considered filled? Handles doc_row (needs .ok), checkbox (needs true), money (>0). */
function isFieldFilled(stageKey: StageKey, field: string, value: unknown): boolean {
  const meta = STAGES.find(s => s.key === stageKey)?.fields.find(f => f.name === field);
  if (meta?.kind === "doc_row") {
    return Boolean(value && typeof value === "object" && (value as DocRowValue).ok);
  }
  if (meta?.kind === "checkbox") {
    return value === true;
  }
  if (meta?.kind === "number_rupees" || meta?.kind === "number") {
    return value !== undefined && value !== null && String(value).trim() !== "" && Number(value) > 0;
  }
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/** The required fields still missing for one stage. */
export function missingForStage(stageKey: StageKey, values: Record<string, unknown>, ctx: DealCtx): MissingField[] {
  const stage = STAGES.find(s => s.key === stageKey);
  if (!stage) return [];
  return requiredFieldNames(stageKey, values, ctx)
    .filter(f => !isFieldFilled(stageKey, f, values[f]))
    .map(f => ({ field: f, label: stage.fields.find(x => x.name === f)?.label ?? f }));
}

/** Has this stage got all it needs? Optional stages count as complete only if they carry data. */
export function isStageComplete(stageKey: StageKey, values: Record<string, unknown>, ctx: DealCtx): boolean {
  if (OPTIONAL_STAGES.includes(stageKey)) {
    // Optional stages don't block close; treat "complete" as "has meaningful data".
    return Object.entries(values).some(([k, v]) =>
      !k.startsWith("_") && v !== undefined && v !== null && String(v).trim() !== "" && v !== false,
    );
  }
  return missingForStage(stageKey, values, ctx).length === 0;
}

/** Everything blocking a close, grouped, in pipeline order. */
export function validateClose(deal: Pick<DealRow, "steps" | "agreed_amount">): {
  ok: boolean;
  missing: MissingAcrossDeal[];
} {
  const ctx = buildCtx(deal);
  const missing: MissingAcrossDeal[] = [];
  for (const stage of STAGES) {
    if (OPTIONAL_STAGES.includes(stage.key)) continue;
    const values = (deal.steps?.[stage.key]?.values ?? {}) as Record<string, unknown>;
    for (const m of missingForStage(stage.key, values, ctx)) {
      missing.push({ stage: stage.key, stageTitle: stage.title, ...m });
    }
  }
  return { ok: missing.length === 0, missing };
}
