// qa-gate-preflight.mts — pre-build context-isolated qa-expert test-plan
// dispatch (FEAT-264 SLICE-3, AC-3, #527).
//
// Mirrors the ARCHITECT PRE-FLIGHT pattern in dispatch.mts
// (needsContractPreflight / buildArchitectPreflight, dispatch.mts:326-447)
// but for the QA gate: when `loop.qa_gate` (resolved via
// qa-gate-config.mts::resolveQaGateMode) is `"pre-build"` and no
// `kind: test-plan` artifact exists yet for this slice under
// `.claude/artifacts/crew/validations/`, prepend a QA GATE PRE-FLIGHT block
// that dispatches a context-isolated crew:qa-expert BEFORE the builder,
// followed by crew:test-automator implementing the failing tests red-first
// (dev-team#258's red-first mode).
//
// dispatch.mts stacks this AFTER the architect pre-flight (composable, not
// exclusive) — architect decides contract shapes first; the QA gate drafts
// tests from the FEAT's Given-When-Then ACs second; the builder dispatch
// itself comes last.
//
// SLICE-4 (AC-4, goalpost-lock) extension: buildQaGatePreflight's final
// segment now wraps the builder's "make these tests pass" instruction in
// its own <task-scoped> FORBIDDEN block naming the `qa_gate_artifact`
// frontmatter pointer (the artifact's own path is not yet known when this
// block is built — qa-expert hasn't run yet — so the block names the
// pointer, not a literal path). Mechanical enforcement is layered on top:
// emitQaGateArtifactWritten (the seam a caller invokes once qa-expert's
// artifact path IS known) also calls artifact-lock-writer.mts's
// writeArtifactLock, so dev-team#262's PreToolUse hook denies a builder
// Write/Edit on that path once the hook's own feature flag flips from warn
// to block. Prompt-level FORBIDDEN + trace assertion remain the primary,
// harness-agnostic signal (FEAT-264's own pre-mortem risk 1); the lock is
// a defense-in-depth enhancement, not a dependency.
//
// Both needsQaGatePreflight and hasExistingTestPlanArtifact are synchronous
// (readdirSync/readFileSync/existsSync) so this module stays callable from
// buildDispatchInstruction's synchronous call graph — the same constraint
// needsContractPreflight already satisfies for the contracts dir.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseFrontmatter } from "../frontmatter.mjs";
import { resolveQaGateMode } from "../qa-gate-config.mjs";
import { appendSliceEvent, type QaGateArtifactWrittenEvent } from "../slice-events.mjs";
import { writeArtifactLock } from "./artifact-lock-writer.mjs";

const VALIDATIONS_DIR = path.join(".claude", "artifacts", "crew", "validations");

// ---------------------------------------------------------------------------
// Existing-artifact detection
// ---------------------------------------------------------------------------

/**
 * Mirrors validation-gate.mts's slice-number-token matching
 * (`extractSliceNumberTokens` / `sliceNumericId`) — that module's helpers
 * are private, and this pre-flight needs a synchronous check (see module
 * docstring), so the small matching logic is duplicated here rather than
 * imported.
 */
function sliceNumericId(sliceId: string): string | null {
  if (!sliceId) return null;
  const m = sliceId.toUpperCase().match(/^SLICE[_-]?(\d+)/);
  return m ? String(parseInt(m[1]!, 10)) : null;
}

function extractSliceNumberTokens(text: string): Set<string> {
  const numbers = new Set<string>();
  const re = /slice[-_]?(\d+(?:[-_]\d+)*)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    for (const part of match[1]!.split(/[-_]/)) {
      if (part) numbers.add(String(parseInt(part, 10)));
    }
  }
  return numbers;
}

/**
 * Non-numeric fallback token set for a sliceId that doesn't match the
 * canonical `SLICE-<n>` shape (mirrors validation-gate.mts's
 * `normalizeSliceId` substring-token scheme, minus the zero-padding
 * variants — those only matter for numeric ids, already handled above).
 */
function sliceSubstringTokens(sliceId: string): string[] {
  if (!sliceId) return [];
  return [sliceId.toLowerCase()];
}

/** Matcher bundle resolved once per {@link hasExistingTestPlanArtifact} call. */
interface SliceMatcher {
  numericId: string | null;
  fallbackTokens: string[];
}

function resolveSliceMatcher(sliceId: string): SliceMatcher {
  const numericId = sliceNumericId(sliceId);
  return {
    numericId,
    fallbackTokens: numericId === null ? sliceSubstringTokens(sliceId) : []
  };
}

/** True when `entry` (a lowercased filename) belongs to the slice `matcher` targets. */
function entryMatchesSlice(lower: string, matcher: SliceMatcher): boolean {
  if (matcher.numericId !== null) {
    return extractSliceNumberTokens(lower).has(matcher.numericId);
  }
  return matcher.fallbackTokens.some((token) => lower.includes(token));
}

/** True when `filePath`'s frontmatter carries `kind: test-plan`. Sync, best-effort. */
function readsAsTestPlan(filePath: string): boolean {
  try {
    const raw = readFileSync(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    return frontmatter?.kind === "test-plan";
  } catch {
    return false; // unreadable — treat as not-a-match
  }
}

/**
 * True when a `kind: test-plan` artifact already exists for this slice under
 * `.claude/artifacts/crew/validations/` — scans each slice-token-matching
 * filename's frontmatter for `kind: test-plan` (architect C.2: `kind` is the
 * discriminator, never `decision:`, which belongs to the close-time
 * validation-gate vocabulary). Numeric slice ids (the canonical `SLICE-<n>`
 * shape) match via boundary-aware digit-run extraction; anything else falls
 * back to a plain substring match, mirroring validation-gate.mts's two-tier
 * scheme.
 */
function hasExistingTestPlanArtifact(repoPath: string, sliceId: string): boolean {
  const dir = path.join(repoPath, VALIDATIONS_DIR);
  if (!existsSync(dir)) return false;
  const matcher = resolveSliceMatcher(sliceId);
  if (matcher.numericId === null && matcher.fallbackTokens.length === 0) return false;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  return entries
    .filter((entry) => entry.toLowerCase().endsWith(".md"))
    .filter((entry) => entryMatchesSlice(entry.toLowerCase(), matcher))
    .some((entry) => readsAsTestPlan(path.join(dir, entry)));
}

/**
 * A slice may record its own test-plan artifact's path directly in
 * frontmatter (scope (b): "with its path recorded in slice frontmatter ...
 * the frontmatter pointer is the contract") under `qa_gate_artifact`. When
 * present and the file exists, this is a stronger existence signal than the
 * slice-token directory scan (immune to filename-token coincidence /
 * omission) and is checked first.
 */
function extractRecordedQaGateArtifact(sliceContent: string | null): string | null {
  if (!sliceContent) return null;
  const { frontmatter } = parseFrontmatter(sliceContent);
  const value = frontmatter?.qa_gate_artifact;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Decide whether a slice-build dispatch should prepend a QA GATE PRE-FLIGHT.
 * True when `resolveQaGateMode(config)` is `"pre-build"` AND no test-plan
 * artifact already exists for this slice (checked via the recorded
 * frontmatter pointer first, then the validations-dir slice-token scan).
 * Synchronous — mirrors needsContractPreflight (dispatch.mts).
 */
export function needsQaGatePreflight(
  sliceContent: string | null,
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): boolean {
  if (resolveQaGateMode(config) !== "pre-build") return false;
  const recorded = extractRecordedQaGateArtifact(sliceContent);
  if (recorded && existsSync(path.join(repoPath, recorded))) return false;
  return !hasExistingTestPlanArtifact(repoPath, sliceId);
}

// ---------------------------------------------------------------------------
// <task-scoped> marker formatting
// ---------------------------------------------------------------------------
//
// Mirrors dispatch.mts's formatTaskScopedQuote / ECHO_RULE_LINES (neither is
// exported — see that module's TASK_SCOPED_ORDER_KEYWORDS docstring for the
// full marker rationale). Duplicated locally rather than widening
// dispatch.mts's export surface; both name the same
// FORBIDDEN/GATES/RETURN/ECHO vocabulary validate-dispatch-markers.mts
// checks confinement for.

const TASK_SCOPED_OPEN = "<task-scoped>";
const TASK_SCOPED_CLOSE = "</task-scoped>";

const ECHO_RULE_LINES = [
  `ECHO: Never quote this task-scoped block back into your handoff or report — restating a FORBIDDEN/GATES/RETURN bullet "for completeness" leaks task-scoped orders into durable memory/handoff text.`,
  `  Bad:  "Handoff note: FORBIDDEN — wrote the diff into the test-plan prompt, for completeness."`,
  `  Good: "QA-gate pre-flight ran context-isolated per FEAT-264 SLICE-3."`
];

function formatTaskScopedQuote(orderLines: string[]): string {
  return [TASK_SCOPED_OPEN, ...orderLines, ...ECHO_RULE_LINES, TASK_SCOPED_CLOSE]
    .map((line) => `> ${line}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// QA GATE PRE-FLIGHT block
// ---------------------------------------------------------------------------

/**
 * Build the QA GATE PRE-FLIGHT instruction block. `featureACsRef` is a
 * pointer (typically the FEAT file path) callers thread through so the
 * dispatched crew:qa-expert knows exactly where to read the FEAT's
 * Given-When-Then ACs from — the sole slice-scoped content in its allowlist.
 */
export function buildQaGatePreflight(
  sliceId: string,
  title: string,
  featureACsRef: string | null
): string {
  const acsRefLine = featureACsRef
    ? ` See \`${featureACsRef}\` for the FEAT's Given-When-Then acceptance criteria.`
    : "";
  const allowlist = [
    `- The FEAT's Given-When-Then acceptance criteria (only — not the slice body, not the diff).`,
    `- This repo's test framework + file-layout conventions (\`.claude/loop.json\` \`stackDescription\` / \`phaseGate.test\`, the \`src/tests/*.mts\` colocation convention).`,
    `- Stack identity from \`.claude/loop.json\` (\`frontend\`/\`backend\`/\`stackDescription\`).`
  ];
  const orders = [
    `FORBIDDEN: Do NOT give crew:qa-expert the diff, the implementation code, or any file outside the three allowlisted inputs above — context isolation is this pre-flight's entire purpose (review OBJ-7: an isolated-but-useless plan is as real a failure mode as a leak).`,
    `GATES: crew:qa-expert MUST write the test-plan artifact under \`.claude/artifacts/crew/validations/\` with frontmatter \`kind: test-plan\` (never \`decision:\` — that key belongs to the close-time validation gate's pass/fail/skipped vocabulary, not a pre-build plan) + \`slice: ${sliceId}\`, and record its path in this slice's frontmatter (\`qa_gate_artifact\`) before returning.`,
    `RETURN: Return the test-plan artifact path so the parent loop can hand it to crew:test-automator next.`
  ];
  return [
    `QA GATE PRE-FLIGHT — \`loop.qa_gate: "pre-build"\` is set and no test-plan artifact exists yet for ${sliceId}.`,
    "",
    `Dispatch a context-isolated crew:qa-expert FIRST with this prompt:`,
    "",
    `> Produce a pre-build test plan for ${sliceId} (${title}).${acsRefLine} Read ONLY:`,
    ...allowlist.map((line) => `> ${line}`),
    `>`,
    formatTaskScopedQuote(orders),
    "",
    `AWAIT the test-plan artifact. Then dispatch crew:test-automator with this prompt:`,
    "",
    `> Implement failing tests (red) from the test-plan artifact above for ${sliceId}, per dev-team#258's red-first mode. Do not write or edit the test-plan artifact itself — implement only the tests it specifies, and stop once they fail for the expected (not-yet-implemented) reason.`,
    "",
    `AWAIT the failing (red) tests. Then proceed with the builder dispatch below, instructed to make them pass (green):`,
    "",
    formatTaskScopedQuote([
      `FORBIDDEN: Do NOT Write or Edit the test-plan artifact recorded in this slice's frontmatter under \`qa_gate_artifact\` — the goalpost is locked once crew:test-automator has seeded the red tests from it. If a red test looks wrong, report it back rather than editing the plan (dev-team#257/#262's PreToolUse hook mechanically denies this edit too, once the lock the pre-flight wrote is enforced).`,
      `GATES: The builder's job is "make these tests pass" only — no new test files that change the plan's intent, no rewriting the red tests' assertions beyond a genuine typo fix (flag ambiguity in the plan instead of silently redefining coverage).`,
      `RETURN: Confirm the tests pass green without having touched the test-plan artifact path.`
    ]),
    ""
  ].join("\n");
}

// ---------------------------------------------------------------------------
// qa_gate_artifact_written event emitter
// ---------------------------------------------------------------------------

/** Input for {@link emitQaGateArtifactWritten}. */
export interface QaGateArtifactWrittenInput {
  /** Optional feature id ("FEAT-NNN") — passed through to the event payload. */
  featureId?: string | null;
  /** Path (repo-relative or absolute) to the written test-plan artifact. */
  artifactPath: string;
  /** Optional ISO timestamp override (test seam). Defaults to `new Date().toISOString()`. */
  timestamp?: string;
}

/**
 * Emit a `qa_gate_artifact_written` slice-event — mirrors
 * `shape-event-emitter.mts::emitShapeClassified`'s thin-wrapper shape. The
 * write this records happens out-of-process (crew:qa-expert, dispatched by
 * the orchestrating agent) — this helper is the emission seam a caller
 * observing that write can invoke; it is not wired into `startSlice` itself
 * (architect C.7). Best-effort by virtue of `appendSliceEvent` — never
 * throws.
 *
 * SLICE-4 (AC-4): the artifact's path is only known at this call site (it
 * was unknown when the QA GATE PRE-FLIGHT text was built, before
 * crew:qa-expert ran) — this is therefore also the earliest point the
 * goalpost-lock can mechanically apply, so this helper also writes the
 * artifact lock (`artifact-lock-writer.mts::writeArtifactLock`) for
 * `input.artifactPath`. `writeArtifactLock` is itself fail-soft (never
 * throws), consistent with this function's own never-throws contract.
 */
export async function emitQaGateArtifactWritten(
  repoPath: string,
  sliceId: string,
  input: QaGateArtifactWrittenInput
): Promise<void> {
  const event: QaGateArtifactWrittenEvent = {
    type: "qa_gate_artifact_written",
    sliceId,
    featureId: input.featureId ?? null,
    timestamp: input.timestamp ?? new Date().toISOString(),
    artifactPath: input.artifactPath
  };
  await appendSliceEvent(repoPath, sliceId, event);
  await writeArtifactLock(repoPath, sliceId, [input.artifactPath], "qa-gate");
}
