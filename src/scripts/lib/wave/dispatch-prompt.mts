// src/scripts/lib/wave/dispatch-prompt.mts
// Builds the dispatch prompt string for a wave slot.

import { buildMemoryContext } from "../memory-context.mjs";

export type DispatchPromptOpts = {
  sliceId: string;
  worktreePath: string;
  sliceCommand: string;
  mode: "normal" | "fix";
  failureArtifactPath?: string;
};

export function buildDispatchPrompt(opts: DispatchPromptOpts): string {
  if (opts.mode === "fix") {
    if (!opts.failureArtifactPath) {
      return [
        `You are running in worktree ${opts.worktreePath} for slice ${opts.sliceId} in fix mode.`,
        `Previous wave attempt FAILED but no failure artifact was captured.`,
        `1. Inspect the worktree state and recent crew handoffs manually.`,
        `2. Execute the slash command: /devcrew:fix --slice ${opts.sliceId}`,
        `3. Wait for completion.`,
        `4. Return a JSON marker on the last line: {"slice":"${opts.sliceId}","status":"PASS"|"FAIL","artifacts":[paths]}`
      ].join("\n");
    }
    return [
      `You are running in worktree ${opts.worktreePath} for slice ${opts.sliceId} in fix mode.`,
      `Previous wave attempt FAILED. Failure artifact: ${opts.failureArtifactPath}.`,
      `1. Read the failure artifact in full.`,
      `2. Execute the slash command: /devcrew:fix --slice ${opts.sliceId} --failure ${opts.failureArtifactPath}`,
      `3. Wait for completion.`,
      `4. Return a JSON marker on the last line: {"slice":"${opts.sliceId}","status":"PASS"|"FAIL","artifacts":[paths]}`
    ].join("\n");
  }
  return [
    `You are running in worktree ${opts.worktreePath} for slice ${opts.sliceId}.`,
    `1. Execute the slash command: ${opts.sliceCommand} --id ${opts.sliceId}`,
    `2. Wait for completion.`,
    `3. Return a JSON marker on the last line: {"slice":"${opts.sliceId}","status":"PASS"|"FAIL","artifacts":[paths]}`
  ].join("\n");
}

export type DispatchPromptWithMemoryOpts = DispatchPromptOpts & {
  /** Repo root — required to read learnings.jsonl / grades / decisions / astramem. */
  repoPath: string;
  /** Parent feature id, used as the memory-context recall query when present. */
  featureId?: string;
  /** `.claude/loop.json` shape. `null`/absent -> memory disabled (default, byte-identical). */
  config?: Record<string, any> | null;
};

/**
 * FEAT-188 S3b residual (#368) — wires wave's per-slot dispatch prompt into
 * the SAME shared memory-context mechanism `post-builder-fanout.mts` already
 * uses (FEAT-219 AC-8), rather than duplicating start-slice.mts's
 * recallSilent/formatRecallBlockV1 splice. Mirrors that call site exactly:
 * prepend `${memoryBlock}\n\n${basePrompt}` when non-empty.
 *
 * Byte-identical (AC-5 parity): `buildMemoryContext` returns "" when memory
 * is disabled/absent (today's default for an unconfigured repo), so this
 * returns exactly `buildDispatchPrompt(opts)` unchanged.
 *
 * Fail-open: `buildMemoryContext` never throws — every reader it wraps
 * (learnings/lessons/decisions/astramem recall) is caught internally via
 * `safe()`. A memory-context failure can therefore never break wave dispatch.
 */
export async function buildDispatchPromptWithMemory(
  opts: DispatchPromptWithMemoryOpts
): Promise<string> {
  const basePrompt = buildDispatchPrompt(opts);
  const memoryBlock = await buildMemoryContext({
    repoPath: opts.repoPath,
    agentType: "builder",
    query: opts.featureId || opts.sliceId,
    sliceId: opts.sliceId,
    config: opts.config ?? null
  });
  return memoryBlock ? `${memoryBlock}\n\n${basePrompt}` : basePrompt;
}
