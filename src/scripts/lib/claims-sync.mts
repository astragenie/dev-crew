import fs from "node:fs/promises";
import path from "node:path";

import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { moveFeature } from "./backlog-writer.mjs";
import { pathExists } from "./paths.mjs";

// Reconciles crew claims state (.claude/state/crew/claims.json) with
// loop backlog state-machine position. Two directions:
//
//   1. Open claim on a FEAT-NNN file -> ensure feature is in in-progress/.
//      Captures the case where agent claimed the file but forgot to run
//      `/devcrew:slice from-feature`.
//
//   2. In-progress feature with no open claim -> emit a "claim suggested"
//      warning so the agent acquires the claim before editing.
//
// Plugin does NOT write to claims.json — that's crew's state, owned by
// crew. We only read it + adjust backlog files (the loop side
// of the contract).

const CLAIMS_STATE = path.join(".claude", "state", "crew", "claims.json");
const FEAT_RE = /\b(FEAT-\d+[a-z]?)\b/;

async function readClaimsState(repoPath: string) {
  const target = path.join(repoPath, CLAIMS_STATE);
  if (!(await pathExists(target))) return { claims: {} };
  try {
    const raw = await fs.readFile(target, "utf8");
    return JSON.parse(raw);
  } catch {
    return { claims: {} };
  }
}

function extractFeatureIdsFromClaims(claims: Record<string, unknown>) {
  // claims is a map of filepath -> claim record. Pull FEAT-NNN refs from
  // either the path itself or the claim's optional metadata.feature field.
  const ids = new Set();
  for (const [filepath, record] of Object.entries(claims)) {
    const fromPath = filepath.match(FEAT_RE);
    if (fromPath) ids.add(fromPath[1]);
    if (record && typeof record === "object" && (record as any).feature) {
      const m = String((record as any).feature).match(FEAT_RE);
      if (m) ids.add(m[1]);
    }
  }
  return [...ids];
}

export async function syncClaims(
  repoPath: string,
  { config = null, apply = true }: Record<string, unknown> = {}
) {
  const state = await readClaimsState(repoPath);
  const claimedFeatureIds = extractFeatureIdsFromClaims(state.claims || {});
  const backlog = await listBacklog(repoPath, { config });

  const actions: any[] = [];

  // Direction 1: claimed features that aren't in in-progress yet -> move them
  for (const featureId of claimedFeatureIds) {
    const entry = backlog.find((f: Record<string, unknown>) => f.id === featureId);
    if (!entry) {
      actions.push({
        type: "claim-without-feature",
        featureId,
        note: "Claim references FEAT id with no backlog file"
      });
      continue;
    }
    if (entry.state === "in-progress" || entry.state === "done") continue;
    if (apply) {
      const moved = await moveFeature(entry.filePath, "in-progress");
      actions.push({
        type: "promote-to-in-progress",
        featureId,
        from: entry.state,
        to: "in-progress",
        path: moved.to
      });
    } else {
      actions.push({ type: "would-promote", featureId, from: entry.state, to: "in-progress" });
    }
  }

  // Direction 2: in-progress features without any open claim -> warn
  const inProgress = filterBacklog(backlog, { status: "in-progress" });
  for (const f of inProgress) {
    if (!claimedFeatureIds.includes(f.id)) {
      actions.push({
        type: "in-progress-without-claim",
        featureId: f.id,
        path: path.relative(repoPath, f.filePath).replace(/\\/g, "/"),
        suggestion: `crew claim ${path.relative(repoPath, f.filePath).replace(/\\/g, "/")} so file ownership is registered`
      });
    }
  }

  return {
    claimsTracked: Object.keys(state.claims || {}).length,
    claimedFeatureIds,
    actions
  };
}
