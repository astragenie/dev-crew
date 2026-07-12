import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  validateFeat,
  validateSlice,
  validateGrade,
  validateDecision,
  validateLoopJson
} from "../scripts/lib/state-schemas.mjs";

const GOOD_FEAT = {
  id: "FEAT-144",
  status: "pending",
  priority: null as null,
  category: "bug",
  target_release: null as null,
  created: "2026-06-10",
  updated: "2026-06-10",
  depends_on: [] as string[],
  slices: [] as string[],
  derived_from: null as null
};

test("validateFeat accepts a canonical FEAT frontmatter", () => {
  const r = validateFeat(GOOD_FEAT);
  assert.equal(r.ok, true, r.issues.join("; "));
});

test("validateFeat rejects bad id, status, dates, and array shapes", () => {
  const r = validateFeat({
    ...GOOD_FEAT,
    id: "FEAT-x",
    status: "shipped",
    created: "yesterday",
    depends_on: "FEAT-001"
  });
  assert.equal(r.ok, false);
  assert.equal(r.issues.length, 4, r.issues.join("; "));
});

test("validateFeat tolerates missing schemaVersion and accepts 1", () => {
  assert.equal(validateFeat({ ...GOOD_FEAT, schemaVersion: 1 }).ok, true);
  assert.equal(validateFeat(GOOD_FEAT).ok, true); // absent => v1
  assert.equal(validateFeat({ ...GOOD_FEAT, schemaVersion: 99 }).ok, false);
});

test("validateSlice accepts the slice-template shape", () => {
  const r = validateSlice({
    id: "SLICE-12",
    status: "pending",
    feature: "FEAT-144",
    phase: null,
    priority: null,
    target_release: null,
    requires_validation: false,
    created: "2026-06-10",
    updated: "2026-06-10"
  });
  assert.equal(r.ok, true, r.issues.join("; "));
});

test("validateSlice rejects bad id and non-FEAT feature link", () => {
  const r = validateSlice({ id: "S12", status: "pending", feature: "feat-1" });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.includes("id")));
  assert.ok(r.issues.some((i) => i.includes("feature")));
});

// runner#393 proposal 4: estimated_tokens is an optional non-negative number.
test("validateSlice accepts a non-negative estimated_tokens", () => {
  const r = validateSlice({
    id: "SLICE-12",
    status: "pending",
    estimated_tokens: 100_000
  });
  assert.equal(r.ok, true, r.issues.join("; "));
});

test("validateSlice tolerates absent estimated_tokens", () => {
  const r = validateSlice({ id: "SLICE-12", status: "pending" });
  assert.equal(r.ok, true, r.issues.join("; "));
});

test("validateSlice rejects a negative or non-numeric estimated_tokens", () => {
  const rNeg = validateSlice({ id: "SLICE-12", status: "pending", estimated_tokens: -1 });
  assert.equal(rNeg.ok, false);
  assert.ok(rNeg.issues.some((i) => i.includes("estimated_tokens")));

  const rStr = validateSlice({ id: "SLICE-12", status: "pending", estimated_tokens: "lots" });
  assert.equal(rStr.ok, false);
  assert.ok(rStr.issues.some((i) => i.includes("estimated_tokens")));
});

test("validateGrade requires a slice link", () => {
  assert.equal(validateGrade({ slice: "SLICE-12" }).ok, true);
  assert.equal(validateGrade({}).ok, false);
});

test("validateDecision requires id/title/status", () => {
  assert.equal(validateDecision({ id: "DEC-044", title: "T", status: "accepted" }).ok, true);
  assert.equal(validateDecision({ id: "DEC-x", title: "", status: "" }).ok, false);
});

test("validateLoopJson requires schemaVersion 1 and string path overrides", () => {
  assert.equal(validateLoopJson({ schemaVersion: 1 }).ok, true);
  assert.equal(validateLoopJson({ schemaVersion: 1, loop: { backlogRoot: 42 } }).ok, false);
  assert.equal(validateLoopJson({}).ok, false);
});
