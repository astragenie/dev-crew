import { test } from "bun:test";
import assert from "node:assert/strict";

import { computePostBuilderConfidence } from "../scripts/lib/confidence-signal.mjs";

test("green when builder status is pass", () => {
  const r = computePostBuilderConfidence({ status: "pass" });
  assert.equal(r.confidence, "green");
  assert.match(r.reason, /passed/);
});

test("red when builder status fail with test-fail in failures", () => {
  const r = computePostBuilderConfidence({ status: "fail", failures: ["test-fail"] });
  assert.equal(r.confidence, "red");
  assert.match(r.reason, /test-fail/);
});

test("red when builder status fail with build-fail in failures", () => {
  const r = computePostBuilderConfidence({ status: "fail", failures: ["build-fail"] });
  assert.equal(r.confidence, "red");
  assert.match(r.reason, /build-fail/);
});

test("yellow when builder status fail with empty failures array", () => {
  const r = computePostBuilderConfidence({ status: "fail", failures: [] });
  assert.equal(r.confidence, "yellow");
  assert.match(r.reason, /failure/);
});

test("yellow when builder status is partial", () => {
  const r = computePostBuilderConfidence({ status: "partial" });
  assert.equal(r.confidence, "yellow");
  assert.match(r.reason, /partial/);
});

test("yellow when builder status fail with no failures field", () => {
  const r = computePostBuilderConfidence({ status: "fail" });
  assert.equal(r.confidence, "yellow");
  assert.match(r.reason, /failure/);
});
