import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  DEFAULT_STALE_BADGE_MAX_AGE_DAYS,
  evaluateBlockedBadgeStaleness,
  formatBlockedGateReason,
  formatStaleBlockedBadgeWarning,
  resolveStaleBadgeMaxAgeDays
} from "../scripts/lib/blocked-badge-staleness.mjs";

test("resolveStaleBadgeMaxAgeDays falls back to default when unset", () => {
  assert.equal(resolveStaleBadgeMaxAgeDays(null), DEFAULT_STALE_BADGE_MAX_AGE_DAYS);
  assert.equal(resolveStaleBadgeMaxAgeDays({ loop: {} }), DEFAULT_STALE_BADGE_MAX_AGE_DAYS);
  assert.equal(
    resolveStaleBadgeMaxAgeDays({ loop: { staleBadgeMaxAgeDays: 0 } }),
    DEFAULT_STALE_BADGE_MAX_AGE_DAYS
  );
});

test("resolveStaleBadgeMaxAgeDays honors a configured override", () => {
  assert.equal(resolveStaleBadgeMaxAgeDays({ loop: { staleBadgeMaxAgeDays: 7 } }), 7);
});

test("evaluateBlockedBadgeStaleness: fresh badge is not stale", () => {
  const now = Date.parse("2026-07-10T00:00:00Z");
  const badge = { updatedAt: "2026-07-09T12:00:00Z" }; // 0.5d old
  const result = evaluateBlockedBadgeStaleness(badge, null, now);
  assert.equal(result.stale, false);
  assert.equal(result.thresholdDays, DEFAULT_STALE_BADGE_MAX_AGE_DAYS);
  assert.ok(result.ageDays! < 1);
});

test("evaluateBlockedBadgeStaleness: badge older than threshold is stale", () => {
  const now = Date.parse("2026-07-10T00:00:00Z");
  const badge = { updatedAt: "2026-07-08T00:00:00Z" }; // 2d old, threshold 3 by default
  assert.equal(evaluateBlockedBadgeStaleness(badge, null, now).stale, false);
  // With a 1-day threshold override, the same badge is stale.
  const result = evaluateBlockedBadgeStaleness(badge, { loop: { staleBadgeMaxAgeDays: 1 } }, now);
  assert.equal(result.stale, true);
  assert.equal(result.thresholdDays, 1);
  assert.ok(result.ageDays! >= 1);
});

test("evaluateBlockedBadgeStaleness: missing or invalid updatedAt is fail-safe not-stale", () => {
  assert.equal(evaluateBlockedBadgeStaleness({}, null).stale, false);
  assert.equal(evaluateBlockedBadgeStaleness(null, null).stale, false);
  assert.equal(evaluateBlockedBadgeStaleness({ updatedAt: "not-a-date" }, null).stale, false);
});

test("formatBlockedGateReason includes updatedAt and the workflow-state path", () => {
  const reason = formatBlockedGateReason(
    { note: "waiting on artifact", updatedAt: "2026-07-08T00:00:00Z" },
    "/repo/.claude/state/crew/workflow-state.json"
  );
  assert.match(reason, /2026-07-08T00:00:00Z/);
  assert.match(reason, /\.claude[\\/]state[\\/]crew[\\/]workflow-state\.json/);
  assert.match(reason, /waiting on artifact/);
});

test("formatStaleBlockedBadgeWarning names updatedAt, age, note snippet, and path", () => {
  const staleness = {
    stale: true,
    ageDays: 5.2,
    thresholdDays: 3,
    updatedAt: "2026-07-05T00:00:00Z"
  };
  const longNote = "x".repeat(200);
  const warning = formatStaleBlockedBadgeWarning(
    { note: longNote, updatedAt: staleness.updatedAt },
    staleness,
    "/repo/.claude/state/crew/workflow-state.json"
  );
  assert.match(warning, /2026-07-05T00:00:00Z/);
  assert.match(warning, /5\.2d old/);
  assert.match(warning, /threshold 3d/);
  assert.match(warning, /\.claude[\\/]state[\\/]crew[\\/]workflow-state\.json/);
  // Note snippet capped to 120 chars, not the full 200.
  assert.ok(!warning.includes("x".repeat(130)));
  assert.ok(warning.includes("x".repeat(120)));
});
