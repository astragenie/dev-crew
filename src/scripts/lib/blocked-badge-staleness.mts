// Staleness policy for the crew `workflow-state.json` `gates.blocked` badge
// (QW3, 2026-07-10 incident). A `blocked` badge left over from a
// long-resolved run silently held every subsequent feature->done roll,
// echoing only the note text — the operator had to grep for it to find the
// source. This module scores badge age against a configurable threshold and
// formats the two operator-facing messages (a downgrade warning, and the
// still-blocking reason) so both name the badge's updatedAt and the state
// file path.

export const DEFAULT_STALE_BADGE_MAX_AGE_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOTE_SNIPPET_LEN = 120;

export interface BlockedBadgeLike {
  status?: string;
  note?: string;
  blockedBy?: string | null;
  updatedAt?: string;
}

export interface BlockedBadgeStaleness {
  stale: boolean;
  ageDays: number | null;
  thresholdDays: number;
  updatedAt: string | null;
}

/** Reads `loop.staleBadgeMaxAgeDays` off an already-resolved config object. */
export function resolveStaleBadgeMaxAgeDays(config: Record<string, any> | null): number {
  const raw = config?.loop?.staleBadgeMaxAgeDays;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0
    ? raw
    : DEFAULT_STALE_BADGE_MAX_AGE_DAYS;
}

/**
 * A badge with no parseable `updatedAt` is treated as not-stale (fail-safe):
 * we can't measure age we don't have, so it keeps blocking exactly as before
 * rather than being silently downgraded.
 */
export function evaluateBlockedBadgeStaleness(
  badge: BlockedBadgeLike | null,
  config: Record<string, any> | null,
  now: number = Date.now()
): BlockedBadgeStaleness {
  const thresholdDays = resolveStaleBadgeMaxAgeDays(config);
  const updatedAt = badge?.updatedAt ?? null;
  if (!updatedAt) {
    return { stale: false, ageDays: null, thresholdDays, updatedAt: null };
  }
  const updatedMs = Date.parse(updatedAt);
  if (Number.isNaN(updatedMs)) {
    return { stale: false, ageDays: null, thresholdDays, updatedAt };
  }
  const ageDays = (now - updatedMs) / MS_PER_DAY;
  return { stale: ageDays >= thresholdDays, ageDays, thresholdDays, updatedAt };
}

/** Console warning emitted when a stale badge is downgraded and the roll proceeds. */
export function formatStaleBlockedBadgeWarning(
  badge: BlockedBadgeLike,
  staleness: BlockedBadgeStaleness,
  workflowStatePath: string
): string {
  const noteSnippet = (badge.note || "").slice(0, NOTE_SNIPPET_LEN);
  const ageDays = staleness.ageDays !== null ? staleness.ageDays.toFixed(1) : "unknown";
  return (
    `[stale-blocked-badge] gates.blocked updatedAt=${staleness.updatedAt ?? "unknown"} ` +
    `is ${ageDays}d old (threshold ${staleness.thresholdDays}d) — downgrading to a warning, ` +
    `feature roll proceeds. note: "${noteSnippet}" — clear it in ${workflowStatePath} or re-block.`
  );
}

/** Skip-reason text used when a `blocked` badge still holds the roll (any age). */
export function formatBlockedGateReason(
  badge: BlockedBadgeLike | null,
  workflowStatePath: string
): string {
  const note = badge?.note || "";
  const updatedAt = badge?.updatedAt || "unknown";
  return `crew run blocked: ${note} (updatedAt: ${updatedAt}, state: ${workflowStatePath})`;
}
