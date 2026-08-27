import { z } from "zod";

/**
 * A requirement is deliberately permissive: almost everything is optional,
 * because an unset field means "no constraint" to the match engine. Only the
 * buyer's name and the deal type are genuinely required.
 */
const requirementFields = z.object({
  buyer_name:       z.string().min(1).max(120),
  buyer_phone:      z.string().max(20).nullable().optional(),
  buyer_alt_phone:  z.string().max(20).nullable().optional(),
  source:           z.enum(["walkin", "agent_tip", "online", "other"]).nullable().optional(),
  notes:            z.string().max(2000).nullable().optional(),

  transaction_type: z.enum(["sale", "rent", "lease"]),
  categories:       z.array(z.string().max(30)).max(10).optional(),
  property_types:   z.array(z.string().max(40)).max(30).optional(),

  bhk_min:          z.string().max(10).nullable().optional(),
  bhk_max:          z.string().max(10).nullable().optional(),

  budget_min:       z.number().int().nonnegative().nullable().optional(),
  budget_max:       z.number().int().nonnegative().nullable().optional(),

  area_min:         z.number().nonnegative().nullable().optional(),
  area_max:         z.number().nonnegative().nullable().optional(),
  area_unit:        z.string().max(20).nullable().optional(),

  localities:       z.array(z.string().max(120)).max(20).optional(),
  city:             z.string().max(80).nullable().optional(),

  urgency:          z.enum(["immediate", "soon", "exploring"]).nullable().optional(),
  status:           z.enum(["active", "fulfilled", "dropped"]).optional(),
});

/**
 * A reversed range would silently match nothing, so reject it at the edge.
 * `== null` deliberately covers both null and undefined, so these hold on a
 * partial update too.
 */
type Ranges = {
  budget_min?: number | null; budget_max?: number | null;
  area_min?: number | null;   area_max?: number | null;
};
const budgetOrdered = (v: Ranges) =>
  v.budget_min == null || v.budget_max == null || v.budget_min <= v.budget_max;
const areaOrdered = (v: Ranges) =>
  v.area_min == null || v.area_max == null || v.area_min <= v.area_max;

const BUDGET_MSG = { message: "Minimum budget cannot be higher than the maximum", path: ["budget_min"] };
const AREA_MSG   = { message: "Minimum area cannot be larger than the maximum",   path: ["area_min"] };

/** Full payload — used when creating. */
export const requirementInput = requirementFields
  .refine(budgetOrdered, BUDGET_MSG)
  .refine(areaOrdered, AREA_MSG);

/**
 * Partial payload — used when updating.
 *
 * Built from the *unrefined* object on purpose: Zod throws
 * "`.partial()` cannot be used on object schemas containing refinements"
 * at runtime if you call `.partial()` on the refined schema, which silently
 * turned every PATCH into a 400.
 */
export const requirementPatchInput = requirementFields.partial()
  .refine(budgetOrdered, BUDGET_MSG)
  .refine(areaOrdered, AREA_MSG);

export type RequirementInput = z.infer<typeof requirementInput>;
