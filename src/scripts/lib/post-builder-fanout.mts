// Post-builder fanout — emit a single parallel-dispatch payload containing
// the configured reviewer(s). Replaces the previous serial
// reviewer-A -> reviewer-B -> validator chain after builder PASS.
//
// Reviewer count is driven by `config.reviewers.ladder` (an ordered subset of
// ["A", "B"]). A single-entry ladder (e.g. ["A"]) dispatches ONE reviewer; the
// two-entry ["A", "B"] dispatches both. An absent, empty, or all-invalid ladder
// falls back to the two-reviewer default so the review gate is never silently
// dropped.
//
// NO validator: behavior/test validation is delegated to the CI test gate, and
// the reviewer's approval badge satisfies the close-time validation gate when
// `loop.validation.satisfiedByReview` is set (see validation-gate.mts). This
// keeps the post-builder step a single review pass.
//
// Pure I/O surface: reads the slice file to validate its existence and to
// expose its relative path in the prompts. No config mutation, no dispatch
// side effects, no `process.exit`. Caller (loop.mts CLI handler) is the
// only stdout surface.
//
// Reuses PARALLEL_DISPATCH_CONTRACT v1 wording.
//
// Aggregation rules (asserted by post-builder-fanout.test.mts):
//   halt_on_any_FAIL: true   -- any reviewer FAIL halts slice.
//   wait_for_all: true        -- orchestrator waits for all review artifacts.

import fs from "node:fs/promises";
import path from "node:path";

import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "./paths.mjs";

export type FanoutTask = {
  role: "reviewer-A" | "reviewer-B";
  subagent_type: "crew:inspector";
  description: string;
  prompt: string;
};

export type FanoutResult = {
  sliceId: string;
  tasks: FanoutTask[];
  instructions: string;
  aggregation: { halt_on_any_FAIL: true; wait_for_all: true };
};

const DEFAULT_LADDER: Array<"A" | "B"> = ["A", "B"];

/**
 * Resolve the reviewer ladder from `config.reviewers.ladder`. Keeps only the
 * valid roles "A"/"B" in configured order, deduped. An absent, non-array,
 * empty, or all-invalid ladder falls back to the two-reviewer default so the
 * review gate is never silently dropped by a malformed config.
 */
function resolveLadder(config: Record<string, any> | null): Array<"A" | "B"> {
  const raw = config?.reviewers?.ladder;
  if (!Array.isArray(raw)) return [...DEFAULT_LADDER];
  const seen = new Set<string>();
  const resolved: Array<"A" | "B"> = [];
  for (const entry of raw) {
    const role = typeof entry === "string" ? entry.trim().toUpperCase() : "";
    if ((role === "A" || role === "B") && !seen.has(role)) {
      seen.add(role);
      resolved.push(role);
    }
  }
  return resolved.length > 0 ? resolved : [...DEFAULT_LADDER];
}

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
  const slicePathRel = path.relative(repoPath, sliceFile).replace(/\\/g, "/");
  if (!sliceContent.startsWith("---")) {
    throw new Error(`Slice file missing frontmatter header: ${slicePathRel}`);
  }

  const ladder = resolveLadder(config);
  const reviewerTasks: FanoutTask[] = ladder.map((role) => ({
    role: `reviewer-${role}` as "reviewer-A" | "reviewer-B",
    subagent_type: "crew:inspector",
    description: `Reviewer ${role} review of ${sliceId} (fanout)`,
    prompt: reviewerPrompt(sliceId, slicePathRel, role)
  }));
  const tasks: FanoutTask[] = reviewerTasks;

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
    instructions: `${contractBlock}\n\nAggregate: any reviewer FAIL halts slice; all PASS continues to grade.`,
    aggregation: { halt_on_any_FAIL: true, wait_for_all: true }
  };
}
