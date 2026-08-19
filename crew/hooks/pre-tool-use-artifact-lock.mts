#!/usr/bin/env node
// PreToolUse hook on Write | Edit | MultiEdit | NotebookEdit — declarative
// artifact-lock enforcement (ported from dev-team#257 piece 2, PR #262, with
// the MultiEdit/NotebookEdit matcher widening from dev-team PR #264 folded
// in from the start; contract mirrored from runner-plugin's
// docs/upstream-requests/2026-07-18-crew-artifact-lock-hook-contract.md).
//
// Lock file shape (one JSON file per active slice under
// <repo-cwd>/.claude/state/loop/artifact-locks/<sliceId>.json) and full
// warn/block semantics: see hooks/lib/pre-tool-use-artifact-lock.ts header.
import { runArtifactLockHook } from "./lib/pre-tool-use-artifact-lock.mjs";
import { logHookError } from "./hook-error.mjs";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  const out = await runArtifactLockHook(raw);
  if (out !== null) process.stdout.write(out);
}

main().catch(async (err) => {
  await logHookError(process.cwd(), "pre-tool-use-artifact-lock", err);
  process.exit(0);
});
