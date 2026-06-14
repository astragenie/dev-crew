// src/scripts/lib/wave/failure-pivot.mts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildDispatchPrompt } from "./dispatch-prompt.mjs";
import type {
  FailureKind,
  FailurePivot,
  SliceCandidate,
  WaveConfig,
  WorktreeResult
} from "./types.mjs";

export type FinalizeOutcome = {
  conflicts: string[];
};

function classifyKind(result: WorktreeResult, finalize: FinalizeOutcome): FailureKind {
  if (finalize.conflicts.includes(result.branch)) return "merge_conflict";
  if (result.status === "timeout") return "timeout";
  if (result.status === "agent_error") return "agent_error";
  return "worktree_fail";
}

function firstArtifact(result: WorktreeResult): string {
  return result.artifacts[0] ?? "";
}

export function buildFailurePivot(
  result: WorktreeResult,
  finalize: FinalizeOutcome,
  slice: SliceCandidate,
  waveId: string,
  cfg: WaveConfig
): FailurePivot {
  const failureKind = classifyKind(result, finalize);
  const failureArtifactPath = firstArtifact(result);
  const retryCount = slice.retryCount + 1;
  const promptOpts: Parameters<typeof buildDispatchPrompt>[0] = {
    sliceId: result.sliceId,
    worktreePath: result.worktreePath,
    sliceCommand: cfg.sliceCommand,
    mode: "fix"
  };
  if (failureArtifactPath !== "") {
    promptOpts.failureArtifactPath = failureArtifactPath;
  }
  return {
    sliceId: result.sliceId,
    featureId: slice.featureId,
    originalWaveId: waveId,
    failureKind,
    failureArtifactPath,
    worktreePath: failureKind === "merge_conflict" ? null : result.worktreePath,
    retryCount,
    fixCommand: cfg.fixCommand,
    fixDispatchPrompt: buildDispatchPrompt(promptOpts)
  };
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

function upsertFrontmatterField(fmBlock: string, key: string, value: string): string {
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(fmBlock)) {
    return fmBlock.replace(re, `${key}: ${value}`);
  }
  return `${fmBlock}\n${key}: ${value}`;
}

function removeFrontmatterField(fmBlock: string, key: string): string {
  return fmBlock.replace(new RegExp(`^${key}:.*\n?`, "m"), "");
}

function setLastFailureBlock(fmBlock: string, pivot: FailurePivot): string {
  const stripped = fmBlock.replace(/\nlast_failure:(?:\n[ \t]+.*)*/, "");
  const block = [
    "last_failure:",
    `  wave_id: ${pivot.originalWaveId}`,
    `  kind: ${pivot.failureKind}`,
    `  artifact: ${pivot.failureArtifactPath}`,
    `  pivot_command: ${pivot.fixCommand}`
  ].join("\n");
  return `${stripped.replace(/\n+$/, "")}\n${block}`;
}

/**
 * Move an escalated slice from .../slices/pending/ to .../slices/needs-review/.
 * Returns the new path. Idempotent: if source is already outside pending/,
 * returns the original path unchanged.
 */
function moveToNeedsReview(slicePath: string): string {
  const parent = dirname(slicePath);
  if (!parent.endsWith("pending")) return slicePath;
  const target = join(dirname(parent), "needs-review");
  if (!existsSync(target)) mkdirSync(target, { recursive: true });
  const targetPath = join(target, slicePath.split(/[\\/]/).pop() ?? "");
  renameSync(slicePath, targetPath);
  return targetPath;
}

export function persistPivotAt(slicePath: string, pivot: FailurePivot, cfg: WaveConfig): string {
  const raw = readFileSync(slicePath, "utf8");
  const m = raw.match(FRONTMATTER_RE);
  if (!m || !m[1]) throw new Error(`slice file missing frontmatter: ${slicePath}`);
  let fm = m[1];
  const escalating = pivot.retryCount >= cfg.maxWaveAttempts;

  if (escalating) {
    fm = upsertFrontmatterField(fm, "status", "needs-review");
    fm = upsertFrontmatterField(fm, "wave_attempts", String(pivot.retryCount));
    fm = removeFrontmatterField(fm, "pending_fix");
    fm = setLastFailureBlock(fm, pivot);
  } else {
    fm = upsertFrontmatterField(fm, "wave_attempts", String(pivot.retryCount));
    fm = upsertFrontmatterField(fm, "pending_fix", "true");
    fm = setLastFailureBlock(fm, pivot);
  }
  const updated = raw.replace(FRONTMATTER_RE, `---\n${fm}\n---`);
  writeFileSync(slicePath, updated, "utf8");

  if (escalating) {
    return moveToNeedsReview(slicePath);
  }
  return slicePath;
}
