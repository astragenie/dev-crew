// FEAT-167 AC-7: effort_points / expected_usd frontmatter validator.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { validateEffortPoints } from "../scripts/validate-effort-points.mjs";

const BACKLOG_REL = ".claude/artifacts/loop/backlog";

async function tmpRepoWithBacklog(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  for (const dir of ["pending", "triaged", "in-progress", "done"]) {
    await fs.mkdir(path.join(repo, BACKLOG_REL, dir), { recursive: true });
  }
  return repo;
}

async function writeFeat(
  repo: string,
  state: string,
  id: string,
  frontmatter: Record<string, unknown>
) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(frontmatter)) {
    lines.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
  lines.push("---", "", `# ${id}`, "");
  await fs.writeFile(path.join(repo, BACKLOG_REL, state, `${id}.md`), lines.join("\n"));
}

test("FEAT without effort_points passes (optional field)", async () => {
  const repo = await tmpRepoWithBacklog("ep-optional-");
  await writeFeat(repo, "triaged", "FEAT-001", { id: "FEAT-001", priority: "P2" });
  const r = await validateEffortPoints(repo);
  assert.equal(r.ok, true);
  assert.equal(r.scanned, 1);
  assert.deepEqual(r.errors, []);
});

test("FEAT with valid effort_points passes for every Fibonacci value", async () => {
  const repo = await tmpRepoWithBacklog("ep-valid-");
  const fibs = [1, 2, 3, 5, 8, 13];
  for (const [i, points] of fibs.entries()) {
    await writeFeat(repo, "triaged", `FEAT-00${i + 1}`, {
      id: `FEAT-00${i + 1}`,
      effort_points: points
    });
  }
  const r = await validateEffortPoints(repo);
  assert.equal(r.ok, true);
  assert.equal(r.scanned, 6);
});

test("non-Fibonacci effort_points fails with explicit error", async () => {
  const repo = await tmpRepoWithBacklog("ep-nonfib-");
  await writeFeat(repo, "triaged", "FEAT-001", { id: "FEAT-001", effort_points: 4 });
  await writeFeat(repo, "triaged", "FEAT-002", { id: "FEAT-002", effort_points: 7 });
  const r = await validateEffortPoints(repo);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
  for (const err of r.errors) {
    assert.match(err, /Fibonacci/);
  }
});

test("non-integer / out-of-set effort_points fails", async () => {
  const repo = await tmpRepoWithBacklog("ep-types-");
  await writeFeat(repo, "triaged", "FEAT-001", { id: "FEAT-001", effort_points: 1.5 });
  await writeFeat(repo, "triaged", "FEAT-002", { id: "FEAT-002", effort_points: 9 });
  await writeFeat(repo, "triaged", "FEAT-003", { id: "FEAT-003", effort_points: null });
  const r = await validateEffortPoints(repo);
  assert.equal(r.ok, false);
  // null is treated as "absent" — should pass; 1.5 + 9 fail (out of Fibonacci set).
  assert.equal(r.errors.length, 2);
});

test("expected_usd must be non-negative finite number when present", async () => {
  const repo = await tmpRepoWithBacklog("ep-eu-");
  await writeFeat(repo, "triaged", "FEAT-001", {
    id: "FEAT-001",
    effort_points: 5,
    expected_usd: -10
  });
  await writeFeat(repo, "triaged", "FEAT-002", {
    id: "FEAT-002",
    effort_points: 5,
    expected_usd: "ten"
  });
  await writeFeat(repo, "triaged", "FEAT-003", {
    id: "FEAT-003",
    effort_points: 5,
    expected_usd: 50
  });
  const r = await validateEffortPoints(repo);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
});

test("expected_usd vs effort_points × median_usd_per_point consistency check (within tolerance)", async () => {
  const repo = await tmpRepoWithBacklog("ep-consistency-");
  await writeFeat(repo, "triaged", "FEAT-001", {
    id: "FEAT-001",
    effort_points: 5,
    expected_usd: 50.005 // 5 × 10 = 50, off by 0.005 → within ±0.01 tolerance
  });
  await writeFeat(repo, "triaged", "FEAT-002", {
    id: "FEAT-002",
    effort_points: 5,
    expected_usd: 60 // way off
  });
  const r = await validateEffortPoints(repo, { medianUsdPerPoint: 10 });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0]!, /expected_usd=60/);
});

test("scans all four backlog directories", async () => {
  const repo = await tmpRepoWithBacklog("ep-dirs-");
  const dirs = ["pending", "triaged", "in-progress", "done"];
  for (const [i, dir] of dirs.entries()) {
    await writeFeat(repo, dir, `FEAT-00${i + 1}`, { id: `FEAT-00${i + 1}` });
  }
  const r = await validateEffortPoints(repo);
  assert.equal(r.ok, true);
  assert.equal(r.scanned, 4);
});

test("returns empty result when backlog dirs are missing", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "ep-empty-"));
  const r = await validateEffortPoints(repo);
  assert.equal(r.ok, true);
  assert.equal(r.scanned, 0);
});
