import fs from "node:fs/promises";
import path from "node:path";

import { readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { pathExists } from "./paths.mjs";

const DEFAULT_VALIDATION_DIR = path.join(".claude", "artifacts", "crew", "validations");

/**
 * @param {string} sliceId
 * @returns {string[]}
 */
function normalizeSliceId(sliceId) {
  if (!sliceId) return [];
  const upper = sliceId.toUpperCase();
  const m = upper.match(/^SLICE[_-]?(\d+)/);
  if (!m) return [upper];
  const n = m[1];
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
async function findValidationArtifacts(repoPath, sliceId) {
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
function readGateStatus(workflowState) {
  const v = workflowState?.currentRun?.gates?.validation;
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
export async function deriveValidationGate(repoPath, sliceId, { sliceFm = null }: Record<string, any> = {}) {
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

  const artifacts = await findValidationArtifacts(repoPath, sliceId);
  if (artifacts.length > 0) {
    return {
      satisfied: true,
      reason: `validation artifact present (${artifacts.length})`,
      evidence: artifacts
    };
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
