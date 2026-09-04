import { formatINRShort } from "@/lib/format/currency";

/**
 * Presentation layer for the `attributes` JSONB bag.
 *
 * The detail page used to render raw keys — "DOOR NO", "OCCUPANCY",
 * "WASHROOMS", "TOTAL FLOORS WB" — in whatever order Postgres returned them.
 * This gives every key a human label, a sensible unit, and a fixed position,
 * so the same property always reads the same way.
 *
 * Nothing here writes; the wizard remains the only thing that shapes the bag.
 */

type Formatter = (v: unknown) => string;

const enumLabel = (map: Record<string, string>): Formatter =>
  v => map[String(v)] ?? String(v);

const withUnit = (unit: string): Formatter =>
  v => `${new Intl.NumberFormat("en-IN").format(Number(v))} ${unit}`;

const yesNo = enumLabel({ yes: "Yes", no: "No", true: "Yes", false: "No" });
const money: Formatter = v => formatINRShort(Number(v));

/** Ordered: the specs a dealer quotes first come first. */
const SPEC: Array<[key: string, label: string, format?: Formatter]> = [
  // ── Residential ──
  ["carpet",           "Carpet area",     withUnit("sq.ft")],
  ["bathrooms",        "Bathrooms"],
  ["balconies",        "Balconies"],
  ["floor",            "Floor"],
  ["total_floors",     "Total floors"],
  ["facing",           "Facing", enumLabel({
    N: "North", S: "South", E: "East", W: "West",
    NE: "North-East", NW: "North-West", SE: "South-East", SW: "South-West",
  })],
  ["furnishing",       "Furnishing", enumLabel({
    unfurnished: "Unfurnished", semi: "Semi-furnished", fully: "Fully furnished",
  })],
  ["age_years",        "Age", v => (Number(v) === 0 ? "Brand new" : `${v} year${Number(v) === 1 ? "" : "s"}`)],
  ["parking_4w",       "Car parking", v => `${v} slot${Number(v) === 1 ? "" : "s"}`],
  ["parking_2w",       "Bike parking", v => `${v} slot${Number(v) === 1 ? "" : "s"}`],

  // ── Plot / land ──
  ["length_ft",        "Length",       withUnit("ft")],
  ["breadth_ft",       "Breadth",      withUnit("ft")],
  ["road_width_ft",    "Road width",   withUnit("ft")],
  ["corner",           "Corner site",  yesNo],
  ["approval",         "Approval"],
  ["khata",            "Khata", enumLabel({
    A: "A-Khata", B: "B-Khata", E: "E-Khata", none: "None",
  })],
  ["survey_no",        "Survey no."],
  ["water",            "Water source", enumLabel({
    borewell: "Borewell", canal: "Canal", well: "Well", none: "None",
  })],
  ["dc_converted",     "DC converted", yesNo],

  // ── Commercial ──
  ["frontage_ft",      "Frontage",     withUnit("ft")],
  ["washrooms",        "Washrooms"],
  ["power_kw",         "Power load",   withUnit("KW")],
  ["occupancy",        "Currently",    enumLabel({ vacant: "Vacant", tenanted: "Tenanted" })],
  ["total_floors_wb",  "Floors"],
  ["units_flats",      "Flats"],
  ["units_shops",      "Shops"],
  ["current_rent",     "Current rent", money],
  ["clear_height_ft",  "Clear height", withUnit("ft")],
  ["shutter_ht_ft",    "Shutter height", withUnit("ft")],
  ["docks",            "Docks"],

  // ── PG ──
  ["sharing",          "Sharing", enumLabel({ single: "Single", double: "Double", triple: "Triple" })],
  ["gender",           "For",     enumLabel({ male: "Male", female: "Female", coed: "Co-ed" })],
  ["food",             "Food included", yesNo],

  // ── Rent terms ──
  ["maintenance_type", "Maintenance", enumLabel({
    included: "Included in rent", extra: "Paid separately", none: "None",
  })],
  ["maintenance_amount", "Maintenance / month", money],
  ["preferred_tenant", "Preferred tenant", enumLabel({
    family: "Family", bachelors: "Bachelors", company: "Company lease",
  })],
  ["notice_period_months", "Notice period", v => `${v} month${Number(v) === 1 ? "" : "s"}`],
  ["veg_only",         "Food preference", enumLabel({ yes: "Veg only", no: "No restriction" })],
];

/** Keys that describe *where* it is — shown with the address, not the specs. */
export const LOCATION_KEYS = ["building", "door_no", "landmark", "area"] as const;

const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));

export type Spec = { label: string; value: string };

/** The specs worth showing, labelled and ordered. Unknown keys are kept last. */
export function describeAttributes(attributes: Record<string, unknown> | null): Spec[] {
  const attrs = attributes ?? {};
  const out: Spec[] = [];
  const claimed = new Set<string>([...LOCATION_KEYS]);

  for (const [key, label, format] of SPEC) {
    claimed.add(key);
    const raw = attrs[key];
    if (isEmpty(raw)) continue;
    out.push({ label, value: format ? format(raw) : String(raw) });
  }

  // Anything the wizard adds later still surfaces, just without a curated
  // label — better than silently dropping a field the dealer filled in.
  for (const [key, raw] of Object.entries(attrs)) {
    if (key.startsWith("_") || claimed.has(key) || isEmpty(raw)) continue;
    out.push({
      label: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: String(raw),
    });
  }
  return out;
}

/** Building / door no / landmark, joined for the address line. */
export function locationDetail(attributes: Record<string, unknown> | null): string | null {
  const attrs = attributes ?? {};
  const parts = [attrs.building, attrs.door_no, attrs.landmark]
    .filter(v => !isEmpty(v))
    .map(String);
  return parts.length ? parts.join(" · ") : null;
}
