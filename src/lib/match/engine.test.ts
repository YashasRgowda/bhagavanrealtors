/**
 * Matching engine tests.
 *
 * Run:  node --test src/lib/match/engine.test.ts
 *
 * The point of these is the false-positive guarantee: a "match" verdict must
 * never appear unless every constraint was actually verified against real data.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluate, buyersFor, bhkRank, localityMatches, propertyAreaSqft,
  type MatchProperty, type MatchRequirement,
} from "./engine.ts";

const property = (over: Partial<MatchProperty> = {}): MatchProperty => ({
  id: "p1",
  status: "available",
  transaction_type: "sale",
  category: "residential",
  property_type: "flat",
  price: 4_500_000,
  area_value: 1200,
  area_unit: "sqft",
  bhk: "2",
  locality: "Yelahanka New Town",
  city: "Bengaluru",
  ...over,
});

const requirement = (over: Partial<MatchRequirement> = {}): MatchRequirement => ({
  id: "r1",
  status: "active",
  buyer_name: "Suresh",
  transaction_type: "sale",
  categories: [],
  property_types: [],
  bhk_min: null,
  bhk_max: null,
  budget_min: null,
  budget_max: null,
  area_min: null,
  area_max: null,
  area_unit: "sqft",
  localities: [],
  ...over,
});

/* ───────────────────────── the happy path ───────────────────────── */

test("a fully-specified requirement matches a fully-specified property", () => {
  const r = evaluate(property(), requirement({
    budget_max: 5_000_000, bhk_min: "2", area_min: 1000, localities: ["Yelahanka"],
  }));
  assert.equal(r.verdict, "match");
  assert.equal(r.gaps.length, 0);
});

test("an empty requirement constrains nothing", () => {
  assert.equal(evaluate(property(), requirement()).verdict, "match");
});

/* ─────────────────────────── hard gates ─────────────────────────── */

test("a sale buyer is never shown a rental", () => {
  const r = evaluate(property({ transaction_type: "rent" }), requirement({ transaction_type: "sale" }));
  assert.equal(r.verdict, "no");
});

test("sold / rented / parked properties never match", () => {
  for (const status of ["sold", "rented", "leased", "parked", "withdrawn"]) {
    assert.equal(evaluate(property({ status }), requirement()).verdict, "no", status);
  }
});

test("only live statuses match", () => {
  for (const status of ["available", "negotiating", "token"]) {
    assert.equal(evaluate(property({ status }), requirement()).verdict, "match", status);
  }
});

test("a fulfilled or dropped requirement never matches", () => {
  for (const status of ["fulfilled", "dropped"]) {
    assert.equal(evaluate(property(), requirement({ status })).verdict, "no", status);
  }
});

/* ──────────────────────────── budget ────────────────────────────── */

test("over budget fails, exactly on budget passes", () => {
  assert.equal(evaluate(property({ price: 5_000_001 }), requirement({ budget_max: 5_000_000 })).verdict, "no");
  assert.equal(evaluate(property({ price: 5_000_000 }), requirement({ budget_max: 5_000_000 })).verdict, "match");
});

test("below a minimum budget fails", () => {
  assert.equal(evaluate(property({ price: 900_000 }), requirement({ budget_min: 1_000_000 })).verdict, "no");
});

/* ───────────────────────────── area ─────────────────────────────── */

test("area is compared across units — 2 guntha satisfies a 2000 sq.ft minimum", () => {
  const p = property({ area_value: 2, area_unit: "guntha", bhk: null });   // 2178 sq.ft
  const r = evaluate(p, requirement({ area_min: 2000, area_unit: "sqft" }));
  assert.equal(r.verdict, "match");
});

test("a requirement stated in acres still filters correctly", () => {
  const p = property({ area_value: 43560, area_unit: "sqft" });            // exactly 1 acre
  assert.equal(evaluate(p, requirement({ area_min: 2, area_unit: "acre" })).verdict, "no");
  assert.equal(evaluate(p, requirement({ area_min: 1, area_unit: "acre" })).verdict, "match");
});

/* ───────────────────────────── BHK ──────────────────────────────── */

test("BHK is ordinal — a 3BHK satisfies 'at least 2BHK', a 1BHK does not", () => {
  assert.equal(evaluate(property({ bhk: "3" }), requirement({ bhk_min: "2" })).verdict, "match");
  assert.equal(evaluate(property({ bhk: "1" }), requirement({ bhk_min: "2" })).verdict, "no");
});

test("1RK ranks below 1BHK and 5+ above 4", () => {
  assert.ok(bhkRank("1RK")! < bhkRank("1")!);
  assert.ok(bhkRank("5+")! > bhkRank("4")!);
  assert.equal(bhkRank(null), null);
  assert.equal(bhkRank("garbage"), null);
});

/* ─────────────────────────── locality ───────────────────────────── */

test("locality matches in both directions but not across different places", () => {
  assert.ok(localityMatches("Yelahanka", "Yelahanka New Town"));
  assert.ok(localityMatches("Yelahanka New Town", "Yelahanka"));
  assert.ok(localityMatches("yelahanka  new-town", "Yelahanka New Town"));
  assert.ok(!localityMatches("Yelahanka", "Whitefield"));
  assert.ok(!localityMatches("Indira Nagar", "Vijaya Nagar"));
});

test("any one locality in the list is enough", () => {
  const r = evaluate(property({ locality: "Whitefield" }), requirement({
    localities: ["Yelahanka", "Whitefield"],
  }));
  assert.equal(r.verdict, "match");
});

test("a property in a different area fails", () => {
  assert.equal(
    evaluate(property({ locality: "Whitefield" }), requirement({ localities: ["Yelahanka"] })).verdict,
    "no",
  );
});

/* ───────── the core guarantee: missing data never fakes a match ───────── */

test("missing price downgrades a budget requirement to 'check', never 'match'", () => {
  const r = evaluate(property({ price: null }), requirement({ budget_max: 5_000_000 }));
  assert.equal(r.verdict, "check");
  assert.equal(r.gaps.length, 1);
});

test("missing area downgrades an area requirement to 'check'", () => {
  const r = evaluate(property({ area_value: null }), requirement({ area_min: 1000 }));
  assert.equal(r.verdict, "check");
});

test("missing BHK downgrades a BHK requirement to 'check'", () => {
  const r = evaluate(property({ bhk: null }), requirement({ bhk_min: "2" }));
  assert.equal(r.verdict, "check");
});

test("missing locality downgrades a locality requirement to 'check'", () => {
  const r = evaluate(property({ locality: null, city: null }), requirement({ localities: ["Yelahanka"] }));
  assert.equal(r.verdict, "check");
});

test("a real failure still beats a gap — a hard fail is never softened to 'check'", () => {
  // Over budget AND missing area: the definite failure must win.
  const r = evaluate(
    property({ price: 9_000_000, area_value: null }),
    requirement({ budget_max: 5_000_000, area_min: 1000 }),
  );
  assert.equal(r.verdict, "no");
});

test("missing property fields are irrelevant when the requirement does not ask", () => {
  const r = evaluate(property({ price: null, area_value: null, bhk: null, locality: null }), requirement());
  assert.equal(r.verdict, "match");
  assert.equal(r.gaps.length, 0);
});

/* ─────────────────────── bucketing & ordering ─────────────────────── */

test("buyersFor separates confirmed matches from ones needing a check", () => {
  const p = property({ price: null });
  const { matches, needsCheck } = buyersFor(p, [
    requirement({ id: "a", budget_max: 5_000_000 }),   // unverifiable — no price
    requirement({ id: "b" }),                          // no constraints — confirmed
    requirement({ id: "c", localities: ["Whitefield"] }), // fails outright
  ]);
  assert.deepEqual(matches.map(m => m.requirement.id), ["b"]);
  assert.deepEqual(needsCheck.map(m => m.requirement.id), ["a"]);
});

test("ordering never changes a verdict", () => {
  const p = property({ price: 3_000_000 });
  const { matches } = buyersFor(p, [
    requirement({ id: "tight", budget_max: 3_100_000 }),
    requirement({ id: "roomy", budget_max: 9_000_000 }),
  ]);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].requirement.id, "roomy");  // more headroom ranks first
});

/* ──────────────────────────── unit maths ─────────────────────────── */

test("propertyAreaSqft converts and defends against bad data", () => {
  assert.equal(propertyAreaSqft(property({ area_value: 100, area_unit: "sqft" })), 100);
  assert.equal(propertyAreaSqft(property({ area_value: 1, area_unit: "acre" })), 43560);
  assert.equal(propertyAreaSqft(property({ area_value: null })), null);
  assert.equal(propertyAreaSqft(property({ area_value: 100, area_unit: null })), 100); // defaults to sq.ft
});
