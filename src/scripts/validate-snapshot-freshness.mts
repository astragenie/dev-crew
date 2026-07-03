// CI validator (FEAT-208): blocks a stale .claude/artifacts/loop/loop-snapshot.md
// from merging. The snapshot is pure aggregation (backlog counts, grade
// signal, decisions, telemetry) — this regenerates the expected content
// in-memory and diffs it against the on-disk file. Any drift (a FEAT moved
// to done/ but still listed as "next to slice", a stale grade/backlog count,
// etc.) fails the gate.
//
// mtime comparison is deliberately NOT used: a CI checkout resets every
// file's mtime to checkout time, so relative "is loop-snapshot.md older than
// the newest grade file" comparisons are meaningless in CI. Content diffing
// is the only reliable signal here.
//
// The comparison is anchored to the on-disk file's own header date (parsed
// out of "# Autonomous Loop snapshot — YYYY-MM-DD"), not the real "today".
// Otherwise a snapshot regenerated on day N and unchanged since would
// false-positive on day N+1 purely from calendar rollover — the gate should
// only fail on genuine data drift, per AC-2.
import fs from "node:fs/promises";

import { generateSnapshotContent } from "./lib/memory-snapshot.mjs";
import { snapshotPath } from "./lib/paths.mjs";

export interface SnapshotFreshnessResult {
  ok: boolean;
  errors: string[];
}

const REGENERATE_HINT = "Run: bun src/scripts/loop.mts snapshot-memory --repo <path>";

function extractHeaderDate(onDisk: string): string | null {
  const m = onDisk.match(/^# Autonomous Loop snapshot — (\d{4}-\d{2}-\d{2})/m);
  return m?.[1] ?? null;
}

export async function validateSnapshotFreshness(
  repoRoot: string,
  opts: { config?: Record<string, any> | null; today?: string } = {}
): Promise<SnapshotFreshnessResult> {
  const config = opts.config ?? null;
  const target = snapshotPath(repoRoot, config);

  let onDisk: string;
  try {
    onDisk = await fs.readFile(target, "utf8");
  } catch {
    return { ok: false, errors: [`loop-snapshot.md not found at ${target}. ${REGENERATE_HINT}`] };
  }

  const today = opts.today ?? extractHeaderDate(onDisk) ?? new Date().toISOString().slice(0, 10);
  const expected = await generateSnapshotContent(repoRoot, { config, today });

  if (onDisk === expected) return { ok: true, errors: [] };

  return {
    ok: false,
    errors: [
      "loop-snapshot.md is out of date — regenerated content does not match the on-disk file.",
      REGENERATE_HINT
    ]
  };
}

if (import.meta.main) {
  const repoRoot = process.cwd();
  const result = await validateSnapshotFreshness(repoRoot);
  if (!result.ok) {
    console.error("Snapshot freshness validation failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log("loop-snapshot.md is up to date");
  }
}
