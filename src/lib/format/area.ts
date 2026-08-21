/**
 * Indian area units. Base = square feet.
 */

export const AREA_UNITS = [
  { value: "sqft",   label: "sq.ft"    },
  { value: "sqyd",   label: "sq.yards" },
  { value: "sqm",    label: "sq.m"     },
  { value: "acre",   label: "Acres"    },
  { value: "guntha", label: "Guntha"   },
  { value: "cent",   label: "Cents"    },
  { value: "ankanam",label: "Ankanam"  },
] as const;

export type AreaUnit = (typeof AREA_UNITS)[number]["value"];

const TO_SQFT: Record<AreaUnit, number> = {
  sqft:    1,
  sqyd:    9,
  sqm:     10.7639,
  acre:    43560,
  guntha:  1089,      // 1 guntha ≈ 1089 sqft (Karnataka standard)
  cent:    435.6,     // 1 cent = 1/100 acre
  ankanam: 72,        // 1 ankanam ≈ 72 sqft (Bengaluru standard)
};

export function toSqft(value: number, unit: AreaUnit): number {
  return value * TO_SQFT[unit];
}

export function formatArea(value: number | null | undefined, unit: AreaUnit | string | null | undefined): string {
  if (value === null || value === undefined || !unit) return "—";
  const u = AREA_UNITS.find(x => x.value === unit)?.label ?? unit;
  return `${new Intl.NumberFormat("en-IN").format(value)} ${u}`;
}
