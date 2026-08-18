// tracker-reconcile.mts — runner#427 backlog cleanup: `loop github reconcile`.
//
// `loop github drift` (#485) quantified the accumulated backlog across a
// single repo: 125 status mismatches (all `localStatus: "done"` /
// `trackerState: "OPEN"` — the close ceremony marked work done locally and
// never closed the tracker issue) and 60 local-only FEATs (never published
// at all). `fix/427-code-enforce-close` stops the leak going forward; this
// module is the one-time (and re-runnable) cleanup for what already piled
// up — here and across the other 9 repos that carry a loop backlog.
//
// Hard constraints (see runner dispatch for #427 follow-up):
//   - NEVER writes to the local backlog. Local is the source of truth; this
//     only pushes local truth *to* the tracker. `checkSyncDrift` (the read
//     side, reused verbatim below) already guarantees this for the read
//     path — this module adds zero additional local reads/writes beyond
//     `listBacklog`, which is itself read-only.
//   - Idempotent without a local write: publishing a local-only FEAT does
//     NOT stamp `github_issue` back onto its file (the interface's
//     `publishFeature` never has — see provider-interface.mts). Re-running
//     after `--apply` must not create a duplicate issue. `buildReconcilePlan`
//     solves this by cross-matching each local-only FEAT id against the
//     titles of `report.trackerOnly` issues (every issue this module or
//     `github-sync.mjs` creates is titled `"<id>: <description>"` —
//     issue-sync.mjs's `createFeatureIssue`) — an issue that already exists
//     with a matching title is a prior publish that never got linked
//     locally, not a fresh candidate.
//   - Two of the three actions here are pure planning (no provider calls):
//     `buildReconcilePlan` only reads the already-computed drift report +
//     `listBacklog`. All writes live in `applyReconcilePlan`, gated entirely
//     behind the caller's `--apply` flag (see runGithubReconcile in
//     loop.mts) — a dry run makes zero calls into any TaskStoreProvider
//     mutation method.
import type { TaskStoreProvider } from "./provider-interface.mjs";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** Mirrors checkSyncDrift's return shape (github-sync.mjs) — imported structurally, not by type, since that module stays plain JS. */
export interface DriftReport {
  supported: boolean;
  reason: string | null;
  checked: number;
  trackerOnly: Array<{ number: number | string; title: string }>;
  localOnly: Array<{ id: string; title: string }>;
  statusMismatches: Array<{
    id: string;
    number: number | string;
    localStatus: string;
    trackerState: string;
  }>;
  bodyDrift: Array<{ id: string; number: number | string; changes: string[] }>;
}

export interface MergedPr {
  number: number | string;
  url: string;
  title: string;
}

export interface CloseCandidate {
  id: string;
  number: number | string;
  completedAt: string | null;
  slices: string[];
}

export interface PublishCandidate {
  /** The full listBacklog entry — passed through untouched to provider.publishFeature. */
  feat: any;
  id: string;
  title: string;
  status: string;
}

export interface SkippedPublish {
  id: string;
  title: string;
  reason: string;
}

export interface ReconcilePlan {
  supported: boolean;
  reason: string | null;
  close: CloseCandidate[];
  publish: PublishCandidate[];
  skippedPublish: SkippedPublish[];
  /** Issues with no matching local FEAT by id or by github_issue link — report-only, NEVER acted on. */
  trackerOnly: Array<{ number: number | string; title: string }>;
  /** statusMismatches whose shape is NOT localStatus=done/trackerState=OPEN — out of scope, reported for visibility, never acted on. */
  otherStatusMismatches: DriftReport["statusMismatches"];
}

export interface BuildReconcilePlanOpts {
  includeClose?: boolean;
  includePublish?: boolean;
  /** Caps each of close[] and publish[] independently — lets an operator apply a small batch first. */
  limit?: number | null;
}

const FEAT_ID_PREFIX_RE = /^([A-Za-z]+-\d+[a-z]?):/;

// ---------------------------------------------------------------------------
// Plan building — read-only (drift report + listBacklog), zero provider calls.
// ---------------------------------------------------------------------------

// Split statusMismatches into the one shape this command acts on
// (done-but-open) vs. everything else, which stays report-only.
function splitStatusMismatches(
  statusMismatches: DriftReport["statusMismatches"],
  byId: Map<string, any>
): { close: CloseCandidate[]; otherStatusMismatches: DriftReport["statusMismatches"] } {
  const close: CloseCandidate[] = [];
  const otherStatusMismatches: DriftReport["statusMismatches"] = [];
  for (const m of statusMismatches) {
    const isDoneButOpen =
      m.localStatus === "done" && String(m.trackerState).toUpperCase() === "OPEN";
    if (!isDoneButOpen) {
      otherStatusMismatches.push(m);
      continue;
    }
    const feat = byId.get(m.id);
    close.push({
      id: m.id,
      number: m.number,
      completedAt: feat?.frontmatter?.completed_at ?? null,
      slices: Array.isArray(feat?.frontmatter?.slices) ? feat.frontmatter.slices : []
    });
  }
  return { close, otherStatusMismatches };
}

// Cross-matches local-only FEATs against tracker-only issue titles so a
// prior publish (created but never linked locally) is never re-published —
// this is the idempotency guarantee for a re-run after --apply (module header).
function crossMatchPriorPublish(report: DriftReport): {
  priorPublish: Map<string, { number: number | string; title: string }>;
  trackerOnly: ReconcilePlan["trackerOnly"];
} {
  const localOnlyIds = new Set(report.localOnly.map((l) => l.id));
  const priorPublish = new Map<string, { number: number | string; title: string }>();
  const trackerOnly: ReconcilePlan["trackerOnly"] = [];
  for (const t of report.trackerOnly) {
    const featId = FEAT_ID_PREFIX_RE.exec(t.title)?.[1];
    if (featId && localOnlyIds.has(featId)) {
      priorPublish.set(featId, t);
    } else {
      trackerOnly.push(t);
    }
  }
  return { priorPublish, trackerOnly };
}

function publishSkipReason(
  already: { number: number | string; title: string } | undefined,
  status: string
): string | null {
  if (already) {
    return (
      `already present in the tracker as issue #${already.number} (title match) — publish ` +
      "skipped to avoid a duplicate. Local FEAT file has no github_issue because reconcile " +
      "never writes to the local backlog; backfill by hand or via `loop github publish` if desired."
    );
  }
  if (status === "done") {
    return (
      "local-only and already done — publishing a finished FEAT purely to close it again " +
      "adds tracker noise with no operational value; skipped by design."
    );
  }
  return null;
}

function buildPublishCandidates(
  localOnly: DriftReport["localOnly"],
  byId: Map<string, any>,
  priorPublish: Map<string, { number: number | string; title: string }>
): { publish: PublishCandidate[]; skippedPublish: SkippedPublish[] } {
  const publish: PublishCandidate[] = [];
  const skippedPublish: SkippedPublish[] = [];
  for (const l of localOnly) {
    const feat = byId.get(l.id);
    const status = feat?.frontmatter?.status ?? "unknown";
    const reason = publishSkipReason(priorPublish.get(l.id), status);
    if (reason) {
      skippedPublish.push({ id: l.id, title: l.title, reason });
      continue;
    }
    if (!feat) {
      skippedPublish.push({
        id: l.id,
        title: l.title,
        reason: "local FEAT file not found on re-read — skipped."
      });
      continue;
    }
    publish.push({ feat, id: l.id, title: l.title, status });
  }
  return { publish, skippedPublish };
}

function capList<T>(list: T[], limit: number | null): T[] {
  return limit != null ? list.slice(0, limit) : list;
}

export async function buildReconcilePlan(
  repoPath: string,
  config: Record<string, any> | null,
  report: DriftReport,
  opts: BuildReconcilePlanOpts = {}
): Promise<ReconcilePlan> {
  const empty: ReconcilePlan = {
    supported: false,
    reason: report.reason,
    close: [],
    publish: [],
    skippedPublish: [],
    trackerOnly: [],
    otherStatusMismatches: []
  };
  if (!report.supported) return empty;

  const includeClose = opts.includeClose ?? true;
  const includePublish = opts.includePublish ?? true;
  const limit = opts.limit ?? null;

  const { listBacklog } = await import("../backlog-parser.mjs");
  const feats = await listBacklog(repoPath, { config });
  const byId = new Map<string, any>(feats.map((f: any) => [f.id, f]));

  const { close, otherStatusMismatches } = splitStatusMismatches(report.statusMismatches, byId);
  const { priorPublish, trackerOnly } = crossMatchPriorPublish(report);
  const { publish, skippedPublish } = buildPublishCandidates(report.localOnly, byId, priorPublish);

  return {
    supported: true,
    reason: null,
    close: includeClose ? capList(close, limit) : [],
    publish: includePublish ? capList(publish, limit) : [],
    skippedPublish,
    trackerOnly,
    otherStatusMismatches
  };
}

// ---------------------------------------------------------------------------
// Applying — the only place this module calls into a TaskStoreProvider
// mutation method. Every call is soft-fail: a throwing provider degrades to
// a warned, per-item failure, never aborts the batch and never throws out of
// applyReconcilePlan itself (provider-interface.mts's own contract is the
// first line of defense; the retry/catch here is the second).
// ---------------------------------------------------------------------------

export interface ApplyItemResult {
  id: string;
  number: number | string | null;
  ok: boolean;
  error?: string;
}

export interface ApplyReconcileResult {
  closed: ApplyItemResult[];
  published: ApplyItemResult[];
}

export interface ApplyReconcileOpts {
  /** Best-effort merged-PR lookup for the evidence comment. Never required — a miss just omits the PR line. */
  findMergedPr?: (id: string) => Promise<MergedPr | null>;
  /** Pacing between mutating calls (ms). Default 150ms — keeps a 125-item batch well under secondary rate limits. */
  sleepMs?: number;
}

// Mirrors webhook-sender.mts's 429 backoff shape (MAX_ATTEMPTS_429 / BACKOFF_MS_429).
const MAX_RATE_LIMIT_ATTEMPTS = 3;
const RATE_LIMIT_BACKOFF_MS = [1000, 2000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry only on genuine rate limiting.
 *
 * Deliberately does NOT match a bare `403`. GitHub returns 403 for permission
 * failures as well as for secondary rate limits, and retrying a permissions
 * error is pointless — it will fail identically three more times. Worse, when
 * the retried closure has any non-idempotent step, each retry duplicates it.
 * Match the rate-limit vocabulary explicitly instead.
 *
 * GitHub has shipped at least two throttling wordings behind a 403: the current
 * "secondary rate limit" phrasing, and an older "abuse detection mechanism" one
 * that is not clearly retired. Match both — a missed retry here degrades to a
 * soft-fail (reported, re-runnable), so the cost of over-matching a genuine
 * throttle is far lower than the cost of never retrying one.
 */
function isRateLimited(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /rate limit|secondary rate|abuse detection|retry.after|\b429\b/i.test(message);
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface BackoffOutcome<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

async function withBackoff<T>(fn: () => Promise<T>, label: string): Promise<BackoffOutcome<T>> {
  let attempt = 0;
  for (;;) {
    try {
      const value = await fn();
      return { ok: true, value };
    } catch (err) {
      attempt += 1;
      if (isRateLimited(err) && attempt <= MAX_RATE_LIMIT_ATTEMPTS) {
        const delay =
          RATE_LIMIT_BACKOFF_MS[attempt - 1] ??
          RATE_LIMIT_BACKOFF_MS[RATE_LIMIT_BACKOFF_MS.length - 1]!;
        console.warn(
          `[reconcile] ${label}: rate-limited (attempt ${attempt}/${MAX_RATE_LIMIT_ATTEMPTS}) — backing off ${delay}ms`
        );
        await sleep(delay);
        continue;
      }
      const message = errMessage(err);
      console.warn(`[reconcile] ${label}: failed (non-fatal) — ${message}`);
      return { ok: false, error: message };
    }
  }
}

function buildCloseEvidence(item: CloseCandidate, mergedPr: MergedPr | null): string {
  const lines = [
    "## Reconciled by `loop github reconcile`",
    "",
    `Local **${item.id}** was marked \`done\`${item.completedAt ? ` on ${item.completedAt}` : ""} but this ` +
      "tracker issue was never closed — the close ceremony updated the local backlog and stopped " +
      "there (see runner#427). This is a one-time backlog cleanup; runner#427 code-enforces the " +
      "tracker close going forward so this should not recur."
  ];
  if (item.slices.length > 0) lines.push(`**Slices:** ${item.slices.join(", ")}`);
  lines.push(
    mergedPr
      ? `**Merged PR:** ${mergedPr.url} (#${mergedPr.number} — ${mergedPr.title})`
      : "**Merged PR:** not found by automated search — verify manually if this FEAT shipped via a PR."
  );
  lines.push(
    "",
    "_Closed automatically by `loop github reconcile`. If this is not actually complete, reopen and correct the local status._"
  );
  return lines.join("\n");
}

async function resolveMergedPr(opts: ApplyReconcileOpts, id: string): Promise<MergedPr | null> {
  if (!opts.findMergedPr) return null;
  try {
    return await opts.findMergedPr(id);
  } catch {
    return null;
  }
}

async function closeOneItem(
  provider: TaskStoreProvider,
  item: CloseCandidate,
  opts: ApplyReconcileOpts
): Promise<ApplyItemResult> {
  const mergedPr = await resolveMergedPr(opts, item.id);
  const body = buildCloseEvidence(item, mergedPr);

  // Close FIRST, comment SECOND, each in its OWN retry scope.
  //
  // `closeSlice` is idempotent (closing a closed issue is a no-op);
  // `postSliceComment` is NOT (every call appends another comment). Wrapping
  // both in one retry closure meant a failure in the SECOND step re-ran the
  // FIRST — reposting the evidence comment on every attempt. With up to 3
  // retries across 125 issues that is a lot of duplicate noise on issues we
  // are trying to tidy.
  //
  // Ordering close-then-comment also means the worst case is an issue that is
  // correctly closed but missing its evidence comment (cosmetic, easily
  // re-run) rather than an open issue carrying four identical comments.
  const closeOutcome = await withBackoff(
    () =>
      provider.closeSlice(
        item.number,
        `${item.id} closed by loop github reconcile (runner#427 backlog cleanup)`
      ),
    `close ${item.id} (#${item.number})`
  );

  if (!closeOutcome.ok) {
    const failed: ApplyItemResult = { id: item.id, number: item.number, ok: false };
    if (closeOutcome.error) failed.error = closeOutcome.error;
    return failed;
  }

  const commentOutcome = await withBackoff(
    () => provider.postSliceComment(item.number, body),
    `comment ${item.id} (#${item.number})`
  );

  const result: ApplyItemResult = { id: item.id, number: item.number, ok: closeOutcome.ok };
  // The close succeeded; a failed evidence comment is reported but does not
  // fail the item — the issue IS closed, which is the point of the run.
  if (!commentOutcome.ok && commentOutcome.error) {
    result.error = `closed, but evidence comment failed: ${commentOutcome.error}`;
  }
  return result;
}

async function publishOneItem(
  provider: TaskStoreProvider,
  item: PublishCandidate
): Promise<ApplyItemResult> {
  const outcome = await withBackoff(() => provider.publishFeature(item.feat), `publish ${item.id}`);
  const result: ApplyItemResult = {
    id: item.id,
    number: outcome.ok ? (outcome.value ?? null) : null,
    ok: outcome.ok
  };
  if (!outcome.ok && outcome.error) result.error = outcome.error;
  return result;
}

export async function applyReconcilePlan(
  provider: TaskStoreProvider,
  plan: ReconcilePlan,
  opts: ApplyReconcileOpts = {}
): Promise<ApplyReconcileResult> {
  const sleepMs = opts.sleepMs ?? 150;

  const closed: ApplyItemResult[] = [];
  for (const item of plan.close) {
    closed.push(await closeOneItem(provider, item, opts));
    if (sleepMs > 0) await sleep(sleepMs);
  }

  const published: ApplyItemResult[] = [];
  for (const item of plan.publish) {
    published.push(await publishOneItem(provider, item));
    if (sleepMs > 0) await sleep(sleepMs);
  }

  return { closed, published };
}
