/**
 * backlog-list-ids — deterministic enumeration of pending FEAT ids from disk.
 *
 * Used by the /loop:triage skill to hand PM an explicit id list, so PM cannot
 * score features that do not exist (structural anti-hallucination guard).
 *
 * FEAT-194 / SLICE-110: optional `includeTriaged` returns ids from BOTH
 * `pending/` AND `triaged/` so the slash flow can re-score already-triaged
 * FEATs without first moving them.
 */

import { listBacklog, filterBacklog } from "./backlog-parser.mjs";

export interface ListPendingFeatureIdsOpts {
  /** When true, include FEATs in `triaged/` alongside `pending/`. Default false. */
  includeTriaged?: boolean;
}

export async function listPendingFeatureIds(
  repoPath: string,
  opts: ListPendingFeatureIdsOpts = {}
): Promise<string[]> {
  const entries = await listBacklog(repoPath);
  const pending = filterBacklog(entries, { status: "pending" });
  const result: Record<string, any>[] = [...pending];
  if (opts.includeTriaged) {
    const triaged = filterBacklog(entries, { status: "triaged" });
    result.push(...triaged);
  }
  return result.map((e: Record<string, any>) => String(e.id));
}
