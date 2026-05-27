import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/state/loop"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/crew/cost-insights"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function seedIterationCount(repo, count) {
  const target = path.join(repo, ".claude/state/loop/iteration.json");
  await fs.writeFile(
    target,
    JSON.stringify({ count, initializedAt: new Date().toISOString() }, null, 2)
  );
}

async function writeCrewWorkflow(repo, gates) {
  const target = path.join(repo, ".claude/state/crew/workflow-state.json");
  await fs.writeFile(
    target,
    JSON.stringify(
      {
        version: "1.0",
        updatedAt: new Date().toISOString(),
        currentRun: { id: "run-marathon-test", gates }
      },
      null,
      2
    )
  );
}

async function writeCostAdvise(repo, sliceId, content) {
  const dir = path.join(repo, ".claude/artifacts/crew/cost-insights");
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const filepath = path.join(dir, `${timestamp}-cost-advise-${sliceId}.md`);
  await fs.writeFile(filepath, content);
  return filepath;
}

const HIGH_COST_ADVISE = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus is 85% of spend.
- **Suggested action:** Switch to Sonnet.
`;

test("marathon=true (default): iteration cap reached → shouldStop=false, counter still in snapshot", async () => {
  const repo = await tmpRepo("marathon-cap-default-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 30);

  const config = { loop: { maxIterations: 25 } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, false, "should not stop on iteration cap when marathonMode default");
  assert.equal(out.iterationCapReached, true, "snapshot still flags cap reached");
  assert.equal(out.snapshot.iterationCount, 30);
  assert.equal(out.snapshot.iterationCap, 25);
  assert.equal(out.snapshot.marathonMode, true);
});

test("marathon=true: explicit marathonMode=true respects same behavior", async () => {
  const repo = await tmpRepo("marathon-cap-explicit-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 99);

  const config = { loop: { maxIterations: 25, marathonMode: true } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, false);
  assert.equal(out.snapshot.marathonMode, true);
});

test("marathon=true: crew blocked badge → advisory only, shouldStop=false", async () => {
  const repo = await tmpRepo("marathon-blocked-");
  await addFeature(repo, { title: "queued" });
  await writeCrewWorkflow(repo, {
    blocked: { status: "blocked", note: "waiting on artifact", blockedBy: "review_required" }
  });

  const out = await checkStopConditions(repo);

  assert.equal(out.shouldStop, false, "marathon mode treats soft blocked badge as advisory");
  assert.equal(out.snapshot.crewBlocked, true, "snapshot still reports blocked state");
});

test("marathon=true: crew escalated_to_human still halts the loop", async () => {
  const repo = await tmpRepo("marathon-escalated-");
  await addFeature(repo, { title: "queued" });
  await writeCrewWorkflow(repo, {
    escalation: { status: "escalated", note: "human review required" }
  });

  const out = await checkStopConditions(repo);

  assert.equal(out.shouldStop, true, "escalation is a hard external block even in marathon mode");
  assert.ok(
    out.reasons.some((r) => r.includes("escalated_to_human")),
    "reasons include escalation marker"
  );
  assert.equal(out.snapshot.crewEscalated, true);
});

test("marathon=true: warn pattern alert still halts the loop", async () => {
  const repo = await tmpRepo("marathon-warn-");
  await addFeature(repo, { title: "queued" });
  const orphan = await addFeature(repo, { title: "orphan" });
  await moveFeature(orphan.filePath, "in-progress");

  const out = await checkStopConditions(repo);

  assert.equal(out.shouldStop, true, "warn alerts still gate in marathon mode");
  assert.ok(out.blockers.some((b) => b.category === "in-progress-orphan"));
});

test("marathon=true: high-severity cost alert still halts the loop", async () => {
  const repo = await tmpRepo("marathon-cost-");
  await addFeature(repo, { title: "queued" });
  await writeCostAdvise(repo, "SLICE-01", HIGH_COST_ADVISE);

  const config = { loop: { costStopThreshold: 1 } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, true, "cost alerts still gate in marathon mode");
  assert.ok(out.reasons.some((r) => r.includes("cost_alert_high")));
});

test("marathon=false (legacy): iteration cap halts the loop", async () => {
  const repo = await tmpRepo("legacy-cap-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 30);

  const config = { loop: { maxIterations: 25, marathonMode: false } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, true, "legacy mode halts on iteration cap");
  assert.ok(out.reasons.some((r) => /iteration cap reached/.test(r)));
  assert.equal(out.iterationCapReached, true);
  assert.equal(out.snapshot.marathonMode, false);
});

test("marathon=false (legacy): crew blocked badge halts the loop", async () => {
  const repo = await tmpRepo("legacy-blocked-");
  await addFeature(repo, { title: "queued" });
  await writeCrewWorkflow(repo, {
    blocked: { status: "blocked", note: "waiting on artifact" }
  });

  const config = { loop: { marathonMode: false } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, true, "legacy mode halts on soft blocked badge");
  assert.ok(out.reasons.some((r) => /crew run blocked/.test(r)));
});

test("marathon snapshot field surfaces mode for dashboards", async () => {
  const repo = await tmpRepo("marathon-snapshot-");
  await addFeature(repo, { title: "queued" });

  const outDefault = await checkStopConditions(repo);
  assert.equal(outDefault.snapshot.marathonMode, true);

  const outLegacy = await checkStopConditions(repo, {
    config: { loop: { marathonMode: false } }
  });
  assert.equal(outLegacy.snapshot.marathonMode, false);
});
