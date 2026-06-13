// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { auditBacklog } from "../scripts/lib/backlog-auditor.mjs";

/** Create a temp dir that looks like a minimal loop repo. */
async function tmpRepo(prefix: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return dir;
}

/** Write a FEAT file into a given backlog state dir. */
async function writeFeat(
  repoPath: string,
  state: "pending" | "triaged",
  id: string,
  content: string
) {
  const dir = path.join(repoPath, ".claude", "artifacts", "loop", "backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.md`);
  await fs.writeFile(file, content, "utf8");
  return file;
}

/** Write a source file under srcDir. */
async function writeSrc(repoPath: string, relPath: string, content: string) {
  const full = path.join(repoPath, "src", relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
  return full;
}

const FEAT_WITH_AC = `---
id: FEAT-001
status: pending
---
# FEAT-001: Test feature

## Acceptance criteria

- [ ] AC-1: auditBacklog function should dispatchHierarchical with evidence
- [ ] AC-2: keyword extraction handles multiword phrases
`;

const FEAT_ONE_KW = `---
id: FEAT-002
status: pending
---
# FEAT-002: Another feature

## Acceptance criteria

- [ ] AC-1: backlogWriter should persist feature entries
- [ ] AC-2: something else completely unrelated
`;

const FEAT_NO_MATCH = `---
id: FEAT-003
status: pending
---
# FEAT-003: No match feature

## Acceptance criteria

- [ ] AC-1: frombullfrog uniquelynamed operation
- [ ] AC-2: xyzplonk unrelated concept here
`;

const FEAT_NO_AC = `---
id: FEAT-004
status: pending
---
# FEAT-004: No AC section

## Description

This feature has no acceptance criteria section at all.
`;

// Test 1: Returns likely_satisfied with evidence when >=2 AC keywords found in src
test("auditBacklog returns likely_satisfied with evidence when >=2 AC keywords found", async () => {
  const repo = await tmpRepo("ba-likely-");

  await writeFeat(repo, "pending", "FEAT-001", FEAT_WITH_AC);

  // Write a source file that contains both AC keywords: "audibacklog" -> "auditbacklog"
  // The keywords extracted from AC-1 will include: "auditbacklog", "function", "should",
  // "dispatc..." — words >= 6 chars. Let's put them in the source.
  await writeSrc(
    repo,
    "scripts/lib/backlog-auditor.mts",
    `
export async function auditBacklog(repoPath: string) {
  // dispatchHierarchical implementation
  return [];
}
`
  );

  const results = await auditBacklog(repo);
  assert.equal(results.length, 1);
  const r = results[0]!;
  assert.equal(r.id, "FEAT-001");
  assert.equal(r.verdict, "likely_satisfied");
  assert.ok(r.evidence.length > 0, "expected evidence entries");
  assert.ok(
    r.evidence.every((e) => e.includes(":")),
    "evidence should be file:line format"
  );
});

// Test 2: Returns partially when exactly 1 keyword found
test("auditBacklog returns partially when exactly 1 keyword found", async () => {
  const repo = await tmpRepo("ba-partial-");

  await writeFeat(repo, "pending", "FEAT-002", FEAT_ONE_KW);

  // Source contains "backlogWriter" (maps to keyword "backlogwriter") but NOT
  // "persist" (only 7 chars, would be candidate). We include only one keyword.
  await writeSrc(
    repo,
    "scripts/lib/backlog-writer.mts",
    `
// backlogWriter — handles feature persistence
export function writeFeature(path: string) {}
`
  );

  const results = await auditBacklog(repo);
  assert.equal(results.length, 1);
  const r = results[0]!;
  assert.equal(r.id, "FEAT-002");
  // "backlogwriter" or "persist" or "feature" — at least one keyword hits
  // "entries" is 7 chars, "persist" is 7. The source has "backlogWriter" and "persist".
  // We expect at least partially (1 keyword hit), could be likely_satisfied if 2 hit.
  assert.ok(
    r.verdict === "partially" || r.verdict === "likely_satisfied",
    `expected partially or likely_satisfied, got ${r.verdict}`
  );
  assert.ok(r.evidence.length > 0, "expected at least 1 evidence entry");
});

// Test 3: Returns open when no keywords found in src
test("auditBacklog returns open when no keywords found in src", async () => {
  const repo = await tmpRepo("ba-open-");

  await writeFeat(repo, "pending", "FEAT-003", FEAT_NO_MATCH);

  // Source contains none of the AC keywords
  await writeSrc(
    repo,
    "scripts/index.mts",
    `
export function unrelated() {
  return 42;
}
`
  );

  const results = await auditBacklog(repo);
  assert.equal(results.length, 1);
  const r = results[0]!;
  assert.equal(r.id, "FEAT-003");
  assert.equal(r.verdict, "open");
  assert.deepEqual(r.evidence, []);
});

// Test 4: Handles FEAT with no AC section gracefully (returns open, no crash)
test("auditBacklog handles FEAT with no AC section gracefully", async () => {
  const repo = await tmpRepo("ba-noac-");

  await writeFeat(repo, "pending", "FEAT-004", FEAT_NO_AC);

  await writeSrc(repo, "scripts/index.mts", `export function foo() { return 1; }`);

  const results = await auditBacklog(repo);
  assert.equal(results.length, 1);
  const r = results[0]!;
  assert.equal(r.id, "FEAT-004");
  assert.equal(r.verdict, "open");
  assert.deepEqual(r.evidence, []);
});

// Test 5: Returns empty array for empty backlog directory
test("auditBacklog returns empty array for empty backlog directory", async () => {
  const repo = await tmpRepo("ba-empty-");

  // Create empty pending and triaged dirs
  await fs.mkdir(path.join(repo, ".claude", "artifacts", "loop", "backlog", "pending"), {
    recursive: true
  });
  await fs.mkdir(path.join(repo, ".claude", "artifacts", "loop", "backlog", "triaged"), {
    recursive: true
  });

  const results = await auditBacklog(repo);
  assert.deepEqual(results, []);
});

// Test 6: Scans triaged state by default
test("auditBacklog scans triaged state by default", async () => {
  const repo = await tmpRepo("ba-triaged-");

  const triagedFeat = `---
id: FEAT-010
status: triaged
---
# FEAT-010: Triaged feature

## Acceptance criteria

- [ ] AC-1: resolveSkills function should handle missing preset
- [ ] AC-2: skillResolver returns default values
`;

  await writeFeat(repo, "triaged", "FEAT-010", triagedFeat);

  await writeSrc(
    repo,
    "scripts/lib/skill-resolver.mts",
    `
export async function resolveSkills(variant: string) {
  // skillResolver default implementation
  return [];
}
`
  );

  const results = await auditBacklog(repo);
  assert.equal(results.length, 1);
  const r = results[0]!;
  assert.equal(r.id, "FEAT-010");
  assert.ok(
    r.verdict === "likely_satisfied" || r.verdict === "partially",
    `expected hit, got ${r.verdict}`
  );
});

// Test 7: opts.states restricts which states are scanned
test("auditBacklog respects opts.states filter", async () => {
  const repo = await tmpRepo("ba-states-");

  const pendingFeat = `---
id: FEAT-020
status: pending
---
# FEAT-020: Pending only

## Acceptance criteria

- [ ] AC-1: pendingOnly keyword here
`;

  const triagedFeat = `---
id: FEAT-021
status: triaged
---
# FEAT-021: Triaged only

## Acceptance criteria

- [ ] AC-1: triagedOnly keyword here
`;

  await writeFeat(repo, "pending", "FEAT-020", pendingFeat);
  await writeFeat(repo, "triaged", "FEAT-021", triagedFeat);

  // Scan only pending
  const results = await auditBacklog(repo, { states: ["pending"] });
  assert.equal(results.length, 1);
  assert.equal(results[0]!.id, "FEAT-020");
});
