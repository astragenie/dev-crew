// profile-feedback.mts — outcome-gated, positive-only usefulness feedback for
// agent-profile atoms injected into an autonomous-loop slice's dispatch(es).
// Mirrors dev-team's scripts/lib/memory/profile-feedback.ts, adapted to
// runner's astramem-client-direct transport (feedbackSilent) and sliceId
// keying instead of a MemoryProvider + runId.
//
// Two halves:
//   - writeInjectedAtoms / readInjectedAtoms: a machine-local sidecar at
//     .claude/state/loop/injected-atoms/<sliceId>.json recording which
//     agent-profile atom ids were injected into a slice's dispatch(es).
//     Written at inject time by buildMemoryContext (memory-context.mts).
//   - submitSliceProfileFeedback: on a clean gate PASS at slice close, credit
//     each injected atom (POST /memory/:id/used via feedbackSilent) so the
//     daemon's usefulness ranking learns which memories rode along a
//     successful slice.
//
// Fail-silent throughout: no read/write/network error may surface or block the
// slice-close ceremony. Opt-in via memory.feedback.enabled (default off) — the
// injection sidecar is written whenever memory.profile.enabled, but nothing is
// ever sent to the daemon unless feedback is separately enabled.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function sidecarPath(repoPath: string, sliceId: string): string {
  const safe = sliceId.replace(/[^A-Za-z0-9._-]/g, "_");
  return path.join(repoPath, ".claude", "state", "loop", "injected-atoms", `${safe}.json`);
}

// Union-merge with any ids already recorded for this slice (read -> union ->
// write) rather than overwriting: a slice dispatches memory context for several
// agents (builder, then the reviewer fan-out), each calling this once, and none
// may clobber another's injected atom ids.
export async function writeInjectedAtoms(
  repoPath: string,
  sliceId: string,
  ids: string[]
): Promise<void> {
  try {
    if (!sliceId || ids.length === 0) return;
    const target = sidecarPath(repoPath, sliceId);
    await mkdir(path.dirname(target), { recursive: true });
    const existing = await readInjectedAtoms(repoPath, sliceId);
    const merged = Array.from(new Set([...existing, ...ids]));
    await writeFile(target, JSON.stringify({ sliceId, ids: merged }), "utf8");
  } catch {
    /* fire-and-forget */
  }
}

export async function readInjectedAtoms(repoPath: string, sliceId: string): Promise<string[]> {
  try {
    const parsed = JSON.parse(await readFile(sidecarPath(repoPath, sliceId), "utf8")) as {
      ids?: unknown;
    };
    return Array.isArray(parsed.ids)
      ? parsed.ids.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function feedbackEnabled(config: Record<string, any> | null | undefined): boolean {
  return config?.memory?.feedback?.enabled === true;
}

export interface SubmitSliceProfileFeedbackOptions {
  repoPath: string;
  sliceId: string;
  /** True only when the slice closed clean (no blocking/verdict gate failed). */
  passed: boolean;
  config?: Record<string, any> | null;
}

// On a clean gate PASS, credit (markUsed) every profile atom injected into this
// slice's dispatch(es). Positive-only outcome backstop (v1): reference-level
// "which atom actually changed the work" attribution is a documented phase-2
// refinement. Returns the ids successfully credited. Never throws; a disabled
// gate, cold slice (no sidecar), or unreachable daemon all resolve to [].
export async function submitSliceProfileFeedback(
  opts: SubmitSliceProfileFeedbackOptions
): Promise<{ credited: string[] }> {
  const credited: string[] = [];
  try {
    if (!opts.passed) return { credited };
    if (!feedbackEnabled(opts.config)) return { credited };

    const ids = await readInjectedAtoms(opts.repoPath, opts.sliceId);
    if (ids.length === 0) return { credited };

    const { feedbackSilent } = await import("@astragenie/astramem-client");
    const timeoutMs: number =
      opts.config?.memory?.feedback?.timeoutMs ??
      opts.config?.memory?.profile?.timeoutMs ??
      opts.config?.memory?.recall?.timeoutMs ??
      5000;
    for (const id of ids) {
      try {
        const ok = await feedbackSilent(id, { capMs: timeoutMs });
        if (ok) credited.push(id);
      } catch {
        /* per-id fail-silent */
      }
    }
    return { credited };
  } catch {
    return { credited };
  }
}
