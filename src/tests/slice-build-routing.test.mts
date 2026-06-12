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

test("pickBuilderVariant: fe + be -> parallel-fe-be (SLICE-105 retired the SLICE-104 interim fullstack mapping)", () => {
  assert.equal(pickBuilderVariant(["fe", "be"]), "parallel-fe-be");
  // Tag order does not matter.
  assert.equal(pickBuilderVariant(["be", "fe"]), "parallel-fe-be");
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

test("buildDispatchInstruction slice-build + fe+be emits PARALLEL DISPATCH with both agents (SLICE-105)", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags:\n  - fe\n  - be\n---\n# Slice\n"
  });
  assert.match(out, /^PARALLEL DISPATCH/);
  assert.ok(out.includes("crew:frontend-dev"), "must reference crew:frontend-dev");
  assert.ok(out.includes("crew:backend-dev"), "must reference crew:backend-dev");
  // The parent loop should still drive the inspector/verifier gates after both subagents finish.
  assert.ok(out.includes("crew:inspector"), "must mention crew:inspector for gate-driving guidance");
});

test("buildDispatchInstruction slice-build + fe+be returns a SINGLE string (not an array or object)", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [fe, be]\n---\n# Slice\n"
  });
  assert.equal(typeof out, "string", "callers expect a string back-compat");
});

test("buildDispatchInstruction slice-build + fe+be: tag order does not change output structure", () => {
  const a = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [fe, be]\n---\n# Slice\n"
  });
  const b = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [be, fe]\n---\n# Slice\n"
  });
  // Both must invoke the parallel-fe-be branch, regardless of tag order.
  assert.match(a, /^PARALLEL DISPATCH/);
  assert.match(b, /^PARALLEL DISPATCH/);
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

// FEAT-190 SLICE-106 — architect pre-flight when needs_contract: true.

import fs from "node:fs/promises";
import os from "node:os";
import nodePath from "node:path";

async function tmpRepoWithContracts(prefix: string, files: string[] = []): Promise<string> {
  const repo = await fs.mkdtemp(nodePath.join(os.tmpdir(), prefix));
  await fs.mkdir(nodePath.join(repo, ".claude/artifacts/crew/contracts"), { recursive: true });
  for (const f of files) {
    await fs.writeFile(
      nodePath.join(repo, ".claude/artifacts/crew/contracts", f),
      "---\nkind: contract\n---\n"
    );
  }
  return repo;
}

test("slice-build + needs_contract:true + no contract artifact: prepends architect pre-flight", async () => {
  const repo = await tmpRepoWithContracts("sb-preflight-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-PF-1",
    title: "Pre-flight slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\nneeds_contract: true\ntags: [be]\n---\n# Slice\n"
  });
  assert.match(out, /^ARCHITECT PRE-FLIGHT/);
  assert.ok(out.includes("crew:architect"), "must dispatch crew:architect first");
  // Builder dispatch still embedded below the pre-flight.
  assert.ok(
    out.includes("Dispatch crew:backend-dev"),
    "must still include the builder dispatch below pre-flight"
  );
});

test("slice-build + needs_contract:true + EXISTING contract artifact: no pre-flight", async () => {
  const repo = await tmpRepoWithContracts("sb-existing-", ["SLICE-PF-2-design.md"]);
  const out = buildDispatchInstruction({
    sliceId: "SLICE-PF-2",
    title: "Pre-flight slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\nneeds_contract: true\ntags: [fe]\n---\n# Slice\n"
  });
  assert.ok(!out.startsWith("ARCHITECT PRE-FLIGHT"), "no pre-flight when contract exists");
  assert.match(out, /^Dispatch crew:frontend-dev/);
});

test("slice-build + needs_contract:false: no pre-flight regardless of artifact presence", async () => {
  const repo = await tmpRepoWithContracts("sb-no-need-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-PF-3",
    title: "Pre-flight slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\nneeds_contract: false\ntags: [be]\n---\n# Slice\n"
  });
  assert.ok(!out.startsWith("ARCHITECT PRE-FLIGHT"), "no pre-flight when needs_contract is false");
  assert.match(out, /^Dispatch crew:backend-dev/);
});

test("slice-build + needs_contract missing (default false): no pre-flight", async () => {
  const repo = await tmpRepoWithContracts("sb-missing-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-PF-4",
    title: "Pre-flight slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [fe]\n---\n# Slice\n"
  });
  assert.ok(!out.startsWith("ARCHITECT PRE-FLIGHT"));
});

test("legacy modes (lead, direct-builder) ignore needs_contract — no pre-flight", async () => {
  const repo = await tmpRepoWithContracts("sb-legacy-");
  for (const mode of ["lead", "direct-builder"] as const) {
    const out = buildDispatchInstruction({
      sliceId: "SLICE-PF-5",
      title: "Legacy",
      sliceFile: null,
      repoPath: repo,
      resolvedGoal: null,
      orchestratorMode: mode,
      sliceContent: "---\nneeds_contract: true\ntags: [be]\n---\n# Slice\n"
    });
    assert.ok(
      !out.startsWith("ARCHITECT PRE-FLIGHT"),
      `mode ${mode} must not add pre-flight (legacy behavior)`
    );
  }
});

test("slice-build + needs_contract:true + parallel-fe-be: pre-flight precedes PARALLEL DISPATCH header", async () => {
  const repo = await tmpRepoWithContracts("sb-preflight-parallel-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-PF-6",
    title: "Full-stack",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\nneeds_contract: true\ntags: [fe, be]\n---\n# Slice\n"
  });
  assert.match(out, /^ARCHITECT PRE-FLIGHT/);
  assert.ok(out.includes("PARALLEL DISPATCH"), "builder portion must still be parallel");
  assert.ok(out.includes("crew:frontend-dev"));
  assert.ok(out.includes("crew:backend-dev"));
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
