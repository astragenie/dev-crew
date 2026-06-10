import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  writeCrewHandoff,
  writeCrewFinalSynthesis,
  detectCostMode,
  appendSourceProjectArgs
} from "../scripts/lib/slice-linker/crew-bridge.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices"
      },
      stack: {}
    })
  );
  return repo;
}

// Minimal fake slice path helper
async function makeSliceFile(repo: string, sliceId: string) {
  const slicesDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/completed");
  await fs.mkdir(slicesDir, { recursive: true });
  const slicePath = path.join(slicesDir, `${sliceId}.md`);
  await fs.writeFile(slicePath, `---\nid: ${sliceId}\nstatus: completed\n---\n# ${sliceId}\n`);
  return slicePath;
}

// --- writeCrewHandoff tests ---

test("writeCrewHandoff body includes identification line with phase, feature, slice", async () => {
  const repo = await tmpRepo("al-cb-handoff-id-");
  const slicePath = await makeSliceFile(repo, "SLICE-01");
  const result = await writeCrewHandoff(repo, {
    sliceId: "SLICE-01",
    slicePath,
    featureId: "FEAT-007",
    phase: "2",
    featureResult: null,
    specChanges: [],
    config: null
  });
  const content = await fs.readFile(result.handoffPath, "utf8");
  const { body } = parseFrontmatter(content);
  assert.match(body, /\*\*Phase:\*\* 2/);
  assert.match(body, /\*\*Feature:\*\* FEAT-007/);
  assert.match(body, /\*\*Slice:\*\* SLICE-01/);
  // Phase must precede Feature in the identification line
  const idLineMatch = body.match(/\*\*Phase:\*\*.*\*\*Feature:\*\*.*\*\*Slice:\*\*/);
  assert.ok(idLineMatch, "identification line must contain Phase · Feature · Slice in order");
});

test("writeCrewHandoff body omits blank identification segments when phase is null", async () => {
  const repo = await tmpRepo("al-cb-handoff-null-");
  const slicePath = await makeSliceFile(repo, "SLICE-02");
  const result = await writeCrewHandoff(repo, {
    sliceId: "SLICE-02",
    slicePath,
    featureId: null,
    phase: null,
    featureResult: null,
    specChanges: [],
    config: null
  });
  const content = await fs.readFile(result.handoffPath, "utf8");
  const { body } = parseFrontmatter(content);
  // No blank Phase/Feature lines
  assert.doesNotMatch(body, /\*\*Phase:\*\*\s*$/m);
  assert.doesNotMatch(body, /\*\*Feature:\*\*\s*$/m);
});

// --- writeCrewFinalSynthesis tests ---

test("writeCrewFinalSynthesis body includes identification line with phase, feature, slice", async () => {
  const repo = await tmpRepo("al-cb-synth-id-");
  const slicePath = await makeSliceFile(repo, "SLICE-03");
  const result = await writeCrewFinalSynthesis(repo, {
    sliceId: "SLICE-03",
    slicePath,
    featureId: "FEAT-010",
    phase: "4",
    featureResult: null,
    specChanges: [],
    config: null
  });
  const content = await fs.readFile(result.synthesisPath, "utf8");
  const { body } = parseFrontmatter(content);
  assert.match(body, /\*\*Phase:\*\* 4/);
  assert.match(body, /\*\*Feature:\*\* FEAT-010/);
  assert.match(body, /\*\*Slice:\*\* SLICE-03/);
  const idLineMatch = body.match(/\*\*Phase:\*\*.*\*\*Feature:\*\*.*\*\*Slice:\*\*/);
  assert.ok(idLineMatch, "identification line must contain Phase · Feature · Slice in order");
});

test("writeCrewFinalSynthesis body omits blank identification segments when phase and feature are null", async () => {
  const repo = await tmpRepo("al-cb-synth-null-");
  const slicePath = await makeSliceFile(repo, "SLICE-04");
  const result = await writeCrewFinalSynthesis(repo, {
    sliceId: "SLICE-04",
    slicePath,
    featureId: null,
    phase: null,
    featureResult: null,
    specChanges: [],
    config: null
  });
  const content = await fs.readFile(result.synthesisPath, "utf8");
  const { body } = parseFrontmatter(content);
  assert.doesNotMatch(body, /\*\*Phase:\*\*\s*$/m);
  assert.doesNotMatch(body, /\*\*Feature:\*\*\s*$/m);
});

test("detectCostMode returns scoped when config.loop.costProject is set", async () => {
  const config = { loop: { costProject: "my-repo" } };
  const mode = await detectCostMode("/irrelevant/path", config);
  assert.equal(mode, "scoped");
});

test("detectCostMode returns aggregate when config has no costProject", async () => {
  // Use a fresh non-git temp directory so the git rev-parse calls fail and we
  // fall through to the catch → aggregate. Using os.tmpdir() directly is
  // unreliable when the user home or a parent dir is itself a git repo (the
  // Windows home-is-git-repo case surfaced via SLICE-57 fix DEC-022).
  const isolated = await fs.mkdtemp(path.join(os.tmpdir(), "ccm-iso-"));
  try {
    const mode = await detectCostMode(isolated, {});
    assert.equal(mode, "aggregate");
  } finally {
    await fs.rm(isolated, { recursive: true, force: true });
  }
});

// --- appendSourceProjectArgs tests ---

test("appendSourceProjectArgs pushes aliases first then primary last (primary wins in last-one-wins CLI)", () => {
  const args: string[] = [];
  appendSourceProjectArgs(args, "PRIMARY", ["ALIAS1", "ALIAS2"]);
  assert.deepEqual(args, [
    "--source-project",
    "ALIAS1",
    "--source-project",
    "ALIAS2",
    "--source-project",
    "PRIMARY"
  ]);
});

test("appendSourceProjectArgs with no aliases pushes exactly one --source-project flag (primary only)", () => {
  const args: string[] = [];
  appendSourceProjectArgs(args, "PRIMARY", undefined);
  assert.deepEqual(args, ["--source-project", "PRIMARY"]);
});

test("appendSourceProjectArgs with empty aliases array behaves same as no aliases", () => {
  const args: string[] = [];
  appendSourceProjectArgs(args, "PRIMARY", []);
  assert.deepEqual(args, ["--source-project", "PRIMARY"]);
});

test("appendSourceProjectArgs skips non-string entries in aliases array, primary last", () => {
  const args: string[] = [];
  appendSourceProjectArgs(args, "PRIMARY", [null, 123, "GOOD"] as unknown as string[]);
  assert.deepEqual(args, ["--source-project", "GOOD", "--source-project", "PRIMARY"]);
});

test("appendSourceProjectArgs can be used for cost-advise argv shape (mirrors cost-slice)", () => {
  // cost-advise does not accept --source-project at all, so only
  // cost-slice uses appendSourceProjectArgs. This test documents that the
  // helper is argv-shape-agnostic and can be reused by any future block.
  const adviseArgs: string[] = ["node", "crew.mjs", "cost-advise", "--repo", "/repo"];
  appendSourceProjectArgs(adviseArgs, "PRIMARY", ["ALIAS1"]);
  assert.ok(adviseArgs.includes("--source-project"), "adviseArgs contains --source-project flag");
  assert.equal(
    adviseArgs.filter((a) => a === "--source-project").length,
    2,
    "two --source-project occurrences: primary + alias"
  );
});
