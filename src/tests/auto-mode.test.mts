import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";

async function tmpRepo(prefix: string) {
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

async function seedIterationCount(repo: string, count: number) {
  const target = path.join(repo, ".claude/state/loop/iteration.json");
  await fs.writeFile(
    target,
    JSON.stringify({ count, initializedAt: new Date().toISOString() }, null, 2)
  );
}

async function writeCrewWorkflow(repo: string, gates: Record<string, any>) {
  const target = path.join(repo, ".claude/state/crew/workflow-state.json");
  await fs.writeFile(
    target,
    JSON.stringify(
      {
        version: "1.0",
        updatedAt: new Date().toISOString(),
        currentRun: { id: "run-auto-mode-test", gates }
      },
      null,
      2
    )
  );
}

async function writeCostAdvise(repo: string, sliceId: string, content: string) {
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

test("auto mode (default): iteration cap reached → shouldStop=false, counter still in snapshot", async () => {
  const repo = await tmpRepo("auto-cap-default-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 30);

  const config = { loop: { maxIterations: 25 } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, false, "should not stop on iteration cap when autoMode default");
  assert.equal(out.iterationCapReached, true, "snapshot still flags cap reached");
  assert.equal(out.snapshot.iterationCount, 30);
  assert.equal(out.snapshot.iterationCap, 25);
  assert.equal(out.snapshot.autoMode, true);
});

test("auto mode: explicit autoMode=true respects same behavior", async () => {
  const repo = await tmpRepo("auto-cap-explicit-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 99);

  const config = { loop: { maxIterations: 25, autoMode: true } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, false);
  assert.equal(out.snapshot.autoMode, true);
});

test("auto mode: crew blocked badge → advisory only, shouldStop=false", async () => {
  const repo = await tmpRepo("auto-blocked-");
  await addFeature(repo, { title: "queued" });
  await writeCrewWorkflow(repo, {
    blocked: { status: "blocked", note: "waiting on artifact", blockedBy: "review_required" }
  });

  const out = await checkStopConditions(repo);

  assert.equal(out.shouldStop, false, "auto mode treats soft blocked badge as advisory");
  assert.equal(out.snapshot.crewBlocked, true, "snapshot still reports blocked state");
});

test("auto mode: crew escalated_to_human still halts the loop", async () => {
  const repo = await tmpRepo("auto-escalated-");
  await addFeature(repo, { title: "queued" });
  await writeCrewWorkflow(repo, {
    escalation: { status: "escalated", note: "human review required" }
  });

  const out = await checkStopConditions(repo);

  assert.equal(out.shouldStop, true, "escalation is a hard external block even in auto mode");
  assert.ok(
    out.reasons.some((r: string) => r.includes("escalated_to_human")),
    "reasons include escalation marker"
  );
  assert.equal(out.snapshot.crewEscalated, true);
});

test("auto mode: warn pattern alert still halts the loop", async () => {
  const repo = await tmpRepo("auto-warn-");
  await addFeature(repo, { title: "queued" });
  const orphan = await addFeature(repo, { title: "orphan" });
  await moveFeature(orphan.filePath, "in-progress");

  const out = await checkStopConditions(repo);

  assert.equal(out.shouldStop, true, "warn alerts still gate in auto mode");
  assert.ok(out.blockers.some((b: Record<string, any>) => b.category === "in-progress-orphan"));
});

test("auto mode: high-severity cost alert emits as advisory suggestion (no halt)", async () => {
  const repo = await tmpRepo("auto-cost-");
  await addFeature(repo, { title: "queued" });
  await writeCostAdvise(repo, "SLICE-01", HIGH_COST_ADVISE);

  const out = await checkStopConditions(repo, { config: { loop: {} } });

  assert.equal(out.shouldStop, false, "cost alerts demoted to advisory; never halt");
  assert.ok(
    out.suggestions.some((s: string) => s.includes("cost_alert_high")),
    "cost_alert_high should appear in suggestions"
  );
  assert.equal(
    out.reasons.some((r: string) => r.includes("cost_alert_high")),
    false,
    "cost_alert_high must NOT appear in halt reasons"
  );
});

test("legacy mode (autoMode=false): iteration cap halts the loop", async () => {
  const repo = await tmpRepo("legacy-cap-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 30);

  const config = { loop: { maxIterations: 25, autoMode: false } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, true, "legacy mode halts on iteration cap");
  assert.ok(out.reasons.some((r: string) => /iteration cap reached/.test(r)));
  assert.equal(out.iterationCapReached, true);
  assert.equal(out.snapshot.autoMode, false);
});

test("legacy mode (autoMode=false): crew blocked badge halts the loop", async () => {
  const repo = await tmpRepo("legacy-blocked-");
  await addFeature(repo, { title: "queued" });
  await writeCrewWorkflow(repo, {
    blocked: { status: "blocked", note: "waiting on artifact" }
  });

  const config = { loop: { autoMode: false } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, true, "legacy mode halts on soft blocked badge");
  assert.ok(out.reasons.some((r: string) => /crew run blocked/.test(r)));
});

test("snapshot field surfaces autoMode for dashboards", async () => {
  const repo = await tmpRepo("auto-snapshot-");
  await addFeature(repo, { title: "queued" });

  const outDefault = await checkStopConditions(repo);
  assert.equal(outDefault.snapshot.autoMode, true);

  const outLegacy = await checkStopConditions(repo, {
    config: { loop: { autoMode: false } }
  });
  assert.equal(outLegacy.snapshot.autoMode, false);
});

// Back-compat: deprecated marathonMode alias still accepted
test("back-compat: only marathonMode key in config → autoMode behavior matches", async () => {
  const repo = await tmpRepo("bc-marathonMode-only-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 30);

  // Using deprecated marathonMode key — should behave identically to autoMode
  const configLegacy = { loop: { maxIterations: 25, marathonMode: true } };
  const outLegacy = await checkStopConditions(repo, { config: configLegacy });

  const configNew = { loop: { maxIterations: 25, autoMode: true } };
  const outNew = await checkStopConditions(repo, { config: configNew });

  assert.equal(outLegacy.shouldStop, false, "marathonMode=true → shouldStop=false");
  assert.equal(outNew.shouldStop, false, "autoMode=true → shouldStop=false");
  assert.equal(
    outLegacy.snapshot.autoMode,
    true,
    "deprecated key still sets autoMode=true in snapshot"
  );
});

test("back-compat: marathonMode=false halts iteration cap (same as autoMode=false)", async () => {
  const repo = await tmpRepo("bc-marathonMode-false-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 30);

  const config = { loop: { maxIterations: 25, marathonMode: false } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, true, "deprecated marathonMode=false still halts on cap");
  assert.equal(out.snapshot.autoMode, false, "snapshot reflects autoMode=false");
  assert.ok(out.reasons.some((r: string) => /iteration cap reached/.test(r)));
});

test("back-compat: autoMode wins when both keys set with conflicting values", async () => {
  const repo = await tmpRepo("bc-conflict-");
  await addFeature(repo, { title: "queued" });
  await seedIterationCount(repo, 30);

  // autoMode=false should win over marathonMode=true
  const config = { loop: { maxIterations: 25, autoMode: false, marathonMode: true } };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, true, "autoMode=false wins over marathonMode=true");
  assert.equal(out.snapshot.autoMode, false, "snapshot reflects autoMode=false");
});
