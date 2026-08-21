/**
 * Turn a property_contacts row into the values object for the deal's seller_info stage.
 * Only sets fields that actually have data — the deal step never gets stamped with
 * empty strings that would overwrite fresh input.
 */
export function buildSellerValuesFromContact(contact: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!contact) return out;

  const map: Array<[string, string]> = [
    // [contactColumn, sellerInfoFieldName]
    ["owner_name",      "seller_name"],
    ["owner_father",    "seller_father"],
    ["owner_pan",       "seller_pan"],
    ["owner_aadhaar",   "seller_aadhaar"],
    ["bank_name",       "bank_name"],
    ["bank_account",    "bank_account"],
    ["bank_ifsc",       "bank_ifsc"],
    ["nri_country",     "nri_country"],
    ["coowner_name",    "coowner_name"],
    ["coowner_relation","coowner_relation"],
    ["coowner_pan",     "coowner_pan"],
    ["coowner_aadhaar", "coowner_aadhaar"],
  ];

  for (const [src, dst] of map) {
    const v = contact[src];
    if (v !== undefined && v !== null && v !== "") out[dst] = v;
  }
  // Booleans need explicit checks (false is a real value)
  if (contact.is_nri === true) out.is_nri = true;
  if (contact.has_coowner === true) out.has_coowner = true;

  if (Object.keys(out).length > 0) out._prefilled_from_owner = true;
  return out;
}
