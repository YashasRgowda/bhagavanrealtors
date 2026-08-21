export type WizardState = {
  transaction_type: "sale" | "rent" | "lease" | null;
  category: "residential" | "commercial" | "land" | null;
  property_type: string;

  title: string | null;
  description: string | null;

  city: string | null;
  locality: string | null;
  address_text: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;

  price: number | null;
  price_unit: string | null;
  deposit: number | null;
  is_negotiable: boolean;

  area_value: number | null;
  area_unit: string;

  bhk: string | null;

  source: "walkin" | "agent_tip" | "online" | "other";
  attributes: Record<string, unknown>;

  contact: {
    owner_name: string | null;
    owner_phone: string | null;
    owner_alt_phone: string | null;
    brokerage_expected: number | null;
    private_notes: string | null;

    // Optional KYC — anything filled here prefills the deal's seller_info stage
    owner_father: string | null;
    owner_pan: string | null;
    owner_aadhaar: string | null;
    is_nri: boolean;
    nri_country: string | null;
    bank_name: string | null;
    bank_account: string | null;
    bank_ifsc: string | null;
    has_coowner: boolean;
    coowner_name: string | null;
    coowner_relation: string | null;
    coowner_pan: string | null;
    coowner_aadhaar: string | null;
  };
};

export const initialWizardState: WizardState = {
  transaction_type: null,
  category: null,
  property_type: "",
  title: null,
  description: null,
  city: "Bengaluru",
  locality: null,
  address_text: null,
  pincode: null,
  latitude: null,
  longitude: null,
  price: null,
  price_unit: "total",
  deposit: null,
  is_negotiable: true,
  area_value: null,
  area_unit: "sqft",
  bhk: null,
  source: "walkin",
  attributes: {},
  contact: {
    owner_name: null,
    owner_phone: null,
    owner_alt_phone: null,
    brokerage_expected: null,
    private_notes: null,
    owner_father: null,
    owner_pan: null,
    owner_aadhaar: null,
    is_nri: false,
    nri_country: null,
    bank_name: null,
    bank_account: null,
    bank_ifsc: null,
    has_coowner: false,
    coowner_name: null,
    coowner_relation: null,
    coowner_pan: null,
    coowner_aadhaar: null,
  },
};
