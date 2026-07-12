// runner-plugin#392: git-anchored slice-completion check.
//
// runner:start (via sliceFromFeature) previously trusted a FEAT's
// proposed_slices index / frontmatter `slices` count as the sole signal for
// "which slice comes next" — that state routinely drifts from git reality
// (a slice ships through a path this tool never recorded: a manual PR, a
// parallel worktree whose backlog move never landed, a squash-merge that
// skipped the close ceremony). This module cross-checks a FEAT's declared
// proposed_slices against the merged commit history on the repo's main ref
// before a new slice is scaffolded, so an already-shipped slice is never
// re-dispatched to a builder.
//
// Detection is intentionally narrow to avoid false positives: it requires a
// commit whose subject or body mentions BOTH the FEAT id and that specific
// proposed slice's ordinal token (`SLICE-<n>`, derived from the `-SLICE-<n>`
// id_suffix already validated by proposed-slices.mts) within a short window
// of each other — the commit-message convention already in use across astra
// consumer repos (see runner-plugin#392's live repro). Absence of a match is
// NOT proof a slice is unshipped; it only means this check found no
// evidence, so callers must treat "not shipped" as the default, fail-open
// outcome — this check must never block a legitimate slice start.

import { gitOk, gitText } from "../run-git.mjs";
import type { ProposedSlice } from "../proposed-slices.mjs";

export interface ShippedOrdinalEvidence {
  ordinal: number;
  idSuffix: string;
  title: string;
  commitSha: string;
  commitSubject: string;
}

export interface GitAnchorReconcileResult {
  ref: string | null;
  shipped: ShippedOrdinalEvidence[];
  // Non-null on any failure to resolve a ref or run git — callers must
  // fail-open (treat as "no evidence") rather than block on this.
  gitError: string | null;
}

export type ReconcileAction =
  | { kind: "proceed" }
  | { kind: "advance"; newStartIndex: number }
  | { kind: "refuse"; reason: string };

// Local refs FIRST: the loop's default posture is "never push from inside
// the loop" (rules.md; auto-merge.mts autoPushOnMerge defaults false), so
// slices squash-merge onto local main while origin/main goes stale. Scanning
// origin first would silently miss exactly the locally-merged-never-pushed
// slices this check exists to catch.
const MAIN_REF_CANDIDATES = ["main", "master", "origin/main", "origin/master"];
const GIT_TIMEOUT_MS = 15_000;
// Field/record separators unlikely to appear in commit subjects/bodies.
const FIELD_SEP = "";
const RECORD_SEP = "";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract the numeric ordinal from a `-SLICE-<n>` id_suffix (validated shape). */
export function ordinalFromIdSuffix(idSuffix: string): number | null {
  const m = /-SLICE-(\d+)$/.exec(idSuffix);
  return m ? Number(m[1]) : null;
}

/**
 * Resolve the ref to scan for shipped evidence. `config.loop.mainRef`
 * overrides; otherwise probes common default-branch names in order. Returns
 * null (fail-open — caller treats as "no evidence available") when none
 * resolve, e.g. a fresh repo with no commits yet or a detached test fixture.
 */
export async function resolveMainRef(
  repoPath: string,
  config: Record<string, any> | null
): Promise<string | null> {
  const override = config?.loop?.mainRef;
  if (typeof override === "string" && override.trim().length > 0) {
    const ref = override.trim();
    const ok = await gitOk(["rev-parse", "--verify", "--quiet", ref], {
      cwd: repoPath,
      timeoutMs: GIT_TIMEOUT_MS
    });
    return ok ? ref : null;
  }
  for (const candidate of MAIN_REF_CANDIDATES) {
    const ok = await gitOk(["rev-parse", "--verify", "--quiet", candidate], {
      cwd: repoPath,
      timeoutMs: GIT_TIMEOUT_MS
    });
    if (ok) return candidate;
  }
  return null;
}

interface CommitRecord {
  sha: string;
  subject: string;
  body: string;
}

/** Fetch commits on `ref` whose subject/body mentions `featureId` at all — a
 * cheap pre-filter before the per-ordinal token match. Returns null on any
 * git-level failure (fail-open signal for the caller). */
async function fetchCandidateCommits(
  repoPath: string,
  ref: string,
  featureId: string
): Promise<CommitRecord[] | null> {
  const raw = await gitText(
    ["log", ref, "-i", "--grep", featureId, `--format=%H${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`],
    { cwd: repoPath, timeoutMs: GIT_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 }
  );
  if (raw === null) return null;
  if (raw.length === 0) return [];
  return raw
    .split(RECORD_SEP)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha = "", subject = "", body = ""] = record.split(FIELD_SEP);
      return { sha, subject, body };
    })
    .filter((r) => r.sha.length > 0);
}

/**
 * Cross-check a FEAT's proposed_slices against merged commit history.
 * Fail-open by contract: any git-level failure (unresolvable ref, spawn
 * error, exception) returns `gitError` set and an empty `shipped[]` — callers
 * must proceed as though nothing is shipped rather than block a legitimate
 * slice start on a git hiccup.
 */
export async function reconcileProposedSlicesAgainstGit(
  repoPath: string,
  featureId: string,
  proposed: ProposedSlice[],
  config: Record<string, any> | null = null
): Promise<GitAnchorReconcileResult> {
  try {
    const ref = await resolveMainRef(repoPath, config);
    if (!ref) {
      return { ref: null, shipped: [], gitError: "no resolvable main ref (fail-open)" };
    }
    const commits = await fetchCandidateCommits(repoPath, ref, featureId);
    if (commits === null) {
      return { ref, shipped: [], gitError: `git log failed against ${ref} (fail-open)` };
    }

    const featTok = escapeRegExp(featureId);
    const shipped: ShippedOrdinalEvidence[] = [];
    for (let i = 0; i < proposed.length; i += 1) {
      const slice = proposed[i]!;
      const ordinal = ordinalFromIdSuffix(slice.id_suffix) ?? i + 1;
      const sliceTok = `SLICE-${ordinal}\\b`;
      const pattern = new RegExp(
        `${featTok}[^\\n]{0,80}?${sliceTok}|${sliceTok}[^\\n]{0,80}?${featTok}`,
        "i"
      );
      const hit = commits.find((c) => pattern.test(`${c.subject} ${c.body}`));
      if (hit) {
        shipped.push({
          ordinal,
          idSuffix: slice.id_suffix,
          title: slice.title,
          commitSha: hit.sha,
          commitSubject: hit.subject
        });
      }
    }
    return { ref, shipped, gitError: null };
  } catch (err: unknown) {
    // Belt-and-braces: gitText/gitOk already swallow their own failures, but
    // a malformed config or regex construction should still fail open.
    return {
      ref: null,
      shipped: [],
      gitError: `reconcile threw: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/** Refuse-with-report error — thrown by sliceFromFeature when git evidence
 * shows the FEAT is fully shipped, or when shipped ordinals are
 * non-contiguous relative to what's already materialized (ambiguous —
 * refuse rather than silently reorder proposed_slices). */
export class SliceAlreadyShippedError extends Error {
  constructor(
    public readonly featureId: string,
    public readonly evidence: ShippedOrdinalEvidence[],
    public readonly detail: string
  ) {
    const evidenceLines = evidence
      .map(
        (e) =>
          `  - ordinal ${e.ordinal} (${e.idSuffix} "${e.title}") — ${e.commitSha.slice(0, 7)} "${e.commitSubject}"`
      )
      .join("\n");
    super(
      `${featureId}: refusing to scaffold — git-anchored check found ${evidence.length} ` +
        `already-shipped slice(s):\n${evidenceLines}\n${detail}`
    );
    this.name = "SliceAlreadyShippedError";
  }
}

/**
 * Given git evidence + how many slices are already materialized in the
 * backlog (`existingCount`), decide the action for `sliceFromFeature`:
 *   - `proceed`: no shipped evidence beyond what's already materialized —
 *     scaffold as normal starting at `existingCount`.
 *   - `advance`: a contiguous shipped prefix (ordinals 1..k) extends past
 *     `existingCount` — safe to auto-reconcile by skipping straight to the
 *     first unshipped ordinal (k, 0-indexed as `newStartIndex`).
 *   - `refuse`: either the whole FEAT looks shipped, or the shipped set is
 *     non-contiguous (ambiguous) — do not scaffold or mutate any state.
 */
export function planReconcileAction(
  proposedLength: number,
  existingCount: number,
  shipped: ShippedOrdinalEvidence[]
): ReconcileAction {
  if (shipped.length === 0) return { kind: "proceed" };

  const shippedOrdinals = new Set(shipped.map((s) => s.ordinal));
  // Longest contiguous shipped prefix starting at ordinal 1.
  let k = 0;
  while (k < proposedLength && shippedOrdinals.has(k + 1)) k += 1;

  const nonContiguousExtra = shipped.some((s) => s.ordinal > k);
  if (nonContiguousExtra) {
    const sorted = [...shippedOrdinals].sort((a, b) => a - b).join(", ");
    return {
      kind: "refuse",
      reason:
        `shipped evidence is non-contiguous (ordinals with evidence: ${sorted}) — refusing to ` +
        "auto-reorder. Verify each proposed_slices entry against git, then reconcile backlog " +
        "state by hand (mark shipped entries done, update the FEAT's `slices` frontmatter)."
    };
  }

  if (k <= existingCount) return { kind: "proceed" };

  if (k >= proposedLength) {
    return {
      kind: "refuse",
      reason: `all ${proposedLength} proposed slice(s) have merged-commit evidence — this FEAT looks fully shipped. Move it to done/ if confirmed, or re-run with corrected proposed_slices if this is a false positive.`
    };
  }

  return { kind: "advance", newStartIndex: k };
}
