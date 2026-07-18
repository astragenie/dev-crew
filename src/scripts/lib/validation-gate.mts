import fs from "node:fs/promises";
import path from "node:path";

import { readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { readNewestArtifactVerdict } from "./artifact-verdict.mjs";
import { pathExists } from "./paths.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";

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
 * Unpadded numeric id for a canonical `SLICE-<n>`-shaped id, or null when
 * `sliceId` doesn't match that shape (matching then falls back to the
 * substring-token scheme in {@link normalizeSliceId}).
 * @param {string} sliceId
 * @returns {string|null}
 */
function sliceNumericId(sliceId: string): string | null {
  if (!sliceId) return null;
  const m = sliceId.toUpperCase().match(/^SLICE[_-]?(\d+)/);
  return m ? String(parseInt(m[1]!, 10)) : null;
}

/**
 * Extracts every slice number referenced in a filename as an unpadded
 * string set, including combined multi-slice artifacts such as
 * `...validation-result-slice-157-158-....md`. The digit run following a
 * `slice` prefix segment is split on its own separators so `157-158` yields
 * both `157` and `158` — this also fixes the substring-collision bug where
 * a naive `includes("slice-15")` matched `slice-158` (only a boundary-aware
 * digit-run split can tell them apart).
 * @param {string} text
 * @returns {Set<string>}
 */
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
 * FEAT-264 SLICE-3 (AC-3, architect C.2): `kind: test-plan` artifacts are
 * pre-build QA-gate plans (qa-gate-preflight.mts), not close-time validation
 * evidence — a lone test-plan artifact must neither satisfy nor fail the
 * validation gate, so it is excluded here rather than left to fall through
 * on a missing `decision:` key (which would grandfather it as a legacy
 * "satisfied" artifact — the exact bug this exclusion prevents).
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isTestPlanArtifact(filePath: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    return frontmatter?.kind === "test-plan";
  } catch {
    return false;
  }
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
  const numericId = sliceNumericId(sliceId);
  const tokens = normalizeSliceId(sliceId).map((t) => t.toLowerCase());
  const matches: any[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const lower = entry.toLowerCase();
    if (numericId !== null) {
      if (extractSliceNumberTokens(lower).has(numericId)) {
        matches.push(path.join(dir, entry));
      }
      continue;
    }
    if (tokens.some((token) => lower.includes(token))) {
      matches.push(path.join(dir, entry));
    }
  }
  const kept: string[] = [];
  for (const match of matches) {
    if (await isTestPlanArtifact(match)) continue;
    kept.push(match);
  }
  return kept;
}

// Synonyms a validator sometimes writes in place of the canonical
// {pass, fail, skipped} decision vocabulary. Normalization is local to this
// gate — the review gate has its own vocabulary (approved/approved_with_notes/
// rejected) via the same shared readNewestArtifactVerdict() reader and must
// not see this mapping.
const DECISION_ALIASES: Record<string, "pass" | "fail" | "skipped"> = {
  pass: "pass",
  passed: "pass",
  approved: "pass",
  fail: "fail",
  failed: "fail",
  skipped: "skipped",
  skip: "skipped"
};

/**
 * @param {string} decision
 * @returns {"pass"|"fail"|"skipped"|null}
 */
function normalizeDecision(decision: string): "pass" | "fail" | "skipped" | null {
  return DECISION_ALIASES[decision.trim().toLowerCase()] ?? null;
}

/**
 * Resolves the gate outcome for an already-read artifact verdict. Split out
 * of {@link deriveValidationGate} to keep that function's branching within
 * the repo's cognitive-complexity cap.
 * @param {import("./artifact-verdict.mjs").ArtifactVerdict} verdict
 * @param {string[]} artifacts
 * @returns {{ satisfied: boolean, reason: string, evidence: string[] }}
 */
function resolveVerdictOutcome(
  verdict: { decision: string | null; skipReason: string | null; file: string },
  artifacts: string[]
) {
  if (verdict.decision === null) {
    return {
      satisfied: true,
      reason:
        `validation artifact present (${artifacts.length}) — legacy, no decision frontmatter ` +
        `(grandfathered pre-P1.3; newest: ${path.basename(verdict.file)})`,
      evidence: artifacts
    };
  }
  const normalized = normalizeDecision(verdict.decision);
  const normalizedNote =
    normalized && normalized !== verdict.decision ? ` [normalized from '${verdict.decision}']` : "";
  if (normalized === "pass") {
    return {
      satisfied: true,
      reason: `validation artifact decision: pass${normalizedNote} (${path.basename(verdict.file)})`,
      evidence: artifacts
    };
  }
  if (normalized === "skipped") {
    const why = verdict.skipReason ? `: ${verdict.skipReason}` : "";
    // Known intentional divergence: crew's pre-push-verifier does NOT count
    // skipped as pass; close-ceremony semantics follow the plan (skipped
    // with a recorded reason satisfies the close gate).
    return {
      satisfied: true,
      reason: `validation artifact decision: skipped${normalizedNote}${why} (${path.basename(verdict.file)})`,
      evidence: artifacts
    };
  }
  if (normalized === "fail") {
    return {
      satisfied: false,
      reason:
        `validation artifact decision: fail${normalizedNote} (${path.basename(verdict.file)}) — ` +
        "a failed validation cannot close; fix and re-validate, " +
        "record an explicit skip with --skip-validation-check, or use --force-close (audited)",
      evidence: artifacts
    };
  }
  return {
    satisfied: false,
    reason:
      `unrecognized decision '${verdict.decision}' — expected pass|fail|skipped ` +
      `(${path.basename(verdict.file)})`,
    evidence: artifacts
  };
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
    return resolveVerdictOutcome(verdict, artifacts);
  }

  // Opt-in (loop.validation.satisfiedByReview): an EXPLICITLY-EVIDENCED review
  // gate — a real reviewer approval badge/artifact — also satisfies the
  // validation gate, delegating behavior/test validation to the CI test gate
  // (no separate loop-side validator is dispatched — see post-builder-fanout).
  // Placed last so real validation evidence (artifact/badge/waiver) still wins.
  //
  // CRITICAL: require `!reviewGate.unproven`. deriveReviewGate treats the
  // ABSENCE of any matching review artifact as `satisfied: true, unproven: true`
  // (a tolerant fallthrough for filename-token variance). That tolerance must
  // NOT leak across to the validation gate — otherwise a slice with no review
  // AND no validation would close as satisfied with a misleading "reviewer
  // approval" reason. Only an artifact/badge/waiver-backed review (satisfied &&
  // !unproven) delegates validation here.
  if (config?.loop?.validation?.satisfiedByReview === true) {
    const { deriveReviewGate } = await import("./review-gate.mjs");
    const reviewGate = await deriveReviewGate(repoPath, sliceId, { sliceFm });
    if (reviewGate.satisfied && !reviewGate.unproven) {
      return {
        satisfied: true,
        reason: `review-badge: validation delegated to evidenced reviewer approval + CI test gate (${reviewGate.reason})`,
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
