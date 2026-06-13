// Tests for FEAT-065 / SLICE-61: --explain-halts renderer.
// Covers: all-null path, each single-halt path, multi-halt combined render,
// malformed snapshot (graceful degrade), brief-vs-snapshot lookup, unknown
// fields (registry iteration ignores them).

import { test } from "bun:test";
import assert from "node:assert/strict";

import { explainHalts, HALT_BADGES } from "../scripts/lib/halt-badges.mjs";

test("explainHalts: all halt-badges null → 'No halts active.'", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /^## Halt summary/);
  assert.match(out, /No halts active\./);
  assert.equal(out.includes("Cost regression"), false);
});

test("explainHalts: missing snapshot AND missing top-level → 'No halts active.'", () => {
  const out = explainHalts({});
  assert.match(out, /No halts active\./);
});

test("explainHalts: costRegression populated → renders gate name + values + action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: {
        triggered: true,
        currentUsd: 150.5,
        medianUsd: 47.13,
        thresholdUsd: 141.39,
        multiplier: 3,
        window: 5,
        sampleCount: 5
      },
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Cost regression/);
  assert.match(out, /\$150\.50/);
  assert.match(out, /\$47\.13/);
  assert.match(out, /multiplier 3/);
  assert.match(out, /costRegressionMultiplier/);
});

test("explainHalts: sessionDrift populated → renders both sessionIds + override action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: {
        triggered: true,
        sessionIdAtStart: "sess-old",
        sessionIdNow: "sess-new"
      },
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Session drift/);
  assert.match(out, /sess-old/);
  assert.match(out, /sess-new/);
  assert.match(out, /--allow-cross-session/);
});

test("explainHalts: sliceCostCeiling populated → renders actual vs ceiling + action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: { exceeded: true, actualUsd: 200.25, ceilingUsd: 150 },
      gradeTrend: null
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Slice cost ceiling/);
  assert.match(out, /\$200\.25/);
  assert.match(out, /\$150\.00/);
  assert.match(out, /costSliceCeiling/);
});

test("explainHalts: gradeTrend populated → renders consecutiveBelow + threshold + action", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: { consecutiveBelow: 3, threshold: 0.8 }
    }
  };
  const out = explainHalts(brief);
  assert.match(out, /### Grade trend/);
  assert.match(out, /Consecutive slices below threshold: 3/);
  assert.match(out, /Threshold: 0\.8/);
  assert.match(out, /warnAlertCategoriesIgnoredInAutoMode/);
});

test("explainHalts: multiple halts → renders ALL fired in registry order", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: {
        triggered: true,
        currentUsd: 100,
        medianUsd: 20,
        thresholdUsd: 60,
        multiplier: 3,
        window: 5,
        sampleCount: 5
      },
      sessionDrift: { triggered: true, sessionIdAtStart: "a", sessionIdNow: "b" },
      sliceCostCeiling: { exceeded: true, actualUsd: 80, ceilingUsd: 75 },
      gradeTrend: { consecutiveBelow: 3, threshold: 0.8 },
      mergeFailed: {
        slice: "SLICE-64",
        feature: "FEAT-062",
        failedStep: "rebase",
        code: "REBASE_CONFLICT",
        attemptedBranch: "slice/SLICE-64",
        attemptedWorktree: "/tmp/worktree"
      },
      redundantReadStop: {
        triggered: true,
        maxReadCount: 30,
        path: "/repo/CLAUDE.md",
        sessionId: "abc123",
        threshold: 5,
        offendingPathCount: 1
      },
      marathonCheckpoint: {
        level: "hard",
        closesSinceCheckpoint: 8,
        every: 4,
        hardThreshold: 8,
        lastRetroPath: "/repo/.claude/artifacts/loop/retrospectives/2026-06-10.md"
      },
      pausedForExternalEvent: {
        triggered: true,
        reason: "waiting for CI",
        resumeHint: "Run: bun src/scripts/loop.mts resume --repo .",
        pausedAt: "2026-06-13T12:00:00.000Z"
      },
      stuckDetected: {
        sliceId: "SLICE-119",
        attempts: 3,
        threshold: 3,
        lastAttemptAt: "2026-06-13T12:00:00.000Z"
      }
    }
  };
  const out = explainHalts(brief);
  // All gate headings present
  for (const badge of HALT_BADGES) {
    assert.ok(
      out.includes(`### ${badge.gateName}`),
      `expected gate heading for ${badge.field} in output`
    );
  }
  // Order matches HALT_BADGES order
  const positions = HALT_BADGES.map((b) => out.indexOf(`### ${b.gateName}`));
  for (let i = 1; i < positions.length; i++) {
    assert.ok(
      positions[i]! > positions[i - 1]!,
      `expected ${HALT_BADGES[i]!.gateName} to appear after ${HALT_BADGES[i - 1]!.gateName}`
    );
  }
});

test("explainHalts: top-level fields (loop brief shape, not stop-check) also detected", () => {
  // loop brief currently surfaces costRegression + sessionDrift at top level.
  const brief: Record<string, any> = {
    costRegression: {
      triggered: true,
      currentUsd: 50,
      medianUsd: 10,
      thresholdUsd: 30,
      multiplier: 3,
      window: 5,
      sampleCount: 5
    },
    sessionDrift: null
  };
  const out = explainHalts(brief);
  assert.match(out, /### Cost regression/);
});

test("explainHalts: malformed snapshot field (missing inner fields) does not crash", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: { triggered: true }, // no numeric fields
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null
    }
  };
  // Should not throw — undefined values render as 'undefined' but no exception
  const out = explainHalts(brief);
  assert.match(out, /### Cost regression/);
});

test("explainHalts: unknown registry field on snapshot is ignored (graceful degrade)", () => {
  const brief: Record<string, any> = {
    snapshot: {
      costRegression: null,
      sessionDrift: null,
      sliceCostCeiling: null,
      gradeTrend: null,
      futureHalt: { triggered: true, someValue: 42 }
    }
  };
  const out = explainHalts(brief);
  // No registry entry → No halts rendered
  assert.match(out, /No halts active\./);
  assert.equal(out.includes("futureHalt"), false);
});

test("HALT_BADGES registry has the 9 known fields in expected order", () => {
  const fields = HALT_BADGES.map((b) => b.field);
  assert.deepEqual(fields, [
    "costRegression",
    "sessionDrift",
    "sliceCostCeiling",
    "gradeTrend",
    "mergeFailed",
    "redundantReadStop",
    "marathonCheckpoint",
    "pausedForExternalEvent",
    "stuckDetected"
  ]);
});
