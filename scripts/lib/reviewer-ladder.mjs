import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig } from "./config-resolver.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

// Produces structured review-task prompts for parallel reviewer agents per
// the `reviewers.ladder` config (default ["A", "B"]). Plugin does not spawn
// the agents — Claude Code does that via the Task tool / subagents. This
// module hands the orchestrator the prompts to dispatch.
//
// Reviewer A focus: correctness, regressions, acceptance criteria coverage.
// Reviewer B focus: production-readiness, observability, security, edge cases.
// Customize per-reviewer focus via reviewers.focus.<id> in config.

const DEFAULT_FOCUS = {
  A: "Correctness, regressions, and explicit coverage of each acceptance criterion. Verify diffs against the slice file. Flag missing test cases.",
  B: "Production-readiness, observability (OTel spans / structured logs), security posture, edge cases. Check for hardcoded secrets, missing healthchecks, and absent error paths."
};

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function locateSliceFile(slicesRoot, sliceId) {
  if (!(await pathExists(slicesRoot))) return null;
  const slicePattern = sliceId.replace("-", "[_-]");
  const re = new RegExp(`^${slicePattern}(_|$)`, "i");
  const stack = [slicesRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (re.test(e.name)) return full;
    }
  }
  return null;
}

export async function buildReviewLadder(repoPath, sliceId, { config = null } = {}) {
  if (!sliceId) throw new Error("buildReviewLadder requires sliceId");
  const resolved = config || (await resolveConfig(repoPath));
  const ladder = resolved.reviewers?.ladder || ["A", "B"];
  const focusOverrides = resolved.reviewers?.focus || {};
  const slicesRoot = path.resolve(repoPath, resolved.loop?.slicesRoot || "docs/ai-loop/slices");
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice not found: ${sliceId}`);
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(sliceContent);
  const featureId = frontmatter.feature || null;
  const slicePathRel = path.relative(repoPath, sliceFile).replace(/\\/g, "/");

  const tasks = ladder.map((reviewerId) => {
    const focus =
      focusOverrides[reviewerId] ||
      DEFAULT_FOCUS[reviewerId] ||
      `Review ${sliceId} from your assigned perspective.`;
    return {
      reviewer: reviewerId,
      subagent_type: "crew:reviewer",
      description: `Reviewer ${reviewerId} review of ${sliceId}`,
      prompt: [
        `You are Reviewer ${reviewerId} on the Wiggin Loop ladder for slice ${sliceId}.`,
        "",
        `**Slice file**: \`${slicePathRel}\``,
        featureId ? `**Linked feature**: \`docs/backlog/in-progress/${featureId}.md\`` : "",
        "",
        "**Your focus area**:",
        focus,
        "",
        "**What to do**:",
        "1. Read the slice file. List its acceptance criteria.",
        "2. Read the diff for the in-progress slice (git diff against base).",
        "3. For each acceptance criterion, evaluate PASS / FAIL / PARTIAL with one-line evidence.",
        "4. Surface any prior decisions relevant to changed files (run `/loop:decisions relevant --files <list>`).",
        "5. Write your review verdict using the crew writer:",
        `   \`crew write-review-result --decision <PASS|FAIL> --summary "<one-line>" --evidence <path-to-detail-file>\``,
        `6. Link the review artifact to ${sliceId}:`,
        `   \`/loop:slice link --id ${sliceId} --kind reviews --artifact <path>\``,
        "",
        `**Verdict format**: \`PASS\` (no blockers) | \`PASS with minor\` (small fixups requested) | \`FAIL\` (blocker — list them).`
      ]
        .filter(Boolean)
        .join("\n")
    };
  });

  return {
    sliceId,
    ladder,
    tasks,
    instructions: `Dispatch each task in parallel using the Task tool with the listed subagent_type. Aggregate verdicts — slice passes when all reviewers return PASS or PASS with minor.`
  };
}
