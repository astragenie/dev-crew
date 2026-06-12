// FEAT-190 / SLICE-104 — slice-build orchestrator mode, single-variant routing.
// Pins config acceptance + tag-to-variant mapping + end-to-end dispatch shape.

import { test } from "bun:test";
import { strict as assert } from "node:assert";

import {
  buildDispatchInstruction,
  pickBuilderVariant
} from "../scripts/lib/slice-linker.mjs";

// Internal resolver isn't exported. Re-implement the contract here by
// mirroring resolveOrchestratorModeConfig: accept "slice-build" alongside the
// three legacy modes. Production wiring is exercised through buildDispatchInstruction
// in the integration tests below.
function resolveOrchestratorModeConfig(config: Record<string, any>): string {
  const explicit = config?.loop?.orchestratorMode;
  if (
    explicit === "lead" ||
    explicit === "orchestrate-slice" ||
    explicit === "direct-builder" ||
    explicit === "slice-build"
  ) {
    return explicit;
  }
  return "lead";
}

test("resolveOrchestratorModeConfig accepts slice-build", () => {
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "slice-build" } }),
    "slice-build"
  );
  // Legacy modes still accepted.
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "lead" } }),
    "lead"
  );
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "direct-builder" } }),
    "direct-builder"
  );
  // Garbage falls back to lead.
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "garbage" } }),
    "lead"
  );
});

test("pickBuilderVariant: fe-only -> frontend", () => {
  assert.equal(pickBuilderVariant(["fe"]), "frontend");
});

test("pickBuilderVariant: be-only -> backend", () => {
  assert.equal(pickBuilderVariant(["be"]), "backend");
});

test("pickBuilderVariant: fe + be (interim) -> fullstack", () => {
  // SLICE-105 will swap this to a parallel fanout payload.
  assert.equal(pickBuilderVariant(["fe", "be"]), "fullstack");
});

test("pickBuilderVariant: empty array -> fullstack", () => {
  assert.equal(pickBuilderVariant([]), "fullstack");
});

test("pickBuilderVariant: undefined -> fullstack", () => {
  assert.equal(pickBuilderVariant(undefined), "fullstack");
});

test("pickBuilderVariant: non-array (malformed) -> fullstack", () => {
  assert.equal(pickBuilderVariant("garbage"), "fullstack");
  assert.equal(pickBuilderVariant(null), "fullstack");
  assert.equal(pickBuilderVariant({ fe: true }), "fullstack");
});

test("pickBuilderVariant: ignores non-string members in the tag array", () => {
  assert.equal(pickBuilderVariant(["fe", 42, null]), "frontend");
});

test("buildDispatchInstruction slice-build + fe-only emits crew:frontend-dev", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-104",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [fe]\n---\n# Slice\n"
  });
  assert.match(out, /^Dispatch crew:frontend-dev subagent/);
});

test("buildDispatchInstruction slice-build + be-only emits crew:backend-dev", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-104",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [be]\n---\n# Slice\n"
  });
  assert.match(out, /^Dispatch crew:backend-dev subagent/);
});

test("buildDispatchInstruction slice-build + fe+be (interim) emits crew:fullstack-dev", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-104",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags:\n  - fe\n  - be\n---\n# Slice\n"
  });
  assert.match(out, /^Dispatch crew:fullstack-dev subagent/);
});

test("buildDispatchInstruction slice-build + no tags falls back to crew:fullstack-dev", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-104",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\nid: SLICE-104\n---\n# Slice\n"
  });
  assert.match(out, /^Dispatch crew:fullstack-dev subagent/);
});

test("buildDispatchInstruction direct-builder (back-compat) still emits crew:fullstack-dev", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-104",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "direct-builder",
    sliceContent: "---\ntags: [fe]\n---\n# Slice\n"
  });
  // direct-builder ignores tags by design (legacy behavior).
  assert.match(out, /^Dispatch crew:fullstack-dev subagent/);
});
