import { z } from "zod";

/** Minimal shape validated on the server before insert. */
export const createPropertyInput = z.object({
  transaction_type: z.enum(["sale", "rent", "lease"]),
  category:         z.enum(["residential", "commercial", "land"]),
  property_type:    z.string().min(1),

  title:            z.string().max(160).nullable().optional(),
  description:      z.string().max(4000).nullable().optional(),

  city:             z.string().max(80).nullable().optional(),
  locality:         z.string().max(120).nullable().optional(),
  address_text:     z.string().max(400).nullable().optional(),
  pincode:          z.string().max(10).nullable().optional(),
  latitude:         z.number().nullable().optional(),
  longitude:        z.number().nullable().optional(),

  price:            z.number().int().nonnegative().nullable().optional(),
  price_unit:       z.string().max(20).nullable().optional(),
  deposit:          z.number().int().nonnegative().nullable().optional(),
  is_negotiable:    z.boolean().optional(),

  area_value:       z.number().nonnegative().nullable().optional(),
  area_unit:        z.string().max(20).nullable().optional(),

  bhk:              z.string().max(10).nullable().optional(),

  source:           z.enum(["walkin","agent_tip","online","other"]).optional(),
  is_featured:      z.boolean().optional(),
  attributes:       z.record(z.string(), z.unknown()).optional(),

  contact: z.object({
    owner_name:         z.string().max(120).nullable().optional(),
    owner_phone:        z.string().max(20).nullable().optional(),
    owner_alt_phone:    z.string().max(20).nullable().optional(),
    relationship:       z.string().max(40).nullable().optional(),
    brokerage_expected: z.number().int().nonnegative().nullable().optional(),
    private_notes:      z.string().max(2000).nullable().optional(),

    // Optional KYC
    owner_father:       z.string().max(120).nullable().optional(),
    owner_pan:          z.string().max(15).nullable().optional(),
    owner_aadhaar:      z.string().max(15).nullable().optional(),
    is_nri:             z.boolean().optional(),
    nri_country:        z.string().max(60).nullable().optional(),
    bank_name:          z.string().max(120).nullable().optional(),
    bank_account:       z.string().max(30).nullable().optional(),
    bank_ifsc:          z.string().max(15).nullable().optional(),
    has_coowner:        z.boolean().optional(),
    coowner_name:       z.string().max(120).nullable().optional(),
    coowner_relation:   z.string().max(40).nullable().optional(),
    coowner_pan:        z.string().max(15).nullable().optional(),
    coowner_aadhaar:    z.string().max(15).nullable().optional(),
  }).optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertyInput>;
