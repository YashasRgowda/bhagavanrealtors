export const TRANSACTION_TYPES = [
  { value: "sale",  label: "For Sale"       },
  { value: "rent",  label: "For Rent"       },
  { value: "lease", label: "For Lease"      },
] as const;

export const CATEGORIES = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial"  },
  { value: "land",        label: "Land / Plot" },
] as const;

/** Types per category. `rentOnly` and `saleOnly` gate visibility by transaction. */
export const PROPERTY_TYPES = {
  residential: [
    { value: "flat",         label: "Flat / Apartment" },
    { value: "villa",        label: "Independent House / Villa" },
    { value: "builder_floor",label: "Builder Floor" },
    { value: "studio",       label: "1RK / Studio" },
    { value: "penthouse",    label: "Penthouse" },
    { value: "pg",           label: "PG / Hostel bed", rentOnly: true },
  ],
  commercial: [
    { value: "shop",         label: "Shop / Showroom" },
    { value: "office",       label: "Office Space" },
    { value: "building",     label: "Commercial Building (whole)" },
    { value: "warehouse",    label: "Warehouse / Godown" },
    { value: "restaurant",   label: "Restaurant / Cloud Kitchen" },
    { value: "coworking",    label: "Co-working seat", rentOnly: true },
  ],
  land: [
    { value: "res_plot",     label: "Residential Plot / Site", saleOnly: true },
    { value: "com_plot",     label: "Commercial Plot",         saleOnly: true },
    { value: "agri_land",    label: "Agricultural Land",       saleOnly: true },
    { value: "farm_land",    label: "Farm Land / Farmhouse",   saleOnly: true },
  ],
} as const;

/**
 * What each status is called, and what it actually means.
 *
 * The words are deliberately plain. "Negotiating", "Parked" and "Withdrawn"
 * are the app's internal names, not the ones a dealer standing outside a
 * building uses — and a status picker nobody is sure about is a status nobody
 * keeps up to date. `blurb` is shown under the picker so the choice never has
 * to be guessed, and it always says where the property ends up: the Live list
 * or the Archive, which are the two words already on the nav.
 */
export const STATUS_META: Record<string, {
  label: string;
  blurb: string;
  variant: "default"|"success"|"warning"|"danger"|"muted"|"outline";
}> = {
  available: {
    label: "Available", variant: "success",
    blurb: "Ready to show. Stays on your Live list.",
  },
  negotiating: {
    label: "In talks", variant: "warning",
    blurb: "Price talks going on with someone. Stays on your Live list.",
  },
  token: {
    label: "Token taken", variant: "warning",
    blurb: "Advance money received. Stays on Live until you close the deal.",
  },
  sold: {
    label: "Sold", variant: "muted",
    blurb: "Deal done and money settled. Moves to Archive.",
  },
  rented: {
    label: "Rented out", variant: "muted",
    blurb: "Tenant has moved in. Moves to Archive.",
  },
  leased: {
    label: "Leased out", variant: "muted",
    blurb: "Lease finalised. Moves to Archive.",
  },
  parked: {
    label: "Rented out", variant: "outline",
    blurb: "Tenant has moved in. Moves to Archive \u2014 press \u201cVacant again\u201d when they leave.",
  },
  withdrawn: {
    label: "Withdrawn", variant: "danger",
    blurb: "Owner does not want to sell or rent now. Moves to Archive.",
  },
};

/**
 * The word for a status in the language of THIS deal.
 *
 * `parked` is the single state a rental ends up in, so it should be called
 * what the button that sets it is called — "Rented out" on a rent, "Leased
 * out" on a lease. One flat label cannot say both, so the deal type decides.
 */
export function statusLabel(status: string, txn?: string | null): string {
  if (status === "parked" && txn === "lease") return "Leased out";
  return STATUS_META[status]?.label ?? status;
}

export function statusBlurb(status: string, txn?: string | null): string {
  if (status === "parked" && txn === "lease") {
    return "Tenant has moved in. Moves to Archive \u2014 press \u201cVacant again\u201d when they leave.";
  }
  return STATUS_META[status]?.blurb ?? "";
}

export const LIVE_STATUSES = ["available", "negotiating", "token"] as const;
export const CLOSED_STATUSES = ["sold", "rented", "leased", "parked", "withdrawn"] as const;

export const SOURCES = [
  { value: "walkin",    label: "Walk-in owner" },
  { value: "agent_tip", label: "Tip from another agent" },
  { value: "online",    label: "Spotted online (99acres etc.)" },
  { value: "other",     label: "Other" },
] as const;

export const BHK_OPTIONS = ["1RK", "1", "2", "3", "4", "5+"] as const;
