import { test } from "bun:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  buildArtifactSlug,
  buildArtifactTitle,
  hasLeadingTimestamp,
  stripArtifactTimestamp,
  buildArtifactFilename,
  camelTight,
  KIND_REGISTRY
} from "../scripts/lib/artifact-naming.mjs";

test("buildArtifactSlug emits tight phase → feat → slice when all three set", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: "3", sliceId: "SLICE-36" });
  assert.equal(out, "phase3-feat021-slice36");
});

test("buildArtifactSlug drops phase segment when phase is null", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: null, sliceId: "SLICE-36" });
  assert.equal(out, "feat021-slice36");
});

test("buildArtifactSlug drops feature segment when featureId is null", () => {
  const out = buildArtifactSlug({ featureId: null, phase: "3", sliceId: "SLICE-36" });
  assert.equal(out, "phase3-slice36");
});

test("buildArtifactSlug returns bare sliceNN when only sliceId given", () => {
  const out = buildArtifactSlug({ sliceId: "SLICE-36" });
  assert.equal(out, "slice36");
});

test("buildArtifactSlug lowercases identifiers", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-007", sliceId: "SLICE-A2" });
  assert.equal(out, "feat007-slicea2");
});

test("buildArtifactSlug compacts punctuation in phase", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: "3 alpha", sliceId: "SLICE-36" });
  assert.equal(out, "phase3alpha-feat021-slice36");
});

test("buildArtifactSlug throws without sliceId", () => {
  assert.throws(() => buildArtifactSlug({ featureId: "FEAT-021" }), /sliceId/);
});

test("buildArtifactSlug treats empty string phase as null", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: "", sliceId: "SLICE-36" });
  assert.equal(out, "feat021-slice36");
});

test("buildArtifactTitle emits tight uppercase tags PHASE → FEAT → SLICE", () => {
  const out = buildArtifactTitle({
    featureId: "FEAT-021",
    phase: "3",
    sliceId: "SLICE-36",
    summary: "Health page repurpose"
  });
  assert.equal(out, "PHASE3 FEAT021 SLICE36: Health page repurpose");
});

test("buildArtifactTitle omits summary suffix when none given", () => {
  const out = buildArtifactTitle({ featureId: "FEAT-021", sliceId: "SLICE-36" });
  assert.equal(out, "FEAT021 SLICE36");
});

test("buildArtifactTitle omits FEAT and PHASE tags when both null", () => {
  const out = buildArtifactTitle({ sliceId: "SLICE-36", summary: "Bare slice" });
  assert.equal(out, "SLICE36: Bare slice");
});

test("buildArtifactTitle omits PHASE tag when phase null", () => {
  const out = buildArtifactTitle({
    featureId: "FEAT-021",
    phase: null,
    sliceId: "SLICE-36",
    summary: "No phase"
  });
  assert.equal(out, "FEAT021 SLICE36: No phase");
});

test("buildArtifactTitle throws without sliceId", () => {
  assert.throws(() => buildArtifactTitle({ featureId: "FEAT-021" }), /sliceId/);
});

test("hasLeadingTimestamp detects crew CLI TS prefix", () => {
  assert.equal(hasLeadingTimestamp("20260524T083250Z-feat021-slice36-review-result.md"), true);
  assert.equal(hasLeadingTimestamp("feat021-slice36-final-synthesis.md"), false);
  assert.equal(hasLeadingTimestamp("/abs/dir/20260524T083250Z-x.md"), true);
});

test("stripArtifactTimestamp renames a TS-prefixed file in place", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "strip-ts-"));
  const original = path.join(dir, "20260524T083250Z-phase3-feat021-slice36-review-result.md");
  await fs.writeFile(original, "body");

  const newPath = await stripArtifactTimestamp(original);
  assert.equal(
    path.basename(newPath),
    "phase3-feat021-slice36-review-result.md",
    "filename loses the leading timestamp segment"
  );
  const onDisk = await fs.readdir(dir);
  assert.deepEqual(onDisk, ["phase3-feat021-slice36-review-result.md"]);
});

test("stripArtifactTimestamp is a no-op when no TS prefix", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "strip-noop-"));
  const original = path.join(dir, "phase3-feat021-slice36-complete.md");
  await fs.writeFile(original, "body");

  const newPath = await stripArtifactTimestamp(original);
  assert.equal(newPath, original);
});

test("stripArtifactTimestamp returns falsy input untouched", async () => {
  assert.equal(await stripArtifactTimestamp(null), null);
  assert.equal(await stripArtifactTimestamp(undefined), undefined);
  assert.equal(await stripArtifactTimestamp(""), "");
});

// ---------------------------------------------------------------------------
// camelTight
// ---------------------------------------------------------------------------

test("camelTight converts kebab-case to camelCase", () => {
  assert.equal(camelTight("cost-report-slice"), "costReportSlice");
});

test("camelTight converts space-separated words to camelCase", () => {
  assert.equal(camelTight("health page"), "healthPage");
});

test("camelTight converts mixed punctuation to camelCase", () => {
  assert.equal(camelTight("FEAT-187"), "feat187");
});

test("camelTight returns empty string on overflow (> 24 chars)", () => {
  assert.equal(camelTight("a".repeat(30)), "");
});

test("camelTight returns empty string for null", () => {
  assert.equal(camelTight(null), "");
});

test("camelTight handles single word lowercase", () => {
  assert.equal(camelTight("grade"), "grade");
});

// ---------------------------------------------------------------------------
// KIND_REGISTRY
// ---------------------------------------------------------------------------

test("KIND_REGISTRY contains all 17 canonical kinds", () => {
  const expected = [
    "agentReport",
    "costReportSlice",
    "costReportAggregate",
    "costAdvise",
    "reviewResult",
    "validationResult",
    "finalSynthesis",
    "pmReview",
    "autoRun",
    "handoff",
    "grade",
    "plan",
    "retro",
    "trajectory",
    "fanoutMarker",
    "shapeMarker",
    "design"
  ];
  assert.equal(KIND_REGISTRY.size, 17);
  for (const k of expected) {
    assert.ok(KIND_REGISTRY.has(k as any), `KIND_REGISTRY missing: ${k}`);
  }
});

// ---------------------------------------------------------------------------
// buildArtifactFilename — AC-3 happy path
// ---------------------------------------------------------------------------

test("AC-3: buildArtifactFilename returns canonical filename", () => {
  const out = buildArtifactFilename({
    ts: "20260611T123843Z",
    kind: "costReportSlice",
    featureId: "FEAT-187",
    sliceId: "SLICE-96",
    ext: "md"
  });
  assert.equal(out, "20260611T123843Z-costReportSlice-feat187-slice96.md");
});

test("buildArtifactFilename omits title when not provided", () => {
  const out = buildArtifactFilename({
    ts: "20260611T000000Z",
    kind: "grade",
    featureId: "FEAT-001",
    sliceId: "SLICE-01",
    ext: "md"
  });
  assert.equal(out, "20260611T000000Z-grade-feat001-slice01.md");
});

test("buildArtifactFilename includes camelTight title when provided", () => {
  const out = buildArtifactFilename({
    ts: "20260611T000000Z",
    kind: "agentReport",
    featureId: "FEAT-166",
    sliceId: "SLICE-91",
    title: "expose-checkpoint-due",
    ext: "md"
  });
  assert.equal(out, "20260611T000000Z-agentReport-feat166-slice91-exposeCheckpointDue.md");
});

test("buildArtifactFilename omits title segment when title overflows 24 chars", () => {
  const longTitle = "this-is-an-extremely-long-title-that-will-overflow";
  const out = buildArtifactFilename({
    ts: "20260611T000000Z",
    kind: "handoff",
    featureId: "FEAT-010",
    sliceId: "SLICE-10",
    title: longTitle,
    ext: "md"
  });
  // title should be omitted — basename splits into exactly 4 tokens
  const tokens = path.basename(out, ".md").split("-");
  assert.equal(tokens.length, 4);
});

// ---------------------------------------------------------------------------
// AC-4: kebab-case kind throws containing "camelCase"
// ---------------------------------------------------------------------------

test("AC-4: buildArtifactFilename throws camelCase error for kebab kind", () => {
  assert.throws(
    () =>
      buildArtifactFilename({
        ts: "20260611T123843Z",
        kind: "cost-report-slice",
        featureId: "FEAT-187",
        sliceId: "SLICE-96",
        ext: "md"
      }),
    (err: Error) => err.message.includes("camelCase"),
    "error message must contain 'camelCase'"
  );
});

// ---------------------------------------------------------------------------
// AC-5: unregistered camelCase kind throws containing "KIND_REGISTRY"
// ---------------------------------------------------------------------------

test("AC-5: buildArtifactFilename throws KIND_REGISTRY error for unknown kind", () => {
  assert.throws(
    () =>
      buildArtifactFilename({
        ts: "20260611T123843Z",
        kind: "unregisteredKind",
        featureId: "FEAT-187",
        sliceId: "SLICE-96",
        ext: "md"
      }),
    (err: Error) => err.message.includes("KIND_REGISTRY"),
    "error message must contain 'KIND_REGISTRY'"
  );
});

// ---------------------------------------------------------------------------
// AC-6: path.basename(...).split('-') yields exactly 4 tokens for canonical
// shape (ts, kind, featId, sliceId) — no junk segments. Tested for >= 3 kinds.
// ---------------------------------------------------------------------------

test("AC-6a: split('-') yields 4 tokens for costReportSlice", () => {
  const filename = buildArtifactFilename({
    ts: "20260611T123843Z",
    kind: "costReportSlice",
    featureId: "FEAT-187",
    sliceId: "SLICE-96",
    ext: "md"
  });
  const tokens = path.basename(filename, ".md").split("-");
  assert.equal(tokens.length, 4, `Expected 4 tokens, got ${tokens.length}: ${tokens.join("|")}`);
});

test("AC-6b: split('-') yields 4 tokens for agentReport", () => {
  const filename = buildArtifactFilename({
    ts: "20260611T090146Z",
    kind: "agentReport",
    featureId: "FEAT-166",
    sliceId: "SLICE-91",
    ext: "md"
  });
  const tokens = path.basename(filename, ".md").split("-");
  assert.equal(tokens.length, 4, `Expected 4 tokens, got ${tokens.length}: ${tokens.join("|")}`);
});

test("AC-6c: split('-') yields 4 tokens for reviewResult", () => {
  const filename = buildArtifactFilename({
    ts: "20260611T115758Z",
    kind: "reviewResult",
    featureId: "FEAT-185",
    sliceId: "SLICE-93",
    ext: "md"
  });
  const tokens = path.basename(filename, ".md").split("-");
  assert.equal(tokens.length, 4, `Expected 4 tokens, got ${tokens.length}: ${tokens.join("|")}`);
});
