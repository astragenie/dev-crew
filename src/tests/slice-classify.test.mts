// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import type { DispatchResult } from "../scripts/lib/auto-dispatch.mjs";
import { parseClassifyOutput } from "../scripts/lib/classify-parser.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker/feature-lifecycle.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createFeature(
  repoRoot: string,
  id: string,
  state: string = "triaged",
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repoRoot, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const fmPairs = Object.entries({ id, status: state, priority: "P2", ...extraFm })
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
      return `${k}: ${v}`;
    })
    .join("\n");
  const content = `---\n${fmPairs}\n---\n# ${id}: Test feature\n\nTest feature description.\n`;
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

// Ensure slices root exists
async function ensureSlicesRoot(repoRoot: string): Promise<void> {
  const dir = path.join(repoRoot, ".claude/artifacts/loop/slices/pending");
  await fs.mkdir(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// parseClassifyOutput unit tests
// ---------------------------------------------------------------------------

test("parseClassifyOutput: compact block parses all three fields", () => {
  const raw = ["tags: [api-change, storage]", "needs_contract: true", "needs_ux: false"].join("\n");
  const result = parseClassifyOutput(raw);
  assert.deepEqual(result.tags, ["api-change", "storage"]);
  assert.equal(result.needs_contract, true);
  assert.equal(result.needs_ux, false);
});

test("parseClassifyOutput: unknown tags are filtered out", () => {
  const raw = "tags: [api-change, unknown-label, refactor]\nneeds_contract: false\nneeds_ux: false";
  const result = parseClassifyOutput(raw);
  assert.deepEqual(result.tags, ["api-change", "refactor"]);
});

test("parseClassifyOutput: missing needs_contract returns null", () => {
  const raw = "tags: [workflow]\nneeds_ux: true";
  const result = parseClassifyOutput(raw);
  assert.equal(result.needs_contract, null);
  assert.equal(result.needs_ux, true);
});

test("parseClassifyOutput: missing needs_ux returns null", () => {
  const raw = "tags: [docs]\nneeds_contract: false";
  const result = parseClassifyOutput(raw);
  assert.equal(result.needs_ux, null);
  assert.equal(result.needs_contract, false);
});

test("parseClassifyOutput: empty string returns defaults", () => {
  const result = parseClassifyOutput("");
  assert.deepEqual(result.tags, []);
  assert.equal(result.needs_contract, null);
  assert.equal(result.needs_ux, null);
});

test("parseClassifyOutput: null/undefined input returns defaults", () => {
  const r1 = parseClassifyOutput(null as any);
  assert.deepEqual(r1.tags, []);
  const r2 = parseClassifyOutput(undefined as any);
  assert.deepEqual(r2.tags, []);
});

test("parseClassifyOutput: prose surrounding the block is ignored", () => {
  const raw = [
    "Here is my analysis of the slice:",
    "tags: [auth, infra]",
    "needs_contract: true",
    "needs_ux: false",
    "This is an important slice because it touches the auth layer."
  ].join("\n");
  const result = parseClassifyOutput(raw);
  assert.deepEqual(result.tags, ["auth", "infra"]);
  assert.equal(result.needs_contract, true);
  assert.equal(result.needs_ux, false);
});

test("parseClassifyOutput: all valid tags are accepted", () => {
  const allTags = "api-change, storage, workflow, ux, auth, infra, test, docs, refactor";
  const result = parseClassifyOutput(`tags: [${allTags}]`);
  assert.equal(result.tags.length, 9);
});

test("parseClassifyOutput: bare (non-array) tags line is parsed", () => {
  const raw = "tags: api-change, storage\nneeds_contract: false\nneeds_ux: false";
  const result = parseClassifyOutput(raw);
  assert.deepEqual(result.tags, ["api-change", "storage"]);
});

// ---------------------------------------------------------------------------
// surface + stack parsing (FE/BE routing fix — 2026-06-07)
// ---------------------------------------------------------------------------

test("parseClassifyOutput: surface frontend|backend|mixed|none are accepted", () => {
  for (const s of ["frontend", "backend", "mixed", "none"]) {
    const result = parseClassifyOutput(`surface: ${s}`);
    assert.equal(result.surface, s);
  }
});

test("parseClassifyOutput: surface uppercase + quoted are normalized", () => {
  const r1 = parseClassifyOutput("surface: FRONTEND");
  assert.equal(r1.surface, "frontend");
  const r2 = parseClassifyOutput(`surface: "backend"`);
  assert.equal(r2.surface, "backend");
});

test("parseClassifyOutput: surface invalid value returns null", () => {
  const r = parseClassifyOutput("surface: fullstack");
  assert.equal(r.surface, null);
});

test("parseClassifyOutput: surface missing returns null", () => {
  const r = parseClassifyOutput("tags: [docs]");
  assert.equal(r.surface, null);
});

test("parseClassifyOutput: stack accepts known vocabulary + filters unknown", () => {
  const r = parseClassifyOutput("stack: [typescript, fortran, csharp, cobol]");
  assert.deepEqual(r.stack, ["typescript", "csharp"]);
});

test("parseClassifyOutput: stack is lowercased before vocab filter", () => {
  const r = parseClassifyOutput("stack: [TypeScript, GO, Python]");
  assert.deepEqual(r.stack, ["typescript", "go", "python"]);
});

test("parseClassifyOutput: stack bare comma-separated parses", () => {
  const r = parseClassifyOutput("stack: node, java");
  assert.deepEqual(r.stack, ["node", "java"]);
});

test("parseClassifyOutput: stack missing returns empty array", () => {
  const r = parseClassifyOutput("tags: [docs]");
  assert.deepEqual(r.stack, []);
});

test("parseClassifyOutput: full five-field block parses end-to-end", () => {
  const raw = [
    "tags: [api-change, infra]",
    "needs_contract: true",
    "needs_ux: false",
    "surface: backend",
    "stack: [typescript, node]"
  ].join("\n");
  const r = parseClassifyOutput(raw);
  assert.deepEqual(r.tags, ["api-change", "infra"]);
  assert.equal(r.needs_contract, true);
  assert.equal(r.needs_ux, false);
  assert.equal(r.surface, "backend");
  assert.deepEqual(r.stack, ["typescript", "node"]);
});

// ---------------------------------------------------------------------------
// sliceFromFeature with classify dispatch — integration-style tests
// ---------------------------------------------------------------------------

test("sliceFromFeature with mock dispatch: tags/needs_contract/needs_ux written to slice frontmatter", async () => {
  const repo = await tmpRepo("sfc-classify-");
  await createFeature(repo, "FEAT-001", "triaged");
  await ensureSlicesRoot(repo);

  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    return {
      ok: true,
      skipped: false,
      output: "tags: [api-change, storage]\nneeds_contract: true\nneeds_ux: false",
      durationMs: 1
    };
  };

  const out = await sliceFromFeature(repo, "FEAT-001", { dispatchFn: mockDispatch });

  assert.ok(out.classify, "classify result should be present");
  assert.deepEqual(out.classify!.tags, ["api-change", "storage"]);
  assert.equal(out.classify!.needs_contract, true);
  assert.equal(out.classify!.needs_ux, false);

  // Verify slice file was patched
  const sliceContent = await fs.readFile(out.slice.path, "utf8");
  const { frontmatter } = parseFrontmatter(sliceContent);
  assert.deepEqual(frontmatter.tags, ["api-change", "storage"]);
  assert.equal(frontmatter.needs_contract, true);
  assert.equal(frontmatter.needs_ux, false);
});

test("sliceFromFeature with mock dispatch: surface/stack written to slice frontmatter", async () => {
  const repo = await tmpRepo("sfc-surface-stack-");
  await createFeature(repo, "FEAT-001", "triaged");
  await ensureSlicesRoot(repo);

  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    return {
      ok: true,
      skipped: false,
      output: [
        "tags: [ux]",
        "needs_contract: false",
        "needs_ux: true",
        "surface: frontend",
        "stack: [typescript]"
      ].join("\n"),
      durationMs: 1
    };
  };

  const out = await sliceFromFeature(repo, "FEAT-001", { dispatchFn: mockDispatch });

  assert.ok(out.classify, "classify result should be present");
  assert.equal((out.classify as any).surface, "frontend");
  assert.deepEqual((out.classify as any).stack, ["typescript"]);

  const sliceContent = await fs.readFile(out.slice.path, "utf8");
  const { frontmatter } = parseFrontmatter(sliceContent);
  assert.equal(frontmatter.surface, "frontend");
  assert.deepEqual(frontmatter.stack, ["typescript"]);
});

test("sliceFromFeature with --no-classify: dispatch not called", async () => {
  const repo = await tmpRepo("sfc-noclassify-");
  await createFeature(repo, "FEAT-001", "triaged");
  await ensureSlicesRoot(repo);

  let dispatchCalled = false;
  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    dispatchCalled = true;
    return { ok: true, skipped: false, output: "tags: [docs]", durationMs: 1 };
  };

  const out = await sliceFromFeature(repo, "FEAT-001", {
    noClassify: true,
    dispatchFn: mockDispatch
  });

  assert.equal(dispatchCalled, false, "dispatch should not be called when noClassify=true");
  assert.equal(out.classify, null, "classify result should be null when skipped");
});

test("sliceFromFeature when feature already has tags: dispatch not called (AC-3)", async () => {
  const repo = await tmpRepo("sfc-already-tagged-");
  await createFeature(repo, "FEAT-001", "triaged", { tags: "[api-change]" });
  await ensureSlicesRoot(repo);

  let dispatchCalled = false;
  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    dispatchCalled = true;
    return { ok: true, skipped: false, output: "tags: [storage]", durationMs: 1 };
  };

  const out = await sliceFromFeature(repo, "FEAT-001", { dispatchFn: mockDispatch });

  assert.equal(
    dispatchCalled,
    false,
    "dispatch should not be called when feature already has tags"
  );
  assert.equal(out.classify, null);
});

test("sliceFromFeature with dispatch failure: no throw, slice file valid, classify is null", async () => {
  const repo = await tmpRepo("sfc-dispatch-fail-");
  await createFeature(repo, "FEAT-001", "triaged");
  await ensureSlicesRoot(repo);

  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    throw new Error("Simulated dispatch error");
  };

  // Should not throw
  let out: any;
  let thrown = false;
  try {
    out = await sliceFromFeature(repo, "FEAT-001", { dispatchFn: mockDispatch });
  } catch {
    thrown = true;
  }

  assert.equal(thrown, false, "sliceFromFeature should not throw on dispatch failure");
  assert.equal(out.classify, null);

  // Slice file should still exist and be valid
  const sliceContent = await fs.readFile(out.slice.path, "utf8");
  const { frontmatter } = parseFrontmatter(sliceContent);
  assert.equal(frontmatter.status, "pending");
});

test("sliceFromFeature with dispatch returning unparseable output: classify is null, slice file valid", async () => {
  const repo = await tmpRepo("sfc-unparseable-");
  await createFeature(repo, "FEAT-001", "triaged");
  await ensureSlicesRoot(repo);

  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    // marker path — not parseable as key:value
    return {
      ok: true,
      skipped: false,
      output: "<marker-written:.claude/artifacts/loop/pending-dispatch/123-loop-architect.json>",
      durationMs: 1
    };
  };

  const out = await sliceFromFeature(repo, "FEAT-001", { dispatchFn: mockDispatch });

  // classify should be null since no valid tags/fields were parsed
  assert.equal(out.classify, null);

  const sliceContent = await fs.readFile(out.slice.path, "utf8");
  const { frontmatter } = parseFrontmatter(sliceContent);
  assert.equal(frontmatter.status, "pending");
  assert.ok(!frontmatter.tags, "tags should not be written when output was unparseable");
});
