// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { computeApprovalGate } from "../scripts/lib/slice-linker/start-slice.mjs";

test("computeApprovalGate: returns false when autonomous_safe is true", () => {
  const result = computeApprovalGate(true, false, true);
  assert.equal(result, false);
});

test("computeApprovalGate: returns true when autonomous_safe is false and auto mode is off", () => {
  const result = computeApprovalGate(false, false, true);
  assert.equal(result, true);
});

test("computeApprovalGate: returns false when autonomous_safe is false but auto mode is on", () => {
  const result = computeApprovalGate(false, true, true);
  assert.equal(result, false);
});

test("computeApprovalGate: returns false when dispatch is false", () => {
  const result = computeApprovalGate(false, false, false);
  assert.equal(result, false);
});

test("computeApprovalGate: returns false when autonomous_safe is null (no feature)", () => {
  const result = computeApprovalGate(null, false, true);
  assert.equal(result, false);
});
