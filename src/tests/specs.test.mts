import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  addSpec,
  listSpecs,
  filterSpecs,
  nextSpecId,
  findSpecById,
  updateSpecFrontmatter,
  SPEC_TYPES
} from "../scripts/lib/spec-parser.mjs";
import { decomposeSpec } from "../scripts/lib/spec-decomposer.mjs";
import {
  linkFeatureToSpec,
  specSatisfaction,
  reconcileSpecStatus
} from "../scripts/lib/linkage.mjs";
import { moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { listBacklog } from "../scripts/lib/backlog-parser.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("addSpec creates SPEC-NNN.md with required frontmatter and template body", async () => {
  const repo = await tmpRepo("al-spec-add-");
  const s = await addSpec(repo, { type: "prd", title: "Test PRD" });
  assert.equal(s.id, "SPEC-001");
  assert.match(s.filePath, /SPEC-001\.md$/);
  const content = await fs.readFile(s.filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(content);
  assert.equal(frontmatter.type, "prd");
  assert.equal(frontmatter.status, "draft");
  assert.equal(frontmatter.title, "Test PRD");
  assert.deepEqual(frontmatter.derived_features, []);
  assert.match(body, /## Problem/);
});

test("addSpec prepends the real id H1 when body starts with a ## section (PM --spec path)", async () => {
  const repo = await tmpRepo("al-spec-h1-");
  // PM's --spec flow emits a specBody starting at "## 1. Purpose ..." with NO
  // "# SPEC-NNN:" H1 (it cannot know the real id). addSpec must supply the H1.
  const s = await addSpec(repo, {
    type: "prd",
    title: "OAuth token refresh",
    body: "## 1. Purpose & Scope\n\nHarden token refresh.\n"
  });
  assert.equal(s.id, "SPEC-001");
  const { body } = parseFrontmatter(await fs.readFile(s.filePath, "utf8"));
  // Real id H1 prepended, matching frontmatter — not the "## 1." swallowing it.
  assert.match(body, /^# SPEC-001: OAuth token refresh\n/);
  assert.match(body, /## 1\. Purpose & Scope/);
  // No stray SPEC-NNN placeholder leaked through.
  assert.doesNotMatch(body, /SPEC-NNN/);
});

test("addSpec keeps a body that already has a real '# ' H1 verbatim (no double header)", async () => {
  const repo = await tmpRepo("al-spec-h1-verbatim-");
  const s = await addSpec(repo, {
    type: "prd",
    title: "Ignored",
    body: "# SPEC-001: Real Title\n\n## 1. Purpose\n\nbody\n"
  });
  const { body } = parseFrontmatter(await fs.readFile(s.filePath, "utf8"));
  assert.match(body, /^# SPEC-001: Real Title\n/);
  // exactly one H1 line
  assert.equal(body.split("\n").filter((l) => /^# /.test(l)).length, 1);
});

test("addSpec rejects unknown type", async () => {
  const repo = await tmpRepo("al-spec-bad-type-");
  await assert.rejects(() => addSpec(repo, { type: "nope", title: "x" }), /spec type must be/);
});

test("SPEC_TYPES includes adr", () => {
  assert.ok(SPEC_TYPES.includes("adr"), "ADR must be a supported spec type");
});

test("addSpec sets monotonic id across types", async () => {
  const repo = await tmpRepo("al-spec-mono-");
  await addSpec(repo, { type: "prd", title: "A" });
  await addSpec(repo, { type: "user-journey", title: "B" });
  await addSpec(repo, { type: "adr", title: "C" });
  const next = await nextSpecId(repo);
  assert.equal(next, "SPEC-004");
});

test("listSpecs + filterSpecs return matching entries", async () => {
  const repo = await tmpRepo("al-spec-list-");
  await addSpec(repo, { type: "prd", title: "Alpha" });
  await addSpec(repo, { type: "sre", title: "Beta" });
  await addSpec(repo, { type: "prd", title: "Gamma" });
  const all = await listSpecs(repo);
  assert.equal(all.length, 3);
  const prds = filterSpecs(all, { type: "prd" });
  assert.equal(prds.length, 2);
});

test("decomposeSpec creates FEAT files and updates spec frontmatter", async () => {
  const repo = await tmpRepo("al-spec-decompose-");
  const s = await addSpec(repo, {
    type: "prd",
    title: "Test PRD",
    priority: "P0",
    target_release: "v1.0.0"
  });
  await updateSpecFrontmatter(s.filePath, { status: "approved" });
  const result = await decomposeSpec(repo, s.id, ["Feature one", "Feature two", "Feature three"]);
  assert.equal(result.count, 3);
  assert.equal(result.created.length, 3);
  const updatedSpec = await findSpecById(repo, s.id);
  assert.deepEqual(updatedSpec.frontmatter.derived_features, ["FEAT-001", "FEAT-002", "FEAT-003"]);
  assert.equal(updatedSpec.frontmatter.status, "decomposed");
  // FEAT files carry derived_from + inherited priority
  const backlog = await listBacklog(repo);
  for (const f of backlog) {
    assert.equal(f.frontmatter.derived_from, s.id);
    assert.equal(f.frontmatter.priority, "P0");
    assert.equal(f.frontmatter.target_release, "v1.0.0");
  }
});

test("linkFeatureToSpec is idempotent", async () => {
  const repo = await tmpRepo("al-spec-link-");
  const s = await addSpec(repo, { type: "prd", title: "x" });
  const r1 = await linkFeatureToSpec(repo, s.id, "FEAT-999");
  const r2 = await linkFeatureToSpec(repo, s.id, "FEAT-999");
  assert.equal(r1.alreadyLinked, false);
  assert.equal(r2.alreadyLinked, true);
});

test("specSatisfaction reports per-spec completion", async () => {
  const repo = await tmpRepo("al-spec-sat-");
  const s = await addSpec(repo, { type: "prd", title: "PRD" });
  await updateSpecFrontmatter(s.filePath, { status: "approved" });
  await decomposeSpec(repo, s.id, ["a", "b", "c"]);
  // Move one feature to done
  const backlog = await listBacklog(repo);
  await moveFeature(backlog[0].filePath, "done");
  const sat = await specSatisfaction(repo);
  const entry = sat.find((x) => x.id === s.id);
  assert.equal(entry.total, 3);
  assert.equal(entry.done, 1);
  assert.equal(entry.pct, 33);
  assert.equal(entry.state, "in-progress");
});

test("reconcileSpecStatus rolls fully-satisfied specs to satisfied", async () => {
  const repo = await tmpRepo("al-spec-reconcile-");
  const s = await addSpec(repo, { type: "prd", title: "PRD" });
  await updateSpecFrontmatter(s.filePath, { status: "approved" });
  await decomposeSpec(repo, s.id, ["a", "b"]);
  const backlog = await listBacklog(repo);
  for (const f of backlog) {
    await moveFeature(f.filePath, "done");
  }
  const updates = await reconcileSpecStatus(repo);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, s.id);
  assert.equal(updates[0].to, "satisfied");
  const after = await findSpecById(repo, s.id);
  assert.equal(after.frontmatter.status, "satisfied");
});

test("reconcileSpecStatus is idempotent + skips already-satisfied", async () => {
  const repo = await tmpRepo("al-spec-recon-idem-");
  const s = await addSpec(repo, { type: "prd", title: "PRD" });
  await updateSpecFrontmatter(s.filePath, { status: "approved" });
  await decomposeSpec(repo, s.id, ["a"]);
  const backlog = await listBacklog(repo);
  await moveFeature(backlog[0].filePath, "done");
  await reconcileSpecStatus(repo);
  const second = await reconcileSpecStatus(repo);
  assert.equal(second.length, 0);
});
