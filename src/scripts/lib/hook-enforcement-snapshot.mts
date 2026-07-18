import fs from "node:fs/promises";
import path from "node:path";

// hook-enforcement-snapshot.mts — FEAT-265 (dev-team#257 AC leftover).
//
// Reads the enforcement event log written by dev-team's SubagentStop
// `gate-guard` hook (hooks/subagent-gate-guard.ts ->
// hooks/lib/subagent-gate-guard.ts::logEvent) and PreToolUse `artifact-lock`
// hook (hooks/pre-tool-use-artifact-lock.ts ->
// hooks/lib/pre-tool-use-artifact-lock.ts::logEvent). Both hooks append one
// JSON line per enforcement decision to
// `<repo-cwd>/.claude/logs/events.jsonl`:
//   { ts: string, event: string, session_id: string, detail: string }
// with `event` one of:
//   gate-guard:{warned-red-gate,blocked-red-gate,no-message,internal-error}
//   artifact-lock:{warned,denied,internal-error}
//
// Tail-safe read, mirroring pause-telemetry.mts::readPauseTelemetry: a
// missing/unreadable file, or a file with zero recognized event lines,
// resolves to `null` so callers omit the section entirely rather than
// rendering an empty/misleading block. A malformed individual line
// (non-JSON, or JSON missing the expected shape) is skipped, never fatal.
//
// No time window: events.jsonl is a flat append-log with no per-entry file
// boundary like the cost-report directory, so there is no existing windowing
// idiom to reuse (per FEAT-265 scope). This reports lifetime totals plus the
// most recent event timestamp instead.

const HOOK_EVENTS_RELATIVE = [".claude", "logs", "events.jsonl"] as const;

export interface HookEventCounts {
  warn: number;
  block: number;
  other: number;
  total: number;
}

export interface HookEnforcementSummary {
  gateGuard: HookEventCounts;
  artifactLock: HookEventCounts;
  totalEvents: number;
  lastEventAt: string | null;
}

export function hookEventsLogPath(repoPath: string): string {
  return path.join(repoPath, ...HOOK_EVENTS_RELATIVE);
}

function emptyCounts(): HookEventCounts {
  return { warn: 0, block: 0, other: 0, total: 0 };
}

interface ParsedEventLine {
  event: string;
  ts: string | null;
}

function parseEventLine(line: string): ParsedEventLine | null {
  try {
    const obj = JSON.parse(line);
    if (typeof obj !== "object" || obj === null) return null;
    const event = (obj as Record<string, unknown>).event;
    if (typeof event !== "string" || event.length === 0) return null;
    const ts = (obj as Record<string, unknown>).ts;
    return { event, ts: typeof ts === "string" ? ts : null };
  } catch {
    return null;
  }
}

function classify(counts: HookEventCounts, code: string, warnCode: string, blockCode: string) {
  counts.total += 1;
  if (code === warnCode) {
    counts.warn += 1;
  } else if (code === blockCode) {
    counts.block += 1;
  } else {
    counts.other += 1;
  }
}

/**
 * Tail-safe reader: missing file or zero recognized `gate-guard:*` /
 * `artifact-lock:*` lines -> `null`. Malformed lines are skipped
 * individually rather than failing the whole read.
 */
export async function readHookEnforcementSummary(
  repoPath: string
): Promise<HookEnforcementSummary | null> {
  let content: string;
  try {
    content = await fs.readFile(hookEventsLogPath(repoPath), "utf8");
  } catch {
    return null;
  }

  const gateGuard = emptyCounts();
  const artifactLock = emptyCounts();
  let lastEventAt: string | null = null;

  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    const parsed = parseEventLine(line);
    if (parsed === null) continue;

    if (parsed.event.startsWith("gate-guard:")) {
      classify(
        gateGuard,
        parsed.event,
        "gate-guard:warned-red-gate",
        "gate-guard:blocked-red-gate"
      );
    } else if (parsed.event.startsWith("artifact-lock:")) {
      classify(artifactLock, parsed.event, "artifact-lock:warned", "artifact-lock:denied");
    } else {
      continue; // not a gate-guard/artifact-lock event -- ignore
    }

    if (parsed.ts !== null && (lastEventAt === null || parsed.ts > lastEventAt)) {
      lastEventAt = parsed.ts;
    }
  }

  const totalEvents = gateGuard.total + artifactLock.total;
  if (totalEvents === 0) return null;

  return { gateGuard, artifactLock, totalEvents, lastEventAt };
}
