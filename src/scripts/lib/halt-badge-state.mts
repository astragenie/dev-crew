import fs from "node:fs/promises";
import path from "node:path";

// Halt-badge resolve-transition tracking (issue #297 / halt-events v1).
//
// The plugin previously only fanned out a `halt_badge` envelope on the
// OPENED transition (badge appears in snapshot). Nothing told the BE when a
// badge cleared, so the row stayed open forever. This module persists a
// minimal snapshot of which badge fields were open on the previous fan-out
// call, diffs it against the current call, and reports which fields
// transitioned populated -> cleared so the caller can emit one
// `halt_badge.resolved` envelope per transition.
//
// State file is a small best-effort cache under .claude/state/loop/ (same
// directory convention as stuck-detector.json / paused.json) — never
// authoritative. Fail-open: a missing or malformed file is treated as
// "nothing was open before"; a write failure never blocks the caller.

export interface OpenHaltBadgeEntry {
  badgeKind: string;
  ts: string; // opened timestamp — first fan-out call that observed this badge open
  sliceId?: string;
}

export interface ResolvedHaltBadgeEntry {
  badgeKind: string;
  ts: string; // the original opened timestamp, carried through unchanged
  sliceId?: string;
}

type HaltBadgeStateFile = Record<string, OpenHaltBadgeEntry>;

const STATE_REL = path.join(".claude", "state", "loop", "halt-badge-state.json");
const AUDIT_LOG_REL = path.join(".claude", "artifacts", "loop", "auto-dispatch.jsonl");

async function readState(repoPath: string): Promise<HaltBadgeStateFile> {
  try {
    const raw = await fs.readFile(path.join(repoPath, STATE_REL), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as HaltBadgeStateFile;
    }
  } catch {
    // fail-open: absent or malformed file → nothing was open before
  }
  return {};
}

async function writeState(repoPath: string, state: HaltBadgeStateFile): Promise<void> {
  const filePath = path.join(repoPath, STATE_REL);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/**
 * Diff the currently-open badge fields against the persisted prior-open
 * state, returning every field that was open before but is absent now
 * (populated -> cleared transition). Persists the new open-state for the
 * next call so a still-open badge keeps its original opened `ts` across
 * repeated calls instead of resetting it every tick.
 *
 * Best-effort: a state read/write failure degrades to "no transitions
 * detected" rather than throwing — the caller's fan-out loop must never be
 * blocked by state-tracking failures.
 */
export async function diffHaltBadgeTransitions(
  repoPath: string,
  currentOpen: Record<string, { ts: string; sliceId?: string }>
): Promise<ResolvedHaltBadgeEntry[]> {
  const prior = await readState(repoPath);
  const resolved: ResolvedHaltBadgeEntry[] = [];
  const next: HaltBadgeStateFile = {};

  for (const [badgeKind, entry] of Object.entries(prior)) {
    if (badgeKind in currentOpen) continue; // still open — carried forward below
    resolved.push({
      badgeKind: entry.badgeKind,
      ts: entry.ts,
      ...(entry.sliceId ? { sliceId: entry.sliceId } : {})
    });
  }

  for (const [badgeKind, { ts, sliceId }] of Object.entries(currentOpen)) {
    const existing = prior[badgeKind];
    next[badgeKind] = existing ?? { badgeKind, ts, ...(sliceId ? { sliceId } : {}) };
  }

  try {
    await writeState(repoPath, next);
  } catch {
    // best-effort persistence — transitions already computed above still stand
  }

  return resolved;
}

/**
 * Best-effort resolver-agent-role lookup: read the last line of
 * auto-dispatch.jsonl and derive a role from its `agent` field
 * (namespace-prefixed, e.g. "devcrew:builder" -> "builder"). Returns
 * `undefined` when the log is absent, empty, malformed, or the last entry
 * has no usable `agent` field — callers MUST omit the field in that case
 * rather than send an empty string. BE upsert semantics tolerate the field's
 * absence (best-effort per issue #297).
 */
export async function resolveResolverAgentRole(repoPath: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(path.join(repoPath, AUDIT_LOG_REL), "utf8");
    const lines = raw.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) return undefined;
    const last = JSON.parse(lines[lines.length - 1]!) as { agent?: unknown };
    if (typeof last.agent !== "string" || last.agent.length === 0) return undefined;
    const idx = last.agent.indexOf(":");
    return idx >= 0 ? last.agent.slice(idx + 1) : last.agent;
  } catch {
    return undefined;
  }
}
