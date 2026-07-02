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
const WRITABLE_STATES = new Set(["pending", "triaged"]);

const AC_HEADING_RE = /^##\s+Acceptance criteria/im;
const SLICES_HEADING_RE = /^##\s+Proposed slices/im;

export interface PmApplyEntryInput {
  featureId?: unknown;
  scores?: unknown;
  compositePriority?: unknown;
  autonomousSafe?: unknown;
  demandEvidence?: unknown;
  scopeNotes?: unknown;
  risks?: unknown;
  reasoning?: unknown;
  acs?: unknown;
  proposedSlices?: unknown;
  declined_per?: unknown;
}

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
}

export interface PmApplyResult {
  applied: PmApplyApplied[];
  failures: PmApplyFailure[];
}

export interface ApplyPmResultsOpts {
  /** Restrict writes to this id set. Null/omitted = no restriction. */
  allowedIds?: string[] | null;
  config?: Record<string, unknown> | null;
}

function withId(index: number, featureId: string | null, msg: string): string {
  return `entry ${index}${featureId ? ` (${featureId})` : ""}: ${msg}`;
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

  if (typeof e.compositePriority !== "string" || !VALID_PRIORITIES.has(e.compositePriority)) {
    issues.push(
      withId(
        index,
        featureId,
        `compositePriority must be one of P0-P4, got ${JSON.stringify(e.compositePriority)}`
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
}

async function resolveWritableEntry(
  repoPath: string,
  featureId: string,
  index: number,
  config: Record<string, unknown> | null
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
  if (!WRITABLE_STATES.has(backlogEntry.state)) {
    return {
      failure: {
        index,
        featureId,
        issues: [
          withId(
            index,
            featureId,
            `feature is in state "${backlogEntry.state}" — pm-apply only writes pending/triaged FEATs`
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
  const pmUpdates: Record<string, unknown> = {
    priority: e.compositePriority,
    pm_customer_impact: scores.customer_impact,
    pm_effort_estimate: scores.effort_estimate,
    pm_strategic_alignment: scores.strategic_alignment,
    pm_technical_risk: scores.technical_risk,
    pm_dependency_depth: scores.dependency_depth,
    pm_composite_priority: e.compositePriority,
    pm_autonomous_safe: e.autonomousSafe,
    pm_reviewed: new Date().toISOString().slice(0, 10),
    autonomous_safe: e.autonomousSafe,
    triage_notes: e.reasoning
  };
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

  let finalPath = entry.filePath;
  let movedToTriaged = false;
  if (entry.state === "pending") {
    const moved = await moveFeature(entry.filePath, "triaged", pmUpdates, repoPath, config);
    finalPath = moved.to;
    movedToTriaged = true;
  } else {
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

  return { featureId, filePath: finalPath, artifactPath, movedToTriaged };
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

  if (!Array.isArray(entries)) {
    failures.push({
      index: 0,
      featureId: null,
      issues: ["results file must contain a top-level JSON array of PM entries"]
    });
    return { applied, failures };
  }

  for (let index = 0; index < entries.length; index += 1) {
    const rawEntry = entries[index];
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

  return { applied, failures };
}
