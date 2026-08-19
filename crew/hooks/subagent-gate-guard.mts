#!/usr/bin/env node
// SubagentStop hook — cannot report DONE past a failing review/validation
// gate (ported from dev-team#257 piece 1, PR #262). Default-on; opt out via
// crew.json features["gate-guard"].enabled=false (already default warn-only
// until explicitly set true — see hooks/lib/warn-first-flag.ts). Blocks
// (warn-mode: warns; block-mode: decision:"block") a builder-tier subagent
// (crew:fullstack-dev, crew:backend-dev, crew:frontend-dev,
// crew:aiplugin-dev, crew:dev-lite) that reports a DONE: completion claim
// while the current run's review or validation gate is recorded "failed" in
// .claude/state/crew/workflow-state.json. Fail-open on malformed input,
// out-of-scope agents, stop_hook_active re-entry, or a runtime that doesn't
// populate last_assistant_message — see hooks/lib/subagent-gate-guard.ts
// header for the documented residual gap.
import { runSubagentGateGuardHook } from "./lib/subagent-gate-guard.mjs";
import { logHookError } from "./hook-error.mjs";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const raw = await readStdin();
  const out = await runSubagentGateGuardHook(raw);
  if (out !== null) process.stdout.write(out);
}

main().catch(async (err) => {
  await logHookError(process.cwd(), "subagent-gate-guard", err);
  process.exit(0);
});
