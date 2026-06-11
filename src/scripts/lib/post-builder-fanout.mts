// Post-builder fanout — emit a single parallel-dispatch payload containing
// the two reviewers and the validator. Replaces the previous serial
// reviewer-A -> reviewer-B -> validator chain after builder PASS.
//
// Pure I/O surface: reads the slice file to validate its existence and to
// expose its relative path in the prompts. No config mutation, no dispatch
// side effects, no `process.exit`. Caller (loop.mts CLI handler) is the
// only stdout surface.
//
// Reuses PARALLEL_DISPATCH_CONTRACT v1 wording established by T3
// (commands/slice-review-ladder.md + src/scripts/lib/reviewer-ladder.mts).
// Only line 4 of the contract drops the word "reviewer" because the
// fanout includes the validator as a non-reviewer participant.
//
// Aggregation rules (asserted by post-builder-fanout.test.mts):
//   halt_on_any_FAIL: true   -- any reviewer or validator FAIL halts slice.
//   wait_for_all: true        -- orchestrator waits for all three artifacts.

import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "./paths.mjs";

export type FanoutTask = {
  role: "reviewer-A" | "reviewer-B" | "validator";
  subagent_type: "crew:reviewer" | "crew:validator";
  description: string;
  prompt: string;
};

export type FanoutResult = {
  sliceId: string;
  tasks: FanoutTask[];
  instructions: string;
  aggregation: { halt_on_any_FAIL: true; wait_for_all: true };
};

function reviewerPrompt(sliceId: string, slicePathRel: string, role: "A" | "B"): string {
  const focus =
    role === "A"
      ? "Correctness, regressions, and explicit coverage of each acceptance criterion."
      : "Production-readiness, observability, security posture, edge cases.";
  return [
    `You are Reviewer ${role} on the post-builder fanout for slice ${sliceId}.`,
    `**Slice file**: \`${slicePathRel}\``,
    "",
    "**Focus**:",
    focus,
    "",
    "Read the builder handoff (latest in .claude/artifacts/crew/handoffs/ for this slice).",
    "Write your verdict via `crew write-review-result`. Do NOT pause without writing the artifact."
  ].join("\n");
}

function validatorPrompt(sliceId: string, slicePathRel: string): string {
  return [
    `You are the Validator on the post-builder fanout for slice ${sliceId}.`,
    `**Slice file**: \`${slicePathRel}\``,
    "",
    `Run \`bun src/scripts/loop.mts phase-gate --repo "$PWD" --slice ${sliceId}\` to gather evidence.`,
    "Write your verdict via `crew write-validation-result`.",
    "",
    "You run INDEPENDENTLY of the other specialists. Do not read review artifacts. Verdict is based on behavior evidence only."
  ].join("\n");
}

export async function buildPostBuilderFanout(
  repoPath: string,
  sliceId: string,
  { config = null }: { config?: Record<string, any> | null } = {}
): Promise<FanoutResult> {
  if (!sliceId) throw new Error("buildPostBuilderFanout requires sliceId");
  const slicesRootDir = resolveSlicesRoot(repoPath, config);
  const sliceFile = await locateSliceFile(slicesRootDir, sliceId);
  if (!sliceFile) throw new Error(`Slice not found: ${sliceId}`);
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  parseFrontmatter(sliceContent); // sanity parse — surfaces malformed frontmatter early
  const slicePathRel = path.relative(repoPath, sliceFile).replace(/\\/g, "/");

  const tasks: FanoutTask[] = [
    {
      role: "reviewer-A",
      subagent_type: "crew:reviewer",
      description: `Reviewer A review of ${sliceId} (fanout)`,
      prompt: reviewerPrompt(sliceId, slicePathRel, "A")
    },
    {
      role: "reviewer-B",
      subagent_type: "crew:reviewer",
      description: `Reviewer B review of ${sliceId} (fanout)`,
      prompt: reviewerPrompt(sliceId, slicePathRel, "B")
    },
    {
      role: "validator",
      subagent_type: "crew:validator",
      description: `Validator behavior check of ${sliceId} (fanout)`,
      prompt: validatorPrompt(sliceId, slicePathRel)
    }
  ];

  const contractBlock = [
    "PARALLEL_DISPATCH_CONTRACT v1",
    `required: emit exactly ONE message containing N=${tasks.length} Agent tool calls`,
    "forbidden: send any message between dispatches",
    "forbidden: wait for one return before next dispatch",
    "violation: serial-reviewer-warning badge logged to grade"
  ].join("\n");

  return {
    sliceId,
    tasks,
    instructions: `${contractBlock}\n\nAggregate: any reviewer FAIL halts slice; validator FAIL halts slice; all PASS continues to grade.`,
    aggregation: { halt_on_any_FAIL: true, wait_for_all: true }
  };
}
