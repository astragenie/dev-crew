import { test } from "bun:test";
import assert from "node:assert/strict";

import { isEnabled } from "../scripts/lib/features-service.mjs";

// AC-2: Given a config with no features block, When isEnabled is called, Then it returns true (default-ON)
test("isEnabled returns true when config is null", () => {
  const result = isEnabled("redundant-read-stop", null);
  assert.equal(result, true);
});

test("isEnabled returns true when config has no features block", () => {
  const config = { loop: {} };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, true);
});

test("isEnabled returns true when feature is missing from features block", () => {
  const config = { features: {} };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, true);
});

// AC-3: Given features.redundant-read-stop.enabled = false, When isEnabled is called, Then it returns false
test("isEnabled returns false when feature is explicitly disabled", () => {
  const config = { features: { "redundant-read-stop": { enabled: false } } };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, false);
});

test("isEnabled returns true when feature is explicitly enabled", () => {
  const config = { features: { "redundant-read-stop": { enabled: true } } };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, true);
});

// AC-5: Given malformed features entry, When isEnabled is called, Then it returns true (safe default) and does not throw
test("isEnabled returns true when feature value is not an object (string value)", () => {
  const config: Record<string, any> = { features: { "redundant-read-stop": "yes" } };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, true);
});

test("isEnabled returns true when feature value is null (malformed)", () => {
  const config: Record<string, any> = { features: { "redundant-read-stop": null } };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, true);
});

test("isEnabled returns true when enabled property is not a boolean (string)", () => {
  const config: Record<string, any> = { features: { "redundant-read-stop": { enabled: "false" } } };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, true);
});

test("isEnabled returns true when enabled property is not a boolean (number)", () => {
  const config: Record<string, any> = { features: { "redundant-read-stop": { enabled: 0 } } };
  const result = isEnabled("redundant-read-stop", config);
  assert.equal(result, true);
});

test("isEnabled does not throw when config is undefined", () => {
  assert.doesNotThrow(() => {
    isEnabled("redundant-read-stop", undefined as any);
  });
});

test("isEnabled does not throw when features is not an object", () => {
  const config: Record<string, any> = { features: "not-an-object" };
  assert.doesNotThrow(() => {
    isEnabled("redundant-read-stop", config);
  });
});

// AC-6: When a gate evaluation occurs, Then a debug-level log line is emitted
// (This is verified by the integration test via console.debug stub, but unit test
// just confirms the function completes without error)
test("isEnabled emits stderr diagnostic and returns expected value (enabled=true)", () => {
  const logs: string[] = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = ((chunk: any) => {
    logs.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    const config: Record<string, any> = { features: { "redundant-read-stop": { enabled: true } } };
    const result = isEnabled("redundant-read-stop", config);
    assert.equal(result, true);
    assert.equal(logs.length, 1);
    assert.match(logs[0]!, /redundant-read-stop.*enabled/);
  } finally {
    process.stderr.write = originalWrite;
  }
});

test("isEnabled emits stderr diagnostic and returns expected value (enabled=false)", () => {
  const logs: string[] = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = ((chunk: any) => {
    logs.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    const config: Record<string, any> = { features: { "redundant-read-stop": { enabled: false } } };
    const result = isEnabled("redundant-read-stop", config);
    assert.equal(result, false);
    assert.equal(logs.length, 1);
    assert.match(logs[0]!, /redundant-read-stop.*disabled/);
  } finally {
    process.stderr.write = originalWrite;
  }
});

test("isEnabled emits stderr diagnostic with default-ON when config missing (enabled=true)", () => {
  const logs: string[] = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = ((chunk: any) => {
    logs.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    const result = isEnabled("redundant-read-stop", null);
    assert.equal(result, true);
    assert.equal(logs.length, 1);
    assert.match(logs[0]!, /redundant-read-stop.*enabled/);
  } finally {
    process.stderr.write = originalWrite;
  }
});
