// tracker-close-sync.mts — runner#427: code-enforce the tracker issue-close.
//
// completeSlice() (complete-slice.mts) moves the slice file to completed/
// and, when gates allow, the parent feature to done/ — entirely on local
// disk. Nothing in that path ever touched the external tracker: closing the
// GitHub/Linear issue was left to an orchestrator-remembered follow-up step
// (`runner github sync-milestones`, or a manual `gh issue close`). Nothing
// in code failed or warned when that step was skipped.
//
// `loop github drift` (PR #485) quantified the blast radius: 125/125
// status-mismatch drift instances observed were the identical shape —
// `localStatus: "done"` / `trackerState: "OPEN"` — and zero were anything
// else. See runner#427.
//
// This module makes the tracker write part of the close ceremony itself,
// exclusively through the existing TaskStoreProvider abstraction (never a
// hand-rolled `gh` call). Every provider implementation is soft-fail by
// contract (provider-interface.mts: "MUST resolve without throwing when the
// backend is unavailable"). The try/catch in this module is a second line
// of defense — a misbehaving provider (or a filesystem read failure while
// resolving the feature's external id) must still never fail the close.
// The local close already committed by the time this runs; the tracker
// write is a mirror, never the authority.

import fs from "node:fs/promises";
import { parseFrontmatter } from "../frontmatter.mjs";
import type { TaskStoreProvider } from "../task-store/provider-interface.mjs";

export interface TrackerCloseOutcome {
  /** True once a provider call was actually attempted for this target. */
  attempted: boolean;
  /** The external tracker id used (issue number / Linear identifier), or null when skipped. */
  externalId: number | string | null;
  /** False only when the attempt threw and was caught here. */
  ok: boolean;
  error?: string;
}

export interface TrackerCloseSyncResult {
  slice: TrackerCloseOutcome;
  feature: TrackerCloseOutcome;
}

export interface TrackerCloseSyncOpts {
  sliceId: string;
  sliceFm: Record<string, any> | null | undefined;
  featureId: string | null;
  /** The featureResult returned by moveFeatureToDone / computeFeatureResult. */
  featureResult: Record<string, any> | null | undefined;
  handoffPath?: string | null;
  synthesisPath?: string | null;
  costUsd?: number | null;
  /**
   * Test-only injection point: bypasses getProvider() resolution when set.
   * Mirrors the config.ghExec injection pattern GithubProvider already uses
   * for tests — never set by production call sites.
   */
  providerOverride?: TaskStoreProvider | null;
}

const SKIPPED: TrackerCloseOutcome = { attempted: false, externalId: null, ok: true };

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function buildCompletionComment(opts: {
  sliceId: string;
  handoffPath?: string | null;
  synthesisPath?: string | null;
  costUsd?: number | null;
  prUrl?: string | null;
}): string {
  const lines = [
    `## ${opts.sliceId} closed`,
    "",
    "Closed automatically by the loop close ceremony (runner#427)."
  ];
  if (opts.prUrl) lines.push(`**PR:** ${opts.prUrl}`);
  if (typeof opts.costUsd === "number" && opts.costUsd > 0) {
    lines.push(`**Cost:** ~$${opts.costUsd.toFixed(2)}`);
  }
  if (opts.handoffPath) lines.push(`**Handoff:** \`${opts.handoffPath}\``);
  if (opts.synthesisPath) lines.push(`**Synthesis:** \`${opts.synthesisPath}\``);
  return lines.join("\n");
}

function externalIdFrom(
  frontmatter: Record<string, any> | null | undefined
): number | string | null {
  return frontmatter?.github_issue ?? frontmatter?.external_id ?? null;
}

function prUrlFrom(frontmatter: Record<string, any> | null | undefined): string | null {
  return frontmatter?.pr_url ?? frontmatter?.prUrl ?? null;
}

/**
 * Close the slice's own tracker sub-issue when the slice frontmatter carries
 * an external id. The slice file is always stamped `completed` before this
 * runs (moveAndStampSlice), so this fires unconditionally on that id.
 */
async function closeSliceExternalIssue(
  provider: any,
  opts: TrackerCloseSyncOpts
): Promise<TrackerCloseOutcome> {
  const externalId = externalIdFrom(opts.sliceFm);
  if (externalId == null) return SKIPPED;
  try {
    const body = buildCompletionComment({
      sliceId: opts.sliceId,
      handoffPath: opts.handoffPath ?? null,
      synthesisPath: opts.synthesisPath ?? null,
      costUsd: opts.costUsd ?? null,
      prUrl: prUrlFrom(opts.sliceFm)
    });
    await provider.closeSlice(externalId, `${opts.sliceId} closed by loop close ceremony`);
    await provider.postSliceComment(externalId, body);
    return { attempted: true, externalId, ok: true };
  } catch (err) {
    console.warn(
      `[tracker-close-sync] slice ${opts.sliceId} tracker close failed (non-fatal): ${errMessage(err)}`
    );
    return { attempted: true, externalId, ok: false, error: errMessage(err) };
  }
}

/**
 * Close the parent FEAT's tracker issue the moment completeSlice() actually
 * performs the -> done transition. Skipped on alreadyDone / keptOpen /
 * skipped outcomes — those are not a fresh "done" event, so re-running
 * close on an already-closed feature does not re-hit the tracker.
 */
async function closeFeatureExternalIssue(
  provider: any,
  opts: TrackerCloseSyncOpts
): Promise<TrackerCloseOutcome> {
  const fr = opts.featureResult;
  const freshlyDone = Boolean(fr?.to && !fr.alreadyDone && !fr.keptOpen && !fr.skipped);
  if (!freshlyDone) return SKIPPED;
  try {
    const raw = await fs.readFile(fr!.to as string, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const externalId = externalIdFrom(frontmatter);
    if (externalId == null) return SKIPPED;
    const body = buildCompletionComment({
      sliceId: opts.sliceId,
      handoffPath: opts.handoffPath ?? null,
      synthesisPath: opts.synthesisPath ?? null,
      costUsd: opts.costUsd ?? null,
      prUrl: prUrlFrom(frontmatter)
    });
    const reason = `${opts.featureId ?? fr!.id} closed by loop close ceremony (slice ${opts.sliceId})`;
    await provider.closeSlice(externalId, reason);
    await provider.postSliceComment(externalId, body);
    return { attempted: true, externalId, ok: true };
  } catch (err) {
    console.warn(
      `[tracker-close-sync] feature ${opts.featureId ?? ""} tracker close failed (non-fatal): ${errMessage(err)}`
    );
    return { attempted: true, externalId: null, ok: false, error: errMessage(err) };
  }
}

/**
 * Code-enforced tracker close (runner#427). Resolves the configured
 * TaskStoreProvider and closes + comments on the slice's and (when freshly
 * transitioned) the parent feature's external tracker issue.
 *
 * Never throws. A tracker outage, an unconfigured provider (NoopProvider),
 * or a misbehaving provider implementation all degrade to a warning — the
 * local close (already committed by the time this runs) is authoritative
 * and is never rolled back or blocked by this call.
 */
export async function syncTrackerOnClose(
  repoPath: string,
  config: Record<string, any> | null,
  opts: TrackerCloseSyncOpts
): Promise<TrackerCloseSyncResult> {
  let provider: any = opts.providerOverride ?? null;
  if (!provider) {
    try {
      const { getProvider } = await import("../task-store/index.mjs");
      provider = getProvider(config, repoPath);
    } catch (err) {
      console.warn(`[tracker-close-sync] getProvider failed (non-fatal): ${errMessage(err)}`);
      return { slice: SKIPPED, feature: SKIPPED };
    }
  }

  const [slice, feature] = await Promise.all([
    closeSliceExternalIssue(provider, opts),
    closeFeatureExternalIssue(provider, opts)
  ]);
  return { slice, feature };
}
