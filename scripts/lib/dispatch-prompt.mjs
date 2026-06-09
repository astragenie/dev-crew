export function augmentPrompt(prompt, args) {
    const { runId, depth, childCwd, childBranch, childId } = args;
    const nextDepth = depth + 1;
    const markerPath = `.claude/artifacts/loop/dispatch/${runId}/${childId}.result.json`;
    const header = [
        "## Hierarchical dispatch context (injected by loop:hierarchical-dispatcher)",
        "",
        `- Run id: \`${runId}\` (set \`LOOP_DISPATCH_RUN_ID=${runId}\` when invoking nested dispatch)`,
        `- Your depth: ${nextDepth} (set \`LOOP_DISPATCH_DEPTH=${nextDepth}\` OR pass \`--depth ${nextDepth}\` to \`node scripts/loop.mjs dispatch\` if you spawn grandchildren)`,
        `- Your worktree cwd: \`${childCwd}\``,
        `- Your branch: \`${childBranch}\``,
        "",
        "### Result-write contract (REQUIRED before you return)",
        "",
        `Write a JSON file to \`${markerPath}\` matching the \`DispatchResult\` schema:`,
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
        `  "costUsd": null  // FEAT-165 populates; leave null in SLICE-1`,
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
