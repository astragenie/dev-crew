import fs from "node:fs/promises";
import path from "node:path";

import { readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { readNewestArtifactVerdict } from "./artifact-verdict.mjs";
import { pathExists } from "./paths.mjs";

const DEFAULT_VALIDATION_DIR = path.join(".claude", "artifacts", "crew", "validations");

/**
 * @param {string} sliceId
 * @returns {string[]}
 */
function normalizeSliceId(sliceId: string) {
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

/**
 * @param {string} repoPath
 * @param {string} sliceId
 * @returns {Promise<string[]>}
 */
async function findValidationArtifacts(repoPath: string, sliceId: string) {
  const dir = path.join(repoPath, DEFAULT_VALIDATION_DIR);
  if (!(await pathExists(dir))) return [];
  const entries = await fs.readdir(dir);
  const tokens = normalizeSliceId(sliceId).map((t) => t.toLowerCase());
  const matches: any[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const lower = entry.toLowerCase();
    if (tokens.some((token) => lower.includes(token))) {
      matches.push(path.join(dir, entry));
    }
  }
  return matches;
}

/**
 * @param {object|null} workflowState
 * @returns {object|null}
 */
function readGateStatus(workflowState: unknown) {
  const state = workflowState as Record<string, any> | null;
  const v = state?.currentRun?.gates?.validation;
  if (!v || typeof v !== "object") return null;
  return v;
}

// Resolves whether the validation gate is satisfied for a slice close.
//
// Resolution order:
//   1. Slice frontmatter `requires_validation: false` -> waived (explicit).
//   2. workflow-state currentRun.gates.validation.status `passed` -> satisfied.
//   3. workflow-state currentRun.gates.validation.status `skipped` -> satisfied (skip badge present).
//   4. Validation artifact filename matches slice id under
//      .claude/artifacts/crew/validations/ -> satisfied with evidence.
//   5. Otherwise -> not satisfied.
//
/**
 * @param {string} repoPath
 * @param {string} sliceId
 * @param {{ sliceFm?: object|null }} [opts]
 * @returns {Promise<{ satisfied: boolean, reason: string, evidence: string[] }>}
 */
export async function deriveValidationGate(
  repoPath: string,
  sliceId: string,
  { sliceFm = null, config = null }: Record<string, any> = {}
) {
  if (sliceFm && sliceFm.requires_validation === false) {
    return {
      satisfied: true,
      reason: "explicit-waiver: slice frontmatter requires_validation: false",
      evidence: []
    };
  }

  const workflowState = await readCrewWorkflowState(repoPath);
  const gate = readGateStatus(workflowState);
  if (gate?.status === "passed") {
    return {
      satisfied: true,
      reason: "workflow-state gate: validation_passed",
      evidence: []
    };
  }
  if (gate?.status === "skipped") {
    const note = gate.note ? `: ${gate.note}` : "";
    return {
      satisfied: true,
      reason: `workflow-state gate: validation_skipped${note}`,
      evidence: []
    };
  }

  // P1.4: verdict-aware artifact check. Presence-only satisfaction is the
  // SLICE-174 bug (a validation that FAILED still counted as evidence).
  // New-format artifacts (crew P1.3) carry frontmatter `decision:` with
  // canonical {pass, fail, skipped}; pre-P1.3 artifacts have no decision and
  // are grandfathered as satisfied.
  const artifacts = await findValidationArtifacts(repoPath, sliceId);
  const verdict = await readNewestArtifactVerdict(artifacts);
  if (verdict) {
    if (verdict.decision === null) {
      return {
        satisfied: true,
        reason:
          `validation artifact present (${artifacts.length}) — legacy, no decision frontmatter ` +
          `(grandfathered pre-P1.3; newest: ${path.basename(verdict.file)})`,
        evidence: artifacts
      };
    }
    if (verdict.decision === "pass") {
      return {
        satisfied: true,
        reason: `validation artifact decision: pass (${path.basename(verdict.file)})`,
        evidence: artifacts
      };
    }
    if (verdict.decision === "skipped") {
      const why = verdict.skipReason ? `: ${verdict.skipReason}` : "";
      // Known intentional divergence: crew's pre-push-verifier does NOT count
      // skipped as pass; close-ceremony semantics follow the plan (skipped
      // with a recorded reason satisfies the close gate).
      return {
        satisfied: true,
        reason: `validation artifact decision: skipped${why} (${path.basename(verdict.file)})`,
        evidence: artifacts
      };
    }
    return {
      satisfied: false,
      reason:
        `validation artifact decision: ${verdict.decision} (${path.basename(verdict.file)}) — ` +
        "a failed validation cannot close; fix and re-validate, " +
        "record an explicit skip with --skip-validation-check, or use --force-close (audited)",
      evidence: artifacts
    };
  }

  // Opt-in (loop.validation.satisfiedByReview): a satisfied review gate — the
  // reviewer's approval badge — also satisfies the validation gate. The CI test
  // gate covers behavior/test validation, so no separate loop-side validator is
  // dispatched (see post-builder-fanout.mts). Placed last so real validation
  // evidence (artifact/badge/waiver) still wins when present.
  if (config?.loop?.validation?.satisfiedByReview === true) {
    const { deriveReviewGate } = await import("./review-gate.mjs");
    const reviewGate = await deriveReviewGate(repoPath, sliceId, { sliceFm });
    if (reviewGate.satisfied) {
      return {
        satisfied: true,
        reason: `review-badge: validation delegated to reviewer approval + CI test gate (${reviewGate.reason})`,
        evidence: []
      };
    }
  }

  return {
    satisfied: false,
    reason:
      "no validation artifact under .claude/artifacts/crew/validations/, " +
      "no validation_passed/skipped badge in workflow-state, " +
      "no explicit requires_validation: false waiver on slice",
    evidence: []
  };
}
