import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runDoctor } from "../scripts/lib/doctor.mjs";

const FEAT = (id: string, status: string) =>
  `---\nid: ${id}\nstatus: ${status}\npriority: null\ncategory: bug\ntarget_release: null\ncreated: 2026-06-10\nupdated: 2026-06-10\ndepends_on: []\nslices: []\nderived_from: null\n---\n# ${id}: t\n`;

async function makeRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "loop-doctor-"));
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/backlog/pending"), { recursive: true });
  return repo;
}

test("clean repo: zero findings", async () => {
  const repo = await makeRepo();
  try {
    await fs.writeFile(
      path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-001.md"),
      FEAT("FEAT-001", "pending")
    );
    const { findings } = await runDoctor(repo, { fix: false });
    assert.deepEqual(findings, []);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("detects stray tree, id collision, and cross-tree contradiction", async () => {
  const repo = await makeRepo();
  try {
    await fs.mkdir(path.join(repo, "docs/backlog/triaged"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-001.md"),
      FEAT("FEAT-001", "pending")
    );
    await fs.writeFile(
      path.join(repo, "docs/backlog/triaged/FEAT-001.md"),
      FEAT("FEAT-001", "triaged")
    );
    const { findings } = await runDoctor(repo, { fix: false });
    const kinds = findings.map((f) => f.kind).sort();
    assert.ok(kinds.includes("stray-tree"), kinds.join(","));
    assert.ok(kinds.includes("id-collision"), kinds.join(","));
    assert.ok(kinds.includes("state-contradiction"), kinds.join(","));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("detects schema-invalid state file in authoritative tree", async () => {
  const repo = await makeRepo();
  try {
    await fs.writeFile(
      path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-002.md"),
      `---\nid: FEAT-002\nstatus: shipped\ncreated: 2026-06-10\ndepends_on: []\nslices: []\n---\nbody\n`
    );
    const { findings } = await runDoctor(repo, { fix: false });
    assert.ok(findings.some((f) => f.kind === "schema-invalid" && f.path.includes("FEAT-002")));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("detects config-vs-reality mismatch (configured root empty, default populated)", async () => {
  const repo = await makeRepo();
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude/loop.json"),
      JSON.stringify({ schemaVersion: 1, loop: { backlogRoot: "docs/backlog" } })
    );
    await fs.writeFile(
      path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-001.md"),
      FEAT("FEAT-001", "pending")
    );
    const { findings } = await runDoctor(repo, { fix: false });
    assert.ok(findings.some((f) => f.kind === "config-mismatch"));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("--fix merges stray tree into authoritative root and writes report first", async () => {
  const repo = await makeRepo();
  try {
    await fs.mkdir(path.join(repo, "docs/backlog/pending"), { recursive: true });
    await fs.writeFile(
      path.join(repo, "docs/backlog/pending/FEAT-009.md"),
      FEAT("FEAT-009", "pending")
    );
    const { reportPath } = await runDoctor(repo, { fix: true });
    assert.ok(reportPath, "report path expected");
    const report = await fs.readFile(reportPath!, "utf8");
    assert.match(report, /stray-tree/);
    assert.match(report, /docs.backlog/);
    const moved = await fs.readFile(
      path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-009.md"),
      "utf8"
    );
    assert.match(moved, /FEAT-009/);
    const second = await runDoctor(repo, { fix: false });
    assert.deepEqual(second.findings, []);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("--fix preserves non-FEAT files living in the stray root", async () => {
  const repo = await makeRepo();
  try {
    await fs.mkdir(path.join(repo, "docs/backlog/pending"), { recursive: true });
    await fs.writeFile(
      path.join(repo, "docs/backlog/pending/FEAT-009.md"),
      FEAT("FEAT-009", "pending")
    );
    // A non-state file in the stray root must survive the merge.
    await fs.writeFile(path.join(repo, "docs/backlog/product-backlog.md"), "# product backlog\n");
    await runDoctor(repo, { fix: true });
    const survivor = await fs.readFile(path.join(repo, "docs/backlog/product-backlog.md"), "utf8");
    assert.match(survivor, /product backlog/);
    // State dirs are gone, the FEAT was merged.
    const pendingGone = await fs.access(path.join(repo, "docs/backlog/pending")).then(
      () => false,
      () => true
    );
    assert.ok(pendingGone, "stray state dir should be removed");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("--fix keeps newest-transition winner on contradiction, loser preserved in conflicts dir", async () => {
  const repo = await makeRepo();
  try {
    await fs.writeFile(
      path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-001.md"),
      FEAT("FEAT-001", "pending")
    );
    await fs.mkdir(path.join(repo, "docs/backlog/triaged"), { recursive: true });
    const strayFile = path.join(repo, "docs/backlog/triaged/FEAT-001.md");
    await fs.writeFile(strayFile, FEAT("FEAT-001", "triaged"));
    const future = new Date(Date.now() + 60_000);
    await fs.utimes(strayFile, future, future);
    await runDoctor(repo, { fix: true });
    const winner = path.join(repo, ".claude/artifacts/loop/backlog/triaged/FEAT-001.md");
    assert.ok(
      await fs.access(winner).then(
        () => true,
        () => false
      ),
      "winner in triaged/"
    );
    const conflictsDir = path.join(repo, ".claude/artifacts/loop/doctor/conflicts");
    const conflicts = await fs.readdir(conflictsDir);
    assert.ok(
      conflicts.some((f) => f.includes("FEAT-001")),
      conflicts.join(",")
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("--fix same-state collision with newer stray: winner stays in tree, true loser archived", async () => {
  // Regression: when both copies share a state dir, the rename overwrites the
  // authoritative file in place — the loser must be archived BEFORE the rename
  // and the file must NOT be unlinked afterwards.
  const repo = await makeRepo();
  try {
    const authFile = path.join(repo, ".claude/artifacts/loop/backlog/done/FEAT-007.md");
    await fs.mkdir(path.dirname(authFile), { recursive: true });
    await fs.writeFile(authFile, FEAT("FEAT-007", "done") + "auth-marker\n");
    await fs.mkdir(path.join(repo, "docs/backlog/done"), { recursive: true });
    const strayFile = path.join(repo, "docs/backlog/done/FEAT-007.md");
    await fs.writeFile(strayFile, FEAT("FEAT-007", "done") + "stray-marker\n");
    const future = new Date(Date.now() + 60_000);
    await fs.utimes(strayFile, future, future);
    await runDoctor(repo, { fix: true });
    // Winner (stray content) must EXIST in the tree at the same path.
    const survivor = await fs.readFile(authFile, "utf8");
    assert.match(survivor, /stray-marker/);
    // True loser (auth content) archived in conflicts.
    const loser = await fs.readFile(
      path.join(repo, ".claude/artifacts/loop/doctor/conflicts/FEAT-007-done.md"),
      "utf8"
    );
    assert.match(loser, /auth-marker/);
    const second = await runDoctor(repo, { fix: false });
    assert.deepEqual(second.findings, []);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
