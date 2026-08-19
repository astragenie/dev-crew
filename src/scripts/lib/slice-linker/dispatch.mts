import fs from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.mjs";
import { locateSliceFile, backlogRoot as resolveBacklogRoot } from "../paths.mjs";
import { isFeatureEnabled } from "../features-service.mjs";
import { needsQaGatePreflight, buildQaGatePreflight } from "./qa-gate-preflight.mjs";

interface DispatchLimits {
  maxSubagentsPerSlice: number;
  preferInlineFor?: string[];
}

// Plain sentence (no blockquote/markdown formatting) — callers assemble it
// into a task-scoped GATES order line via formatTaskScopedPlain/Quote below.
// FEAT-263 T1: previously returned a pre-formatted "\n\n> **Dispatch
// budget...**" fragment; that formatting now lives at the call site so the
// order can be labeled and confined inside <task-scoped>.
function buildBudgetLine(dispatchLimits: DispatchLimits | null): string {
  if (!dispatchLimits) return "";
  const preferInline = (dispatchLimits.preferInlineFor || []).join(", ");
  return (
    `Dispatch budget (hard limit): max ${dispatchLimits.maxSubagentsPerSlice} subagents this slice. ` +
    `Prefer inline (no subagent dispatch) for: ${preferInline}. ` +
    `Bundle review + validation into one pass when scope is small.`
  );
}

// ---------------------------------------------------------------------------
// FEAT-263 T1: <task-scoped> order-block marker.
//
// Dispatch headers used to mix objective prose with hard orders (forbidden
// dispatches, return instructions, budget gates) in one continuous paragraph.
// Per the dual-reviewed extraction-quality plan (T1, architect finding 9's
// companion echo rule = finding 2), every rewritten template now separates
// objective/context prose from ALL task-scoped orders, which are wrapped in a
// single, non-nested <task-scoped>...</task-scoped> region per prompt. This
// is groundwork only — until upstream astramem-local#374's E3 teaches the
// session-transcript extractor to skip marked regions, the marker has zero
// chaff effect on its own (plan T1's explicit framing). Ad-hoc / 3rdparty /
// user-authored dispatches never carry this marker — known, accepted partial
// coverage (plan T1). validate-dispatch-markers.mts enforces that every
// order-block keyword below appears only inside a marked region.
//
// Keep this list in sync with every FORBIDDEN:/GATES:/RETURN:/ECHO: label
// actually emitted below — validate-dispatch-markers.mts imports this array
// directly rather than hardcoding its own copy, so a new label only needs to
// be added here once.
export const TASK_SCOPED_ORDER_KEYWORDS = ["FORBIDDEN", "GATES", "RETURN", "ECHO"] as const;

// Companion echo rule (arch finding 2): the echo evidence proves agents
// re-quote dispatch bullets into their own handoff/report output, which a
// marker at the origin chunk cannot stop by itself — every rewritten
// template therefore also carries this explicit instruction, with a negative
// example (not just a positive one), so it appears the same way everywhere.
// NOTE: deliberately does not spell out the literal "<task-scoped>" /
// "</task-scoped>" strings in this prose — doing so would embed a spurious
// marker-shaped substring INSIDE the marked region itself and trip
// validate-dispatch-markers.mts's balance scan (found via that gate).
// "this task-scoped block" reads identically to a human/agent without the
// literal tag text.
const ECHO_RULE_LINES = [
  `ECHO: Never quote this task-scoped block back into your handoff or report — restating a FORBIDDEN/GATES/RETURN bullet "for completeness" leaks task-scoped orders into durable memory/handoff text.`,
  `  Bad:  "Handoff note: FORBIDDEN — did not dispatch devcrew:reviewer, for completeness."`,
  `  Good: "Reviewer/verifier dispatch left to the parent loop per slice-build orchestration."`
];

/** Wrap order lines (already labeled FORBIDDEN:/GATES:/RETURN:) in a <task-scoped> marker, one order per line, no quote prefix. Used for plain (non-blockquoted) prose regions. */
function formatTaskScopedPlain(orderLines: string[]): string {
  return ["<task-scoped>", ...orderLines, ...ECHO_RULE_LINES, "</task-scoped>"].join("\n");
}

/** Same as formatTaskScopedPlain but every line is blockquoted ("> ...") so the marker sits inside a Markdown blockquote prompt (the "> Implement ..." style dispatch bodies). */
function formatTaskScopedQuote(orderLines: string[]): string {
  return ["<task-scoped>", ...orderLines, ...ECHO_RULE_LINES, "</task-scoped>"]
    .map((line) => `> ${line}`)
    .join("\n");
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
    "- `[MODE] <single-session|assisted-single-session|team-run>` — emit exactly once, as the first line of your first response after dispatch. Optional free-form note after `—`, e.g. `[MODE] team-run — delegating devcrew:fullstack-dev for src/foo/`.",
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

export type OrchestratorMode = "slice-build" | "orchestrate-slice";

function resolveOrchestratorMode(orchestratorMode: OrchestratorMode | undefined): OrchestratorMode {
  return orchestratorMode ?? "slice-build";
}

export type BuilderVariant = "frontend" | "backend" | "fullstack" | "parallel-fe-be" | "unknown";

// Canonical surface/stack vocabulary (feat-tag-schema.md). `stack:react` is
// the sole built-in frontend-stack signal in the schema today; the built-in
// backend-stack set below covers the stacks this repo's presets actually
// ship (WS-3 — extend here, not with a heuristic, if a new backend stack
// preset is added). A repo can additionally opt an otherwise-ambiguous stack
// tag (e.g. `stack:typescript`, which is used on both sides of the stack) into
// one side via `loop.json`'s `dispatch.frontendStackTags` /
// `dispatch.backendStackTags` string arrays — see resolveFrontendStackTags /
// resolveBackendStackTags (FU #2). No config → behavior unchanged.
const FRONTEND_STACK_TAGS = new Set(["stack:react"]);
const BACKEND_STACK_TAGS = new Set([
  "stack:csharp",
  "stack:dotnet",
  "stack:node",
  "stack:python",
  "stack:go",
  "stack:java",
  "stack:rust"
]);

// classifySlice() (feature-lifecycle.mts) emits a third, LIVE vocabulary —
// api-change/storage/workflow/ux/auth/infra/test/docs/refactor — that never
// produced a canonical surface:*/stack:* tag. Reconcile the subset that
// carries an unambiguous FE/BE surface signal so FEATs classified only via
// that path still resolve to a real variant instead of falling through to
// "unknown". needs_contract/needs_ux (classifySlice's other outputs) are
// untouched by this mapping.
const CLASSIFY_UI_TAGS = new Set(["ux"]);
const CLASSIFY_API_TAGS = new Set(["api-change", "storage"]);

function hasAnyTag(set: Set<string>, candidates: Set<string>): boolean {
  for (const t of candidates) {
    if (set.has(t)) return true;
  }
  return false;
}

/** Read a string-array config field at loopConfig.dispatch.<key>, else []. */
function readConfiguredStackTags(
  loopConfig: Record<string, any> | null,
  key: "frontendStackTags" | "backendStackTags"
): string[] {
  if (!loopConfig || typeof loopConfig !== "object") return [];
  const dispatch = (loopConfig as Record<string, unknown>).dispatch;
  if (!dispatch || typeof dispatch !== "object") return [];
  const arr = (dispatch as Record<string, unknown>)[key];
  if (!Array.isArray(arr)) return [];
  return arr.filter((t): t is string => typeof t === "string");
}

/**
 * Merge loop.json's `dispatch.frontendStackTags` (if present) into the
 * built-in frontend stack-tag set. Returns the built-in set unchanged (same
 * reference) when no config override is configured, so the zero-config path
 * has zero overhead / zero behavior change.
 */
function resolveFrontendStackTags(loopConfig: Record<string, any> | null): Set<string> {
  const extra = readConfiguredStackTags(loopConfig, "frontendStackTags");
  if (extra.length === 0) return FRONTEND_STACK_TAGS;
  return new Set([...FRONTEND_STACK_TAGS, ...extra]);
}

/** Backend-side counterpart of resolveFrontendStackTags. */
function resolveBackendStackTags(loopConfig: Record<string, any> | null): Set<string> {
  const extra = readConfiguredStackTags(loopConfig, "backendStackTags");
  if (extra.length === 0) return BACKEND_STACK_TAGS;
  return new Set([...BACKEND_STACK_TAGS, ...extra]);
}

function detectUiSignal(set: Set<string>, frontendStackTags: Set<string>): boolean {
  return (
    set.has("surface:ui") || hasAnyTag(set, frontendStackTags) || hasAnyTag(set, CLASSIFY_UI_TAGS)
  );
}

function detectApiSignal(set: Set<string>, backendStackTags: Set<string>): boolean {
  return (
    set.has("surface:api") || hasAnyTag(set, backendStackTags) || hasAnyTag(set, CLASSIFY_API_TAGS)
  );
}

/**
 * Pick a crew builder variant from a slice's frontmatter `tags` array.
 * FEAT-190 / SLICE-104 (single-variant) + SLICE-105 (parallel fanout).
 * WS-3: rewritten to read the canonical `surface:*`/`stack:*` vocabulary
 * (feat-tag-schema.md) instead of the orphaned bare `fe`/`be` tags, whose
 * producer was removed in v0.53 — the missing-tag default used to be
 * "fullstack", which meant a fullstack-gated dispatch fired on every slice
 * that carried no fe/be tag at all (which was every slice, post-v0.53).
 *
 * Signal resolution (first match per surface wins; UI and API signals are
 * independent and can both be present):
 *   - UI signal:  tags ⊇ {"surface:ui"} OR any tag in FRONTEND_STACK_TAGS
 *                 (built-in: "stack:react", plus any repo-configured
 *                 `dispatch.frontendStackTags` from loop.json — FU #2) OR a
 *                 classifySlice tag in CLASSIFY_UI_TAGS (currently: "ux")
 *   - API signal: tags ⊇ {"surface:api"} OR any tag in BACKEND_STACK_TAGS
 *                 (built-in stacks, plus any repo-configured
 *                 `dispatch.backendStackTags` from loop.json) OR a
 *                 classifySlice tag in CLASSIFY_API_TAGS (currently:
 *                 "api-change", "storage")
 *
 * The bare `fe`/`be` tag fallback (deprecated since its producer was removed
 * in v0.53) has been removed entirely (FU #4) — those tags are no longer
 * special-cased and carry no signal on their own.
 *
 * Mapping:
 *   - UI signal AND API signal     → "parallel-fe-be" (unless
 *     features.parallel-fe-be-variant is disabled, in which case this
 *     falls back to "fullstack" — P1.0 feature-flag envelope)
 *   - API signal only              → "backend"
 *   - UI signal only               → "frontend"
 *   - no signal at all             → "unknown" — a distinct value from
 *     "fullstack" so a positive-signal gate can tell "no tag data" apart
 *     from "confirmed fullstack". variantToAgent still dispatches the
 *     fullstack builder for "unknown" as a safe superset.
 */
export function pickBuilderVariant(
  tags: unknown,
  loopConfig: Record<string, any> | null = null
): BuilderVariant {
  const set = Array.isArray(tags)
    ? new Set(tags.filter((t): t is string => typeof t === "string"))
    : new Set<string>();

  const hasUi = detectUiSignal(set, resolveFrontendStackTags(loopConfig));
  const hasApi = detectApiSignal(set, resolveBackendStackTags(loopConfig));

  if (hasUi && hasApi) {
    return isFeatureEnabled("parallel-fe-be-variant", loopConfig) ? "parallel-fe-be" : "fullstack";
  }
  if (hasApi) return "backend";
  if (hasUi) return "frontend";
  return "unknown";
}

function variantToAgent(variant: BuilderVariant): string {
  if (variant === "frontend") return "devcrew:frontend-dev";
  if (variant === "backend") return "devcrew:backend-dev";
  // "fullstack" and "unknown" both dispatch the fullstack builder — for
  // "unknown" this is a safe superset, not a confirmed fullstack signal.
  return "devcrew:fullstack-dev";
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
  const returnLine = `When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch devcrew:reviewer, then devcrew:verifier if behavior changed, then run /loop:slice complete --id ${sliceId}. If a needed cross-cutting change is out of scope, stop and surface it to the parent loop.`;
  const perAgentOrders = [
    `FORBIDDEN: Do NOT dispatch devcrew:reviewer or devcrew:verifier yourself.`,
    `RETURN: ${returnLine}`,
    ...(suffix ? [`GATES: ${suffix}`] : [])
  ];
  const perAgentTaskScoped = formatTaskScopedQuote(perAgentOrders);
  const topOrders = [
    `FORBIDDEN: Never use caveman:* agents for slice work.`,
    `GATES: The parent loop drives devcrew:reviewer and devcrew:verifier AFTER both subagents return.`
  ];
  return [
    `PARALLEL DISPATCH — issue ONE Agent message with TWO parallel tool calls:`,
    "",
    `  1. devcrew:frontend-dev with the **Frontend prompt** below.`,
    `  2. devcrew:backend-dev with the **Backend prompt** below.`,
    "",
    `Both subagents own their respective slice surface.`,
    "",
    formatTaskScopedPlain(topOrders),
    "",
    `**Frontend prompt** (for devcrew:frontend-dev):`,
    `> Implement the frontend portion of ${title}.${sliceRef}${goalLine} You own implementation of the frontend surface only.`,
    `>`,
    perAgentTaskScoped,
    "",
    `**Backend prompt** (for devcrew:backend-dev):`,
    `> Implement the backend portion of ${title}.${sliceRef}${goalLine} You own implementation of the backend surface only.`,
    `>`,
    perAgentTaskScoped
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
  worktreePath = null as string | null,
  loopConfig = null as Record<string, any> | null
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
  loopConfig?: Record<string, any> | null;
}) {
  const mode = resolveOrchestratorMode(orchestratorMode);
  const rel = sliceFile ? path.relative(repoPath, sliceFile).replace(/\\/g, "/") : null;

  if (mode === "orchestrate-slice") {
    return buildOrchestrateSliceInstruction(sliceId);
  }

  // Default path: slice-build — tag-driven dispatch with optional architect
  // pre-flight, then an optional QA-gate pre-flight (FEAT-264 SLICE-3, AC-3,
  // #527). Composable, not exclusive, and ordered: architect FIRST (decides
  // contract shapes), QA gate SECOND (drafts tests from the FEAT's
  // Given-When-Then ACs, context-isolated from the diff), builder LAST.
  const variant: BuilderVariant = pickBuilderVariant(extractTags(sliceContent), loopConfig);
  const architectPreflight = needsContractPreflight(sliceContent, repoPath, sliceId)
    ? `${buildArchitectPreflight(sliceId, title, rel)}\n---\n\n`
    : "";
  const qaGatePreflight = needsQaGatePreflight(sliceContent, repoPath, sliceId, loopConfig)
    ? `${buildQaGatePreflight(sliceId, title, featurePath)}\n---\n\n`
    : "";
  const preflight = architectPreflight + qaGatePreflight;

  let header: string;
  if (variant === "parallel-fe-be") {
    header = buildParallelFeBeInstruction(sliceId, title, rel, resolvedGoal, dispatchLimits);
  } else {
    const agentName = variantToAgent(variant);
    const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
    const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
    const suffix = buildBudgetLine(dispatchLimits);
    const objective = `Implement ${title}.${sliceRef}${goalLine} You own implementation only — frame, edit, run the self-verify gates, and return a write-handoff artifact path.`;
    const orders = [
      `FORBIDDEN: Do NOT dispatch devcrew:reviewer or devcrew:verifier yourself; the parent loop drives those gates separately after you return. Never use caveman:* agents for slice work — they lack the artifact protocol.`,
      `RETURN: When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch devcrew:reviewer, then devcrew:verifier if behavior changed, then run /loop:slice complete --id ${sliceId}. If a needed cross-cutting change is out of scope, stop and surface it to the parent loop.`,
      ...(suffix ? [`GATES: ${suffix}`] : [])
    ];
    header = [
      `Dispatch ${agentName} subagent with this prompt:`,
      "",
      `> ${objective}`,
      `>`,
      formatTaskScopedQuote(orders)
    ].join("\n");
  }
  const lines = [preflight + header];
  appendProgressSignals(lines);
  appendWorktreeSection(lines, worktreePath);
  appendContextBlock(lines, rel, sliceContent, featureId, featureExcerpt, featurePath);
  return lines.join("\n");
}

export function extractTags(sliceContent: string | null): unknown {
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
    `Dispatch devcrew:architect FIRST with this prompt:`,
    "",
    `> Produce a contract artifact for ${sliceId} (${title}).${sliceRef} Write the contract under \`.claude/artifacts/crew/contracts/${sliceId}-<short-name>.md\` with frontmatter \`kind: contract\` + \`slice: ${sliceId}\`. The contract must capture: data shapes, public function signatures, integration surfaces, and edge cases the builder(s) will consume. Return the artifact path so the parent loop can verify and proceed.`,
    "",
    `AWAIT the contract artifact. Then proceed with the builder dispatch below:`,
    ""
  ].join("\n");
}

function buildOrchestrateSliceInstruction(sliceId: string): string {
  return [
    `Invoke /devcrew:orchestrate-slice to run the full specialist ladder for this slice:`,
    ``,
    `> /devcrew:orchestrate-slice --id ${sliceId}`,
    ``,
    `The command dispatches specialists in sequence from the main thread (architect if needed,`,
    `builder, reviewer, validator, devcrew:document-writer). All dispatches are visible in this`,
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
