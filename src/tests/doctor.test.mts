import { test } from "node:test";
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
    await fs.writeFile(path.join(repo, "docs/backlog/triaged/FEAT-001.md"), FEAT("FEAT-001", "triaged"));
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

test("--fix is not implemented yet (Task 6)", async () => {
  const repo = await makeRepo();
  try {
    await fs.mkdir(path.join(repo, "docs/backlog/pending"), { recursive: true });
    await fs.writeFile(path.join(repo, "docs/backlog/pending/FEAT-009.md"), FEAT("FEAT-009", "pending"));
    await assert.rejects(runDoctor(repo, { fix: true }), /not implemented/);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
