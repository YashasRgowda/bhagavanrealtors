/**
 * Karnataka sale deal pipeline — 13 stages a Bengaluru dealer walks through.
 * Each stage stores its own bag of fields inside `deals.steps[stage_key]` (JSONB).
 *
 * Field kinds:
 *  - text            : plain text
 *  - pattern_text    : text with a regex hint (PAN, Aadhaar, IFSC…)
 *  - textarea        : multi-line text
 *  - number          : integer
 *  - number_rupees   : integer rupees + shows human short (₹45 Lakh)
 *  - date            : YYYY-MM-DD
 *  - select          : dropdown
 *  - checkbox        : boolean
 *  - doc_row         : { ok: boolean, storage_path?: string, filename?: string }
 *                       — used for the document checklist so each item can carry
 *                         both "we have it" and the scanned file.
 */

export type StageKey =
  | "buyer_found"
  | "seller_info"
  | "token"
  | "agreement"
  | "docs"
  | "khata"
  | "loan"
  | "sale_deed"
  | "stamp_reg"
  | "tds"
  | "register"
  | "mutation"
  | "possession";

export type FieldKind =
  | "text"
  | "pattern_text"
  | "textarea"
  | "number"
  | "number_rupees"
  | "date"
  | "select"
  | "checkbox"
  | "doc_row";

export type FieldMeta = {
  name: string;
  label: string;
  kind: FieldKind;
  options?: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  /** For pattern_text: uppercase regex to match, e.g. PAN. */
  pattern?: string;
  /** Small hint under the field. */
  hint?: string;
  /** Only show this field when the checkbox `showIf.field` is true. */
  showIf?: { field: string; equals?: unknown };
};

export type StageMeta = {
  key: StageKey;
  title: string;
  hint: string;
  fields: ReadonlyArray<FieldMeta>;
};

const PAN_PATTERN = "^[A-Z]{5}[0-9]{4}[A-Z]$";
const AADHAAR_PATTERN = "^[0-9]{12}$";
const IFSC_PATTERN = "^[A-Z]{4}0[A-Z0-9]{6}$";

export const STAGES: ReadonlyArray<StageMeta> = [
  // ─────────────────────────────────────────────────────────────
  {
    key: "buyer_found",
    title: "Buyer found + price agreed",
    hint: "Buyer identified, headline price locked, and full KYC captured. Property moves to Negotiating.",
    fields: [
      { name: "buyer_name",       label: "Buyer name",              kind: "text",          placeholder: "e.g. Suresh Reddy" },
      { name: "buyer_phone",      label: "Buyer phone",             kind: "text",          placeholder: "10-digit mobile" },
      { name: "buyer_father",     label: "Buyer's father's / spouse's name", kind: "text", placeholder: "Goes on the sale deed" },
      { name: "buyer_pan",        label: "Buyer PAN",               kind: "pattern_text",  pattern: PAN_PATTERN, placeholder: "ABCDE1234F",
        hint: "Mandatory when sale value > ₹50 Lakh — needed for TDS/Form 26QB." },
      { name: "buyer_aadhaar",    label: "Buyer Aadhaar",           kind: "pattern_text",  pattern: AADHAAR_PATTERN, placeholder: "12 digits",
        hint: "Required at Sub-Registrar for biometrics." },
      { name: "buyer_address",    label: "Buyer permanent address", kind: "textarea",      placeholder: "House / street / city / pincode — goes on the sale deed" },
      { name: "agreed_price",     label: "Agreed price (₹)",        kind: "number_rupees", placeholder: "e.g. 4500000" },
      { name: "date",             label: "Date buyer confirmed",    kind: "date" },

      // Co-buyer (many purchases are joint)
      { name: "has_cobuyer",      label: "Joint purchase (add co-buyer)?", kind: "checkbox" },
      { name: "cobuyer_name",     label: "Co-buyer name",           kind: "text",         showIf: { field: "has_cobuyer" } },
      { name: "cobuyer_phone",    label: "Co-buyer phone",          kind: "text",         showIf: { field: "has_cobuyer" }, placeholder: "10-digit mobile" },
      { name: "cobuyer_pan",      label: "Co-buyer PAN",            kind: "pattern_text", showIf: { field: "has_cobuyer" }, pattern: PAN_PATTERN },
      { name: "cobuyer_relation", label: "Relationship to buyer",   kind: "select",       showIf: { field: "has_cobuyer" }, options: [
        { value: "spouse",  label: "Spouse" },
        { value: "parent",  label: "Parent" },
        { value: "child",   label: "Son / Daughter" },
        { value: "sibling", label: "Brother / Sister" },
        { value: "other",   label: "Other" },
      ]},

      { name: "note", label: "Note", kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "seller_info",
    title: "Seller KYC & payout details",
    hint: "Every seller-side detail needed for the deed, payment, and TDS. Capture spouse/co-owner — joint owners must both sign.",
    fields: [
      { name: "seller_name",     label: "Primary seller name",   kind: "text",         placeholder: "As per title deed" },
      { name: "seller_father",   label: "Father's / spouse's name", kind: "text",     placeholder: "Goes on the sale deed" },
      { name: "seller_pan",      label: "Seller PAN",            kind: "pattern_text", pattern: PAN_PATTERN, placeholder: "ABCDE1234F" },
      { name: "seller_aadhaar",  label: "Seller Aadhaar",        kind: "pattern_text", pattern: AADHAAR_PATTERN, placeholder: "12 digits" },

      { name: "has_coowner",     label: "Property is jointly owned (add co-owner)?", kind: "checkbox" },
      { name: "coowner_name",    label: "Co-owner name",         kind: "text",         showIf: { field: "has_coowner" } },
      { name: "coowner_relation",label: "Co-owner relationship", kind: "select",       showIf: { field: "has_coowner" }, options: [
        { value: "spouse",  label: "Spouse" },
        { value: "parent",  label: "Parent" },
        { value: "child",   label: "Son / Daughter" },
        { value: "sibling", label: "Brother / Sister" },
        { value: "other",   label: "Other" },
      ]},
      { name: "coowner_pan",     label: "Co-owner PAN",          kind: "pattern_text", showIf: { field: "has_coowner" }, pattern: PAN_PATTERN },
      { name: "coowner_aadhaar", label: "Co-owner Aadhaar",      kind: "pattern_text", showIf: { field: "has_coowner" }, pattern: AADHAAR_PATTERN },

      { name: "bank_name",       label: "Seller bank name",      kind: "text",         placeholder: "For receiving sale proceeds" },
      { name: "bank_account",    label: "Bank account number",   kind: "text" },
      { name: "bank_ifsc",       label: "IFSC",                  kind: "pattern_text", pattern: IFSC_PATTERN, placeholder: "e.g. HDFC0000123" },

      { name: "is_nri",          label: "Seller is NRI",         kind: "checkbox",
        hint: "If yes: TDS is 20%+ (not 1%) and Form 15CA/CB is required. Flag your lawyer early." },
      { name: "nri_country",     label: "Country of residence",  kind: "text",         showIf: { field: "is_nri" } },

      { name: "note",            label: "Note",                  kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "token",
    title: "Token / advance received",
    hint: "Typically ₹50k–₹2L or 1–2% of the sale price. Property moves to Token Received.",
    fields: [
      { name: "amount", label: "Token amount (₹)", kind: "number_rupees" },
      { name: "date",   label: "Date received",    kind: "date" },
      { name: "mode",   label: "Mode",             kind: "select", options: [
        { value: "cash",     label: "Cash" },
        { value: "cheque",   label: "Cheque" },
        { value: "upi",      label: "UPI" },
        { value: "neft",     label: "NEFT / RTGS" },
      ]},
      { name: "ref_no", label: "Cheque / txn reference",     kind: "text" },
      { name: "note",   label: "Note",                       kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "agreement",
    title: "Agreement to Sell signed",
    hint: "Signed on stamp paper. Further advance commonly 10–20%.",
    fields: [
      { name: "further_advance", label: "Further advance (₹)", kind: "number_rupees" },
      { name: "date",            label: "Signed on",           kind: "date" },
      { name: "close_by",        label: "Registration by",     kind: "date" },
      { name: "note",            label: "Note",                kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "docs",
    title: "Document verification",
    hint: "Tick each doc as you collect it and attach the scan. Everything the buyer, bank, and Sub-Registrar will ask for.",
    fields: [
      { name: "sale_deed",     label: "Title / Sale deed",              kind: "doc_row" },
      { name: "mother_deed",   label: "Mother deed",                    kind: "doc_row" },
      { name: "ec",            label: "Encumbrance Certificate (EC)",   kind: "doc_row" },
      { name: "khata_cert",    label: "Khata certificate & extract",    kind: "doc_row" },
      { name: "tax_receipt",   label: "Latest property tax receipt",    kind: "doc_row" },
      { name: "approved_plan", label: "Approved plan / OC",             kind: "doc_row" },
      { name: "noc",           label: "NOCs (society / apartment)",     kind: "doc_row" },
      { name: "legal_report",  label: "Legal & valuation report (loan)", kind: "doc_row" },
      { name: "note",          label: "Note",                            kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "khata",
    title: "Khata check / transfer",
    hint: "Since Oct 2024, a valid E-Khata is effectively required to register in Bengaluru.",
    fields: [
      { name: "khata_type",  label: "Khata type", kind: "select", options: [
        { value: "A",    label: "A-Khata (fully legal)" },
        { value: "B",    label: "B-Khata (restricted)" },
        { value: "E",    label: "E-Khata (BBMP e-Aasthi)" },
        { value: "none", label: "None" },
      ]},
      { name: "conversion_pending", label: "B→A / E-Khata work pending?", kind: "checkbox" },
      { name: "note",              label: "Note",                        kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "loan",
    title: "Home loan (buyer)",
    hint: "Skip if buyer is paying cash.",
    fields: [
      { name: "bank",              label: "Bank",                kind: "text",         placeholder: "e.g. HDFC" },
      { name: "sanction_amount",   label: "Sanction amount (₹)", kind: "number_rupees" },
      { name: "sanction_date",     label: "Sanction date",       kind: "date" },
      { name: "disbursement_date", label: "Disbursement date",   kind: "date" },
      { name: "note",              label: "Note",                kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "sale_deed",
    title: "Sale deed drafted",
    hint: "Final deed drafted by lawyer, parties confirmed.",
    fields: [
      { name: "final_value", label: "Final sale value (₹)", kind: "number_rupees" },
      { name: "drafted_by",  label: "Drafted by",           kind: "text",          placeholder: "Lawyer / firm" },
      { name: "date",        label: "Drafted on",           kind: "date" },
      { name: "draft_file",  label: "Deed draft (final)",   kind: "doc_row" },
      { name: "note",        label: "Note",                 kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "stamp_reg",
    title: "Stamp duty + registration paid",
    hint: "Karnataka rates (editable): stamp duty ≈ 5% + registration ≈ 1% + cess & surcharge.",
    fields: [
      { name: "stamp_amount", label: "Stamp duty paid (₹)",  kind: "number_rupees" },
      { name: "reg_amount",   label: "Registration fee (₹)", kind: "number_rupees" },
      { name: "cess",         label: "Cess & surcharge (₹)", kind: "number_rupees" },
      { name: "date",         label: "Paid on",              kind: "date" },
      { name: "receipt",      label: "Payment receipt",      kind: "doc_row" },
      { name: "note",         label: "Note",                 kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "tds",
    title: "TDS on sale (Form 26QB)",
    hint: "For any sale > ₹50 Lakh, buyer must deduct 1% TDS and file Form 26QB BEFORE registration. Seller gets Form 16B as proof.",
    fields: [
      { name: "applicable",     label: "TDS applicable (sale > ₹50 L)", kind: "checkbox" },
      { name: "tds_amount",     label: "TDS deducted (₹)",              kind: "number_rupees" },
      { name: "deducted_on",    label: "Deducted on",                   kind: "date" },
      { name: "challan_no",     label: "26QB challan / acknowledgement no.", kind: "text" },
      { name: "form_16b_issued",label: "Form 16B issued to seller",     kind: "checkbox" },
      { name: "form_16b_date",  label: "Form 16B issued on",            kind: "date",        showIf: { field: "form_16b_issued" } },
      { name: "form_16b_file",  label: "Form 16B",                      kind: "doc_row",     showIf: { field: "form_16b_issued" } },
      { name: "note",           label: "Note",                          kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "register",
    title: "Registered at Sub-Registrar",
    hint: "Kaveri Online appointment, biometrics, two witnesses.",
    fields: [
      { name: "sro",         label: "Sub-Registrar Office", kind: "text",  placeholder: "e.g. Yelahanka SRO" },
      { name: "date",        label: "Registration date",    kind: "date" },
      { name: "kaveri_ref",  label: "Kaveri reference no.", kind: "text" },
      { name: "registered_deed", label: "Registered deed (final PDF)", kind: "doc_row" },
      { name: "note",        label: "Note",                 kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "mutation",
    title: "Khata mutation to buyer",
    hint: "BBMP transfers khata and property tax record to buyer's name.",
    fields: [
      { name: "date", label: "Mutation completed on", kind: "date" },
      { name: "note", label: "Note",                  kind: "textarea" },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    key: "possession",
    title: "Possession & brokerage",
    hint: "Keys handed over, balance settled, your brokerage in hand → property auto-marks SOLD.",
    fields: [
      { name: "possession_date",     label: "Possession date",        kind: "date" },
      { name: "final_balance",       label: "Final balance paid (₹)", kind: "number_rupees" },
      { name: "brokerage_received",  label: "Brokerage received (₹)", kind: "number_rupees" },
      { name: "brokerage_date",      label: "Brokerage received on",  kind: "date" },
      { name: "note",                label: "Note",                   kind: "textarea" },
    ],
  },
];

export const STAGE_INDEX: Record<StageKey, number> = STAGES.reduce(
  (acc, s, i) => ({ ...acc, [s.key]: i }),
  {} as Record<StageKey, number>,
);

/** Karnataka registration cost defaults — editable per deal. */
export const KA_RATES = {
  stamp_duty_pct: 5.0,
  registration_pct: 1.0,
  cess_pct_of_stamp: 10.0,
  surcharge_pct_of_stamp: 2.0,
  tds_pct: 1.0,
  tds_threshold_rupees: 50_00_000,
};

/** Property status the deal should push the property into when a stage is marked done. */
export function propertyStatusFor(stage: StageKey): "negotiating" | "token" | "sold" | null {
  if (stage === "buyer_found") return "negotiating";
  if (stage === "token")       return "token";
  if (stage === "possession")  return "sold";
  return null;
}
