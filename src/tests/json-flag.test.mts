import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonFlag } from "../scripts/lib/json-flag.mjs";

test("parses plain JSON", () => {
  const result = parseJsonFlag('{"customer_impact":0.75,"technical_risk":0.5}', "scores");
  assert.deepEqual(result, { customer_impact: 0.75, technical_risk: 0.5 });
});

test("parses PowerShell backslash-escaped JSON", () => {
  const raw = '{\\"customer_impact\\":0.75,\\"effort_estimate\\":0.35}';
  const result = parseJsonFlag(raw, "scores");
  assert.deepEqual(result, { customer_impact: 0.75, effort_estimate: 0.35 });
});

test("escaped-quote retry does not corrupt legitimate escaped quotes inside string values", () => {
  // Plain parse succeeds here, so no retry happens and the inner quote survives.
  const raw = '{"note":"a \\"quoted\\" word"}';
  const result = parseJsonFlag(raw, "scores");
  assert.deepEqual(result, { note: 'a "quoted" word' });
});

test("throws with flag name and original error when both parses fail", () => {
  assert.throws(
    () => parseJsonFlag("{not json at all", "scores"),
    (err: Error) => err.message.startsWith("--scores must be valid JSON:")
  );
});

test("throws on empty string", () => {
  assert.throws(() => parseJsonFlag("", "scores"), /--scores must be valid JSON/);
});
