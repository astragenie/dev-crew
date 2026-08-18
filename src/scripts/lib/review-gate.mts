// P1.4 — review gate derivation for slice close (SLICE-174 class fix).
//
// Structurally mirrors validation-gate.mts::deriveValidationGate. Resolution
// order:
//   1. Slice frontmatter `requires_review: false` -> waived (explicit).
//   2. workflow-state currentRun.gates.review.status `passed`/`skipped` -> satisfied.
//   3. Review artifact filename matches slice id under
//      .claude/artifacts/crew/reviews/ -> VERDICT-AWARE (unlike the historical
//      presence-only check that let a rejected review close as done):
//        - frontmatter decision approved / approved_with_notes -> satisfied
//          (case-insensitive)
//        - frontmatter decision rejected                       -> NOT satisfied
//        - frontmatter decision anything else (e.g. "PASS")     -> NOT satisfied,
//          reported as an unrecognized verdict — SLICE-200 fix: this used to
//          fall through and misreport as "a rejected review", which is a
//          different condition with a different remedy (fix the artifact,
//          not fix the code)
//        - no frontmatter decision key at all                  -> NOT
//          satisfied (SLICE-202 / FEAT-283 defect 3: the prior grandfather
//          clause treated this as satisfied with no date bound whatsoever,
//          so it applied to an artifact written this minute, not just
//          historical ones — removed outright rather than bounded by a
//          cutoff date/marker; an artifact without a `decision` key does not
//          prove a review happened, regardless of when it was written)
//   4. No artifact, no badge, no waiver -> not satisfied (but see the
//      absence-tolerated fallthrough below — a distinct case from #3's
//      artifact-with-no-decision-key).
//
// Deliberately does NOT read workflow-state currentRun.artifacts — that field
// is not part of runner's state model, and currentRun is a known incoherence
// hotspot (FM-3); the filename scan is the primary evidence source.

import fs from "node:fs/promises";
import path from "node:path";

import { readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { readNewestArtifactVerdict } from "./artifact-verdict.mjs";
import { pathExists } from "./paths.mjs";

const DEFAULT_REVIEW_DIR = path.join(".claude", "artifacts", "crew", "reviews");

// Accepted review-artifact `decision` vocabulary (SLICE-200 / FEAT-283 defect 1).
// Matching is case-insensitive — see normalizeVerdict() below.
//
// Vocabulary reconciliation with failure-classifier.mts::PASS_VERDICTS
// (deliberate, not a bug): PASS_VERDICTS classifies the `verdict` field of
// GRADE artifacts, whose vocabulary is validation-shaped ({pass, fail,
// approved, approved_with_notes}) per historical grade-writer usage.
// REVIEW_SATISFIED/REVIEW_REJECTED below classify the `decision` field of
// REVIEW artifacts, whose canonical vocabulary (artifact-verdict.mts's header
// comment) is {approved, approved_with_notes, rejected} — "pass"/"fail" are
// not part of it. A reviewer writing `decision: pass` is using the wrong
// (validation) vocabulary in a review artifact; that is exactly the
// unrecognized-verdict case this module now reports distinctly rather than
// silently accepting as equivalent to "approved". Do not fold "pass" into
// REVIEW_SATISFIED to "match" PASS_VERDICTS — AC-1 depends on `PASS` staying
// unrecognized here.
export const REVIEW_SATISFIED = new Set(["approved", "approved_with_notes"]);
// Recognized rejection value(s) for review artifacts — distinct from the
// unrecognized-verdict branch below (different remedy: fix the code vs. fix
// the artifact).
export const REVIEW_REJECTED = new Set(["rejected"]);

/** Lowercases/trims a raw frontmatter decision value for vocabulary lookups. */
function normalizeVerdict(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSliceId(sliceId: string): string[] {
  if (!sliceId) return [];
  const upper = sliceId.toUpperCase();
  const m = upper.match(/^SLICE[_-]?(\d+)/);
  if (!m) return [upper];
  const n = m[1]!;
  const padded = n.padStart(2, "0");
  const unpadded = String(parseInt(n, 10));
  const set = new Set([
    `SLICE-${padded}`,
    `SLICE_${padded}`,
    `slice${padded}`,
    `SLICE-${unpadded}`,
    `SLICE_${unpadded}`,
    `slice${unpadded}`
  ]);
  return [...set];
}

async function findReviewArtifacts(repoPath: string, sliceId: string): Promise<string[]> {
  const dir = path.join(repoPath, DEFAULT_REVIEW_DIR);
  if (!(await pathExists(dir))) return [];
  const entries = await fs.readdir(dir);
  const tokens = normalizeSliceId(sliceId).map((t) => t.toLowerCase());
  const matches: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const lower = entry.toLowerCase();
    if (tokens.some((token) => lower.includes(token))) {
      matches.push(path.join(dir, entry));
    }
  }
  return matches;
}

function readGateStatus(workflowState: unknown) {
  const state = workflowState as Record<string, any> | null;
  const r = state?.currentRun?.gates?.review;
  if (!r || typeof r !== "object") return null;
  return r;
}

export interface ReviewGateResult {
  satisfied: boolean;
  reason: string;
  evidence: string[];
  /** True when no review evidence was found at all (absence tolerated). */
  unproven?: boolean;
  /** True when the decision value is neither accepted nor a recognized rejection. */
  unrecognized?: boolean;
}

export async function deriveReviewGate(
  repoPath: string,
  sliceId: string,
  { sliceFm = null }: Record<string, any> = {}
): Promise<ReviewGateResult> {
  if (sliceFm && sliceFm.requires_review === false) {
    return {
      satisfied: true,
      reason: "explicit-waiver: slice frontmatter requires_review: false",
      evidence: []
    };
  }

  const workflowState = await readCrewWorkflowState(repoPath);
  const gate = readGateStatus(workflowState);
  if (gate?.status === "passed") {
    return { satisfied: true, reason: "workflow-state gate: review_passed", evidence: [] };
  }
  if (gate?.status === "skipped") {
    const note = gate.note ? `: ${gate.note}` : "";
    return { satisfied: true, reason: `workflow-state gate: review_skipped${note}`, evidence: [] };
  }

  const artifacts = await findReviewArtifacts(repoPath, sliceId);
  const verdict = await readNewestArtifactVerdict(artifacts);
  if (verdict) {
    if (verdict.decision === null) {
      // SLICE-202 / FEAT-283 defect 3: no grandfather clause — an artifact
      // with no `decision` frontmatter key never proves a review happened,
      // no matter when it was written. This is NOT the absence-tolerated
      // branch below (no artifact at all); a real artifact exists here, it
      // just carries no machine-readable verdict.
      return {
        satisfied: false,
        reason:
          `review artifact carries no \`decision\` frontmatter key (newest: ` +
          `${path.basename(verdict.file)}) — cannot prove a review happened; ` +
          "add a `decision:` key with an accepted value " +
          `(${[...REVIEW_SATISFIED].join(", ")} satisfies, ${[...REVIEW_REJECTED].join(", ")} ` +
          "blocks close) to the artifact, or record an explicit review_skipped badge",
        evidence: artifacts
      };
    }
    const normalized = normalizeVerdict(verdict.decision);
    if (REVIEW_SATISFIED.has(normalized)) {
      return {
        satisfied: true,
        reason: `review artifact decision: ${verdict.decision} (${path.basename(verdict.file)})`,
        evidence: artifacts
      };
    }
    if (REVIEW_REJECTED.has(normalized)) {
      return {
        satisfied: false,
        reason:
          `review artifact decision: ${verdict.decision} (${path.basename(verdict.file)}) — ` +
          "a rejected review cannot close; dispatch /crew:fix and re-review, " +
          "record an explicit review_skipped, or use --force-close (audited)",
        evidence: artifacts
      };
    }
    // Unrecognized verdict (SLICE-200 / FEAT-283 defect 1) — NOT the same
    // condition as a rejected review, and must not share its message or
    // remedy. Rejected means fix the code; unrecognized means fix the
    // artifact (wrong decision value, likely validation vocabulary bleeding
    // into a review artifact — see the vocabulary comment above).
    return {
      satisfied: false,
      unrecognized: true,
      reason:
        `review artifact decision: ${verdict.decision} (${path.basename(verdict.file)}) — ` +
        "unrecognized verdict value; accepted values are " +
        `${[...REVIEW_SATISFIED].join(", ")} (satisfied) or ${[...REVIEW_REJECTED].join(", ")} ` +
        "(blocks close). This is not a rejected review — no code fix is implied; " +
        "fix the review artifact's decision field or re-dispatch the reviewer " +
        "with the accepted vocabulary",
      evidence: artifacts
    };
  }

  // Absence is tolerated (satisfied with a warning), unlike validation whose
  // absence-blocking semantics predate P1.4. Review artifact filenames often
  // carry topic slugs without the slice token (e.g. SLICE-174's own review),
  // so absence-blocking would false-block legitimate closes on naming
  // variance. P1.4 targets the rejected-verdict class; absence enforcement
  // needs the P2 join-key discipline first.
  return {
    satisfied: true,
    unproven: true,
    reason:
      "no review artifact matched the slice token under .claude/artifacts/crew/reviews/ " +
      "and no review badge/waiver present — tolerated (P1.4 blocks rejected verdicts only; " +
      "absence enforcement waits for P2 join keys)",
    evidence: []
  };
}
