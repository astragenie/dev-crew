// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { applyWarnAlertSignals } from "../scripts/lib/stop-conditions.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/state/loop"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: null,
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

// AC-4: applyWarnAlertSignals — autoMode + ignoredCategories demotes to suggestions
test("applyWarnAlertSignals: autoMode=true + ignoredCategories demotes alert to suggestions", () => {
  const warnAlerts = [
    {
      severity: "warn",
      category: "score-trend",
      message: "test_confidence below 0.8",
      suggested_action: "Review test coverage"
    }
  ];
  const blockers: any[] = [];
  const reasons: any[] = [];
  const suggestions: any[] = [];
  const demotedCount = { value: 0 };

  applyWarnAlertSignals(warnAlerts, blockers, reasons, {
    autoMode: true,
    ignoredCategories: ["score-trend"],
    suggestions,
    demotedCount
  });

  assert.equal(blockers.length, 0, "no blockers when alert is demoted");
  assert.equal(reasons.length, 0, "no halt reason when alert is demoted");
  assert.equal(suggestions.length, 1, "demoted alert goes to suggestions");
  assert.equal(demotedCount.value, 1, "demotedCount incremented");
});

// AC-4: demotedCount increments for each demoted alert
test("applyWarnAlertSignals: demotedCount increments per demoted alert", () => {
  const warnAlerts = [
    {
      severity: "warn",
      category: "score-trend",
      message: "obs below",
      suggested_action: "fix"
    },
    {
      severity: "warn",
      category: "score-trend",
      message: "test below",
      suggested_action: "fix"
    }
  ];
  const blockers: any[] = [];
  const reasons: any[] = [];
  const suggestions: any[] = [];
  const demotedCount = { value: 0 };

  applyWarnAlertSignals(warnAlerts, blockers, reasons, {
    autoMode: true,
    ignoredCategories: ["score-trend"],
    suggestions,
    demotedCount
  });

  assert.equal(demotedCount.value, 2);
  assert.equal(suggestions.length, 2);
  assert.equal(blockers.length, 0);
  assert.equal(reasons.length, 0);
});

// AC-6: non-listed category still halts even in autoMode
test("applyWarnAlertSignals: non-listed category still goes to blockers in autoMode", () => {
  const warnAlerts = [
    {
      severity: "warn",
      category: "in-progress-orphan",
      message: "FEAT-001 has no slice",
      suggested_action: "run slice from-feature"
    }
  ];
  const blockers: any[] = [];
  const reasons: any[] = [];
  const suggestions: any[] = [];
  const demotedCount = { value: 0 };

  applyWarnAlertSignals(warnAlerts, blockers, reasons, {
    autoMode: true,
    ignoredCategories: ["score-trend"], // in-progress-orphan NOT listed
    suggestions,
    demotedCount
  });

  assert.equal(blockers.length, 1, "non-listed category still halts");
  assert.equal(reasons.length, 1, "non-listed category adds halt reason");
  assert.equal(suggestions.length, 0, "not demoted to suggestions");
  assert.equal(demotedCount.value, 0, "count not incremented");
});

// AC-4: autoMode=false halts on all warn-alerts regardless of ignoredCategories
test("applyWarnAlertSignals: autoMode=false halts on all warn-alerts", () => {
  const warnAlerts = [
    {
      severity: "warn",
      category: "score-trend",
      message: "test below threshold",
      suggested_action: "fix"
    }
  ];
  const blockers: any[] = [];
  const reasons: any[] = [];
  const suggestions: any[] = [];
  const demotedCount = { value: 0 };

  applyWarnAlertSignals(warnAlerts, blockers, reasons, {
    autoMode: false,
    ignoredCategories: ["score-trend"],
    suggestions,
    demotedCount
  });

  assert.equal(blockers.length, 1, "autoMode=false halts on warn-alert");
  assert.equal(reasons.length, 1, "adds halt reason");
  assert.equal(suggestions.length, 0, "not demoted");
  assert.equal(demotedCount.value, 0, "not counted as demoted");
});

// AC-6: backward-compatible call (no options) halts as before
test("applyWarnAlertSignals: no options → original halt behavior preserved", () => {
  const warnAlerts = [
    {
      severity: "warn",
      category: "score-trend",
      message: "test below threshold",
      suggested_action: "fix"
    }
  ];
  const blockers: any[] = [];
  const reasons: any[] = [];

  applyWarnAlertSignals(warnAlerts, blockers, reasons);

  assert.equal(blockers.length, 1);
  assert.equal(reasons.length, 1);
});

// AC-4 + AC-6: mixed alerts — some demoted, some halt, in autoMode
test("applyWarnAlertSignals: mixed categories — some demoted, some halt in autoMode", () => {
  const warnAlerts = [
    {
      severity: "warn",
      category: "score-trend",
      message: "obs below",
      suggested_action: "fix"
    },
    {
      severity: "warn",
      category: "in-progress-orphan",
      message: "orphan",
      suggested_action: "link"
    }
  ];
  const blockers: any[] = [];
  const reasons: any[] = [];
  const suggestions: any[] = [];
  const demotedCount = { value: 0 };

  applyWarnAlertSignals(warnAlerts, blockers, reasons, {
    autoMode: true,
    ignoredCategories: ["score-trend"],
    suggestions,
    demotedCount
  });

  assert.equal(blockers.length, 1, "in-progress-orphan goes to blockers");
  assert.equal(reasons.length, 1, "one halt reason");
  assert.equal(suggestions.length, 1, "score-trend demoted to suggestions");
  assert.equal(demotedCount.value, 1, "one demoted");
});

// AC-6: checkStopConditions threads warnAlertCategoriesIgnoredInAutoMode through
test("checkStopConditions: score-trend alert demoted in autoMode, shouldStop=false", async () => {
  const repo = await tmpRepo("sc-demote-score-trend-");
  // Add a feature to avoid backlog-exhausted stop
  await addFeature(repo, { title: "queued" });
  // Add an in-progress orphan to trigger in-progress-orphan (non-score-trend) ... but
  // we need to generate a score-trend alert without real grade files.
  // We can't easily seed score-trend here without grade files. Instead, test
  // that when the config has warnAlertCategoriesIgnoredInAutoMode=["in-progress-orphan"]
  // and there is an in-progress orphan, it gets demoted.
  const orphan = await addFeature(repo, { title: "orphan" });
  await moveFeature(orphan.filePath, "in-progress");

  const config = {
    loop: {
      autoMode: true,
      warnAlertCategoriesIgnoredInAutoMode: ["in-progress-orphan"]
    }
  };
  const out = await checkStopConditions(repo, { config });

  assert.equal(out.shouldStop, false, "demoted alert should not halt");
  assert.equal(out.snapshot.warnAlertsDemoted, 1, "snapshot records demoted count");
});

// AC-6: warnAlertCategoriesIgnoredInAutoMode default is ['score-trend']
test("checkStopConditions: default warnAlertCategoriesIgnoredInAutoMode is score-trend", async () => {
  const repo = await tmpRepo("sc-default-ignored-");
  await addFeature(repo, { title: "queued" });
  // in-progress-orphan is NOT in default ignored list → should still halt
  const orphan = await addFeature(repo, { title: "orphan" });
  await moveFeature(orphan.filePath, "in-progress");

  const config = { loop: { autoMode: true } }; // no warnAlertCategoriesIgnoredInAutoMode
  const out = await checkStopConditions(repo, { config });

  assert.equal(
    out.shouldStop,
    true,
    "in-progress-orphan still halts (not in default ignored list)"
  );
  assert.ok(out.blockers.some((b) => b.category === "in-progress-orphan"));
});

// FEAT-181: marathon-checkpoint warn signal → advisory, no halt, snapshot populated
test("checkStopConditions: marathon-checkpoint warn → suggestion (advisory), no halt", async () => {
  const repo = await tmpRepo("sc-marathon-warn-");
  await addFeature(repo, { title: "queued" });
  // 2 grade files with marathonCheckpointEvery=2 → warn (not hard)
  const gradesDir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(gradesDir, { recursive: true });
  for (let i = 0; i < 2; i++) {
    const p = path.join(gradesDir, `slice-0${i}-grade.md`);
    await fs.writeFile(p, "---\nid: grade\n---\n");
    await fs.utimes(p, new Date(2_000_000 + i), new Date(2_000_000 + i));
  }
  // No retro file at all — anchor at epoch
  const config = { loop: { autoMode: true, marathonCheckpointEvery: 2 } };
  const out = await checkStopConditions(repo, { config });
  assert.equal(out.shouldStop, false, "warn level must NOT halt");
  assert.ok(out.snapshot.marathonCheckpoint, "snapshot exposes marathonCheckpoint entry");
  assert.equal(out.snapshot.marathonCheckpoint.level, "warn");
  assert.equal(out.snapshot.marathonCheckpoint.every, 2);
  assert.equal(out.snapshot.marathonCheckpoint.hardThreshold, 4);
  assert.ok(
    out.suggestions.some((s) => /marathon_checkpoint_due/.test(s)),
    "warn message goes to suggestions"
  );
});

// FEAT-181: marathon-checkpoint hard signal → halt + blocker
test("checkStopConditions: marathon-checkpoint hard → halt + blocker", async () => {
  const repo = await tmpRepo("sc-marathon-hard-");
  await addFeature(repo, { title: "queued" });
  const gradesDir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(gradesDir, { recursive: true });
  // 4 grade files with marathonCheckpointEvery=2 → hardThreshold=4 reached
  for (let i = 0; i < 4; i++) {
    const p = path.join(gradesDir, `slice-0${i}-grade.md`);
    await fs.writeFile(p, "---\nid: grade\n---\n");
    await fs.utimes(p, new Date(2_000_000 + i), new Date(2_000_000 + i));
  }
  const config = { loop: { autoMode: true, marathonCheckpointEvery: 2 } };
  const out = await checkStopConditions(repo, { config });
  assert.equal(out.shouldStop, true, "hard level MUST halt the loop");
  assert.equal(out.snapshot.marathonCheckpoint.level, "hard");
  assert.ok(
    out.reasons.some((r) => /marathon_checkpoint_required/.test(r)),
    "hard message goes to reasons"
  );
  assert.ok(
    out.blockers.some((b) => b.category === "marathon-checkpoint"),
    "hard adds a blocker entry"
  );
});

// FEAT-181: marathon-checkpoint quiet (below threshold) → no signal, snapshot null
test("checkStopConditions: marathon-checkpoint below threshold → null snapshot, no signal", async () => {
  const repo = await tmpRepo("sc-marathon-quiet-");
  await addFeature(repo, { title: "queued" });
  const gradesDir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(gradesDir, { recursive: true });
  // Only 1 grade with every=4 → below warn threshold
  const p = path.join(gradesDir, "slice-00-grade.md");
  await fs.writeFile(p, "---\nid: grade\n---\n");
  await fs.utimes(p, new Date(2_000_000), new Date(2_000_000));

  const out = await checkStopConditions(repo, { config: { loop: { autoMode: true } } });
  assert.equal(out.snapshot.marathonCheckpoint, null);
});

// W1-4: blocked-badge staleness policy applied to stop-conditions (previously
// only complete-slice.mts honored it; stop-conditions treated any blocked
// badge as live). autoMode must be false here since the blocked-badge halt
// branch is itself disabled in autoMode — see appendCrewGateSignals.

async function writeCrewState(repoPath: string, state: Record<string, any>) {
  const dir = path.join(repoPath, ".claude/state/crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "workflow-state.json"), JSON.stringify(state, null, 2));
}

test("checkStopConditions: fresh blocked badge still halts (unchanged)", async () => {
  const repo = await tmpRepo("sc-blocked-fresh-");
  await addFeature(repo, { title: "queued" });
  const updatedAt = new Date().toISOString();
  await writeCrewState(repo, {
    currentRun: {
      gates: { blocked: { status: "blocked", note: "waiting on unrelated run", updatedAt } }
    }
  });

  const out = await checkStopConditions(repo, { config: { loop: { autoMode: false } } });

  assert.equal(out.shouldStop, true, "fresh blocked badge halts as before");
  assert.ok(out.reasons.some((r: string) => r.includes("crew run blocked")));
  assert.equal(out.snapshot.crewBlocked, true);
});

test("checkStopConditions: stale blocked badge downgrades to a warning, does not halt", async () => {
  const repo = await tmpRepo("sc-blocked-stale-");
  await addFeature(repo, { title: "queued" });
  // 5 days old — past the default 3-day threshold.
  const staleUpdatedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  await writeCrewState(repo, {
    currentRun: {
      gates: {
        blocked: { status: "blocked", note: "long-resolved run", updatedAt: staleUpdatedAt }
      }
    }
  });

  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (msg: unknown) => {
    warnings.push(String(msg));
  };
  let out;
  try {
    out = await checkStopConditions(repo, { config: { loop: { autoMode: false } } });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(out.shouldStop, false, "stale blocked badge should not halt");
  assert.ok(!out.reasons.some((r: string) => r.includes("crew run blocked")));
  assert.equal(out.snapshot.crewBlocked, false, "snapshot no longer reports it as blocking");
  assert.ok(
    warnings.some((w) => w.includes("stale-blocked-badge") && w.includes(staleUpdatedAt)),
    `expected a stale-blocked-badge warning, got: ${JSON.stringify(warnings)}`
  );
});

test("checkStopConditions: staleBadgeMaxAgeDays threshold is configurable", async () => {
  const repo = await tmpRepo("sc-blocked-threshold-");
  await addFeature(repo, { title: "queued" });
  // 2 days old.
  const twoDaysOld = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await writeCrewState(repo, {
    currentRun: {
      gates: { blocked: { status: "blocked", note: "2 days old", updatedAt: twoDaysOld } }
    }
  });

  // Default threshold (3d): a 2d-old badge is still fresh enough to halt.
  const defaultOut = await checkStopConditions(repo, { config: { loop: { autoMode: false } } });
  assert.equal(defaultOut.shouldStop, true);

  // Override the threshold to 1 day: the same-age badge is now stale.
  const overriddenOut = await checkStopConditions(repo, {
    config: { loop: { autoMode: false, staleBadgeMaxAgeDays: 1 } }
  });
  assert.equal(
    overriddenOut.shouldStop,
    false,
    "1-day threshold should treat the 2d-old badge as stale"
  );
});

test("checkStopConditions: escalated badge is never downgraded by staleness", async () => {
  const repo = await tmpRepo("sc-escalated-stale-");
  await addFeature(repo, { title: "queued" });
  const staleUpdatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await writeCrewState(repo, {
    currentRun: {
      gates: {
        escalation: { status: "escalated", note: "needs a human", updatedAt: staleUpdatedAt }
      }
    }
  });

  const out = await checkStopConditions(repo, { config: { loop: { autoMode: true } } });

  assert.equal(out.shouldStop, true, "escalation halts even in autoMode, regardless of age");
  assert.ok(out.reasons.some((r: string) => r.includes("escalated_to_human")));
});
