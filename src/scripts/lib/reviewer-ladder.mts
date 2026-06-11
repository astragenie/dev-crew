import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig } from "./config-resolver.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import {
  locateSliceFile,
  slicesRoot as resolveSlicesRoot,
  backlogRoot as resolveBacklogRoot
} from "./paths.mjs";

const DEFAULT_FOCUS: Record<string, string> = {
  A: "Correctness, regressions, and explicit coverage of each acceptance criterion. Verify diffs against the slice file. Flag missing test cases.",
  B: "Production-readiness, observability (OTel spans / structured logs), security posture, edge cases. Check for hardcoded secrets, missing healthchecks, and absent error paths.",
  correctness:
    "Logic correctness, behavior preservation, race conditions, error-propagation. ONLY correctness. NOT in scope: test coverage gaps, style/conventions, or production-readiness concerns — a separate agent owns those.",
  "test-coverage":
    "Happy-path, partial-failure, and edge-case test coverage. Flag missing scenarios and untested branches. ONLY test coverage. NOT in scope: correctness of logic, code style, or production concerns — a separate agent owns those.",
  conventions:
    "Repo standards: ESM/.mts parity, line caps (300 agent / 200 skill), complexity ≤15, comment hygiene, no banned patterns (process.exit from libraries, CommonJS require). ONLY conventions. NOT in scope: logic correctness or test gaps — separate agents own those."
};

const MULTIDIM_LADDER = ["correctness", "test-coverage", "conventions"] as const;

const MULTIDIM_BUDGET_INSTRUCTION =
  "**Hard budget**: ≤15 tool calls, ≤8 min. If you cannot finish within budget, write your review artifact with what you have and mark incomplete sections explicitly. Do NOT pause without writing the artifact — per the pause-handling SOP, a missing artifact means the gate is unresolved.";

function resolvePreset(ladderConfig: unknown): string[] {
  if (Array.isArray(ladderConfig)) return ladderConfig as string[];
  if (
    ladderConfig !== null &&
    typeof ladderConfig === "object" &&
    (ladderConfig as Record<string, unknown>).preset === "multidim"
  ) {
    return [...MULTIDIM_LADDER];
  }
  return ["A", "B"];
}

function isMultidimId(reviewerId: string): boolean {
  return (MULTIDIM_LADDER as readonly string[]).includes(reviewerId);
}

export function extractFilesSection(content: string) {
  const m = content.match(
    /(?:\*\*Files:\*\*[ \t]*|(?:^|\n)## Files[^\n]*)\n([\s\S]*?)(?=\n## |\s*$)/
  );
  return m ? (m[1] ?? "").trim() || null : null;
}

async function runGitDiffStat(repoPath: string) {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { stdout } = await promisify(execFile)("git", ["diff", "HEAD~1", "--stat"], {
      cwd: repoPath,
      maxBuffer: 64 * 1024
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function buildReviewLadder(
  repoPath: string,
  sliceId: string,
  { config = null }: { config?: Record<string, any> | null } = {}
) {
  if (!sliceId) throw new Error("buildReviewLadder requires sliceId");
  const resolved = config || (await resolveConfig(repoPath));
  const ladderConfig = resolved.reviewers?.ladder ?? ["A", "B"];
  const ladder = resolvePreset(ladderConfig);
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

  const [filesBlock, diffStat] = await Promise.all([
    Promise.resolve(extractFilesSection(sliceContent)),
    runGitDiffStat(repoPath)
  ]);

  const tasks = ladder.map((reviewerId: string) => {
    const focus =
      (focusOverrides as Record<string, string>)[reviewerId] ||
      DEFAULT_FOCUS[reviewerId] ||
      `Review ${sliceId} from your assigned perspective.`;
    const multidim = isMultidimId(reviewerId);
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
        multidim ? MULTIDIM_BUDGET_INSTRUCTION : "",
        `**Files in scope (pre-loaded — do not re-discover):**`,
        filesBlock ?? "(discover from slice spec above)",
        "",
        `**Diff stat (HEAD~1):**`,
        diffStat ?? "(run git diff HEAD~1 --stat)",
        "",
        "Do not read files outside the above list unless they are direct imports.",
        'Run targeted tests only: `npm test -- --test-name-pattern "<test-file-basename>"`',
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
        "   Every flag maps to a section in the artifact. Passing `-` or omitting a flag leaves that section empty — fill them all. **`--test-summary` is enforced by a gate: leaving it as `-` will block `completeSlice` from advancing the feature to done.**",
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

  const contractBlock = [
    "PARALLEL_DISPATCH_CONTRACT v1",
    `required: emit exactly ONE message containing N=${ladder.length} Agent tool calls`,
    "forbidden: send any message between dispatches",
    "forbidden: wait for one reviewer return before next dispatch",
    "violation: serial-reviewer-warning badge logged to grade"
  ].join("\n");

  return {
    sliceId,
    ladder,
    tasks,
    instructions: `${contractBlock}\n\nAggregate verdicts — slice passes when all reviewers return PASS or PASS with minor.`
  };
}
