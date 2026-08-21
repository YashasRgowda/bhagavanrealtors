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

export const STATUS_META: Record<string, { label: string; variant: "default"|"success"|"warning"|"danger"|"muted"|"outline" }> = {
  available:   { label: "Available",     variant: "success" },
  negotiating: { label: "Negotiating",   variant: "warning" },
  token:       { label: "Token Received",variant: "warning" },
  sold:        { label: "Sold",          variant: "muted"   },
  rented:      { label: "Rented",        variant: "muted"   },
  leased:      { label: "Leased",        variant: "muted"   },
  parked:      { label: "Parked",        variant: "outline" },
  withdrawn:   { label: "Withdrawn",     variant: "danger"  },
};

export const LIVE_STATUSES = ["available", "negotiating", "token"] as const;
export const CLOSED_STATUSES = ["sold", "rented", "leased", "parked", "withdrawn"] as const;

export const SOURCES = [
  { value: "walkin",    label: "Walk-in owner" },
  { value: "agent_tip", label: "Tip from another agent" },
  { value: "online",    label: "Spotted online (99acres etc.)" },
  { value: "other",     label: "Other" },
] as const;

export const BHK_OPTIONS = ["1RK", "1", "2", "3", "4", "5+"] as const;
