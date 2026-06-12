import fs from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.mjs";
import { locateSliceFile, backlogRoot as resolveBacklogRoot } from "../paths.mjs";

interface DispatchLimits {
  maxSubagentsPerSlice: number;
  preferInlineFor?: string[];
}

function buildBudgetLine(dispatchLimits: DispatchLimits | null) {
  if (!dispatchLimits) return "";
  const preferInline = (dispatchLimits.preferInlineFor || []).join(", ");
  return (
    `\n\n> **Dispatch budget (hard limit):** max ${dispatchLimits.maxSubagentsPerSlice} subagents this slice. ` +
    `Prefer inline (no subagent dispatch) for: ${preferInline}. ` +
    `Bundle review + validation into one pass when scope is small.`
  );
}

function appendContextBlock(
  lines: string[],
  rel: string | null,
  sliceContent: string | null,
  featureId: string | null,
  featureExcerpt: string | null,
  featurePath: string | null = null
) {
  if (!sliceContent && !featureExcerpt) return;
  lines.push("", "## Slice context (pre-read — do not re-read these files)", "");
  if (rel && sliceContent) {
    lines.push(`### Slice: ${rel}`, "", sliceContent);
  }
  if (featureId && featureExcerpt) {
    lines.push("", `### Feature: ${featureId}`);
    if (featurePath) lines.push(`Path: ${featurePath}`);
    lines.push("", featureExcerpt);
  }
}

function appendProgressSignals(lines: string[]) {
  lines.push(
    "",
    "## Progress signals",
    "",
    "Emit two advisory line-tags so the parent orchestrator has early visibility into your mode choice and per-AC progress. Advisory only — parent degrades gracefully on absence.",
    "",
    "- `[MODE] <single-session|assisted-single-session|team-run>` — emit exactly once, as the first line of your first response after dispatch. Optional free-form note after `—`, e.g. `[MODE] team-run — delegating crew:fullstack-dev for src/foo/`.",
    "- `[CHECKPOINT] AC-<N>: <pass|fail|skip> — <≤80 char note>` — emit one per AC AFTER the AC is verified. Status `fail` is the parent's interrupt signal; status `skip` carries a reason in the note."
  );
}

function appendWorktreeSection(lines: string[], worktreePath: string | null | undefined): void {
  if (!worktreePath) return;
  lines.push(
    "",
    "## Worktree",
    "",
    `This slice operates inside a dedicated git worktree at:`,
    ``,
    `  ${worktreePath}`,
    ``,
    `Keep ALL file edits, state writes, and artifact writes inside this worktree path. Do NOT edit files under the main repo path. When running crew shell-outs (write-handoff, mark-badge, etc.) pass \`--repo ${worktreePath}\`.`
  );
}

export type OrchestratorMode = "lead" | "orchestrate-slice" | "direct-builder" | "slice-build";

function resolveOrchestratorMode(
  orchestratorMode: OrchestratorMode | undefined
): OrchestratorMode {
  return orchestratorMode ?? "lead";
}

export type BuilderVariant = "frontend" | "backend" | "fullstack" | "parallel-fe-be";

/**
 * Pick a crew builder variant from a slice's frontmatter `tags` array.
 * FEAT-190 / SLICE-104 (single-variant) + SLICE-105 (parallel fanout).
 *
 * Mapping:
 *   - tags ⊇ {"fe"} AND NOT ⊇ {"be"} → "frontend"
 *   - tags ⊇ {"be"} AND NOT ⊇ {"fe"} → "backend"
 *   - tags ⊇ {"fe"} AND ⊇ {"be"}     → "parallel-fe-be"
 *   - otherwise (missing / malformed / no surface tag) → "fullstack"
 */
export function pickBuilderVariant(tags: unknown): BuilderVariant {
  if (!Array.isArray(tags)) return "fullstack";
  const set = new Set(tags.filter((t): t is string => typeof t === "string"));
  const hasFe = set.has("fe");
  const hasBe = set.has("be");
  if (hasFe && hasBe) return "parallel-fe-be";
  if (hasFe) return "frontend";
  if (hasBe) return "backend";
  return "fullstack";
}

function variantToAgent(variant: BuilderVariant): string {
  if (variant === "frontend") return "crew:frontend-dev";
  if (variant === "backend") return "crew:backend-dev";
  return "crew:fullstack-dev";
}

/**
 * Build the dispatch instruction body for a parallel-fe-be slice-build.
 * Emits a single string that the orchestrating agent reads inline and turns
 * into ONE Agent tool-call message with TWO tool calls (frontend-dev +
 * backend-dev). The PARALLEL DISPATCH header is the unambiguous signal.
 */
function buildParallelFeBeInstruction(
  sliceId: string,
  title: string,
  rel: string | null,
  resolvedGoal: string | null,
  dispatchLimits: DispatchLimits | null
): string {
  const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
  const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
  const suffix = buildBudgetLine(dispatchLimits);
  const closeTail =
    `When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch crew:inspector, then crew:verifier if behavior changed, then run /loop:slice complete --id ${sliceId}. If a needed cross-cutting change is out of scope, stop and surface it to the parent loop.${suffix}`;
  return [
    `PARALLEL DISPATCH — issue ONE Agent message with TWO parallel tool calls:`,
    "",
    `  1. crew:frontend-dev with the **Frontend prompt** below.`,
    `  2. crew:backend-dev with the **Backend prompt** below.`,
    "",
    `Both subagents own their respective slice surface. The parent loop drives crew:inspector and crew:verifier AFTER both return. Never use caveman:* agents for slice work.`,
    "",
    `**Frontend prompt** (for crew:frontend-dev):`,
    `> Implement the frontend portion of ${title}.${sliceRef}${goalLine} You own implementation of the frontend surface only. Do NOT dispatch crew:inspector or crew:verifier yourself. ${closeTail}`,
    "",
    `**Backend prompt** (for crew:backend-dev):`,
    `> Implement the backend portion of ${title}.${sliceRef}${goalLine} You own implementation of the backend surface only. Do NOT dispatch crew:inspector or crew:verifier yourself. ${closeTail}`
  ].join("\n");
}

export function buildDispatchInstruction({
  sliceId,
  title,
  sliceFile,
  repoPath,
  resolvedGoal,
  featureId = null,
  sliceContent = null,
  featureExcerpt = null,
  featurePath = null,
  dispatchLimits = null as DispatchLimits | null,
  orchestratorMode,
  worktreePath = null as string | null
}: {
  sliceId: string;
  title: string;
  sliceFile: string | null;
  repoPath: string;
  resolvedGoal: string | null;
  featureId?: string | null;
  sliceContent?: string | null;
  featureExcerpt?: string | null;
  featurePath?: string | null;
  dispatchLimits?: DispatchLimits | null;
  orchestratorMode?: OrchestratorMode;
  worktreePath?: string | null;
}) {
  const mode = resolveOrchestratorMode(orchestratorMode);
  const rel = sliceFile ? path.relative(repoPath, sliceFile).replace(/\\/g, "/") : null;

  if (mode === "lead") {
    const lines = [buildLeadOrchestratorInstruction(sliceId, title, rel)];
    appendProgressSignals(lines);
    appendWorktreeSection(lines, worktreePath);
    appendContextBlock(lines, rel, sliceContent, featureId, featureExcerpt, featurePath);
    return lines.join("\n");
  }
  if (mode === "orchestrate-slice") {
    return buildOrchestrateSliceInstruction(sliceId);
  }

  const variant: BuilderVariant =
    mode === "slice-build" ? pickBuilderVariant(extractTags(sliceContent)) : "fullstack";

  const preflight =
    mode === "slice-build" && needsContractPreflight(sliceContent, repoPath, sliceId)
      ? buildArchitectPreflight(sliceId, title, rel) + "\n---\n\n"
      : "";

  let header: string;
  if (variant === "parallel-fe-be") {
    header = buildParallelFeBeInstruction(sliceId, title, rel, resolvedGoal, dispatchLimits);
  } else {
    const agentName = variantToAgent(variant);
    const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
    const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
    const suffix = buildBudgetLine(dispatchLimits);
    header = [
      `Dispatch ${agentName} subagent with this prompt:`,
      "",
      `> Implement ${title}.${sliceRef}${goalLine} You own implementation only — frame, edit, run the self-verify gates, and return a write-handoff artifact path. Do NOT dispatch crew:inspector or crew:verifier yourself; the parent loop drives those gates separately after you return. Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch crew:inspector, then crew:verifier if behavior changed, then run /loop:slice complete --id ${sliceId}. If a needed cross-cutting change is out of scope, stop and surface it to the parent loop.${suffix}`
    ].join("\n");
  }
  const lines = [preflight + header];
  appendProgressSignals(lines);
  appendWorktreeSection(lines, worktreePath);
  appendContextBlock(lines, rel, sliceContent, featureId, featureExcerpt, featurePath);
  return lines.join("\n");
}

function extractTags(sliceContent: string | null): unknown {
  if (!sliceContent) return undefined;
  const { frontmatter } = parseFrontmatter(sliceContent);
  return frontmatter?.tags;
}

function extractNeedsContract(sliceContent: string | null): boolean {
  if (!sliceContent) return false;
  const { frontmatter } = parseFrontmatter(sliceContent);
  return frontmatter?.needs_contract === true;
}

/**
 * Decide whether a `slice-build` dispatch should prepend an architect pre-flight.
 * Returns true when the slice declares `needs_contract: true` AND no contract
 * artifact already exists at `.claude/artifacts/crew/contracts/<sliceId>-*.md`.
 * Synchronous — uses readdirSync to keep buildDispatchInstruction sync.
 * FEAT-190 / SLICE-106.
 */
function needsContractPreflight(
  sliceContent: string | null,
  repoPath: string,
  sliceId: string
): boolean {
  if (!extractNeedsContract(sliceContent)) return false;
  const dir = path.join(repoPath, ".claude/artifacts/crew/contracts");
  if (!existsSync(dir)) return true;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return true;
  }
  const prefix = `${sliceId}-`;
  const has = entries.some((name) => name.startsWith(prefix) && name.endsWith(".md"));
  return !has;
}

function buildArchitectPreflight(sliceId: string, title: string, rel: string | null): string {
  const sliceRef = rel ? ` See \`${rel}\` for slice scope.` : "";
  return [
    `ARCHITECT PRE-FLIGHT — slice declares \`needs_contract: true\` and no contract artifact exists yet.`,
    "",
    `Dispatch crew:architect FIRST with this prompt:`,
    "",
    `> Produce a contract artifact for ${sliceId} (${title}).${sliceRef} Write the contract under \`.claude/artifacts/crew/contracts/${sliceId}-<short-name>.md\` with frontmatter \`kind: contract\` + \`slice: ${sliceId}\`. The contract must capture: data shapes, public function signatures, integration surfaces, and edge cases the builder(s) will consume. Return the artifact path so the parent loop can verify and proceed.`,
    "",
    `AWAIT the contract artifact. Then proceed with the builder dispatch below:`,
    ""
  ].join("\n");
}

function buildLeadOrchestratorInstruction(
  sliceId: string,
  title: string,
  rel: string | null
): string {
  const sliceRef = rel
    ? ` See \`${rel}\` for acceptance criteria, scope-fence, and reviewer ladder.`
    : "";
  return [
    `Dispatch crew:lead subagent with this prompt:`,
    "",
    `> Orchestrate ${title}.${sliceRef} You own the slice ceremony end-to-end: dispatch architect (if contracts/topology need design), then builder. After builder PASS, invoke \`bun src/scripts/loop.mts slice post-builder-fanout --id ${sliceId}\` and dispatch the 3 returned tasks (reviewer-A, reviewer-B, validator) in parallel — one message with 3 Agent tool calls. See \`commands/slice-post-builder-fanout.md\` for the contract. Synthesize specialist results into a final-synthesis artifact. Close by running /loop:slice complete --id ${sliceId} and /loop:slice grade --id ${sliceId}. Escalate to the parent loop only on irreversible destructive actions or when confidence falls below 0.4. If a needed cross-cutting change is out of scope, stop and surface it.`
  ].join("\n");
}

function buildOrchestrateSliceInstruction(sliceId: string): string {
  return [
    `Invoke /crew:orchestrate-slice to run the full specialist ladder for this slice:`,
    ``,
    `> /crew:orchestrate-slice --id ${sliceId}`,
    ``,
    `The command dispatches specialists in sequence from the main thread (architect if needed,`,
    `builder, reviewer, validator, crew:document-writer). All dispatches are visible in this`,
    `window. When the ladder completes, close with /loop:slice complete --id ${sliceId}.`
  ].join("\n");
}

// Locates the slice file under slicesRoot and reads frontmatter + objective
// text. Returns null fields when the slice file is missing — callers fall
// back gracefully (run-brief emits with bare sliceId; dispatchInstruction
// omits goalLine).
export async function readSliceContext(slicesRoot: string, sliceId: string) {
  let file: string | null = null;
  try {
    file = await locateSliceFile(slicesRoot, sliceId);
  } catch {
    file = null;
  }
  if (!file) {
    return {
      file: null as string | null,
      frontmatter: {} as import("../frontmatter.mjs").Frontmatter,
      goal: null as string | null
    };
  }
  const content = await fs.readFile(file, "utf8");
  const frontmatter = parseFrontmatter(content).frontmatter || {};
  const goal = extractObjective(content);
  const scope = extractSection(content, /^##\s+(In\s+scope|Acceptance\s+criteria)\s*$/i, {
    maxLen: 800,
    joinChar: "\n"
  });
  const outOfScope = extractSection(content, /^##\s+Out\s+of\s+scope\s*$/i, {
    maxLen: 400,
    joinChar: "\n"
  });
  return { file, frontmatter, goal, scope, outOfScope, content };
}

export async function readFeatureExcerpt(
  repoPath: string,
  featureId: string,
  config: Record<string, any> | null | undefined
): Promise<{ path: string; excerpt: string } | null> {
  const root = resolveBacklogRoot(repoPath, config);
  for (const dir of ["in-progress", "triaged", "pending", "done"]) {
    const p = path.join(root, dir, `${featureId}.md`);
    const content = await fs.readFile(p, "utf8").catch((): null => null);
    if (content) {
      const excerpt = extractSection(content, /^##\s+Description\s*$/i, {
        maxLen: 400,
        joinChar: "\n"
      });
      return { path: p, excerpt: excerpt ?? "" };
    }
  }
  return null;
}

export function extractSection(
  sliceContent: string,
  headingPattern: RegExp,
  { maxLen = 500, joinChar = " " }: { maxLen?: number; joinChar?: string } = {}
) {
  const lines = sliceContent.split(/\r?\n/);
  const startIdx = lines.findIndex((l: string) => headingPattern.test(l));
  if (startIdx === -1) return null;
  const body: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^##\s+/.test(line)) break;
    if (line.trim().length === 0 && body.length === 0) continue;
    body.push(line);
  }
  const text = body.join(joinChar).trim();
  return text.length > 0 ? text.slice(0, maxLen) : null;
}

function extractObjective(sliceContent: string) {
  return extractSection(sliceContent, /^##\s+Objective\s*$/i);
}
