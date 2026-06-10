// Tests for SLICE-54: session-pin walker (FEAT-056).
// Covers: checkSessionDrift fail-open, same-session pass, different-session
// halt, stop-check integration, --allow-cross-session override flag, and
// brief.sessionDrift field.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { checkSessionDrift } from "../scripts/lib/session-drift.mjs";
import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { buildBrief } from "../scripts/lib/brief.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  // Seed a pending FEAT so backlog-exhausted does not trip tests.
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    `---\nid: FEAT-001\nstatus: pending\n---\n# Test Feature\n`
  );
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      }
    })
  );
  return repo;
}

async function writeWorkflowState(repo: string, sessionId: string | null): Promise<void> {
  const state: any = {
    version: "1.0",
    updatedAt: new Date().toISOString(),
    currentRun: {
      title: "Test run",
      mode: "autonomous",
      status: "active",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  if (sessionId !== undefined) {
    state.currentRun.sessionId = sessionId;
  }
  const stateDir = path.join(repo, ".claude/state/crew");
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(path.join(stateDir, "workflow-state.json"), JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// checkSessionDrift unit tests
// ---------------------------------------------------------------------------

test("checkSessionDrift: missing CLAUDE_SESSION_ID env var → null (fail-open)", async () => {
  const repo = await tmpRepo("sd-no-env-");
  const saved = process.env.CLAUDE_SESSION_ID;
  try {
    delete process.env.CLAUDE_SESSION_ID;
    const signal = await checkSessionDrift(repo);
    assert.equal(signal, null, "should fail-open when env var is missing");
  } finally {
    if (saved !== undefined) process.env.CLAUDE_SESSION_ID = saved;
  }
});

test("checkSessionDrift: no stored sessionId → null (fail-open)", async () => {
  const repo = await tmpRepo("sd-no-stored-");
  process.env.CLAUDE_SESSION_ID = "session-abc";
  try {
    // workflow-state has no sessionId field
    await writeWorkflowState(repo, null);
    const state = JSON.parse(
      await fs.readFile(path.join(repo, ".claude/state/crew/workflow-state.json"), "utf8")
    );
    // Remove sessionId from state so it's truly absent
    delete state.currentRun.sessionId;
    await fs.writeFile(
      path.join(repo, ".claude/state/crew/workflow-state.json"),
      JSON.stringify(state, null, 2)
    );
    const signal = await checkSessionDrift(repo);
    assert.equal(signal, null, "should fail-open when no stored sessionId");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("checkSessionDrift: no workflow-state file → null (fail-open)", async () => {
  const repo = await tmpRepo("sd-no-state-");
  process.env.CLAUDE_SESSION_ID = "session-abc";
  try {
    // No workflow-state.json file at all
    const signal = await checkSessionDrift(repo);
    assert.equal(signal, null, "should fail-open when workflow-state is missing");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("checkSessionDrift: same session → null (pass-through)", async () => {
  const repo = await tmpRepo("sd-same-session-");
  process.env.CLAUDE_SESSION_ID = "session-xyz";
  try {
    await writeWorkflowState(repo, "session-xyz");
    const signal = await checkSessionDrift(repo);
    assert.equal(signal, null, "should return null when session IDs match");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("checkSessionDrift: different session → returns SessionDriftSignal", async () => {
  const repo = await tmpRepo("sd-different-session-");
  process.env.CLAUDE_SESSION_ID = "session-new";
  try {
    await writeWorkflowState(repo, "session-old");
    const signal = await checkSessionDrift(repo);
    assert.ok(signal, "should return signal when sessions differ");
    assert.equal(signal!.triggered, true);
    assert.equal(signal!.sessionIdAtStart, "session-old");
    assert.equal(signal!.sessionIdNow, "session-new");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

// ---------------------------------------------------------------------------
// stop-conditions integration
// ---------------------------------------------------------------------------

test("checkStopConditions: stops with session_drift_stop when session differs", async () => {
  const repo = await tmpRepo("sd-stop-check-");
  process.env.CLAUDE_SESSION_ID = "session-new";
  try {
    await writeWorkflowState(repo, "session-old");
    const result = await checkStopConditions(repo, { config: { loop: {} } });

    assert.equal(result.shouldStop, true, "should stop on session drift");
    const driftReason = result.reasons.find((r: string) => r.includes("session_drift_stop"));
    assert.ok(driftReason, "should include session_drift_stop in reasons");
    assert.ok(
      result.snapshot.sessionDrift !== null && result.snapshot.sessionDrift !== undefined,
      "snapshot.sessionDrift should be non-null"
    );
    assert.equal(result.snapshot.sessionDrift?.triggered, true);
    assert.equal(result.snapshot.sessionDrift?.sessionIdAtStart, "session-old");
    assert.equal(result.snapshot.sessionDrift?.sessionIdNow, "session-new");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("checkStopConditions: does NOT stop on session drift when sessions match", async () => {
  const repo = await tmpRepo("sd-stop-check-match-");
  process.env.CLAUDE_SESSION_ID = "session-same";
  try {
    await writeWorkflowState(repo, "session-same");
    const result = await checkStopConditions(repo, { config: { loop: {} } });

    const hasDriftReason = result.reasons.some((r: string) => r.includes("session_drift_stop"));
    assert.equal(hasDriftReason, false, "should not stop when sessions match");
    assert.equal(result.snapshot.sessionDrift, null, "snapshot.sessionDrift should be null");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("checkStopConditions: fail-open when CLAUDE_SESSION_ID missing", async () => {
  const repo = await tmpRepo("sd-stop-check-no-env-");
  const saved = process.env.CLAUDE_SESSION_ID;
  try {
    delete process.env.CLAUDE_SESSION_ID;
    await writeWorkflowState(repo, "session-old");
    const result = await checkStopConditions(repo, { config: { loop: {} } });

    const hasDriftReason = result.reasons.some((r: string) => r.includes("session_drift_stop"));
    assert.equal(hasDriftReason, false, "should fail-open when env var missing");
    assert.equal(result.snapshot.sessionDrift, null, "snapshot.sessionDrift should be null");
  } finally {
    if (saved !== undefined) process.env.CLAUDE_SESSION_ID = saved;
  }
});

// ---------------------------------------------------------------------------
// brief.sessionDrift field
// ---------------------------------------------------------------------------

test("buildBrief: sessionDrift field is null when no drift", async () => {
  const repo = await tmpRepo("sd-brief-no-drift-");
  process.env.CLAUDE_SESSION_ID = "session-same";
  try {
    await writeWorkflowState(repo, "session-same");
    const brief = await buildBrief(repo);
    assert.ok("sessionDrift" in brief, "brief should have sessionDrift field");
    assert.equal(brief.sessionDrift, null, "sessionDrift should be null when no drift");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("buildBrief: sessionDrift field is populated when drift detected", async () => {
  const repo = await tmpRepo("sd-brief-drift-");
  process.env.CLAUDE_SESSION_ID = "session-new";
  try {
    await writeWorkflowState(repo, "session-old");
    const brief = await buildBrief(repo);
    assert.ok("sessionDrift" in brief, "brief should have sessionDrift field");
    assert.ok(brief.sessionDrift !== null, "sessionDrift should be populated when drift detected");
    assert.equal(brief.sessionDrift?.triggered, true);
    assert.equal(brief.sessionDrift?.sessionIdAtStart, "session-old");
    assert.equal(brief.sessionDrift?.sessionIdNow, "session-new");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

// ---------------------------------------------------------------------------
// slice-start writes sessionId to workflow-state
// ---------------------------------------------------------------------------

test("slice-start: writeSessionIdToWorkflowState writes sessionId when CLAUDE_SESSION_ID set", async () => {
  const repo = await tmpRepo("sd-write-session-");
  process.env.CLAUDE_SESSION_ID = "session-write-test";
  try {
    const { writeSessionIdToWorkflowState } = await import("../scripts/lib/session-drift.mjs");
    await writeSessionIdToWorkflowState(repo);

    const stateRaw = await fs.readFile(
      path.join(repo, ".claude/state/crew/workflow-state.json"),
      "utf8"
    );
    const state = JSON.parse(stateRaw);
    assert.equal(
      state.currentRun?.sessionId,
      "session-write-test",
      "sessionId should be written to currentRun"
    );
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("slice-start: writeSessionIdToWorkflowState no-ops when CLAUDE_SESSION_ID missing", async () => {
  const repo = await tmpRepo("sd-write-session-no-env-");
  const saved = process.env.CLAUDE_SESSION_ID;
  try {
    delete process.env.CLAUDE_SESSION_ID;
    const { writeSessionIdToWorkflowState } = await import("../scripts/lib/session-drift.mjs");
    // Should not throw
    await assert.doesNotReject(() => writeSessionIdToWorkflowState(repo));
    // workflow-state should not be created if it didn't exist
    const exists = await fs
      .access(path.join(repo, ".claude/state/crew/workflow-state.json"))
      .then(() => true)
      .catch(() => false);
    assert.equal(exists, false, "should not create workflow-state.json when env var missing");
  } finally {
    if (saved !== undefined) process.env.CLAUDE_SESSION_ID = saved;
  }
});

test("slice-start: writeSessionIdToWorkflowState merges into existing state", async () => {
  const repo = await tmpRepo("sd-write-session-merge-");
  process.env.CLAUDE_SESSION_ID = "session-merge";
  try {
    // Write existing state WITHOUT sessionId
    await writeWorkflowState(repo, null);
    const before = JSON.parse(
      await fs.readFile(path.join(repo, ".claude/state/crew/workflow-state.json"), "utf8")
    );
    delete before.currentRun.sessionId;
    await fs.writeFile(
      path.join(repo, ".claude/state/crew/workflow-state.json"),
      JSON.stringify(before, null, 2)
    );

    const { writeSessionIdToWorkflowState } = await import("../scripts/lib/session-drift.mjs");
    await writeSessionIdToWorkflowState(repo);

    const after = JSON.parse(
      await fs.readFile(path.join(repo, ".claude/state/crew/workflow-state.json"), "utf8")
    );
    assert.equal(
      after.currentRun?.sessionId,
      "session-merge",
      "sessionId merged into existing state"
    );
    assert.equal(after.currentRun?.title, "Test run", "existing fields preserved");
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

// ---------------------------------------------------------------------------
// allowCrossSession override flag (FEAT-056 AC-4)
// ---------------------------------------------------------------------------

async function seedTriagedFeat(repo: string, id: string): Promise<void> {
  const dir = path.join(repo, ".claude/artifacts/loop/backlog/triaged");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${id}.md`),
    `---\nid: ${id}\nstatus: triaged\npriority: P2\nautonomous_safe: true\ncomposite_score: 0.5\n---\n# Test Feature\n`
  );
}

test("runAutoWalker: allowCrossSession=true bypasses session_drift_stop and continues", async () => {
  const repo = await tmpRepo("sd-walker-bypass-");
  process.env.CLAUDE_SESSION_ID = "session-new";
  try {
    await writeWorkflowState(repo, "session-old");
    await seedTriagedFeat(repo, "FEAT-100");
    const { runAutoWalker } = await import("../scripts/lib/auto-walker.mjs");
    const result = await runAutoWalker(repo, {
      dryRun: true,
      autoMode: false,
      allowCrossSession: true
    });
    assert.equal(result.halted, false, "should NOT halt with override flag set");
    // Audit log should contain a session-drift-override event with timestamp
    const auditPath = path.join(repo, ".claude/artifacts/loop/auto-dispatch.jsonl");
    const auditExists = await fs
      .access(auditPath)
      .then(() => true)
      .catch(() => false);
    if (auditExists) {
      const lines = (await fs.readFile(auditPath, "utf8")).trim().split("\n");
      const override = lines
        .map((l) => JSON.parse(l))
        .find((e) => e.event === "session-drift-override");
      assert.ok(override, "override audit event must be present");
      assert.ok(typeof override.timestamp === "string", "override event must include timestamp");
      assert.equal(override.sessionIdAtStart, "session-old");
      assert.equal(override.sessionIdNow, "session-new");
    }
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});

test("runAutoWalker: allowCrossSession=false halts on session_drift_stop", async () => {
  const repo = await tmpRepo("sd-walker-no-bypass-");
  process.env.CLAUDE_SESSION_ID = "session-new";
  try {
    await writeWorkflowState(repo, "session-old");
    await seedTriagedFeat(repo, "FEAT-101");
    const { runAutoWalker } = await import("../scripts/lib/auto-walker.mjs");
    const result = await runAutoWalker(repo, {
      dryRun: true,
      autoMode: false,
      allowCrossSession: false
    });
    assert.equal(result.halted, true, "should halt without override flag");
    assert.ok(
      result.stopReason && result.stopReason.startsWith("session_drift_stop"),
      `expected session_drift_stop, got: ${result.stopReason}`
    );
  } finally {
    delete process.env.CLAUDE_SESSION_ID;
  }
});
