// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  addFeature,
  moveFeature,
  ensureBacklogScaffold,
  findFeatureById,
  updateFeatureFrontmatter
} from "../scripts/lib/backlog-writer.mjs";
import {
  listBacklog,
  filterBacklog,
  nextFeatureId,
  comparePickOrder
} from "../scripts/lib/backlog-parser.mjs";
import { triagePending, triageEntry } from "../scripts/lib/backlog-triage.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("addFeature creates FEAT-NNN.md in pending/ with monotonic id", async () => {
  const repo = await tmpRepo("al-backlog-add-");
  const a = await addFeature(repo, { title: "First feature" });
  const b = await addFeature(repo, { title: "Second feature" });
  assert.equal(a.id, "FEAT-001");
  assert.equal(b.id, "FEAT-002");
  assert.match(a.filePath, /pending[\\/]FEAT-001\.md$/);
  const content = await fs.readFile(a.filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  assert.equal(frontmatter.id, "FEAT-001");
  assert.equal(frontmatter.status, "pending");
  assert.match(body, /First feature/);
});

test("nextFeatureId fills gaps correctly", async () => {
  const repo = await tmpRepo("al-backlog-next-");
  await addFeature(repo, { title: "one" });
  await addFeature(repo, { title: "two" });
  await addFeature(repo, { title: "three" });
  const next = await nextFeatureId(repo);
  assert.equal(next, "FEAT-004");
});

test("listBacklog walks all four state dirs", async () => {
  const repo = await tmpRepo("al-backlog-list-");
  const a = await addFeature(repo, { title: "A" });
  const b = await addFeature(repo, { title: "B" });
  await moveFeature(a.filePath, "triaged", { priority: "P1", category: "feature" });
  await moveFeature(b.filePath, "in-progress");
  const entries = await listBacklog(repo);
  assert.equal(entries.length, 2);
  assert.equal(entries.find((e) => e.id === "FEAT-001").state, "triaged");
  assert.equal(entries.find((e) => e.id === "FEAT-002").state, "in-progress");
});

test("filterBacklog filters by status and priority", async () => {
  const repo = await tmpRepo("al-backlog-filter-");
  const a = await addFeature(repo, { title: "A", priority: "P0" });
  await addFeature(repo, { title: "B", priority: "P2" });
  await moveFeature(a.filePath, "triaged", { priority: "P0" });
  const entries = await listBacklog(repo);
  const p0 = filterBacklog(entries, { priority: "P0" });
  assert.equal(p0.length, 1);
  assert.equal(p0[0].id, "FEAT-001");
  const pending = filterBacklog(entries, { status: "pending" });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, "FEAT-002");
});

test("moveFeature updates status and timestamp", async () => {
  const repo = await tmpRepo("al-backlog-move-");
  const a = await addFeature(repo, { title: "Move me" });
  const moved = await moveFeature(a.filePath, "triaged");
  assert.match(moved.to, /triaged[\\/]FEAT-001\.md$/);
  const after = await fs.readFile(moved.to, "utf8");
  const { frontmatter } = parseFrontmatter(after);
  assert.equal(frontmatter.status, "triaged");
});

test("triageEntry infers bugfix category from body", () => {
  const entry = {
    body: "Users report a broken state when uploading large files. Bug needs fix.",
    frontmatter: {}
  };
  const updates = triageEntry(entry);
  assert.equal(updates.category, "bugfix");
});

test("triageEntry infers ops category", () => {
  const entry = {
    body: "Need terraform changes for new ACA env.",
    frontmatter: {}
  };
  const updates = triageEntry(entry);
  assert.equal(updates.category, "ops");
});

test("triageEntry respects existing fields", () => {
  const entry = {
    body: "broken bug",
    frontmatter: { priority: "P0", category: "feature" }
  };
  const updates = triageEntry(entry);
  // Existing values not overwritten — only fills missing
  assert.equal(updates.priority, undefined);
  assert.equal(updates.category, undefined);
});

test("triagePending moves all pending features to triaged with filled fields", async () => {
  const repo = await tmpRepo("al-backlog-triage-");
  await addFeature(repo, { title: "Add login" });
  await addFeature(repo, { title: "Critical outage in production" });
  await addFeature(repo, { title: "Refactor old code paths" });
  const results = await triagePending(repo);
  assert.equal(results.length, 3);
  const entries = await listBacklog(repo);
  const triaged = entries.filter((e) => e.state === "triaged");
  assert.equal(triaged.length, 3);
  const critical = entries.find((e) => e.body.includes("Critical outage"));
  assert.equal(critical.frontmatter.priority, "P0");
  const refactor = entries.find((e) => e.body.includes("Refactor"));
  assert.equal(refactor.frontmatter.category, "tech-debt");
});

test("findFeatureById locates by id across states", async () => {
  const repo = await tmpRepo("al-backlog-find-");
  await addFeature(repo, { title: "find me" });
  const found = await findFeatureById(repo, "FEAT-001");
  assert.ok(found);
  assert.equal(found.id, "FEAT-001");
});

test("ensureBacklogScaffold creates all four state dirs", async () => {
  const repo = await tmpRepo("al-backlog-scaffold-");
  await ensureBacklogScaffold(repo);
  for (const state of ["pending", "triaged", "in-progress", "done"]) {
    const dir = path.join(repo, ".claude", "artifacts", "loop", "backlog", state);
    const stat = await fs.stat(dir).catch(() => null);
    assert.ok(stat?.isDirectory(), `${state} dir should exist`);
  }
});

test("comparePickOrder sorts by priority asc then FEAT-NNN asc on ties", () => {
  const e = (idNumber, priority) => ({ idNumber, frontmatter: { priority } });
  const input = [e(3, "P2"), e(1, "P2"), e(2, "P0"), e(5, "P2"), e(4, "P0")];
  const sorted = [...input].sort(comparePickOrder);
  assert.deepEqual(
    sorted.map((x) => `FEAT-${String(x.idNumber).padStart(3, "0")}`),
    ["FEAT-002", "FEAT-004", "FEAT-001", "FEAT-003", "FEAT-005"]
  );
});

test("comparePickOrder treats missing priority as P3 (sorts last)", () => {
  const e = (idNumber, priority) => ({ idNumber, frontmatter: priority ? { priority } : {} });
  const input = [e(1), e(2, "P0"), e(3)];
  const sorted = [...input].sort(comparePickOrder);
  assert.deepEqual(
    sorted.map((x) => x.idNumber),
    [2, 1, 3]
  );
});

test("updateFeatureFrontmatter preserves body", async () => {
  const repo = await tmpRepo("al-backlog-update-");
  const a = await addFeature(repo, { title: "Original" });
  const before = await fs.readFile(a.filePath, "utf8");
  const { body } = parseFrontmatter(before);
  await updateFeatureFrontmatter(a.filePath, { priority: "P0" });
  const after = await fs.readFile(a.filePath, "utf8");
  const { body: afterBody } = parseFrontmatter(after);
  assert.equal(body, afterBody);
});

test("addFeature refuses to write schema-invalid frontmatter", async () => {
  const repo = await tmpRepo("loop-schema-");
  try {
    await assert.rejects(addFeature(repo, { title: "Bad", priority: "P9" }), /priority/);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
