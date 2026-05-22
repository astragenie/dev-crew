import test from "node:test";
import assert from "node:assert/strict";

import {
  phaseStart,
  phaseEnd,
  featureStart,
  featureEnd,
  renderTree,
} from "../scripts/lib/ceremonies.mjs";

// --- ceremony stubs ---

test("phaseStart returns scaffold ceremony object", () => {
  const result = phaseStart({ id: "2", title: "Domain build-out" });
  assert.equal(result.type, "phase-start");
  assert.equal(result.id, "2");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string", "timestamp must be a string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

test("phaseEnd returns scaffold ceremony object", () => {
  const result = phaseEnd({ id: "3", title: "Workflow polish" });
  assert.equal(result.type, "phase-end");
  assert.equal(result.id, "3");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

test("featureStart returns scaffold ceremony object", () => {
  const result = featureStart({ id: "FEAT-005", title: "csharp-conventions", phase: "2" });
  assert.equal(result.type, "feature-start");
  assert.equal(result.id, "FEAT-005");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

test("featureEnd returns scaffold ceremony object", () => {
  const result = featureEnd({ id: "FEAT-006", title: "flutter-conventions", phase: "2" });
  assert.equal(result.type, "feature-end");
  assert.equal(result.id, "FEAT-006");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});
