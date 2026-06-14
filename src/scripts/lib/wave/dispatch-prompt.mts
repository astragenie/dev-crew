// src/scripts/lib/wave/dispatch-prompt.mts
// Builds the dispatch prompt string for a wave slot.

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
        `2. Execute the slash command: /crew:fix --slice ${opts.sliceId}`,
        `3. Wait for completion.`,
        `4. Return a JSON marker on the last line: {"slice":"${opts.sliceId}","status":"PASS"|"FAIL","artifacts":[paths]}`
      ].join("\n");
    }
    return [
      `You are running in worktree ${opts.worktreePath} for slice ${opts.sliceId} in fix mode.`,
      `Previous wave attempt FAILED. Failure artifact: ${opts.failureArtifactPath}.`,
      `1. Read the failure artifact in full.`,
      `2. Execute the slash command: /crew:fix --slice ${opts.sliceId} --failure ${opts.failureArtifactPath}`,
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
