// FEAT-190 / SLICE-104 — slice-build orchestrator mode, single-variant routing.
// Pins config acceptance + tag-to-variant mapping + end-to-end dispatch shape.

import { test } from "bun:test";
import { strict as assert } from "node:assert";

import { buildDispatchInstruction, pickBuilderVariant } from "../scripts/lib/slice-linker.mjs";

// Internal resolver isn't exported. Re-implement the contract here by
// mirroring resolveOrchestratorModeConfig (FEAT-191: only "slice-build" and
// "orchestrate-slice" are valid; legacy "lead" + "direct-builder" silently
// fall back to "slice-build"). Production wiring is exercised through
// buildDispatchInstruction in the integration tests below.
function resolveOrchestratorModeConfig(config: Record<string, any>): string {
  const explicit = config?.loop?.orchestratorMode;
  if (explicit === "slice-build" || explicit === "orchestrate-slice") {
    return explicit;
  }
  return "slice-build";
}

test("resolveOrchestratorModeConfig accepts slice-build + orchestrate-slice", () => {
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "slice-build" } }),
    "slice-build"
  );
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "orchestrate-slice" } }),
    "orchestrate-slice"
  );
});

test("resolveOrchestratorModeConfig: stale legacy values fall back to slice-build (FEAT-191)", () => {
  // Operators with `orchestratorMode: "lead"` or `"direct-builder"` in their
  // .claude/loop.json get auto-fallback to slice-build (no hard error).
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "lead" } }),
    "slice-build"
  );
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "direct-builder" } }),
    "slice-build"
  );
});

test("resolveOrchestratorModeConfig: default + garbage fall back to slice-build", () => {
  assert.equal(resolveOrchestratorModeConfig({}), "slice-build");
  assert.equal(
    resolveOrchestratorModeConfig({ loop: { orchestratorMode: "garbage" } }),
    "slice-build"
  );
});

// FU #4: the deprecated bare fe/be fallback has been removed entirely (its
// producer was gone since v0.53). Bare "fe"/"be" tags now carry no signal on
// their own and resolve via surface:*/stack:*/classifySlice-vocab only, i.e.
// to "unknown" when that's all that's present.
test("pickBuilderVariant: bare fe-only (no canonical signal) -> unknown (fe/be fallback removed, FU #4)", () => {
  assert.equal(pickBuilderVariant(["fe"]), "unknown");
});

test("pickBuilderVariant: bare be-only (no canonical signal) -> unknown (fe/be fallback removed, FU #4)", () => {
  assert.equal(pickBuilderVariant(["be"]), "unknown");
});

test("pickBuilderVariant: bare fe + be (no canonical signal) -> unknown (fe/be fallback removed, FU #4)", () => {
  assert.equal(pickBuilderVariant(["fe", "be"]), "unknown");
  // Tag order does not matter.
  assert.equal(pickBuilderVariant(["be", "fe"]), "unknown");
});

// WS-3: missing/malformed tag data now resolves to the distinct "unknown"
// variant, not "fullstack" — a fullstack-gated dispatch must not fire on
// every untagged slice by default. variantToAgent still routes "unknown" to
// crew:fullstack-dev as a safe superset (see buildDispatchInstruction tests
// below), but the variant VALUE is no longer indistinguishable from a
// confirmed fullstack signal.
test("pickBuilderVariant: empty array -> unknown", () => {
  assert.equal(pickBuilderVariant([]), "unknown");
});

test("pickBuilderVariant: undefined -> unknown", () => {
  assert.equal(pickBuilderVariant(undefined), "unknown");
});

test("pickBuilderVariant: non-array (malformed) -> unknown", () => {
  assert.equal(pickBuilderVariant("garbage"), "unknown");
  assert.equal(pickBuilderVariant(null), "unknown");
  assert.equal(pickBuilderVariant({ fe: true }), "unknown");
});

test("pickBuilderVariant: ignores non-string members in the tag array", () => {
  assert.equal(pickBuilderVariant(["surface:ui", 42, null]), "frontend");
});

// P1.0 feature-flag envelope: features.parallel-fe-be-variant gates the
// fe+be parallel route. Default (no config / no override) preserves the
// SLICE-105 behavior; disabling it falls back to the single-agent fullstack
// variant instead.

test("pickBuilderVariant: surface:ui+surface:api with no loopConfig defaults to parallel-fe-be (zero behavior change)", () => {
  assert.equal(pickBuilderVariant(["surface:ui", "surface:api"], null), "parallel-fe-be");
});

test("pickBuilderVariant: surface:ui+surface:api with parallel-fe-be-variant explicitly enabled stays parallel-fe-be", () => {
  const config = { features: { "parallel-fe-be-variant": { enabled: true } } };
  assert.equal(pickBuilderVariant(["surface:ui", "surface:api"], config), "parallel-fe-be");
});

test("pickBuilderVariant: surface:ui+surface:api with parallel-fe-be-variant disabled falls back to fullstack", () => {
  const config = { features: { "parallel-fe-be-variant": { enabled: false } } };
  assert.equal(pickBuilderVariant(["surface:ui", "surface:api"], config), "fullstack");
});

test("pickBuilderVariant: disabling parallel-fe-be-variant does not affect frontend-only or backend-only routing", () => {
  const config = { features: { "parallel-fe-be-variant": { enabled: false } } };
  assert.equal(pickBuilderVariant(["surface:ui"], config), "frontend");
  assert.equal(pickBuilderVariant(["surface:api"], config), "backend");
});

// WS-3: canonical surface:*/stack:* vocabulary (feat-tag-schema.md) is now
// the primary signal pickBuilderVariant reads.

test("pickBuilderVariant: surface:ui alone -> frontend", () => {
  assert.equal(pickBuilderVariant(["surface:ui"]), "frontend");
});

test("pickBuilderVariant: surface:api alone -> backend", () => {
  assert.equal(pickBuilderVariant(["surface:api"]), "backend");
});

test("pickBuilderVariant: surface:api + surface:ui -> parallel-fe-be", () => {
  assert.equal(pickBuilderVariant(["surface:api", "surface:ui"]), "parallel-fe-be");
});

test("pickBuilderVariant: surface:api + surface:ui with parallel-fe-be-variant disabled -> fullstack", () => {
  const config = { features: { "parallel-fe-be-variant": { enabled: false } } };
  assert.equal(pickBuilderVariant(["surface:api", "surface:ui"], config), "fullstack");
});

test("pickBuilderVariant: stack:react alone -> frontend", () => {
  assert.equal(pickBuilderVariant(["stack:react"]), "frontend");
});

test("pickBuilderVariant: backend stack tag alone -> backend", () => {
  assert.equal(pickBuilderVariant(["stack:csharp"]), "backend");
  assert.equal(pickBuilderVariant(["stack:node"]), "backend");
  assert.equal(pickBuilderVariant(["stack:python"]), "backend");
});

test("pickBuilderVariant: backend stack + stack:react -> parallel-fe-be", () => {
  assert.equal(pickBuilderVariant(["stack:csharp", "stack:react"]), "parallel-fe-be");
});

test("pickBuilderVariant: surface:api + stack:react (mixed schema forms) -> parallel-fe-be", () => {
  assert.equal(pickBuilderVariant(["surface:api", "stack:react"]), "parallel-fe-be");
});

test("pickBuilderVariant: unrelated stack tag (e.g. stack:typescript, not a recognized backend/frontend signal) alone -> unknown", () => {
  assert.equal(pickBuilderVariant(["stack:typescript"]), "unknown");
});

// FU #2: dispatch.frontendStackTags / dispatch.backendStackTags in loop.json
// let a repo opt an otherwise-ambiguous stack tag (e.g. "stack:typescript",
// used on both sides) into one surface. Default (no config, or config
// missing the `dispatch` block) must be byte-for-byte unchanged from the
// built-in-only behavior above.

test("pickBuilderVariant: stack:typescript stays unknown with a loopConfig that has no dispatch block", () => {
  assert.equal(pickBuilderVariant(["stack:typescript"], { features: {} }), "unknown");
});

test("pickBuilderVariant: repo config opts stack:typescript into frontend via dispatch.frontendStackTags", () => {
  const config = { dispatch: { frontendStackTags: ["stack:typescript"] } };
  assert.equal(pickBuilderVariant(["stack:typescript"], config), "frontend");
});

test("pickBuilderVariant: repo config opts stack:typescript into backend via dispatch.backendStackTags", () => {
  const config = { dispatch: { backendStackTags: ["stack:typescript"] } };
  assert.equal(pickBuilderVariant(["stack:typescript"], config), "backend");
});

test("pickBuilderVariant: configured frontendStackTags + backendStackTags on the same tag -> parallel-fe-be", () => {
  const config = {
    dispatch: {
      frontendStackTags: ["stack:typescript"],
      backendStackTags: ["stack:typescript"]
    }
  };
  assert.equal(pickBuilderVariant(["stack:typescript"], config), "parallel-fe-be");
});

test("pickBuilderVariant: configured stack tags are additive, not a replacement of the built-ins", () => {
  // Configuring an extra frontend stack tag must not disturb the built-in
  // stack:react / backend-stack signals.
  const config = { dispatch: { frontendStackTags: ["stack:svelte"] } };
  assert.equal(pickBuilderVariant(["stack:react"], config), "frontend");
  assert.equal(pickBuilderVariant(["stack:svelte"], config), "frontend");
  assert.equal(pickBuilderVariant(["stack:csharp"], config), "backend");
});

test("pickBuilderVariant: malformed dispatch.frontendStackTags/backendStackTags config is ignored, not thrown", () => {
  assert.equal(pickBuilderVariant(["stack:typescript"], { dispatch: {} }), "unknown");
  assert.equal(
    pickBuilderVariant(["stack:typescript"], { dispatch: { frontendStackTags: "not-an-array" } }),
    "unknown"
  );
  assert.equal(
    pickBuilderVariant(["stack:typescript"], { dispatch: { frontendStackTags: [42, null] } }),
    "unknown"
  );
});

// WS-3: classifySlice() (feature-lifecycle.mts) emits a third vocabulary —
// api-change/storage/workflow/ux/auth/infra/test/docs/refactor. The subset
// with an unambiguous FE/BE surface signal must still resolve.

test("pickBuilderVariant: classifySlice 'ux' tag alone -> frontend", () => {
  assert.equal(pickBuilderVariant(["ux"]), "frontend");
});

test("pickBuilderVariant: classifySlice 'api-change' tag alone -> backend", () => {
  assert.equal(pickBuilderVariant(["api-change"]), "backend");
});

test("pickBuilderVariant: classifySlice 'storage' tag alone -> backend", () => {
  assert.equal(pickBuilderVariant(["storage"]), "backend");
});

test("pickBuilderVariant: classifySlice 'ux' + 'storage' -> parallel-fe-be", () => {
  assert.equal(pickBuilderVariant(["ux", "storage"]), "parallel-fe-be");
});

test("pickBuilderVariant: classifySlice tags with no FE/BE signal (workflow/auth/infra/test/docs/refactor) -> unknown", () => {
  assert.equal(pickBuilderVariant(["workflow"]), "unknown");
  assert.equal(pickBuilderVariant(["auth"]), "unknown");
  assert.equal(pickBuilderVariant(["infra"]), "unknown");
  assert.equal(pickBuilderVariant(["test"]), "unknown");
  assert.equal(pickBuilderVariant(["docs"]), "unknown");
  assert.equal(pickBuilderVariant(["refactor"]), "unknown");
});

test("pickBuilderVariant: surface:* signal takes priority alongside an unrelated classifySlice tag", () => {
  assert.equal(pickBuilderVariant(["surface:ui", "refactor"]), "frontend");
});

// FU #4: bare fe/be carry no signal at all now (fallback removed entirely).
// A bare fe/be tag riding alongside a real surface:* signal must not change
// the outcome — it's simply inert.

test("pickBuilderVariant: bare fe/be tags are inert alongside a canonical surface:* signal", () => {
  assert.equal(pickBuilderVariant(["be", "surface:ui"]), "frontend");
  assert.equal(pickBuilderVariant(["fe", "surface:api"]), "backend");
});

test("buildDispatchInstruction slice-build + fe-only emits crew:frontend-dev", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-104",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [surface:ui]\n---\n# Slice\n"
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
    sliceContent: "---\ntags: [surface:api]\n---\n# Slice\n"
  });
  assert.match(out, /^Dispatch crew:backend-dev subagent/);
});

test("buildDispatchInstruction slice-build + fe+be + parallel-fe-be-variant disabled emits crew:fullstack-dev (P1.0)", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [surface:ui, surface:api]\n---\n# Slice\n",
    loopConfig: { features: { "parallel-fe-be-variant": { enabled: false } } }
  });
  assert.match(out, /^Dispatch crew:fullstack-dev subagent/);
  assert.ok(!out.includes("PARALLEL DISPATCH"));
});

test("buildDispatchInstruction slice-build + fe+be emits PARALLEL DISPATCH with both agents (SLICE-105)", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    // Quoted block-list items: the hand-rolled frontmatter parser's
    // consumeBlockArrayItem otherwise misreads an unquoted colon-bearing
    // item (e.g. `- surface:ui`) as a `{surface: "ui"}` mapping entry rather
    // than the plain string "surface:ui" — a pre-existing parser quirk, out
    // of scope for this dispatch fix; quoting sidesteps it.
    sliceContent: '---\ntags:\n  - "surface:ui"\n  - "surface:api"\n---\n# Slice\n'
  });
  assert.match(out, /^PARALLEL DISPATCH/);
  assert.ok(out.includes("crew:frontend-dev"), "must reference crew:frontend-dev");
  assert.ok(out.includes("crew:backend-dev"), "must reference crew:backend-dev");
  // The parent loop should still drive the inspector/verifier gates after both subagents finish.
  assert.ok(out.includes("crew:reviewer"), "must mention crew:reviewer for gate-driving guidance");
});

test("buildDispatchInstruction slice-build + fe+be returns a SINGLE string (not an array or object)", () => {
  const out = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [surface:ui, surface:api]\n---\n# Slice\n"
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
    sliceContent: "---\ntags: [surface:ui, surface:api]\n---\n# Slice\n"
  });
  const b = buildDispatchInstruction({
    sliceId: "SLICE-105",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [surface:api, surface:ui]\n---\n# Slice\n"
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
    sliceContent: "---\nneeds_contract: true\ntags: [surface:api]\n---\n# Slice\n"
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
    sliceContent: "---\nneeds_contract: true\ntags: [surface:ui]\n---\n# Slice\n"
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
    sliceContent: "---\nneeds_contract: false\ntags: [surface:api]\n---\n# Slice\n"
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
    sliceContent: "---\ntags: [surface:ui]\n---\n# Slice\n"
  });
  assert.ok(!out.startsWith("ARCHITECT PRE-FLIGHT"));
});

test("orchestrate-slice mode ignores needs_contract — no pre-flight (in-thread slash flow)", async () => {
  const repo = await tmpRepoWithContracts("sb-os-noflight-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-PF-5",
    title: "Orchestrate-slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "orchestrate-slice",
    sliceContent: "---\nneeds_contract: true\ntags: [surface:api]\n---\n# Slice\n"
  });
  assert.ok(
    !out.startsWith("ARCHITECT PRE-FLIGHT"),
    "orchestrate-slice mode must not add pre-flight — that's slice-build's path"
  );
  assert.match(out, /\/crew:orchestrate-slice/);
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
    sliceContent: "---\nneeds_contract: true\ntags: [surface:ui, surface:api]\n---\n# Slice\n"
  });
  assert.match(out, /^ARCHITECT PRE-FLIGHT/);
  assert.ok(out.includes("PARALLEL DISPATCH"), "builder portion must still be parallel");
  assert.ok(out.includes("crew:frontend-dev"));
  assert.ok(out.includes("crew:backend-dev"));
});

test("slice-build (no sliceContent at all) emits crew:fullstack-dev (the no-tag fallback)", () => {
  // No sliceContent → extractTags returns undefined → pickBuilderVariant
  // returns "fullstack" → crew:fullstack-dev. This preserves the behavior
  // operators had with the pre-FEAT-191 direct-builder mode.
  const out = buildDispatchInstruction({
    sliceId: "SLICE-104",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null,
    orchestratorMode: "slice-build"
  });
  assert.match(out, /^Dispatch crew:fullstack-dev subagent/);
});
