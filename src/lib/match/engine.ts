/**
 * Property ⇄ buyer-requirement matching.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CORRECTNESS CONTRACT
 *
 * This is a deterministic rule engine, not a scoring heuristic. Every result is
 * reproducible and explainable, and the guarantee is specifically about *false
 * positives*:
 *
 *   verdict "match"  → every constraint the requirement sets was checked
 *                      against real data on the property and passed.
 *                      Nothing was assumed. Safe to call the buyer.
 *
 *   verdict "check"  → nothing failed, but the property is missing a field the
 *                      requirement constrains, so it could not be verified.
 *                      Surfaced separately and never counted as a match.
 *
 *   verdict "no"     → at least one constraint provably failed.
 *
 * The rules that make this hold:
 *   1. An unset requirement field is NO constraint (matches anything).
 *   2. A missing property field is NEVER treated as a pass. It downgrades the
 *      verdict to "check" and is listed in `gaps`.
 *   3. Units are normalised before comparison (all areas → sq.ft), so a
 *      requirement in sq.ft correctly matches land recorded in guntha.
 *   4. Dead properties and non-active requirements are excluded up front.
 *
 * Pure and dependency-free on purpose — it is covered by engine.test.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { toSqft, type AreaUnit } from "../format/area.ts";

/* ───────────────────────────── shapes ───────────────────────────── */

/** Only the property fields matching depends on. */
export type MatchProperty = {
  id: string;
  status: string;
  transaction_type: string;
  category: string;
  property_type: string;
  price: number | null;
  area_value: number | null;
  area_unit: string | null;
  bhk: string | null;
  locality: string | null;
  city: string | null;
};

/** Only the requirement fields matching depends on. */
export type MatchRequirement = {
  id: string;
  status: string;
  buyer_name: string;
  transaction_type: string;
  categories: string[];
  property_types: string[];
  bhk_min: string | null;
  bhk_max: string | null;
  budget_min: number | null;
  budget_max: number | null;
  area_min: number | null;
  area_max: number | null;
  area_unit: string | null;
  localities: string[];
};

export type MatchVerdict = "match" | "check" | "no";

export type MatchResult = {
  verdict: MatchVerdict;
  /** Human-readable confirmations, for display next to the buyer. */
  reasons: string[];
  /** Constraints that could not be verified because property data is missing. */
  gaps: string[];
  /** The first constraint that failed — only set when verdict is "no". */
  failedOn: string | null;
  /**
   * Ordering hint only; never affects the verdict. Higher = tighter fit.
   * Used to put the most relevant buyer at the top of the list.
   */
  score: number;
};

/* ────────────────────────── normalisation ────────────────────────── */

const LIVE_STATUSES = new Set(["available", "negotiating", "token"]);

/** BHK is ordinal, not numeric — '1RK' sorts below '1', '5+' above '4'. */
const BHK_RANK: Record<string, number> = {
  "1RK": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5+": 5,
};

export function bhkRank(bhk: string | null | undefined): number | null {
  if (!bhk) return null;
  const key = String(bhk).trim().toUpperCase();
  return key in BHK_RANK ? BHK_RANK[key] : null;
}

/**
 * Locality text is free-form and inconsistent ("Yelahanka", "yelahanka new
 * town", "Yelahanka  New-Town"). Reduce to comparable word tokens.
 */
export function localityTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * True when two locality strings refer to the same place.
 *
 * Subset in EITHER direction, so "Yelahanka" matches a property in "Yelahanka
 * New Town" and a requirement for "Yelahanka New Town" still matches a property
 * recorded only as "Yelahanka". Requiring *all* tokens of the shorter side to
 * be present stops "Nagar" quietly matching every Nagar in the city.
 */
export function localityMatches(
  requirementLocality: string,
  propertyLocality: string | null | undefined,
): boolean {
  const want = localityTokens(requirementLocality);
  const have = localityTokens(propertyLocality);
  if (want.length === 0 || have.length === 0) return false;
  const wantSet = new Set(want);
  const haveSet = new Set(have);
  const subset = (a: Set<string>, b: Set<string>) => [...a].every(t => b.has(t));
  return subset(wantSet, haveSet) || subset(haveSet, wantSet);
}

/** Property area in sq.ft, or null when it cannot be determined. */
export function propertyAreaSqft(p: MatchProperty): number | null {
  if (p.area_value === null || p.area_value === undefined) return null;
  if (!Number.isFinite(Number(p.area_value))) return null;
  const unit = (p.area_unit ?? "sqft") as AreaUnit;
  try {
    const v = toSqft(Number(p.area_value), unit);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function reqAreaSqft(r: MatchRequirement, which: "min" | "max"): number | null {
  const raw = which === "min" ? r.area_min : r.area_max;
  if (raw === null || raw === undefined || !Number.isFinite(Number(raw))) return null;
  const unit = (r.area_unit ?? "sqft") as AreaUnit;
  try {
    const v = toSqft(Number(raw), unit);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

const inr = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

/* ─────────────────────────── the engine ─────────────────────────── */

/**
 * Evaluate one property against one requirement.
 * Pure: same inputs always produce the same result.
 */
export function evaluate(property: MatchProperty, req: MatchRequirement): MatchResult {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const fail = (failedOn: string): MatchResult => ({
    verdict: "no", reasons, gaps, failedOn, score: 0,
  });

  // ── Gate 0: only live properties and active requirements are ever paired ──
  if (!LIVE_STATUSES.has(property.status)) return fail("Property is not live");
  if (req.status !== "active") return fail("Requirement is not active");

  // ── Gate 1: deal type. A sale buyer must never see a rental. ──
  if (property.transaction_type !== req.transaction_type) return fail("Different deal type");
  reasons.push(
    req.transaction_type === "rent" ? "Wants to rent"
    : req.transaction_type === "lease" ? "Wants a lease"
    : "Wants to buy",
  );

  // ── Gate 2: category / property type (empty list = no constraint) ──
  if (req.categories.length > 0 && !req.categories.includes(property.category)) {
    return fail("Different category");
  }
  if (req.property_types.length > 0 && !req.property_types.includes(property.property_type)) {
    return fail("Different property type");
  }
  if (req.property_types.length > 0) reasons.push("Property type matches");
  else if (req.categories.length > 0) reasons.push("Category matches");

  // ── Gate 3: budget ──
  const wantsBudget = req.budget_min !== null || req.budget_max !== null;
  if (wantsBudget) {
    if (property.price === null || property.price === undefined) {
      gaps.push("Property has no price set");
    } else {
      const price = Number(property.price);
      if (req.budget_max !== null && price > Number(req.budget_max)) {
        return fail(`Over budget (${inr(price)} > ${inr(Number(req.budget_max))})`);
      }
      if (req.budget_min !== null && price < Number(req.budget_min)) {
        return fail(`Under their range (${inr(price)} < ${inr(Number(req.budget_min))})`);
      }
      reasons.push("Within budget");
    }
  }

  // ── Gate 4: area (compared in sq.ft so units can differ) ──
  const minSqft = reqAreaSqft(req, "min");
  const maxSqft = reqAreaSqft(req, "max");
  if (minSqft !== null || maxSqft !== null) {
    const area = propertyAreaSqft(property);
    if (area === null) {
      gaps.push("Property has no area recorded");
    } else {
      if (minSqft !== null && area < minSqft) return fail("Smaller than they want");
      if (maxSqft !== null && area > maxSqft) return fail("Larger than they want");
      reasons.push("Size fits");
    }
  }

  // ── Gate 5: BHK ──
  const minBhk = bhkRank(req.bhk_min);
  const maxBhk = bhkRank(req.bhk_max);
  if (minBhk !== null || maxBhk !== null) {
    const got = bhkRank(property.bhk);
    if (got === null) {
      gaps.push("Property has no BHK recorded");
    } else {
      if (minBhk !== null && got < minBhk) return fail("Fewer bedrooms than they want");
      if (maxBhk !== null && got > maxBhk) return fail("More bedrooms than they want");
      reasons.push(
        property.bhk === "1RK" ? "1 RK as wanted" : `${property.bhk} BHK as wanted`,
      );
    }
  }

  // ── Gate 6: locality (empty list = anywhere) ──
  if (req.localities.length > 0) {
    if (!property.locality && !property.city) {
      gaps.push("Property has no locality recorded");
    } else {
      const hit = req.localities.find(
        l => localityMatches(l, property.locality) || localityMatches(l, property.city),
      );
      if (!hit) return fail("Different area");
      reasons.push(`In ${hit}`);
    }
  }

  // ── Score: ordering only. Tighter budget fit and more confirmations rank up.
  let score = reasons.length * 10;
  if (req.budget_max !== null && property.price) {
    const headroom = (Number(req.budget_max) - Number(property.price)) / Number(req.budget_max);
    // Comfortably inside budget beats scraping the ceiling.
    score += Math.round(Math.max(0, Math.min(1, headroom)) * 20);
  }

  return {
    verdict: gaps.length === 0 ? "match" : "check",
    reasons,
    gaps,
    failedOn: null,
    score,
  };
}

export type RankedRequirement = { requirement: MatchRequirement; result: MatchResult };
export type RankedProperty = { property: MatchProperty; result: MatchResult };

/** Buyers waiting for a given property, best first. */
export function buyersFor(
  property: MatchProperty,
  requirements: MatchRequirement[],
): { matches: RankedRequirement[]; needsCheck: RankedRequirement[] } {
  const matches: RankedRequirement[] = [];
  const needsCheck: RankedRequirement[] = [];
  for (const requirement of requirements) {
    const result = evaluate(property, requirement);
    if (result.verdict === "match") matches.push({ requirement, result });
    else if (result.verdict === "check") needsCheck.push({ requirement, result });
  }
  const bestFirst = (a: RankedRequirement, b: RankedRequirement) => b.result.score - a.result.score;
  return { matches: matches.sort(bestFirst), needsCheck: needsCheck.sort(bestFirst) };
}

/** Properties that satisfy a given requirement, best first. */
export function propertiesFor(
  requirement: MatchRequirement,
  properties: MatchProperty[],
): { matches: RankedProperty[]; needsCheck: RankedProperty[] } {
  const matches: RankedProperty[] = [];
  const needsCheck: RankedProperty[] = [];
  for (const property of properties) {
    const result = evaluate(property, requirement);
    if (result.verdict === "match") matches.push({ property, result });
    else if (result.verdict === "check") needsCheck.push({ property, result });
  }
  const bestFirst = (a: RankedProperty, b: RankedProperty) => b.result.score - a.result.score;
  return { matches: matches.sort(bestFirst), needsCheck: needsCheck.sort(bestFirst) };
}
