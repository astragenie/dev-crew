import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  extractClauseIds,
  validateDeclineCitations
} from "../scripts/validate-decline-citations.mjs";

async function mkTmp() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-decline-"));
}

async function writeFile(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

function makeClaudeMd(clauses: string[]) {
  const sections = clauses
    .map((id) => `## ${id.replace(/-/g, " ")}\n<!-- clause: ${id} -->\n\nSome content.\n`)
    .join("\n");
  return `# Repo Instructions\n\n${sections}`;
}

function makeFeat(priority: string, extra: string = "") {
  return `---\nid: FEAT-TEST\nstatus: triaged\ncomposite_priority: ${priority}\n${extra}---\n# FEAT-TEST\n`;
}

test("extractClauseIds returns all clause ids from CLAUDE.md", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline", "safety", "local-commands"]);
  await writeFile(root, "CLAUDE.md", claudeMd);

  const ids = await extractClauseIds(root);
  assert.deepEqual(ids, new Set(["commit-discipline", "safety", "local-commands"]));
});

test("extractClauseIds returns empty set when CLAUDE.md has no clause markers", async () => {
  const root = await mkTmp();
  await writeFile(root, "CLAUDE.md", "# Repo Instructions\n\n## Some Section\n\nNo clause here.\n");

  const ids = await extractClauseIds(root);
  assert.deepEqual(ids, new Set());
});

test("non-P4 FEAT is ignored even without declined_per", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline"]);
  await writeFile(root, "CLAUDE.md", claudeMd);
  await writeFile(root, ".claude/artifacts/loop/backlog/triaged/FEAT-001.md", makeFeat("P2"));

  const result = await validateDeclineCitations(root);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("P4 FEAT with valid declined_per passes validation", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline", "safety"]);
  await writeFile(root, "CLAUDE.md", claudeMd);
  await writeFile(
    root,
    ".claude/artifacts/loop/backlog/triaged/FEAT-002.md",
    makeFeat("P4", 'declined_per: ["commit-discipline"]\n')
  );

  const result = await validateDeclineCitations(root);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("P4 FEAT missing declined_per field fails with clear error naming the FEAT", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline"]);
  await writeFile(root, "CLAUDE.md", claudeMd);
  await writeFile(root, ".claude/artifacts/loop/backlog/triaged/FEAT-003.md", makeFeat("P4"));

  const result = await validateDeclineCitations(root);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /FEAT-003/);
  assert.match(result.errors[0], /declined_per/);
});

test("P4 FEAT with unknown clause id fails with error naming FEAT and clause", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline"]);
  await writeFile(root, "CLAUDE.md", claudeMd);
  await writeFile(
    root,
    ".claude/artifacts/loop/backlog/triaged/FEAT-004.md",
    makeFeat("P4", 'declined_per: ["bogus-clause-id"]\n')
  );

  const result = await validateDeclineCitations(root);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /FEAT-004/);
  assert.match(result.errors[0], /bogus-clause-id/);
});

test("done/ directory is also scanned for P4 violations", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline"]);
  await writeFile(root, "CLAUDE.md", claudeMd);
  await writeFile(root, ".claude/artifacts/loop/backlog/done/FEAT-005.md", makeFeat("P4"));

  const result = await validateDeclineCitations(root);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /FEAT-005/);
});

test("empty backlog directories pass with no errors", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline"]);
  await writeFile(root, "CLAUDE.md", claudeMd);

  const result = await validateDeclineCitations(root);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("P4 FEAT with empty declined_per array fails", async () => {
  const root = await mkTmp();
  const claudeMd = makeClaudeMd(["commit-discipline"]);
  await writeFile(root, "CLAUDE.md", claudeMd);
  await writeFile(
    root,
    ".claude/artifacts/loop/backlog/triaged/FEAT-006.md",
    makeFeat("P4", "declined_per: []\n")
  );

  const result = await validateDeclineCitations(root);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /FEAT-006/);
});
