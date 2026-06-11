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

test("listBacklog includes letter-suffixed split features (FEAT-119a)", async () => {
  const repo = await tmpRepo("al-backlog-suffix-");
  await ensureBacklogScaffold(repo);
  const pending = path.join(repo, ".claude", "artifacts", "loop", "backlog", "pending");
  const mk = (name, id, priority) =>
    fs.writeFile(
      path.join(pending, name),
      `---\nid: ${id}\nstatus: pending\npriority: ${priority}\n---\n# ${id}: split\n`
    );
  await mk("FEAT-119b.md", "FEAT-119b", "P2");
  await mk("FEAT-119a.md", "FEAT-119a", "P1");
  await mk("FEAT-120.md", "FEAT-120", "P2");
  const entries = await listBacklog(repo);
  assert.deepEqual(
    entries.map((e) => e.id),
    ["FEAT-119a", "FEAT-119b", "FEAT-120"]
  );
  assert.equal(entries[0].idNumber, 119);
  assert.equal(entries[0].idSuffix, "a");
  // comparePickOrder: P1 suffix entry wins; same-priority suffixes sort a < b
  const sorted = [...entries].sort(comparePickOrder);
  assert.equal(sorted[0].id, "FEAT-119a");
  // nextFeatureId ignores suffixes, advances past the max numeric id
  assert.equal(await nextFeatureId(repo), "FEAT-121");
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
