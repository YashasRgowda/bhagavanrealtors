/**
 * What a poster says.
 *
 * Templates draw; this decides. Splitting it out means the six compositions
 * can never disagree about wording, and the awkward cases — a 1.25 crore price
 * that must not wrap, a plot with no BHK, a rental whose deposit matters more
 * than its facing — are solved once.
 *
 * Two rules run through all of it:
 *   • Nothing is ever said twice. The headline says WHAT, the locality line
 *     says WHERE, the spec strip carries only what neither already said.
 *   • A missing fact is dropped, never rendered as "—" or an empty cell.
 */

import { formatArea, AREA_UNITS } from "../format/area";
import { formatPhoneIN } from "../format/phone";
import type { PropertyRow } from "../property/types";
import { CHIP_FILL, CREDIT_TEXT } from "./tokens";

export type SpecCell = { label: string; value: string };

export type PosterContent = {
  chip: { label: string; fillKey: keyof typeof CHIP_FILL };
  price: {
    /** "₹85.2" / "₹25,000" — the numeral, and the only thing that auto-fits. */
    figure: string;
    /** "Lakh" / "Cr" — part of the figure, set in the display face. */
    unit: string | null;
    /** "/month" / "total" — a qualifier on the figure, set in the UI face. */
    period: string | null;
    /** True when there is no price at all: the layout drops the unit slot. */
    onRequest: boolean;
  };
  /** "Showroom", "3 BHK Apartment", "Residential Plot". */
  type: string;
  /** "RMV Stage 2, Bengaluru". Never a door number — this poster goes public. */
  locality: string;
  /** Two or three cells. Never one — a single-cell strip is just a line. */
  specs: SpecCell[];
  brand: {
    name: string;
    initial: string;
    /** "+91 98765 43210", or null when brand_phone is unset. */
    phone: string | null;
  };
  credit: string;
};

/**
 * Poster-friendly type names. The app's labels carry slashes and
 * disambiguating pairs ("Shop / Showroom", "Flat / Apartment") which are right
 * in a form and wrong set at 44px over a photograph.
 */
const POSTER_TYPE: Record<string, string> = {
  flat: "Apartment", villa: "Villa", builder_floor: "Builder Floor",
  studio: "Studio", penthouse: "Penthouse", pg: "PG Accommodation",
  shop: "Showroom", office: "Office Space", building: "Commercial Building",
  warehouse: "Warehouse", restaurant: "Restaurant Space", coworking: "Co-working Space",
  res_plot: "Residential Plot", com_plot: "Commercial Plot",
  agri_land: "Agricultural Land", farm_land: "Farm Land",
};

/* ─────────────────────────────── price ─────────────────────────────── */

const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");
const inr = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

/**
 * Indian money, split so the numeral can dominate and the unit can sit
 * smaller and quieter beside it. ₹85.2 Lakh · ₹1.4 Cr · ₹25,000 /month.
 */
function splitPrice(prop: PropertyRow): PosterContent["price"] {
  const period =
    prop.transaction_type === "rent" ? "/month"
    : prop.transaction_type === "lease" ? "total"
    : null;

  if (!prop.price || !Number.isFinite(Number(prop.price))) {
    return { figure: "Price on request", unit: null, period: null, onRequest: true };
  }
  const n = Math.abs(Number(prop.price));
  if (n >= 1_00_00_000) return { figure: `₹${trim(n / 1_00_00_000)}`, unit: "Cr", period, onRequest: false };
  if (n >= 1_00_000)    return { figure: `₹${trim(n / 1_00_000)}`,    unit: "Lakh", period, onRequest: false };
  return { figure: `₹${inr(n)}`, unit: null, period, onRequest: false };
}

/* ──────────────────────────── spec strip ──────────────────────────── */

const attr = (prop: PropertyRow, key: string): unknown => (prop.attributes ?? {})[key];

const text = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const numeric = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};

const FACING: Record<string, string> = {
  N: "North", S: "South", E: "East", W: "West",
  NE: "North-East", NW: "North-West", SE: "South-East", SW: "South-West",
};
const FURNISHING: Record<string, string> = {
  unfurnished: "Unfurnished", semi: "Semi", fully: "Furnished",
};
const KHATA: Record<string, string> = { A: "A-Khata", B: "B-Khata", E: "E-Khata", none: "None" };
const SHARING: Record<string, string> = { single: "Single", double: "Double", triple: "Triple" };
const GENDER: Record<string, string> = { male: "Men", female: "Women", coed: "Co-ed" };

const cell = (label: string, value: string | null): SpecCell | null =>
  value ? { label, value } : null;

const shortMoney = (n: number | null): string | null => {
  if (n === null) return null;
  if (n >= 1_00_00_000) return `₹${trim(n / 1_00_00_000)} Cr`;
  if (n >= 1_00_000) return `₹${trim(n / 1_00_000)} L`;
  return `₹${inr(n)}`;
};

/**
 * The candidate cells for this property, in priority order. The strip takes
 * the first three that have data — so a plot shows its dimensions where a flat
 * shows its bedrooms, and a rental leads with its deposit.
 */
function specCandidates(prop: PropertyRow): Array<SpecCell | null> {
  const t = prop.property_type;
  const area = prop.area_value
    ? cell("Area", formatArea(prop.area_value, prop.area_unit))
    : null;
  const bhk = cell("Bedrooms", prop.bhk ? (prop.bhk === "1RK" ? "1 RK" : `${prop.bhk} BHK`) : null);
  const facing = cell("Facing", FACING[String(attr(prop, "facing"))] ?? null);
  const deposit = cell("Deposit", shortMoney(numeric(prop.deposit)));
  const isRental = prop.transaction_type !== "sale";

  const dims = (() => {
    const L = numeric(attr(prop, "length_ft"));
    const B = numeric(attr(prop, "breadth_ft"));
    return L && B ? cell("Dimensions", `${L} × ${B} ft`) : null;
  })();

  switch (t) {
    case "res_plot": case "com_plot":
      return [area, dims, cell("Khata", KHATA[String(attr(prop, "khata"))] ?? null), facing,
              cell("Approval", text(attr(prop, "approval")))];
    case "agri_land": case "farm_land":
      return [area, cell("Water", text(attr(prop, "water"))),
              cell("Survey no.", text(attr(prop, "survey_no"))), facing];
    case "shop": case "office": case "restaurant": case "coworking":
      return [area, isRental ? deposit : null,
              cell("Frontage", numeric(attr(prop, "frontage_ft")) ? `${numeric(attr(prop, "frontage_ft"))} ft` : null),
              cell("Floor", text(attr(prop, "floor"))),
              cell("Washrooms", text(attr(prop, "washrooms")))];
    case "warehouse":
      return [area, cell("Clear height", numeric(attr(prop, "clear_height_ft")) ? `${numeric(attr(prop, "clear_height_ft"))} ft` : null),
              cell("Docks", text(attr(prop, "docks"))), isRental ? deposit : null];
    case "building":
      return [area, cell("Floors", text(attr(prop, "total_floors_wb"))),
              cell("Units", text(attr(prop, "units_flats")) ?? text(attr(prop, "units_shops")))];
    case "pg":
      return [cell("Sharing", SHARING[String(attr(prop, "sharing"))] ?? null),
              cell("For", GENDER[String(attr(prop, "gender"))] ?? null),
              cell("Food", attr(prop, "food") === "yes" ? "Included" : null), deposit];
    default: // residential dwellings
      return [area, isRental ? deposit : bhk, isRental ? bhk : facing,
              cell("Furnishing", FURNISHING[String(attr(prop, "furnishing"))] ?? null), facing,
              cell("Baths", text(attr(prop, "bathrooms")))];
  }
}

/* ─────────────────────────────── build ─────────────────────────────── */

/** Comparable word tokens, so "RMV Stage 2" and "rmv stage-2" match. */
const tokens = (v: string | null | undefined) =>
  (v ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

/** True when every word of `phrase` already appears in `text`. */
function alreadySaid(source: string, phrase: string | null | undefined): boolean {
  const want = tokens(phrase);
  if (!want.length) return false;
  const have = new Set(tokens(source));
  return want.every(t => have.has(t));
}

export type BrandInput = { name: string; phone: string | null };

export function buildPosterContent(prop: PropertyRow, brand: BrandInput): PosterContent {
  const typeName = POSTER_TYPE[prop.property_type] ?? prop.property_type;
  const bhk = prop.bhk ? (prop.bhk === "1RK" ? "1 RK" : `${prop.bhk} BHK`) : null;

  /* The headline is the shortest true description of WHAT it is — never
     "<type> in <locality>", which would duplicate the line beneath it. */
  const type = [bhk, typeName].filter(Boolean).join(" ") || typeName;

  const locality = [prop.locality, prop.city]
    .filter((v): v is string => Boolean(v))
    .filter(v => !alreadySaid(type, v))
    .join(", ");

  const chipLabel =
    prop.transaction_type === "rent" ? "For Rent"
    : prop.transaction_type === "lease" ? "For Lease"
    : "For Sale";
  const closed = ["sold", "rented", "leased", "parked", "withdrawn"].includes(prop.status);

  /* A cell that only repeats the headline earns no space on the poster. */
  const specs = specCandidates(prop)
    .filter((c): c is SpecCell => Boolean(c))
    .filter(c => !alreadySaid(type, c.value))
    .filter((c, i, all) => all.findIndex(x => x.label === c.label) === i)
    .slice(0, 3);

  const name = brand.name.trim() || "Bhagvan Realtors";

  return {
    chip: { label: chipLabel, fillKey: closed ? "closed" : prop.transaction_type },
    price: splitPrice(prop),
    type,
    locality,
    /* One cell is a stray line, not a strip — show two or none. */
    specs: specs.length >= 2 ? specs : [],
    brand: {
      name,
      initial: (name[0] ?? "B").toUpperCase(),
      phone: brand.phone ? formatPhoneIN(brand.phone) : null,
    },
    credit: CREDIT_TEXT,
  };
}

/** Kept beside the content model so the area unit list has one owner. */
export const AREA_UNIT_LABELS = AREA_UNITS;
