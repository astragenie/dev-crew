import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig } from "./config-resolver.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import {
  locateSliceFile,
  slicesRoot as resolveSlicesRoot,
  backlogRoot as resolveBacklogRoot
} from "./paths.mjs";

const DEFAULT_FOCUS = {
  A: "Correctness, regressions, and explicit coverage of each acceptance criterion. Verify diffs against the slice file. Flag missing test cases.",
  B: "Production-readiness, observability (OTel spans / structured logs), security posture, edge cases. Check for hardcoded secrets, missing healthchecks, and absent error paths."
};

export async function buildReviewLadder(repoPath, sliceId, { config = null } = {}) {
  if (!sliceId) throw new Error("buildReviewLadder requires sliceId");
  const resolved = config || (await resolveConfig(repoPath));
  const ladder = resolved.reviewers?.ladder || ["A", "B"];
  const focusOverrides = resolved.reviewers?.focus || {};
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice not found: ${sliceId}`);
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter } = parseFrontmatter(sliceContent);
  const featureId = frontmatter.feature || null;
  const phase = frontmatter.phase || null;
  const slicePathRel = path.relative(repoPath, sliceFile).replace(/\\/g, "/");
  const { buildArtifactTitle } = await import("./artifact-naming.mjs");
  // Suggested --title prefix so the review-result artifact filename
  // includes FEAT/phase via crew CLI's slugifier. Agents append a
  // human one-line summary after the prefix.
  const titlePrefix = buildArtifactTitle({ featureId, phase, sliceId });

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
        featureId
          ? `**Linked feature**: \`${path.relative(repoPath, path.join(resolveBacklogRoot(repoPath, resolved), "in-progress", featureId + ".md")).replace(/\\/g, "/")}\``
          : "",
        "",
        "**Your focus area**:",
        focus,
        "",
        "**What to do**:",
        "1. Read the slice file. List its acceptance criteria.",
        "2. Read the diff for the in-progress slice (git diff against base).",
        "3. For each acceptance criterion, evaluate PASS / FAIL / PARTIAL with one-line evidence.",
        "4. Surface any prior decisions relevant to changed files (run `/loop:decisions relevant --files <list>`).",
        "5. Write your review verdict using the crew writer with ALL flags below so every section is populated:",
        "",
        "   ```",
        `   crew write-review-result \\`,
        `     --title "${titlePrefix}: <one-line summary>" \\`,
        `     --decision <PASS|FAIL> \\`,
        `     --summary "<one-line verdict>" \\`,
        `     --evidence "<comma-separated list of files you checked>" \\`,
        `     --files "<comma-separated list of files in the diff>" \\`,
        `     --test-summary "<test coverage assessment — e.g. 12/12 pass, 2 new>" \\`,
        `     --risks "<residual risks or 'none'>" \\`,
        `     --next "<required follow-up actions or 'none'>"${featureId ? ` \\\n     --feature ${featureId}` : ""}${phase ? ` \\\n     --phase ${phase}` : ""}`,
        "   ```",
        "",
        "   Every flag maps to a section in the artifact. Passing `-` or omitting a flag leaves that section empty — fill them all.",
        "",
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
