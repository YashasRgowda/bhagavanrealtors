import { formatINRShort } from "@/lib/format/currency";
import { AREA_UNITS } from "@/lib/format/area";
import { CATEGORIES, PROPERTY_TYPES } from "@/lib/property/enums";
import type { RequirementRow } from "./types";

const unitLabel = (u: string | null) =>
  AREA_UNITS.find(x => x.value === (u ?? "sqft"))?.label ?? (u ?? "sq.ft");

/** "₹40 Lakh – ₹55 Lakh", "Under ₹55 Lakh", "Above ₹40 Lakh" or null. */
export function budgetLabel(r: RequirementRow): string | null {
  const { budget_min: lo, budget_max: hi } = r;
  if (lo && hi) return `${formatINRShort(lo)} – ${formatINRShort(hi)}`;
  if (hi) return `Under ${formatINRShort(hi)}`;
  if (lo) return `Above ${formatINRShort(lo)}`;
  return null;
}

export function areaLabel(r: RequirementRow): string | null {
  const u = unitLabel(r.area_unit);
  if (r.area_min && r.area_max) return `${r.area_min}–${r.area_max} ${u}`;
  if (r.area_max) return `Up to ${r.area_max} ${u}`;
  if (r.area_min) return `${r.area_min}+ ${u}`;
  return null;
}

export function bhkLabel(r: RequirementRow): string | null {
  const fmt = (b: string) => (b === "1RK" ? "1 RK" : `${b} BHK`);
  if (r.bhk_min && r.bhk_max) {
    return r.bhk_min === r.bhk_max ? fmt(r.bhk_min) : `${fmt(r.bhk_min)}–${fmt(r.bhk_max)}`;
  }
  if (r.bhk_min) return `${fmt(r.bhk_min)}+`;
  if (r.bhk_max) return `Up to ${fmt(r.bhk_max)}`;
  return null;
}

export function typeLabel(r: RequirementRow): string | null {
  if (r.property_types.length) {
    const all = Object.values(PROPERTY_TYPES).flat() as ReadonlyArray<{ value: string; label: string }>;
    const names = r.property_types.map(t => all.find(x => x.value === t)?.label ?? t);
    return names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1} more`;
  }
  if (r.categories.length) {
    return r.categories.map(c => CATEGORIES.find(x => x.value === c)?.label ?? c).join(", ");
  }
  return null;
}

/** The one-line "what they want" used on cards and match rows. */
export function criteriaChips(r: RequirementRow): string[] {
  return [budgetLabel(r), bhkLabel(r), areaLabel(r), typeLabel(r),
    r.localities.length ? r.localities.join(" / ") : null,
  ].filter(Boolean) as string[];
}
