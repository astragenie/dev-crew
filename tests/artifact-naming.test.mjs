import test from "node:test";
import assert from "node:assert/strict";

import { buildArtifactSlug, buildArtifactTitle } from "../scripts/lib/artifact-naming.mjs";

test("buildArtifactSlug emits phase → feat → slice when all three set", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: "3", sliceId: "SLICE-36" });
  assert.equal(out, "phase-3-feat-021-slice-36");
});

test("buildArtifactSlug drops phase segment when phase is null", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: null, sliceId: "SLICE-36" });
  assert.equal(out, "feat-021-slice-36");
});

test("buildArtifactSlug drops feature segment when featureId is null", () => {
  const out = buildArtifactSlug({ featureId: null, phase: "3", sliceId: "SLICE-36" });
  assert.equal(out, "phase-3-slice-36");
});

test("buildArtifactSlug returns bare slice-NN when only sliceId given", () => {
  const out = buildArtifactSlug({ sliceId: "SLICE-36" });
  assert.equal(out, "slice-36");
});

test("buildArtifactSlug lowercases identifiers", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-007", sliceId: "SLICE-A2" });
  assert.equal(out, "feat-007-slice-a2");
});

test("buildArtifactSlug sanitizes unsafe punctuation in phase", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: "3 alpha", sliceId: "SLICE-36" });
  assert.equal(out, "phase-3-alpha-feat-021-slice-36");
});

test("buildArtifactSlug throws without sliceId", () => {
  assert.throws(() => buildArtifactSlug({ featureId: "FEAT-021" }), /sliceId/);
});

test("buildArtifactSlug treats empty string phase as null", () => {
  const out = buildArtifactSlug({ featureId: "FEAT-021", phase: "", sliceId: "SLICE-36" });
  assert.equal(out, "feat-021-slice-36");
});

test("buildArtifactTitle keeps original casing and emits PHASE → FEAT → SLICE", () => {
  const out = buildArtifactTitle({
    featureId: "FEAT-021",
    phase: "3",
    sliceId: "SLICE-36",
    summary: "Health page repurpose"
  });
  assert.equal(out, "PHASE-3 FEAT-021 SLICE-36: Health page repurpose");
});

test("buildArtifactTitle omits summary suffix when none given", () => {
  const out = buildArtifactTitle({ featureId: "FEAT-021", sliceId: "SLICE-36" });
  assert.equal(out, "FEAT-021 SLICE-36");
});

test("buildArtifactTitle omits FEAT and PHASE tags when both null", () => {
  const out = buildArtifactTitle({ sliceId: "SLICE-36", summary: "Bare slice" });
  assert.equal(out, "SLICE-36: Bare slice");
});

test("buildArtifactTitle omits PHASE tag when phase null", () => {
  const out = buildArtifactTitle({
    featureId: "FEAT-021",
    phase: null,
    sliceId: "SLICE-36",
    summary: "No phase"
  });
  assert.equal(out, "FEAT-021 SLICE-36: No phase");
});

test("buildArtifactTitle throws without sliceId", () => {
  assert.throws(() => buildArtifactTitle({ featureId: "FEAT-021" }), /sliceId/);
});
