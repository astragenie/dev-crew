/**
 * pm-apply — DEC-058 hybrid write-path: validates a PM batch results file
 * and commits the frontmatter/body changes it authorizes.
 *
 * Flow (FEAT-214):
 *   1. PM writes a JSON array of scoring results to a file (its own `Write`
 *      grant, scoped to `.claude/artifacts/loop/pm-reviews/` per
 *      `agents/pm.md` Boundaries) — one entry per FEAT, matching the output
 *      contract documented in `agents/pm.md` ("featureId", "demandEvidence",
 *      etc).
 *   2. The `bun loop.mts backlog pm-apply --file <path>` CLI subcommand
 *      reads that file and calls `applyPmResults` here.
 *   3. Each entry is validated independently. A failing entry writes
 *      NOTHING — the loop only ever commits entries that pass validation in
 *      full. Failures are returned in `failures` for the caller to surface;
 *      this module never touches `process.exitCode` / `process.exit` (see
 *      docs/code-conventions.md "Error handling" — libraries throw/return,
 *      only the CLI entry point sets the exit code).
 *   4. Passing entries commit atomically via `moveFeature` /
 *      `updateFeatureFrontmatter` (backlog-writer.mts), inheriting the
 *      Windows mtime/cache-bust fix documented there, then a `pm-review`
 *      artifact is written via `pm-artifact-writer.mts` for durability
 *      (FEAT-214 AC-5 — recoverable from disk if a batch response
 *      truncates).
 *
 * Re-running `pm-apply` against the same results file is safe: frontmatter
 * writes are idempotent overwrites, the pm-review artifact overwrites in
 * place, and body-section appends are skipped once the target heading
 * already exists (see `appendAcsSection` / `appendProposedSlicesSection`).
 */

import fs from "node:fs/promises";

import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { findFeatureById, updateFeatureFrontmatter, moveFeature } from "./backlog-writer.mjs";
import { validatePmScores } from "./pm-scorer.mjs";
import { parseProposedSlices, type ProposedSlice } from "./proposed-slices.mjs";
import { writePmReviewArtifact } from "./pm-artifact-writer.mjs";

const VALID_PRIORITIES = new Set(["P0", "P1", "P2", "P3", "P4"]);

// agents/pm.md escape valve: PM may verdict "needs-review" instead of a
// P0-P4 score when scope exceeds its ability. Issue #402 bug 2 — this is a
// legitimate verdict and must have an apply path (held in pending/ with a
// `pm_needs_review: true` marker) rather than hard-failing the entry and
// leaving no on-disk trace of the PM's decision.
const NEEDS_REVIEW_PRIORITY = "needs-review";

const WRITABLE_STATES = new Set(["pending", "triaged"]);

// Rescope-only writable states (FU: allow `--rescope` on in-progress FEATs).
// A mid-slice design reject can land after a FEAT has already been promoted
// to in-progress; `applyPmRescope` only rewrites the AC section (via
// `replaceAcsSection`, below) — it never re-scores or re-promotes — so
// operating on an in-progress FEAT is safe. Deliberately a SEPARATE set from
// `WRITABLE_STATES`: normal `applyPmResults` scoring/promotion must never
// touch in-progress FEATs, so that set stays pending/triaged only.
const RESCOPE_WRITABLE_STATES = new Set(["pending", "triaged", "in-progress"]);

const AC_HEADING_RE = /^##\s+Acceptance criteria/im;
const SLICES_HEADING_RE = /^##\s+Proposed slices/im;

export interface PmApplyFailure {
  index: number;
  featureId: string | null;
  issues: string[];
}

export interface PmApplyApplied {
  featureId: string;
  filePath: string;
  artifactPath: string;
  movedToTriaged: boolean;
  /**
   * Held disposition (issue #402 bug 2): the PM verdicted
   * `compositePriority: "needs-review"`. The FEAT stays in `pending/` with
   * a `pm_needs_review: true` marker and no priority assigned — a human
   * must size it before it can be triaged. Absent on normal P0-P4 entries.
   */
  needsReview?: boolean;
}

// Entries skipped because the ARCHITECT GATE is active/deferred for that
// FEAT — distinct from `failures` (which are validation errors): a gated
// skip is not a batch-quality problem, so it must not flip process.exitCode
// the way a real failure does (see loop.mts runBacklogPmApply).
export interface PmApplyGated {
  index: number;
  featureId: string;
  archStatus: string;
}

export interface PmApplyResult {
  applied: PmApplyApplied[];
  failures: PmApplyFailure[];
  gated: PmApplyGated[];
}

export interface ApplyPmResultsOpts {
  /** Restrict writes to this id set. Null/omitted = no restriction. */
  allowedIds?: string[] | null;
  config?: Record<string, unknown> | null;
}

function withId(index: number, featureId: string | null, msg: string): string {
  return `entry ${index}${featureId ? ` (${featureId})` : ""}: ${msg}`;
}

/**
 * Issue #402 bug 1 — documented key aliases for live LLM output drift.
 * A dispatched `runner:pm` emitted `featId` / `proposed_slices` instead of
 * the contract's `featureId` / `proposedSlices` and the whole batch was
 * rejected, defeating the FEAT-214 AC-5 "recoverable results on disk" goal.
 * Exactly these two aliases are tolerated (belt-and-suspenders with the
 * prompt-side contract note in `agents/pm.md`); any other drift — notably
 * the bare `id` from FEAT-214 AC-2 — still fails validation.
 */
function normalizePmEntryAliases(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const source = raw as Record<string, unknown>;
  if (source.featureId !== undefined && source.proposedSlices !== undefined) return raw;
  const e = { ...source };
  if (e.featureId === undefined && e.featId !== undefined) {
    e.featureId = e.featId;
  }
  if (e.proposedSlices === undefined && e.proposed_slices !== undefined) {
    e.proposedSlices = e.proposed_slices;
  }
  return e;
}

function extractFeatureId(
  e: Record<string, unknown>,
  index: number,
  allowedIds: string[] | null,
  issues: string[]
): string | null {
  const featureId =
    typeof e.featureId === "string" && e.featureId.trim() !== "" ? e.featureId : null;
  if (!featureId) {
    issues.push(`entry ${index}: featureId missing or not a non-empty string`);
  } else if (allowedIds && !allowedIds.includes(featureId)) {
    issues.push(
      withId(
        index,
        featureId,
        `featureId not in allowed set (${allowedIds.length > 0 ? allowedIds.join(", ") : "none"})`
      )
    );
  }
  return featureId;
}

function validateCoreFields(
  e: Record<string, unknown>,
  index: number,
  featureId: string | null,
  issues: string[]
): void {
  const scores =
    e.scores && typeof e.scores === "object" && !Array.isArray(e.scores)
      ? (e.scores as Record<string, unknown>)
      : {};
  for (const issue of validatePmScores(scores)) {
    issues.push(withId(index, featureId, issue));
  }

  if (
    typeof e.compositePriority !== "string" ||
    !(VALID_PRIORITIES.has(e.compositePriority) || e.compositePriority === NEEDS_REVIEW_PRIORITY)
  ) {
    issues.push(
      withId(
        index,
        featureId,
        `compositePriority must be one of P0-P4 or "${NEEDS_REVIEW_PRIORITY}", got ${JSON.stringify(e.compositePriority)}`
      )
    );
  }

  if (typeof e.autonomousSafe !== "boolean") {
    issues.push(withId(index, featureId, "autonomousSafe must be a boolean"));
  }

  if (typeof e.reasoning !== "string" || e.reasoning.trim() === "") {
    issues.push(withId(index, featureId, "reasoning must be a non-empty string"));
  }
}

function validateDeclineAndExtras(
  e: Record<string, unknown>,
  index: number,
  featureId: string | null,
  issues: string[]
): void {
  if (e.compositePriority === "P4") {
    const declinedPer = e.declined_per;
    const valid =
      Array.isArray(declinedPer) &&
      declinedPer.length > 0 &&
      declinedPer.every((d) => typeof d === "string" && d.trim() !== "");
    if (!valid) {
      issues.push(
        withId(
          index,
          featureId,
          "compositePriority is P4 — declined_per must be a non-empty array of clause-id strings"
        )
      );
    }
  }

  if (e.acs !== undefined && !(Array.isArray(e.acs) && e.acs.every((a) => typeof a === "string"))) {
    issues.push(withId(index, featureId, "acs must be an array of strings when present"));
  }

  if (e.proposedSlices !== undefined && e.proposedSlices !== null) {
    try {
      parseProposedSlices(e.proposedSlices, featureId || `entry-${index}`);
    } catch (err) {
      issues.push(withId(index, featureId, (err as Error).message));
    }
  }
}

function validateEntryShape(
  raw: unknown,
  index: number,
  allowedIds: string[] | null
): { issues: string[]; featureId: string | null } {
  const issues: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { issues: [`entry ${index}: not a JSON object`], featureId: null };
  }
  const e = raw as Record<string, unknown>;
  const featureId = extractFeatureId(e, index, allowedIds, issues);
  validateCoreFields(e, index, featureId, issues);
  validateDeclineAndExtras(e, index, featureId, issues);
  return { issues, featureId };
}

function appendAcsSection(body: string, acs: string[]): string {
  if (acs.length === 0 || AC_HEADING_RE.test(body)) return body;
  const section = [
    "",
    "## Acceptance criteria (Given-When-Then)",
    "",
    ...acs.map((ac) => `- ${ac}`),
    ""
  ].join("\n");
  return `${body.replace(/\n+$/, "\n")}${section}`;
}

/**
 * Rescope entry point (GATE reject-loop integration): replaces the body of
 * an existing "## Acceptance criteria" section in place rather than
 * skipping when the heading already exists. Every FEAT that reaches
 * rescope has already been scored/triaged and therefore already has an AC
 * section from `appendAcsSection` — a skip-if-exists write would leave the
 * stale, objected-to ACs on disk. `applyPmRescope` (below) is the only
 * caller; kept as a sibling of `appendAcsSection` in the SAME module so
 * there is still exactly one writer of FEAT body content.
 *
 * Idempotent: calling this twice with different `acs` replaces the section
 * both times — the heading is never duplicated, and sibling sections
 * (anything before the heading, and the next "## " heading onward) are
 * left untouched.
 */
function replaceAcsSection(body: string, acs: string[]): string {
  if (acs.length === 0) return body;
  const newSectionLines = [
    "## Acceptance criteria (Given-When-Then)",
    "",
    ...acs.map((ac) => `- ${ac}`)
  ];

  const lines = body.split("\n");
  const headingIdx = lines.findIndex((l) => AC_HEADING_RE.test(l));
  if (headingIdx === -1) {
    // No existing section on this FEAT yet — append, mirroring appendAcsSection.
    const section = ["", ...newSectionLines, ""].join("\n");
    return `${body.replace(/\n+$/, "\n")}${section}`;
  }

  // Next top-level heading after the AC heading (exclusive), or EOF.
  let endIdx = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i]!)) {
      endIdx = i;
      break;
    }
  }
  const before = lines.slice(0, headingIdx);
  const after = lines.slice(endIdx);
  return [...before, ...newSectionLines, "", ...after].join("\n");
}

function appendProposedSlicesSection(body: string, slices: ProposedSlice[]): string {
  if (slices.length === 0 || SLICES_HEADING_RE.test(body)) return body;
  const section = [
    "",
    "## Proposed slices (PM decomposition)",
    "",
    ...slices.map((s) => `- ${s.id_suffix.replace(/^-/, "")}: ${s.title} (${s.points} pts)`),
    ""
  ].join("\n");
  return `${body.replace(/\n+$/, "\n")}${section}`;
}

interface WritableBacklogEntry {
  filePath: string;
  state: string;
  // findFeatureById's backlog entry carries the full parsed frontmatter —
  // widened here (rather than re-reading the file) so the arch-gate
  // read-guard below can inspect arch_status without a second FS read.
  frontmatter?: Record<string, unknown>;
}

// ARCHITECT GATE read-guard (runner-plugin GATE workstream): a FEAT that is
// mid-gate (`gate_in_progress`) or already `deferred_design` must not have
// its priority/promotion re-written by a routine `pm-apply` triage pass —
// that would silently undo the gate's own transition (a demoted priority,
// or an in-flight rescope cycle) the next time PM re-scores the backlog.
// READ-ONLY: this never writes arch_* fields itself — see arch-gate.mts for
// the sole writer of the reject-loop state machine. Deliberately NOT
// applied to applyPmRescope below: a rescope IS the expected write during
// `gate_in_progress` (the reviewer-objection round the gate itself asked
// for), so gating that path would deadlock the reject loop.
const GATE_ACTIVE_ARCH_STATUSES = new Set(["deferred_design", "gate_in_progress"]);

function isArchGateActive(frontmatter: Record<string, unknown> | undefined): boolean {
  const status = frontmatter?.arch_status;
  return typeof status === "string" && GATE_ACTIVE_ARCH_STATUSES.has(status);
}

async function resolveWritableEntry(
  repoPath: string,
  featureId: string,
  index: number,
  config: Record<string, unknown> | null,
  writableStates: Set<string> = WRITABLE_STATES
): Promise<{ entry: WritableBacklogEntry } | { failure: PmApplyFailure }> {
  const backlogEntry = await findFeatureById(repoPath, featureId, config);
  if (!backlogEntry) {
    return {
      failure: {
        index,
        featureId,
        issues: [withId(index, featureId, "no matching FEAT file found on disk")]
      }
    };
  }
  if (!writableStates.has(backlogEntry.state)) {
    return {
      failure: {
        index,
        featureId,
        issues: [
          withId(
            index,
            featureId,
            `feature is in state "${backlogEntry.state}" — pm-apply only writes ${[...writableStates].join("/")} FEATs`
          )
        ]
      }
    };
  }
  return { entry: backlogEntry };
}

async function appendBodySections(
  filePath: string,
  e: Record<string, any>,
  featureId: string
): Promise<ProposedSlice[] | null> {
  const freshContent = await fs.readFile(filePath, "utf8");
  const { frontmatter: currentFm, body: currentBody } = parseFrontmatter(freshContent);

  let newBody = currentBody;
  if (Array.isArray(e.acs) && e.acs.length > 0) {
    newBody = appendAcsSection(newBody, e.acs as string[]);
  }
  let proposedSlices: ProposedSlice[] | null = null;
  if (e.proposedSlices) {
    proposedSlices = parseProposedSlices(e.proposedSlices, featureId);
    if (proposedSlices) {
      newBody = appendProposedSlicesSection(newBody, proposedSlices);
    }
  }
  if (newBody !== currentBody) {
    await fs.writeFile(filePath, serializeFrontmatter(currentFm, newBody), "utf8");
  }
  return proposedSlices;
}

function buildPmUpdates(
  e: Record<string, any>,
  proposedSlices: ProposedSlice[] | null
): Record<string, unknown> {
  const scores = e.scores as Record<string, number>;
  const needsReview = e.compositePriority === NEEDS_REVIEW_PRIORITY;
  // A held verdict is never autonomous-safe, whatever the PM emitted — the
  // whole point of "needs-review" is that a human decides before the loop
  // may touch this FEAT.
  const autonomousSafe = needsReview ? false : e.autonomousSafe;
  const pmUpdates: Record<string, unknown> = {
    pm_customer_impact: scores.customer_impact,
    pm_effort_estimate: scores.effort_estimate,
    pm_strategic_alignment: scores.strategic_alignment,
    pm_technical_risk: scores.technical_risk,
    pm_dependency_depth: scores.dependency_depth,
    pm_composite_priority: e.compositePriority,
    pm_autonomous_safe: autonomousSafe,
    pm_reviewed: new Date().toISOString().slice(0, 10),
    autonomous_safe: autonomousSafe,
    triage_notes: e.reasoning
  };
  if (needsReview) {
    // Held disposition: marker instead of a priority, so ranking/promotion
    // never picks it up and a later re-triage pass can see the prior verdict
    // instead of scoring blind (issue #402 bug 2).
    pmUpdates.pm_needs_review = true;
  } else {
    pmUpdates.priority = e.compositePriority;
  }
  if (e.compositePriority === "P4") {
    pmUpdates.declined_per = e.declined_per;
  }
  if (proposedSlices) {
    pmUpdates.proposed_slices = proposedSlices;
  }
  return pmUpdates;
}

async function commitEntry(
  repoPath: string,
  entry: WritableBacklogEntry,
  e: Record<string, any>,
  featureId: string,
  config: Record<string, unknown> | null
): Promise<PmApplyApplied> {
  const proposedSlices = await appendBodySections(entry.filePath, e, featureId);
  const pmUpdates = buildPmUpdates(e, proposedSlices);
  const needsReview = e.compositePriority === NEEDS_REVIEW_PRIORITY;

  let finalPath = entry.filePath;
  let movedToTriaged = false;
  if (entry.state === "pending" && !needsReview) {
    const moved = await moveFeature(entry.filePath, "triaged", pmUpdates, repoPath, config);
    finalPath = moved.to;
    movedToTriaged = true;
  } else {
    // In-place update: already-triaged FEATs (re-triage pass), and held
    // needs-review verdicts, which stay in pending/ by design.
    await updateFeatureFrontmatter(entry.filePath, pmUpdates, repoPath, config);
  }

  // exactOptionalPropertyTypes (tsconfig.json) forbids assigning
  // `undefined` to an optional property directly — conditionally spread
  // each optional field instead of setting it to `undefined`.
  const reviewInput: Parameters<typeof writePmReviewArtifact>[1] = {
    featureId,
    scores: e.scores as Record<string, number>,
    compositePriority: e.compositePriority as string,
    autonomousSafe: e.autonomousSafe as boolean,
    reasoning: e.reasoning as string,
    ...(e.demandEvidence !== undefined ? { demandEvidence: e.demandEvidence as string } : {}),
    ...(e.scopeNotes !== undefined ? { scopeNotes: e.scopeNotes as string } : {}),
    ...(e.risks !== undefined ? { risks: e.risks as string[] } : {})
  };
  const { artifactPath } = await writePmReviewArtifact(repoPath, reviewInput);

  return {
    featureId,
    filePath: finalPath,
    artifactPath,
    movedToTriaged,
    // exactOptionalPropertyTypes — spread instead of assigning undefined.
    ...(needsReview ? { needsReview: true } : {})
  };
}

/**
 * Validate and commit a batch of PM triage results. See module docstring
 * for the full write-path contract (DEC-058).
 */
export async function applyPmResults(
  repoPath: string,
  entries: unknown,
  opts: ApplyPmResultsOpts = {}
): Promise<PmApplyResult> {
  const allowedIds = opts.allowedIds ?? null;
  const config = opts.config ?? null;

  const applied: PmApplyApplied[] = [];
  const failures: PmApplyFailure[] = [];
  const gated: PmApplyGated[] = [];

  if (!Array.isArray(entries)) {
    failures.push({
      index: 0,
      featureId: null,
      issues: ["results file must contain a top-level JSON array of PM entries"]
    });
    return { applied, failures, gated };
  }

  for (let index = 0; index < entries.length; index += 1) {
    const rawEntry = normalizePmEntryAliases(entries[index]);
    const { issues, featureId } = validateEntryShape(rawEntry, index, allowedIds);
    if (issues.length > 0) {
      failures.push({ index, featureId, issues });
      continue;
    }

    const resolved = await resolveWritableEntry(repoPath, featureId as string, index, config);
    if ("failure" in resolved) {
      failures.push(resolved.failure);
      continue;
    }

    // ARCHITECT GATE read-guard: skip priority/promotion writes while the
    // gate is active or already deferred for this FEAT — read-only, never a
    // second writer of arch_* fields (see isArchGateActive docstring above).
    if (isArchGateActive(resolved.entry.frontmatter)) {
      gated.push({
        index,
        featureId: featureId as string,
        archStatus: String(resolved.entry.frontmatter?.arch_status)
      });
      continue;
    }

    applied.push(
      await commitEntry(
        repoPath,
        resolved.entry,
        rawEntry as Record<string, any>,
        featureId as string,
        config
      )
    );
  }

  return { applied, failures, gated };
}

// ---------------------------------------------------------------------
// Rescope (GATE reject-loop integration): `runner:pm --rescope <FEAT-ID>`
// rewrites scope + Given-When-Then ACs to address architect-reviewer
// objections. Distinct entry point from `applyPmResults` above because a
// rescope is not a re-score — it does not touch scores/compositePriority/
// autonomousSafe — but it funnels through the SAME writer primitives:
// `resolveWritableEntry` (state gate — called with `RESCOPE_WRITABLE_STATES`
// so an in-progress FEAT stays writable for rescope even though it is
// excluded from `applyPmResults` scoring/promotion), `replaceAcsSection` (AC
// body write, sibling of `appendAcsSection`), `updateFeatureFrontmatter` and
// `writePmReviewArtifact` (both already part of the pm-apply funnel used
// by `commitEntry` above). No second writer touches FEAT frontmatter/body.
// ---------------------------------------------------------------------

export interface PmRescopeApplied {
  featureId: string;
  filePath: string;
  artifactPath: string;
  rescopeCount: number;
}

export interface PmRescopeResult {
  applied: PmRescopeApplied[];
  failures: PmApplyFailure[];
}

function isNonEmptyStringArray(v: unknown): v is string[] {
  return (
    Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.trim() !== "")
  );
}

function validateRescopeEntryShape(
  raw: unknown,
  index: number,
  allowedIds: string[] | null
): { issues: string[]; featureId: string | null } {
  const issues: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { issues: [`entry ${index}: not a JSON object`], featureId: null };
  }
  const e = raw as Record<string, unknown>;
  const featureId = extractFeatureId(e, index, allowedIds, issues);

  if (!isNonEmptyStringArray(e.objections)) {
    issues.push(
      withId(index, featureId, "objections must be a non-empty array of non-empty strings")
    );
  }

  if (!isNonEmptyStringArray(e.acs)) {
    issues.push(withId(index, featureId, "acs must be a non-empty array of non-empty strings"));
  } else {
    const missingGwt = (e.acs as string[]).filter(
      (ac) => !(/\bGiven\b/.test(ac) && /\bWhen\b/.test(ac) && /\bThen\b/.test(ac))
    );
    if (missingGwt.length > 0) {
      issues.push(
        withId(
          index,
          featureId,
          `every AC must contain the literal words Given/When/Then (${missingGwt.length} offending)`
        )
      );
    }
  }

  if (typeof e.reasoning !== "string" || e.reasoning.trim() === "") {
    issues.push(withId(index, featureId, "reasoning must be a non-empty string"));
  }

  if (e.scopeNotes !== undefined && typeof e.scopeNotes !== "string") {
    issues.push(withId(index, featureId, "scopeNotes must be a string when present"));
  }

  return { issues, featureId };
}

async function commitRescopeEntry(
  repoPath: string,
  entry: WritableBacklogEntry,
  e: Record<string, any>,
  featureId: string,
  config: Record<string, unknown> | null
): Promise<PmRescopeApplied> {
  const freshContent = await fs.readFile(entry.filePath, "utf8");
  const { frontmatter: currentFm, body: currentBody } = parseFrontmatter(freshContent);

  const newBody = replaceAcsSection(currentBody, e.acs as string[]);
  if (newBody !== currentBody) {
    await fs.writeFile(entry.filePath, serializeFrontmatter(currentFm, newBody), "utf8");
  }

  const priorCount =
    typeof currentFm.pm_rescope_count === "number" ? currentFm.pm_rescope_count : 0;
  const rescopeCount = priorCount + 1;

  const fmUpdates: Record<string, unknown> = {
    pm_rescope_count: rescopeCount,
    pm_last_rescoped: new Date().toISOString().slice(0, 10),
    rescope_objections: e.objections
  };
  if (e.scopeNotes !== undefined) {
    fmUpdates.rescope_scope_notes = e.scopeNotes;
  }
  await updateFeatureFrontmatter(entry.filePath, fmUpdates, repoPath, config);

  const reviewInput: Parameters<typeof writePmReviewArtifact>[1] = {
    featureId,
    scores: {},
    compositePriority:
      (currentFm.priority as string) || (currentFm.pm_composite_priority as string) || "P2",
    autonomousSafe: Boolean(currentFm.autonomous_safe),
    reasoning: e.reasoning as string,
    risks: e.objections as string[],
    ...(e.scopeNotes !== undefined ? { scopeNotes: e.scopeNotes as string } : {})
  };
  const { artifactPath } = await writePmReviewArtifact(repoPath, reviewInput);

  return { featureId, filePath: entry.filePath, artifactPath, rescopeCount };
}

/**
 * Validate and commit a batch of PM rescope results (GATE reject-loop).
 * See the section docstring above for the write-path contract. Re-running
 * against the same or a newer results file for the same FEAT is safe:
 * `replaceAcsSection` overwrites the AC section in place rather than
 * appending, and `pm_rescope_count` / `pm_last_rescoped` are plain
 * overwrites.
 */
export async function applyPmRescope(
  repoPath: string,
  entries: unknown,
  opts: ApplyPmResultsOpts = {}
): Promise<PmRescopeResult> {
  const allowedIds = opts.allowedIds ?? null;
  const config = opts.config ?? null;

  const applied: PmRescopeApplied[] = [];
  const failures: PmApplyFailure[] = [];

  if (!Array.isArray(entries)) {
    failures.push({
      index: 0,
      featureId: null,
      issues: ["results file must contain a top-level JSON array of PM rescope entries"]
    });
    return { applied, failures };
  }

  for (let index = 0; index < entries.length; index += 1) {
    const rawEntry = entries[index];
    const { issues, featureId } = validateRescopeEntryShape(rawEntry, index, allowedIds);
    if (issues.length > 0) {
      failures.push({ index, featureId, issues });
      continue;
    }

    const resolved = await resolveWritableEntry(
      repoPath,
      featureId as string,
      index,
      config,
      RESCOPE_WRITABLE_STATES
    );
    if ("failure" in resolved) {
      failures.push(resolved.failure);
      continue;
    }

    applied.push(
      await commitRescopeEntry(
        repoPath,
        resolved.entry,
        rawEntry as Record<string, any>,
        featureId as string,
        config
      )
    );
  }

  return { applied, failures };
}
