import path from "node:path";

export type AugmentArgs = {
  runId: string;
  depth: number;
  childCwd: string;
  childBranch: string;
  childId: string;
  repoRoot: string;
};

export function augmentPrompt(prompt: string, args: AugmentArgs): string {
  const { runId, depth, childCwd, childBranch, childId, repoRoot } = args;
  const nextDepth = depth + 1;
  // Use absolute path so child agents running inside a worktree write the
  // marker to the main repo, not to the worktree copy of the directory tree.
  const markerPath = path.join(
    repoRoot,
    ".claude/artifacts/loop/dispatch",
    runId,
    `${childId}.result.json`
  );
  const header = [
    "## Hierarchical dispatch context (injected by devcrew:swarm)",
    "",
    `- Run id: \`${runId}\` (set \`LOOP_DISPATCH_RUN_ID=${runId}\` when invoking nested dispatch)`,
    `- Your depth: ${nextDepth} (set \`LOOP_DISPATCH_DEPTH=${nextDepth}\` OR pass \`--depth ${nextDepth}\` to \`bun src/scripts/loop.mts dispatch\` if you spawn grandchildren)`,
    `- Your worktree cwd: \`${childCwd}\``,
    `- Your branch: \`${childBranch}\``,
    "",
    "### Result-write contract (REQUIRED before you return)",
    "",
    `Write a JSON file to the following ABSOLUTE path: \`${markerPath}\``,
    "",
    "The file must match the `DispatchResult` schema:",
    "",
    "```json",
    "{",
    `  "id": "${childId}",`,
    `  "status": "DONE" | "FAILED" | "BLOCKED",`,
    `  "branch": "${childBranch}",`,
    `  "worktreePath": "${childCwd}",`,
    `  "childResults": [],  // populate if you spawn grandchildren`,
    `  "artifactPath": "(optional path to your run artifact)",`,
    `  "error": "(only set on FAILED/BLOCKED)",`,
    `  "costUsd": null  // parent derives this from events.jsonl at finalize (FEAT-220); leave null here`,
    "}",
    "```",
    "",
    'If you don\'t write this file before returning, the parent will record your child as FAILED with `error: "no marker"`.',
    "",
    "---",
    ""
  ].join("\n");
  return header + prompt;
}
