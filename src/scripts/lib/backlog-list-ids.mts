/**
 * backlog-list-ids — deterministic enumeration of pending FEAT ids from disk.
 *
 * Used by the /loop:triage skill to hand PM an explicit id list, so PM cannot
 * score features that do not exist (structural anti-hallucination guard).
 *
 * FEAT-194 / SLICE-110: optional `includeTriaged` returns ids from BOTH
 * `pending/` AND `triaged/` so the slash flow can re-score already-triaged
 * FEATs without first moving them.
 *
 * FEAT-201: optional `ids` accepts a comma-separated string of FEAT ids
 * (e.g. "FEAT-166,FEAT-182,FEAT-186") and returns only those ids, validating
 * that each exists in `triaged/`. Mutually exclusive with `includeTriaged`
 * (enforced at the CLI layer in loop.mts).
 */

import { listBacklog, filterBacklog } from "./backlog-parser.mjs";

/** Regex for a valid FEAT id: FEAT-NNN, FEAT-NNNa (split-feature letter suffix), or FEAT-NNN-suffix. */
const FEAT_ID_RE = /^FEAT-\d+[a-z]?(-[a-z]+)?$/;

export interface ListPendingFeatureIdsOpts {
  /** When true, include FEATs in `triaged/` alongside `pending/`. Default false. */
  includeTriaged?: boolean;
  /**
   * FEAT-201: comma-separated FEAT ids to rescore. When set, ONLY those ids
   * are returned (read from `triaged/`). Missing ids cause an error to be thrown
   * with `halt_reason: "invalid_ids"`.
   */
  ids?: string;
}

export async function listPendingFeatureIds(
  repoPath: string,
  opts: ListPendingFeatureIdsOpts = {}
): Promise<string[]> {
  // FEAT-201: targeted rescore path — validate and return only the requested ids.
  if (opts.ids) {
    const requestedIds = opts.ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Validate format of each id.
    const malformed = requestedIds.filter((id) => !FEAT_ID_RE.test(id));
    if (malformed.length > 0) {
      throw Object.assign(
        new Error(
          `invalid_ids: malformed FEAT id(s): ${malformed.join(", ")} — expected FEAT-NNN or FEAT-NNN-suffix`
        ),
        { halt_reason: "invalid_ids", malformed_ids: malformed }
      );
    }

    // Check each requested id exists in triaged/.
    const entries = await listBacklog(repoPath);
    const triaged = filterBacklog(entries, { status: "triaged" });
    const triagedIds = new Set(triaged.map((e: Record<string, any>) => String(e.id)));

    const missing = requestedIds.filter((id) => !triagedIds.has(id));
    if (missing.length > 0) {
      throw Object.assign(
        new Error(`invalid_ids: FEAT id(s) not found in triaged/: ${missing.join(", ")}`),
        { halt_reason: "invalid_ids", missing_ids: missing }
      );
    }

    return requestedIds;
  }

  // Default path: glob pending/ (and optionally triaged/).
  const entries = await listBacklog(repoPath);
  const pending = filterBacklog(entries, { status: "pending" });
  const result: Record<string, any>[] = [...pending];
  if (opts.includeTriaged) {
    const triaged = filterBacklog(entries, { status: "triaged" });
    result.push(...triaged);
  }
  return result.map((e: Record<string, any>) => String(e.id));
}
