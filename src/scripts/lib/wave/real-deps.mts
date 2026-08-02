// src/scripts/lib/wave/real-deps.mts
// Real DI implementations for the wave runner. Shells out to git and
// existing loop.mts dispatch subcommands. Note: realDispatch is a
// runtime-only constraint — actual parallel Agent dispatch requires the
// Claude Code harness. The /loop:wave slash flow handles dispatch via
// the harness; headless CLI runs of `wave run` will error at dispatch.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { buildDispatchPromptWithMemory } from "./dispatch-prompt.mjs";
import { resolveConfig } from "../config-resolver.mjs";
import { resolveWaveDispatchModel } from "../model-router.mjs";
import { runGit } from "../run-git.mjs";
import type { GitStatus, StopCheckResult, PrepareResult, FinalizeResult } from "./runner.mjs";
import type { WaveConfig, WavePlan, WorktreeResult } from "./types.mjs";

function tmpPlanFile(plan: WavePlan): string {
  const id = randomBytes(6).toString("hex");
  const p = join(tmpdir(), `wave-plan-${id}.json`);
  // dispatch.mts expects { plans: DispatchPlan[] }. The prompt stored here
  // is used only for dispatch.mts bookkeeping — the real agent-dispatch
  // prompt is rebuilt at agentBatch construction with the actual worktreePath.
  const dispatchPlans = plan.items.map((item) => ({
    id: item.sliceId,
    priority: 0,
    agentType: "general-purpose",
    prompt: `Wave-mode dispatch for ${item.sliceId} (${item.sliceCommand}); resolved at runtime.`
  }));
  writeFileSync(p, JSON.stringify({ plans: dispatchPlans }), "utf8");
  return p;
}

export async function realGitStatus(repoRoot: string): Promise<GitStatus> {
  try {
    // FEAT-249 shape: the wave runner writes its own telemetry under
    // .claude/artifacts/loop/ (waves/<id>/events.jsonl, index.json) before this
    // check runs, so a raw porcelain status self-blocks every wave after the
    // first. Exclude the loop-owned artifact tree exactly like
    // dispatch-worktree.mts::preflightGitClean does.
    const r = await runGit([
      "-C",
      repoRoot,
      "status",
      "--porcelain",
      "--",
      ".",
      ":(exclude).claude/artifacts/loop/**"
    ]);
    return { clean: r.ok && r.stdout.trim() === "" };
  } catch {
    // Spawn failure (e.g. git binary missing) — matches spawnSync's non-throwing
    // ENOENT contract, where `r.status !== 0` simply fell through to `clean: false`.
    return { clean: false };
  }
}

export async function realStopCheck(repoRoot: string): Promise<StopCheckResult> {
  const r = spawnSync("bun", ["src/scripts/loop.mts", "stop-check", "--repo", repoRoot], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    cwd: repoRoot
  });
  if (r.status !== 0) {
    // Soft fail — runner's own halts (dirty_main, post_merge_red, max_*)
    // still apply. Don't block waves on stop-check infrastructure errors.
    return { shouldStop: false };
  }
  const parsed = parseTrailingJson(r.stdout);
  if (!parsed || typeof parsed !== "object") return { shouldStop: false };
  const obj = parsed as {
    shouldStop?: boolean;
    reasons?: string[];
    blockers?: Array<{ category?: string; severity?: string }>;
  };
  const result: StopCheckResult = { shouldStop: Boolean(obj.shouldStop) };
  const firstReason = obj.reasons?.[0];
  if (firstReason !== undefined) result.reason = firstReason;
  const firstBlockerSeverity = obj.blockers?.[0]?.severity;
  if (
    firstBlockerSeverity === "info" ||
    firstBlockerSeverity === "warn" ||
    firstBlockerSeverity === "error" ||
    firstBlockerSeverity === "escalation"
  ) {
    result.severity = firstBlockerSeverity;
  }
  return result;
}

function parseTrailingJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  // CLI emits log lines before the final JSON object. Find the last top-level
  // `{` that starts a line and parse from there to end-of-string.
  const lastBlockStart = trimmed.lastIndexOf("\n{");
  const candidate = lastBlockStart >= 0 ? trimmed.slice(lastBlockStart + 1) : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// resolveConfig reads .claude/loop.json directly (no preset merge post
// FEAT-218 Phase 2 — see DEC-069). Wrapped so a missing/malformed config
// never blocks wave dispatch — resolveModel already fails safe to
// FALLBACK_MODEL on a null config.
async function bestEffortConfig(repoRoot: string): Promise<Record<string, unknown> | null> {
  try {
    return await resolveConfig(repoRoot);
  } catch {
    return null;
  }
}

export async function realPrepare(repoRoot: string, plan: WavePlan): Promise<PrepareResult> {
  const planFile = tmpPlanFile(plan);
  try {
    const r = spawnSync(
      "bun",
      [
        "src/scripts/dispatch.mts",
        "prepare",
        "--plan",
        planFile,
        "--parent-branch",
        "main",
        "--repo",
        repoRoot,
        "--json"
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, cwd: repoRoot }
    );
    if (r.status !== 0) {
      throw new Error(`dispatch prepare failed: ${r.stderr}`);
    }
    const raw = JSON.parse(r.stdout) as {
      runId: string;
      batch: Array<{ prompt: string }>;
      branchById: Record<string, string>;
      cwdById: Record<string, string>;
    };
    // FEAT-205: resolve one model tier per item from its shape (data-driven —
    // see SHAPE_TIER_MAP in model-router.mts), not a per-item conditional.
    // Best-effort: a config-resolve failure must not block dispatch — fall
    // back to the phase-default ("build") tier for every item.
    const config = await bestEffortConfig(repoRoot);
    // FEAT-188 S3b residual (#368): fold in a builder-scoped memory-context
    // block via the same mechanism post-builder-fanout.mts already uses
    // (buildMemoryContext, FEAT-219 AC-8) — byte-identical to the plain
    // buildDispatchPrompt() output when memory is disabled/absent, and
    // fail-open on any reader error (never blocks wave dispatch).
    const agentBatch = await Promise.all(
      plan.items.map(async (item) => {
        // null = routing disabled (loop.modelRouting.enabled: false) — omit
        // the `model` field so the dispatched agent's own `model:` frontmatter
        // (agents/*.md) governs instead of a routed tier.
        const model = resolveWaveDispatchModel(item.shape ?? "none", config);
        const worktreePath = raw.cwdById[item.sliceId] ?? "";
        return {
          sliceId: item.sliceId,
          worktreePath,
          branch: raw.branchById[item.sliceId] ?? item.worktreeBranch,
          prompt: await buildDispatchPromptWithMemory({
            sliceId: item.sliceId,
            worktreePath,
            sliceCommand: item.sliceCommand,
            mode: "normal",
            repoPath: repoRoot,
            featureId: item.featureId,
            config
          }),
          ...(model !== null ? { model } : {})
        };
      })
    );
    return { runId: raw.runId, agentBatch };
  } finally {
    try {
      unlinkSync(planFile);
    } catch {
      // best-effort cleanup
    }
  }
}

export async function realDispatch(
  _batch: PrepareResult["agentBatch"],
  _cfg: WaveConfig
): Promise<WorktreeResult[]> {
  throw new Error(
    "realDispatch must be invoked from the /loop:wave slash flow (Agent dispatch is harness-only)."
  );
}

export async function realFinalize(
  repoRoot: string,
  runId: string,
  plan: WavePlan
): Promise<FinalizeResult> {
  const planFile = tmpPlanFile(plan);
  try {
    const r = spawnSync(
      "bun",
      [
        "src/scripts/dispatch.mts",
        "finalize",
        "--run-id",
        runId,
        "--parent-branch",
        "main",
        "--plan",
        planFile,
        "--repo",
        repoRoot
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, cwd: repoRoot }
    );
    if (r.status !== 0 && r.status !== 2) {
      // exit 2 = all failed but not a crash; still parse what we can
      throw new Error(`dispatch finalize failed: ${r.stderr}`);
    }
    return parseSummaryMd(repoRoot, runId);
  } finally {
    try {
      unlinkSync(planFile);
    } catch {
      // best-effort cleanup
    }
  }
}

/**
 * Parse `.claude/artifacts/loop/dispatch/<runId>/summary.md` produced by
 * `dispatch finalize`. Rows look like:
 *
 *   | <id> | <status> | `<branch>` | `<worktreePath>` | <error> |
 *
 * Status maps:
 *   DONE       → merged
 *   CONFLICTED → conflicts
 *   FAILED     → failed
 *   BLOCKED    → failed (treated as a definitive non-merge)
 */
function parseSummaryMd(repoRoot: string, runId: string): FinalizeResult {
  const merged: string[] = [];
  const conflicts: string[] = [];
  const failed: string[] = [];
  const path = join(repoRoot, ".claude/artifacts/loop/dispatch", runId, "summary.md");
  try {
    if (!existsSync(path)) return { merged, conflicts, failed };
    for (const line of readFileSync(path, "utf8").split("\n")) {
      // Match table rows: skip header + separator.
      const m = line.match(
        /^\|\s*([^|]+?)\s*\|\s*(DONE|FAILED|BLOCKED|CONFLICTED)\s*\|\s*`([^`]+)`/
      );
      if (!m) continue;
      const status = m[2];
      const branch = m[3];
      if (status === "DONE") merged.push(branch ?? "");
      else if (status === "CONFLICTED") conflicts.push(branch ?? "");
      else failed.push(branch ?? "");
    }
  } catch {
    // best-effort; runner's worktreeResults carry the per-slice status as fallback
  }
  return { merged, conflicts, failed };
}

export async function realPostMergeTest(
  repoRoot: string,
  cmd: string
): Promise<{ ran: boolean; status: "PASS" | "FAIL" | "skipped"; logPath?: string }> {
  if (!cmd) return { ran: false, status: "skipped" };
  const r = spawnSync(cmd, [], { cwd: repoRoot, shell: true, encoding: "utf8" });
  return { ran: true, status: r.status === 0 ? "PASS" : "FAIL" };
}
