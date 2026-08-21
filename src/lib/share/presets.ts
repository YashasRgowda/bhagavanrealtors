/**
 * A share_events.fields object — the flat map of what a public share
 * is allowed to expose. `false`/absent means "hide". All fields default hidden
 * unless the dealer explicitly opts them in.
 */
export type ShareFields = {
  title?: boolean;
  description?: boolean;

  price?: boolean;
  deposit?: boolean;

  area?: boolean;
  bhk?: boolean;

  // Location — coarse-to-fine
  city?: boolean;
  locality?: boolean;      // e.g. "HSR Layout" (fine)
  building?: boolean;      // society name
  address_text?: boolean;  // full street address (never on by default)
  landmark?: boolean;
  pincode?: boolean;

  // Type-specific attributes (facing, khata, approval, floor, furnishing, etc.)
  attributes?: boolean;

  // Media
  photos?: boolean;
  video?: boolean;
};

export type SharePresetKey = "teaser" | "serious" | "full";

export const SHARE_PRESETS: Record<SharePresetKey, {
  label: string;
  description: string;
  fields: ShareFields;
  hide_owner: boolean;
  hide_address: boolean;
  media: "cover_only" | "photos" | "all";
}> = {
  teaser: {
    label: "Teaser",
    description: "Safest — cover photo + area + price. No address, no owner. For unknown callers.",
    fields: {
      title: true, price: true, area: true, bhk: true,
      city: true, locality: true, photos: true,
    },
    hide_owner: true,
    hide_address: true,
    media: "cover_only",
  },
  serious: {
    label: "Serious buyer",
    description: "All photos + video + specs + approximate location. Still no exact address, no owner contact.",
    fields: {
      title: true, description: true,
      price: true, deposit: true,
      area: true, bhk: true, attributes: true,
      city: true, locality: true, landmark: true,
      photos: true, video: true,
    },
    hide_owner: true,
    hide_address: true,
    media: "photos",
  },
  full: {
    label: "Full (trusted only)",
    description: "Everything including exact address & building. Owner contact stays hidden — you're still the contact.",
    fields: {
      title: true, description: true,
      price: true, deposit: true,
      area: true, bhk: true, attributes: true,
      city: true, locality: true, building: true, landmark: true, pincode: true, address_text: true,
      photos: true, video: true,
    },
    hide_owner: true,     // owner phone STAYS hidden by design — the dealer is always the contact
    hide_address: false,
    media: "all",
  },
};

export const FIELD_LABELS: Record<keyof ShareFields, string> = {
  title:        "Title",
  description:  "Description",
  price:        "Price",
  deposit:      "Deposit",
  area:         "Area",
  bhk:          "BHK / configuration",
  city:         "City",
  locality:     "Locality (e.g. Yelahanka)",
  building:     "Building / Society name",
  address_text: "Exact street address",
  landmark:     "Landmark",
  pincode:      "Pincode",
  attributes:   "Property details (facing, khata, floor, etc.)",
  photos:       "Photos",
  video:        "Video",
};
