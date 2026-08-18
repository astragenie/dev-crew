// SLICE-208 AC-3: slice-id-in-multiple-directories + status/directory
// disagreement validator, modeled on validate-effort-points.test.mts.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { validateRepo } from "../scripts/validate-slice-state-consistency.mjs";

const SLICES_REL = ".claude/artifacts/loop/ai-loop/slices";

async function tmpRepoWithSliceDirs(prefix: string, dirs = ["pending", "completed"]) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  for (const dir of dirs) {
    await fs.mkdir(path.join(repo, SLICES_REL, dir), { recursive: true });
  }
  return repo;
}

async function writeSlice(
  repo: string,
  dir: string,
  fileName: string,
  frontmatter: Record<string, unknown>
) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(frontmatter)) {
    lines.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
  lines.push("---", "", `# ${fileName}`, "");
  await fs.writeFile(path.join(repo, SLICES_REL, dir, fileName), lines.join("\n"));
}

test("clean repo: pending status in pending/, completed status in completed/ — no errors", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-clean-");
  await writeSlice(repo, "pending", "SLICE_1_FOO.md", { id: "SLICE-1", status: "pending" });
  await writeSlice(repo, "completed", "SLICE_2_BAR.md", { id: "SLICE-2", status: "completed" });
  const r = validateRepo(repo);
  assert.deepEqual(r.errors, []);
  assert.equal(r.filesScanned, 2);
});

test("status: done and status: superseded are accepted in completed/ (repo precedent)", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-terminal-");
  await writeSlice(repo, "completed", "SLICE_1_FOO.md", { id: "SLICE-1", status: "done" });
  await writeSlice(repo, "completed", "SLICE_2_BAR.md", { id: "SLICE-2", status: "superseded" });
  const r = validateRepo(repo);
  assert.deepEqual(r.errors, []);
});

test("duplicate slice id across two state directories fails, distinct from status mismatch", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-dup-");
  await writeSlice(repo, "pending", "SLICE_118_FOO.md", { id: "SLICE-118", status: "pending" });
  await writeSlice(repo, "completed", "SLICE_118_FOO.md", {
    id: "SLICE-118",
    status: "completed"
  });
  const r = validateRepo(repo);
  // Both the duplicate-id error AND (for the pending/ copy) the
  // status-agrees-with-directory check pass individually — only the
  // cross-directory duplicate should fire here.
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0]!, /SLICE-118/);
  assert.match(r.errors[0]!, /more than one state directory/);
});

test("frontmatter status disagreeing with its directory fails, reported separately from duplicates", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-mismatch-");
  await writeSlice(repo, "pending", "SLICE_128_FOO.md", { id: "SLICE-128", status: "done" });
  await writeSlice(repo, "pending", "SLICE_55_BAR.md", { id: "SLICE-55", status: "superseded" });
  const r = validateRepo(repo);
  assert.equal(r.errors.length, 2);
  for (const err of r.errors) {
    assert.match(err, /disagrees with its directory/);
  }
});

test("both conditions can fire independently in the same scan", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-both-");
  // Duplicate id, both plausible statuses for their own directory.
  await writeSlice(repo, "pending", "SLICE_1_FOO.md", { id: "SLICE-1", status: "pending" });
  await writeSlice(repo, "completed", "SLICE_1_FOO.md", { id: "SLICE-1", status: "completed" });
  // A lone status/directory mismatch.
  await writeSlice(repo, "pending", "SLICE_2_BAR.md", { id: "SLICE-2", status: "done" });
  const r = validateRepo(repo);
  assert.equal(r.errors.length, 2);
  assert.ok(r.errors.some((e) => /more than one state directory/.test(e)));
  assert.ok(r.errors.some((e) => /disagrees with its directory/.test(e)));
});

test("same id repeated within a single directory is out of scope (FEAT-257 id-collision defect, not directory drift)", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-samedir-dup-");
  await writeSlice(repo, "completed", "SLICE_115_A.md", { id: "SLICE-115", status: "completed" });
  await writeSlice(repo, "completed", "SLICE_115_B.md", { id: "SLICE-115", status: "completed" });
  const r = validateRepo(repo);
  assert.deepEqual(r.errors, []);
});

test("missing frontmatter status in a directory with known status rules fails", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-missing-status-");
  await writeSlice(repo, "pending", "SLICE_1_FOO.md", { id: "SLICE-1" });
  const r = validateRepo(repo);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0]!, /missing frontmatter status/);
});

test("falls back to filename-derived id when frontmatter omits id", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-derive-id-");
  await writeSlice(repo, "pending", "SLICE_9_FOO.md", { status: "pending" });
  await writeSlice(repo, "completed", "SLICE_9_FOO.md", { status: "completed" });
  const r = validateRepo(repo);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0]!, /SLICE-9/);
});

test("directories with no known status rules (e.g. a future in-progress/) skip the status check but still catch duplicates", async () => {
  const repo = await tmpRepoWithSliceDirs("ssc-unknown-dir-", ["pending", "in-progress"]);
  await writeSlice(repo, "in-progress", "SLICE_1_FOO.md", { id: "SLICE-1", status: "anything" });
  const r1 = validateRepo(repo);
  assert.deepEqual(r1.errors, []);

  await writeSlice(repo, "pending", "SLICE_1_FOO.md", { id: "SLICE-1", status: "pending" });
  const r2 = validateRepo(repo);
  assert.equal(r2.errors.length, 1);
  assert.match(r2.errors[0]!, /more than one state directory/);
});

test("returns empty result when the slices root is missing entirely", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "ssc-empty-"));
  const r = validateRepo(repo);
  assert.equal(r.filesScanned, 0);
  assert.deepEqual(r.errors, []);
});
