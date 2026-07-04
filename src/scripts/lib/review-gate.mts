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
//        - frontmatter decision rejected                       -> NOT satisfied
//        - no frontmatter decision (pre-P1.3 artifact)          -> legacy,
//          satisfied with a grandfathered warning
//   4. No artifact, no badge, no waiver -> not satisfied.
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

const REVIEW_SATISFIED = new Set(["approved", "approved_with_notes"]);

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
  /** True when satisfaction rests on a pre-P1.3 artifact without a verdict. */
  legacy?: boolean;
  /** True when no review evidence was found at all (absence tolerated). */
  unproven?: boolean;
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
      return {
        satisfied: true,
        legacy: true,
        reason:
          "legacy review artifact (no decision frontmatter) — grandfathered pre-P1.3; " +
          `newest: ${path.basename(verdict.file)}`,
        evidence: artifacts
      };
    }
    if (REVIEW_SATISFIED.has(verdict.decision)) {
      return {
        satisfied: true,
        reason: `review artifact decision: ${verdict.decision} (${path.basename(verdict.file)})`,
        evidence: artifacts
      };
    }
    return {
      satisfied: false,
      reason:
        `review artifact decision: ${verdict.decision} (${path.basename(verdict.file)}) — ` +
        "a rejected review cannot close; dispatch /crew:fix and re-review, " +
        "record an explicit review_skipped, or use --force-close (audited)",
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
