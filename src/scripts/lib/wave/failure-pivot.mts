// src/scripts/lib/wave/failure-pivot.mts
import { updateSliceFrontmatter, moveSlice } from "../backlog-store.mjs";
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

// FEAT-250 SLICE-3 / DEC-076 decision 2: ported from a hand-rolled regex
// frontmatter mutator to BacklogStore's mergeFrontmatter-based
// updateSliceFrontmatter/moveSlice — the shared parser already natively
// supports the nested `last_failure:` mapping shape the regex hand-built.
// `pending_fix` deletion (previously a regex field-strip on the escalating
// branch) is represented as `pending_fix: null`, written through
// mergeFrontmatter's set-only merge. The only reader of `pending_fix` is
// wave/planner.mts's `asBoolean(fm["pending_fix"], false)` (verified via
// grep at port time), which already treats `null` and "absent" identically
// — neither matches `"true"`/`true`, so both fall through to the `false`
// fallback. No reader update needed.
//
// GUARD DROPPED (review 2026-07-10-slice-152): the old moveToNeedsReview
// only moved a slice out of a `pending/`-named dir; moveSlice always moves.
// Dormant today — nothing in production calls persistPivotAt. Whoever wires
// it into wave/runner.mts must re-add a source-state check first, or a
// late/duplicate pivot can drag an already-completed slice back to
// needs-review/.
export async function persistPivotAt(
  slicePath: string,
  pivot: FailurePivot,
  cfg: WaveConfig
): Promise<string> {
  const escalating = pivot.retryCount >= cfg.maxWaveAttempts;
  const updates: Record<string, unknown> = {
    wave_attempts: pivot.retryCount,
    last_failure: {
      wave_id: pivot.originalWaveId,
      kind: pivot.failureKind,
      artifact: pivot.failureArtifactPath,
      pivot_command: pivot.fixCommand
    }
  };
  if (escalating) {
    updates.status = "needs-review";
    updates.pending_fix = null;
  } else {
    updates.pending_fix = "true";
  }
  await updateSliceFrontmatter(slicePath, updates);

  if (escalating) {
    const result = await moveSlice(slicePath, "needs-review", {});
    return result.to;
  }
  return slicePath;
}
