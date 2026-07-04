import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  isEnabled,
  isFeatureEnabled,
  FEATURES,
  getFeatureMeta,
  listFeatures
} from "../scripts/lib/features-service.mjs";
import { HOOK_FLAG_DEFAULTS } from "../../hooks/feature-flag-lite.mjs";

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

// ---------------------------------------------------------------------------
// P1.0 — feature registry (FEATURES) + isFeatureEnabled resolution.
// Mirrors crew's sibling registry shape so the two merge in Phase 2.
// ---------------------------------------------------------------------------

const P1_0_FEATURE_NAMES = [
  "dispatch-guard-block",
  "close-refusal",
  "snapshot-autoregen",
  "learnings-capture",
  "version-check",
  "bootstrap-context",
  "parallel-fe-be-variant"
] as const;

test("FEATURES registers all 7 P1.0 flags plus the pre-existing redundant-read-stop", () => {
  for (const name of P1_0_FEATURE_NAMES) {
    assert.ok(FEATURES[name], `expected FEATURES to contain "${name}"`);
  }
  assert.ok(FEATURES["redundant-read-stop"], "pre-existing FEAT-170 entry must survive");
});

test("every FEATURES entry mirrors crew's shape: version, default, description, scope, owner, since", () => {
  for (const [name, meta] of Object.entries(FEATURES)) {
    assert.equal(typeof meta.version, "string", `${name}.version`);
    assert.equal(typeof meta.default, "boolean", `${name}.default`);
    assert.equal(typeof meta.description, "string", `${name}.description`);
    assert.ok(meta.description.length > 0, `${name}.description non-empty`);
    assert.equal(typeof meta.scope, "string", `${name}.scope`);
    assert.equal(typeof meta.owner, "string", `${name}.owner`);
    assert.equal(typeof meta.since, "string", `${name}.since`);
  }
});

test("all 7 P1.0 flags default to true (zero behavior change at defaults)", () => {
  for (const name of P1_0_FEATURE_NAMES) {
    assert.equal(FEATURES[name]?.default, true, `${name} must default to true`);
  }
});

test("getFeatureMeta returns metadata for a known feature, undefined for unknown", () => {
  assert.ok(getFeatureMeta("dispatch-guard-block"));
  assert.equal(getFeatureMeta("does-not-exist"), undefined);
});

test("listFeatures returns every registered feature with its name attached", () => {
  const listed = listFeatures();
  assert.equal(listed.length, Object.keys(FEATURES).length);
  const names = listed.map((f) => f.name);
  for (const name of P1_0_FEATURE_NAMES) {
    assert.ok(names.includes(name));
  }
});

test("isFeatureEnabled: default (no config) resolves to the registry default (true) for each P1.0 flag", () => {
  for (const name of P1_0_FEATURE_NAMES) {
    assert.equal(isFeatureEnabled(name, null), true);
  }
});

test("isFeatureEnabled: explicit override true is honored", () => {
  const config = { features: { "dispatch-guard-block": { enabled: true } } };
  assert.equal(isFeatureEnabled("dispatch-guard-block", config), true);
});

test("isFeatureEnabled: explicit override false is honored", () => {
  const config = { features: { "dispatch-guard-block": { enabled: false } } };
  assert.equal(isFeatureEnabled("dispatch-guard-block", config), false);
});

test("isFeatureEnabled: malformed entry falls back to registry default, never throws", () => {
  const config: Record<string, any> = { features: { "close-refusal": "not-an-object" } };
  assert.doesNotThrow(() => {
    assert.equal(isFeatureEnabled("close-refusal", config), true);
  });
});

test("isFeatureEnabled: unregistered feature name defaults to true", () => {
  assert.equal(isFeatureEnabled("some-future-flag-not-yet-registered", null), true);
});

// P1.8 review follow-up: hooks/feature-flag-lite.mjs (plain .mjs, no build
// step, can't import this TS registry) keeps its own tiny HOOK_FLAG_DEFAULTS
// map for the 3 flags it consumes. This test is the parity guard — if
// someone changes a default in one place and not the other, the suite
// fails instead of the drift going unnoticed until a hook silently
// misbehaves in production.
test("feature-flag-lite's HOOK_FLAG_DEFAULTS stays in sync with the FEATURES registry", () => {
  for (const [name, liteDefault] of Object.entries(HOOK_FLAG_DEFAULTS)) {
    assert.ok(FEATURES[name as keyof typeof FEATURES], `${name} must exist in FEATURES registry`);
    assert.equal(
      liteDefault,
      FEATURES[name as keyof typeof FEATURES]?.default,
      `feature-flag-lite.mjs HOOK_FLAG_DEFAULTS["${name}"] (${liteDefault}) must match ` +
        `FEATURES["${name}"].default (${FEATURES[name as keyof typeof FEATURES]?.default})`
    );
  }
});

test("every hook-consumed flag (version-check, bootstrap-context, dispatch-guard-block) is present in HOOK_FLAG_DEFAULTS", () => {
  for (const name of ["version-check", "bootstrap-context", "dispatch-guard-block"]) {
    assert.ok(name in HOOK_FLAG_DEFAULTS, `${name} must be in HOOK_FLAG_DEFAULTS`);
  }
});
