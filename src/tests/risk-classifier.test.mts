import { test } from "bun:test";
import assert from "node:assert/strict";
import { classifyRisk } from "../scripts/lib/risk-classifier.mjs";

// --- HIGH triggers ---

test("classifyRisk: concern:security tag → HIGH", () => {
  assert.equal(classifyRisk({ tags: ["concern:security"] }), "high");
});

test("classifyRisk: concern:governance tag → HIGH", () => {
  assert.equal(classifyRisk({ tags: ["concern:governance"] }), "high");
});

test("classifyRisk: surface:schema tag → HIGH", () => {
  assert.equal(classifyRisk({ tags: ["surface:schema"] }), "high");
});

test("classifyRisk: surface:api tag → HIGH", () => {
  assert.equal(classifyRisk({ tags: ["surface:api"] }), "high");
});

test("classifyRisk: pm_technical_risk exactly 0.7 → HIGH (boundary)", () => {
  assert.equal(classifyRisk({ pm_technical_risk: 0.7 }), "high");
});

test("classifyRisk: pm_technical_risk 0.69 → NOT HIGH from this trigger (MEDIUM)", () => {
  assert.equal(classifyRisk({ pm_technical_risk: 0.69 }), "medium");
});

test("classifyRisk: category security → HIGH", () => {
  assert.equal(classifyRisk({ category: "security" }), "high");
});

test("classifyRisk: priority P0 → HIGH", () => {
  assert.equal(classifyRisk({ priority: "P0" }), "high");
});

test("classifyRisk: pm_customer_impact exactly 0.85 → HIGH (boundary)", () => {
  assert.equal(classifyRisk({ pm_customer_impact: 0.85 }), "high");
});

test("classifyRisk: pm_customer_impact 0.84 → NOT HIGH from this trigger (MEDIUM)", () => {
  assert.equal(classifyRisk({ pm_customer_impact: 0.84 }), "medium");
});

// --- LOW triggers ---

test("classifyRisk: category docs with no HIGH trigger → LOW", () => {
  assert.equal(classifyRisk({ category: "docs" }), "low");
});

test("classifyRisk: docs-only tag → LOW", () => {
  assert.equal(classifyRisk({ tags: ["docs-only"] }), "low");
});

test("classifyRisk: pm_technical_risk 0.29 and pm_customer_impact 0.39 → LOW", () => {
  assert.equal(classifyRisk({ pm_technical_risk: 0.29, pm_customer_impact: 0.39 }), "low");
});

test("classifyRisk: pm_technical_risk 0.3 and pm_customer_impact 0.39 → NOT LOW (0.3 is not < 0.3)", () => {
  assert.equal(classifyRisk({ pm_technical_risk: 0.3, pm_customer_impact: 0.39 }), "medium");
});

// --- MEDIUM default ---

test("classifyRisk: empty object → MEDIUM", () => {
  assert.equal(classifyRisk({}), "medium");
});

test("classifyRisk: moderate risk and impact → MEDIUM", () => {
  assert.equal(classifyRisk({ pm_technical_risk: 0.5, pm_customer_impact: 0.5 }), "medium");
});

// --- HIGH wins over LOW ---

test("classifyRisk: category docs but pm_technical_risk 0.8 → HIGH (not LOW)", () => {
  assert.equal(classifyRisk({ category: "docs", pm_technical_risk: 0.8 }), "high");
});

// --- Missing fields (conservative defaults) ---

test("classifyRisk: empty object → MEDIUM (missing numerics treated as 1 for LOW check)", () => {
  // missing pm_technical_risk and pm_customer_impact → treated as 1 for LOW
  // → LOW condition (1 < 0.3 && 1 < 0.4) fails → MEDIUM
  assert.equal(classifyRisk({}), "medium");
});

test("classifyRisk: concern:security tag with no other fields → HIGH", () => {
  assert.equal(classifyRisk({ tags: ["concern:security"] }), "high");
});
