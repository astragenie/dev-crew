import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { readCrewBlockingGates } from "../scripts/lib/crew-workflow-reader.mjs";
import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { buildBrief } from "../scripts/lib/brief.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeCrewState(repoPath, state) {
  const dir = path.join(repoPath, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "workflow-state.json"), JSON.stringify(state, null, 2));
}

async function seedMinimalAlRepo(repoPath) {
  await fs.mkdir(path.join(repoPath, "docs", "backlog", "pending"), { recursive: true });
  await fs.mkdir(path.join(repoPath, "docs", "specs"), { recursive: true });
  await fs.writeFile(path.join(repoPath, "docs", "backlog", "pending", ".gitkeep"), "");
}

test("readCrewBlockingGates returns nulls when no crew state on disk", async () => {
  const repo = await tmpRepo("al-gates-missing-");
  const gates = await readCrewBlockingGates(repo);
  assert.equal(gates.blocked, null);
  assert.equal(gates.escalated, null);
});

test("readCrewBlockingGates returns blocked gate when set", async () => {
  const repo = await tmpRepo("al-gates-blocked-");
  await writeCrewState(repo, {
    currentRun: {
      gates: {
        blocked: {
          status: "blocked",
          note: "Waiting on upstream spec",
          blockedBy: "ART-123",
          updatedAt: "2026-05-22T00:00:00Z"
        }
      }
    }
  });
  const gates = await readCrewBlockingGates(repo);
  assert.equal(gates.blocked?.status, "blocked");
  assert.equal(gates.blocked?.note, "Waiting on upstream spec");
  assert.equal(gates.blocked?.blockedBy, "ART-123");
  assert.equal(gates.escalated, null);
});

test("readCrewBlockingGates returns escalated gate when set", async () => {
  const repo = await tmpRepo("al-gates-escalated-");
  await writeCrewState(repo, {
    currentRun: {
      gates: {
        escalation: { status: "escalated", note: "Need human", updatedAt: "2026-05-22T00:00:00Z" }
      }
    }
  });
  const gates = await readCrewBlockingGates(repo);
  assert.equal(gates.escalated?.status, "escalated");
  assert.equal(gates.escalated?.note, "Need human");
  assert.equal(gates.blocked, null);
});

test("checkStopConditions stops when crew run is escalated_to_human", async () => {
  const repo = await tmpRepo("al-stop-escalated-");
  await seedMinimalAlRepo(repo);
  await writeCrewState(repo, {
    currentRun: { gates: { escalation: { status: "escalated", note: "x" } } }
  });
  const result = await checkStopConditions(repo);
  assert.equal(result.shouldStop, true);
  assert.ok(result.reasons.some((r) => r.includes("escalated_to_human")));
  assert.equal(result.snapshot.crewEscalated, true);
});

test("checkStopConditions stops when crew run is blocked", async () => {
  const repo = await tmpRepo("al-stop-blocked-");
  await seedMinimalAlRepo(repo);
  await writeCrewState(repo, {
    currentRun: { gates: { blocked: { status: "blocked", note: "y", blockedBy: "ART-1" } } }
  });
  const result = await checkStopConditions(repo);
  assert.equal(result.shouldStop, true);
  assert.ok(result.reasons.some((r) => r.includes("blocked")));
  assert.equal(result.snapshot.crewBlocked, true);
});

test("checkStopConditions snapshot reports both flags false when crew gates clean", async () => {
  const repo = await tmpRepo("al-stop-clean-");
  await seedMinimalAlRepo(repo);
  // no crew state at all
  const result = await checkStopConditions(repo);
  assert.equal(result.snapshot.crewBlocked, false);
  assert.equal(result.snapshot.crewEscalated, false);
});

test("buildBrief surfaces crewGates in output", async () => {
  const repo = await tmpRepo("al-brief-gates-");
  await seedMinimalAlRepo(repo);
  await writeCrewState(repo, {
    currentRun: { gates: { blocked: { status: "blocked", note: "Brief test", blockedBy: null } } }
  });
  const brief = await buildBrief(repo);
  assert.equal(brief.crewGates.blocked?.note, "Brief test");
  assert.equal(brief.crewGates.escalated, null);
});
