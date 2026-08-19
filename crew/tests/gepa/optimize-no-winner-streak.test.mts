/**
 * tests/gepa/optimize-no-winner-streak.test.ts — SLICE-99
 *
 * Covers AC-7 (streak increments on no-winner, blocks at 3) and
 * AC-9 (winner resets streak to 0) — pure no-winner-streak-tracker.mts unit
 * coverage only.
 *
 * SLICE-22 (FEAT-005 P4, GEPA optimize/eval pipeline deletion) removed the
 * AC-8 (`gepa-resume`/`gepa-optimize` CLI integration) cases from this file
 * — they exercised gepa-optimize-cmd.mts, which was deleted along with the
 * rest of the optimize pipeline. The KEPT `gepa-resume` command
 * (runGepaResumeCmdExtended in gepa-killswitch-cmds.mts) has its own
 * coverage in gepa-resume-global.test.mts; resetStreak's plain streak-clear
 * behavior stays covered below (AC-8's non-CLI half).
 */

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkStreakHalt,
  getStreakCount,
  incrementStreak,
  resetStreak,
  NO_WINNER_STREAK_HALT
} from "../../scripts/lib/gepa/no-winner-streak-tracker.mjs";

function tmpStreakPath(): { repoPath: string; streakPath: string } {
  const repoPath = mkdtempSync(join(tmpdir(), "gepa-streak-"));
  const streakDir = join(repoPath, ".claude", "artifacts", "crew", "gepa");
  mkdirSync(streakDir, { recursive: true });
  const streakPath = join(streakDir, "no-winner-streak.json");
  return { repoPath, streakPath };
}

// ── Unit tests for streak tracker ──────────────────────────────────────────

describe("SLICE-99 AC-7 — streak tracker unit", () => {
  test("initial streak is 0", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    const count = getStreakCount("fullstack-dev", { repoPath, streakPath });
    expect(count).toBe(0);
  });

  test("increment increments streak by 1", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    const next = incrementStreak("fullstack-dev", { repoPath, streakPath });
    expect(next).toBe(1);
    expect(getStreakCount("fullstack-dev", { repoPath, streakPath })).toBe(1);
  });

  test("three increments → halted = true", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    const check = checkStreakHalt("fullstack-dev", { repoPath, streakPath });
    expect(check.halted).toBe(true);
    expect(check.streak).toBe(3);
  });

  test("two increments → halted = false", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    const check = checkStreakHalt("fullstack-dev", { repoPath, streakPath });
    expect(check.halted).toBe(false);
  });

  test("NO_WINNER_STREAK_HALT constant is 3", () => {
    expect(NO_WINNER_STREAK_HALT).toBe(3);
  });

  test("streaks are agent-scoped", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    // Reviewer is unaffected.
    const reviewerCheck = checkStreakHalt("reviewer", { repoPath, streakPath });
    expect(reviewerCheck.halted).toBe(false);
    expect(reviewerCheck.streak).toBe(0);
  });
});

// ── AC-8: gepa-resume clears streak ────────────────────────────────────────

describe("SLICE-99 AC-8 — gepa-resume clears streak", () => {
  test("resetStreak sets count to 0", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    expect(checkStreakHalt("fullstack-dev", { repoPath, streakPath }).halted).toBe(true);

    resetStreak("fullstack-dev", { repoPath, streakPath });
    expect(getStreakCount("fullstack-dev", { repoPath, streakPath })).toBe(0);
    expect(checkStreakHalt("fullstack-dev", { repoPath, streakPath }).halted).toBe(false);
  });
});

// ── AC-9: winner resets streak ─────────────────────────────────────────────

describe("SLICE-99 AC-9 — winner resets streak to 0", () => {
  test("resetStreak after any winning cycle resets to 0", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    // Pre-populate with 2 no-winner cycles.
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    expect(getStreakCount("fullstack-dev", { repoPath, streakPath })).toBe(2);

    // Simulate a winning cycle: resetStreak is called by the optimize runner.
    resetStreak("fullstack-dev", { repoPath, streakPath });
    expect(getStreakCount("fullstack-dev", { repoPath, streakPath })).toBe(0);
  });

  test("streak state is preserved across process restarts (persistent file)", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    // Write streak via one instance of the tracker.
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    incrementStreak("fullstack-dev", { repoPath, streakPath });

    // Read it via a fresh call (simulating new process).
    const count = getStreakCount("fullstack-dev", { repoPath, streakPath });
    expect(count).toBe(2);
  });

  test("streak file JSON is valid after atomic write", () => {
    const { repoPath, streakPath } = tmpStreakPath();
    incrementStreak("fullstack-dev", { repoPath, streakPath });
    const raw = readFileSync(streakPath, "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
    const parsed = JSON.parse(raw);
    expect(parsed["fullstack-dev"]).toBe(1);
  });
});
