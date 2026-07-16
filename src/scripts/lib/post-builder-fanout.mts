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

import { buildMemoryContext } from "./memory-context.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "./paths.mjs";

export type FanoutTask = {
  role: "reviewer-A" | "reviewer-B";
  subagent_type: "crew:reviewer";
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

// FEAT-219 AC-8: fold in a reviewer-scoped memory-context block, mirroring the
// splice pattern already used at start-slice.mts:483-491 (prepend, blank-line
// separated). `buildMemoryContext` is noop-safe — memory disabled/absent
// (today's default) returns "" and this function's output is byte-identical
// to pre-FEAT-219 (see the golden test in post-builder-fanout.test.mts).
async function reviewerPrompt(
  repoPath: string,
  sliceId: string,
  slicePathRel: string,
  role: "A" | "B",
  config: Record<string, any> | null
): Promise<string> {
  const focus =
    role === "A"
      ? "Correctness, regressions, and explicit coverage of each acceptance criterion."
      : "Production-readiness, observability, security posture, edge cases.";
  // Restores the "## Not checked" required-section spec that shipped in
  // commands/slice-review-ladder.md (42d044c7) and was accidentally dropped
  // when FEAT-277 (ee5cea95) consolidated that file away without re-porting
  // it into this generator. Wording adapted from the original per-role
  // examples so it reads correctly for both Reviewer A and Reviewer B.
  const notCheckedHint =
    role === "A"
      ? "e.g. performance characteristics, cross-platform behavior beyond the CI environment, interaction with concurrent slice changes on other branches — anything outside correctness/regressions/AC coverage."
      : "e.g. business-logic correctness and AC coverage (owned by Reviewer A), test case adequacy and branch coverage, third-party dependency version compatibility outside the pinned lock file — anything outside production-readiness/observability/security.";
  const prompt = [
    `You are Reviewer ${role} on the post-builder fanout for slice ${sliceId}.`,
    `**Slice file**: \`${slicePathRel}\``,
    "",
    "**Focus**:",
    focus,
    "",
    "## Not checked (required, ≥2 items)",
    "List at least 2 things you deliberately did NOT cover in this review pass.",
    notCheckedHint,
    'Pass them via `crew write-review-result --not-checked "<item-a>,<item-b>"`.',
    "",
    '## Durable findings (max 3, "none" is legal)',
    "Transferable lessons only — a bug CLASS to watch for next time, a contract truth discovered, or decision rationale. Never run-state.",
    'Bad: "tsc was clean." Good: "Provider adapters here swallow timeout errors on bare catch — check for that shape in any new provider.mts."',
    "",
    "## Run evidence (ephemeral)",
    "Gate outputs, timings, file lists, verdict mechanics — everything else about this run.",
    "",
    "Read the builder handoff (latest in .claude/artifacts/crew/handoffs/ for this slice).",
    "Write your verdict via `crew write-review-result`. Do NOT pause without writing the artifact."
  ].join("\n");

  const memoryBlock = await buildMemoryContext({
    repoPath,
    agentType: "reviewer",
    query: sliceId,
    sliceId,
    config
  });
  return memoryBlock ? `${memoryBlock}\n\n${prompt}` : prompt;
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
  const reviewerTasks: FanoutTask[] = await Promise.all(
    ladder.map(async (role) => ({
      role: `reviewer-${role}` as "reviewer-A" | "reviewer-B",
      subagent_type: "crew:reviewer" as const,
      description: `Reviewer ${role} review of ${sliceId} (fanout)`,
      prompt: await reviewerPrompt(repoPath, sliceId, slicePathRel, role, config)
    }))
  );
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
