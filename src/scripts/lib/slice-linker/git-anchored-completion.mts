// runner-plugin#392: git-anchored slice-completion check.
//
// devcrew:start (via sliceFromFeature) previously trusted a FEAT's
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

// Why a text match was NOT accepted as shipped evidence (FEAT-284
// AC-1/AC-2/AC-6/AC-7/AC-8) — carried on `textOnlyMatches` so a downstream
// caller (SLICE-190) can print an operator-visible skip/downgrade line
// without this module owning any console output itself.
export type TextOnlyMatchReason =
  | "token-pair-in-body-only" // AC-7: the FEAT-id/SLICE-ordinal pair appears
  // only when subject+body are concatenated, never within the subject alone
  // — the established genuine-evidence convention puts it in the subject
  // (e.g. `feat(connectors): FEAT-312 SLICE-1 — bridge`). AC-8 (SLICE-194)
  // widens WHERE the pair may appear — a bullet-shaped body line (see
  // `isBulletShapedBodyLine`) counts as subject-equivalent, since a genuine
  // squash-merge folds each original commit's subject into the merge
  // commit's body as one bullet line per commit — but a prose mention
  // outside any bullet-shaped line still lands here. Checked before, and
  // instead of, diff corroboration — a non-qualifying body-only mention
  // never qualifies regardless of what the commit's diff touched.
  | "no-diff-evidence" // commit changed zero files (--allow-empty, or the
  // diff lookup itself failed — fail-open, treated identically to "no
  // evidence" per this module's contract)
  | "no-touches-files-overlap" // slice declares touches_files; changed paths
  // share zero overlap with it (AC-2)
  | "non-implementing-paths-only"; // slice declares no touches_files; every
// changed path falls under NON_IMPLEMENTING_PATH_PREFIXES (AC-6)

export interface TextOnlyMatchEvidence {
  ordinal: number;
  idSuffix: string;
  title: string;
  commitSha: string;
  commitSubject: string;
  reason: TextOnlyMatchReason;
}

export interface GitAnchorReconcileResult {
  ref: string | null;
  shipped: ShippedOrdinalEvidence[];
  // Proposed slices whose FEAT-id/SLICE-ordinal text matched a commit, but
  // whose diff did not corroborate it — never folded into `shipped`. Distinct
  // from a slice with no text match at all, which appears in neither array.
  textOnlyMatches: TextOnlyMatchEvidence[];
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

// FEAT-284 AC-6: repo-relative path prefixes that never count, by themselves,
// as evidence a slice was IMPLEMENTED — planning notes, research docs, and
// backlog/artifact bookkeeping commonly get touched by commits that merely
// *discuss* a slice (the live 71604bb4 / c2e77fe7 repro: both touched only
// paths under this list). When a proposed slice declares no `touches_files`
// to check overlap against instead, a matched commit whose changed paths are
// ALL covered by this list is downgraded to a text-only match. This is a
// named, documented policy specifically so a future reader can see and
// revise it, not an inline literal buried in the matcher.
//
// Deliberately does NOT include `src/tests/`: a third live false positive
// (SLICE-188's own fixture commit, 3bd6ab95 — see FEAT-284 AC-7) touched only
// a test file while quoting "FEAT-259's SLICE-1" in its body, which would
// tempt widening this list to cover it. Don't — that would make a genuinely
// test-only slice (SLICE-188 itself is one) permanently undetectable as
// shipped, for a reason unrelated to what actually distinguishes it. AC-7's
// subject-vs-body check below is the correct, narrower discriminator: all
// three real offenders carry the token pair only in the commit body, never
// the subject.
const NON_IMPLEMENTING_PATH_PREFIXES = ["docs/", ".claude/artifacts/"];

function isNonImplementingPath(changedPath: string): boolean {
  return NON_IMPLEMENTING_PATH_PREFIXES.some((prefix) => changedPath.startsWith(prefix));
}

// FEAT-284 AC-8 (SLICE-194): a commit body line shaped like a markdown/
// squash-merge bullet — optional leading whitespace, then `-`, `*`, or `+`,
// then at least one space before content. AC-7 (above) requires the FEAT-id/
// SLICE-ordinal pair to sit in the commit SUBJECT because a body-only
// mention is exactly the shape of the three live false positives (71604bb4,
// c2e77fe7, 3bd6ab95) — all three carry the pair only in prose paragraphs.
// But a genuine squash-merge (GitHub's default squash format, and manual
// multi-commit squashes alike — the live 859be561 shape) folds each original
// commit's SUBJECT into the merge commit's BODY as one bullet line per
// commit. Those bullet lines *are* subjects; they just moved.
//
// The character-class test alone (`-`/`*`/`+` + whitespace at line start)
// cannot tell a genuine list item apart from an ordinary prose sentence that
// happens to hard-wrap onto a line starting with "-". What distinguishes
// them is BLOCK CONTEXT: a real bullet always opens a new block — either the
// very first line of the body, or immediately after a blank line, or as a
// continuation of a run of bullets already recognized as such (consecutive
// list items). A mid-paragraph wrap boundary is preceded by an ordinary,
// non-blank, non-bullet prose line, so it never opens a block and is
// excluded even though its leading character matches the shape. This is why
// `bulletShapedBodyLines` walks the body sequentially tracking the previous
// line's status rather than filtering lines independently.
//
// A named, documented predicate pair (matching the style of
// `NON_IMPLEMENTING_PATH_PREFIXES`/`isNonImplementingPath` above) so a
// future reader can see and revise the policy, not find it inline.
//
// Rejected alternative — do NOT adopt: "FEAT-id OR SLICE-token appears
// anywhere in the subject" (without requiring the pair together) reinstates
// ALL THREE known false positives, because each one's SUBJECT alone happens
// to mention one of the two tokens on its own. This predicate never widens
// AC-7's subject rule; it only adds qualifying bullet-shaped body lines as
// additional subject-equivalent text to run that same paired-token pattern
// against — a match still requires both tokens on one physical line.
const BULLET_LINE_PATTERN = /^\s*[-*+]\s+/;

function isBulletShapedBodyLine(line: string): boolean {
  return BULLET_LINE_PATTERN.test(line);
}

/** Split a commit body into the bullet lines that actually OPEN a list block
 * (see the block-context rationale above) — the set of subject-equivalent
 * match targets AC-8 adds alongside the commit's actual subject. A line
 * matching `isBulletShapedBodyLine` only qualifies when the preceding line is
 * blank, the start of the body, or itself a qualifying bullet — never when
 * it's a bare mid-paragraph wrap continuation.
 *
 * Known residual gap (SLICE-194 review, 2026-08-05): a bullet-shaped line
 * DIRECTLY following another qualifying bullet always counts as a new item,
 * because the run-continuation rule cannot distinguish a genuine sibling
 * bullet from a hard-wrapped continuation of the previous bullet's text that
 * happens to begin with `-`. The rationale above reasons only about lines
 * preceded by prose, not about lines preceded by another bullet.
 *
 * Left as-is deliberately: the squash-merge bodies this exists to read are
 * machine-generated from commit subjects and never wrap a bullet's text onto a
 * following line, so the ambiguous shape does not occur in the real input. If
 * this predicate is ever pointed at hand-written bodies, revisit it. */
function bulletShapedBodyLines(body: string): string[] {
  const lines = body.split("\n");
  const matches: string[] = [];
  let precededByBlockBoundary = true; // start of body counts as a boundary
  for (const line of lines) {
    const isBulletShape = isBulletShapedBodyLine(line);
    if (isBulletShape && precededByBlockBoundary) {
      matches.push(line);
    }
    precededByBlockBoundary =
      line.trim().length === 0 || (isBulletShape && precededByBlockBoundary);
  }
  return matches;
}

/** AC-7/AC-8: true if the FEAT-id/SLICE-ordinal `pattern` matches the
 * commit's subject, OR a bullet-shaped body line that opens a list block
 * (see `bulletShapedBodyLines`). Extracted so the caller's branching stays
 * within the reconcile loop's complexity budget. */
function hasSubjectEquivalentMatch(pattern: RegExp, hit: CommitRecord): boolean {
  return (
    pattern.test(hit.subject) || bulletShapedBodyLines(hit.body).some((line) => pattern.test(line))
  );
}

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

/** Fetch the set of repo-relative paths a commit changed. Returns null on any
 * git-level failure (fail-open signal for the caller — treated identically to
 * "changed nothing" by `evaluateDiffCorroboration`, never a crash). An
 * `--allow-empty` commit resolves to `[]`, not null. */
async function fetchChangedFiles(repoPath: string, sha: string): Promise<string[] | null> {
  const raw = await gitText(["show", "--no-color", "--format=", "--name-only", sha], {
    cwd: repoPath,
    timeoutMs: GIT_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024
  });
  if (raw === null) return null;
  if (raw.length === 0) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// Not a discriminated union on purpose: tsconfig.test.json runs with
// `strict`/`strictNullChecks` off (FEAT-259-adjacent codegen constraint), and
// tsc 7's control-flow narrowing of an `{ ok: true } | { ok: false; reason }`
// union does not hold under that combination — `reason` stays reachable in
// the `ok: true` arm as far as the checker is concerned. `reason` is always
// non-null exactly when `ok` is false (enforced below), so callers read it
// with a `!` assertion in the `ok === false` branch instead of relying on
// narrowing.
interface DiffCorroboration {
  ok: boolean;
  reason: TextOnlyMatchReason | null;
}

/** FEAT-284 AC-1/AC-2/AC-6: decide whether a text-matched commit's diff
 * actually corroborates the match. `changedFiles` is the result of
 * `fetchChangedFiles` (null = lookup failed, fail-open). */
function evaluateDiffCorroboration(
  changedFiles: string[] | null,
  touchesFiles: string[] | undefined
): DiffCorroboration {
  if (changedFiles === null || changedFiles.length === 0) {
    // AC-1: no file changes (or the diff lookup itself failed) — fail-open,
    // never crash, never treat as shipped evidence either way.
    return { ok: false, reason: "no-diff-evidence" };
  }
  if (touchesFiles && touchesFiles.length > 0) {
    // AC-2: slice declares its implementation surface — require overlap.
    const overlaps = changedFiles.some((f) => touchesFiles.includes(f));
    return overlaps
      ? { ok: true, reason: null }
      : { ok: false, reason: "no-touches-files-overlap" };
  }
  // AC-6: no declared touches_files — require at least one changed path
  // outside the non-implementing prefix list (docs/artifacts bookkeeping).
  const allNonImplementing = changedFiles.every(isNonImplementingPath);
  return allNonImplementing
    ? { ok: false, reason: "non-implementing-paths-only" }
    : { ok: true, reason: null };
}

/**
 * Cross-check a FEAT's proposed_slices against merged commit history.
 * Fail-open by contract: any git-level failure (unresolvable ref, spawn
 * error, exception) returns `gitError` set and empty `shipped[]`/
 * `textOnlyMatches[]` — callers must proceed as though nothing is shipped
 * rather than block a legitimate slice start on a git hiccup.
 *
 * A commit whose subject/body mentions a proposed slice's FEAT-id/SLICE-
 * ordinal token pair is no longer sufficient on its own (FEAT-284): the pair
 * must appear in the commit SUBJECT itself (AC-7 — a body-only mention is
 * never evidence, no matter what the commit touched), OR on a bullet-shaped
 * body line (AC-8/SLICE-194 — a genuine squash-merge folds each original
 * commit subject into the merge commit's body as a bullet line; see
 * `isBulletShapedBodyLine`), and the match is only promoted to `shipped`
 * evidence if the commit's diff also corroborates it (see
 * `evaluateDiffCorroboration`) — a bullet-line match is not a corroboration
 * bypass. A text match that fails either check is recorded on
 * `textOnlyMatches` instead of being silently dropped, so a caller can
 * surface it as a warning.
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
      return {
        ref: null,
        shipped: [],
        textOnlyMatches: [],
        gitError: "no resolvable main ref (fail-open)"
      };
    }
    const commits = await fetchCandidateCommits(repoPath, ref, featureId);
    if (commits === null) {
      return {
        ref,
        shipped: [],
        textOnlyMatches: [],
        gitError: `git log failed against ${ref} (fail-open)`
      };
    }

    const featTok = escapeRegExp(featureId);
    const shipped: ShippedOrdinalEvidence[] = [];
    const textOnlyMatches: TextOnlyMatchEvidence[] = [];
    for (let i = 0; i < proposed.length; i += 1) {
      const slice = proposed[i]!;
      const ordinal = ordinalFromIdSuffix(slice.id_suffix) ?? i + 1;
      const sliceTok = `SLICE-${ordinal}\\b`;
      const pattern = new RegExp(
        `${featTok}[^\\n]{0,80}?${sliceTok}|${sliceTok}[^\\n]{0,80}?${featTok}`,
        "i"
      );
      const hit = commits.find((c) => pattern.test(`${c.subject} ${c.body}`));
      if (!hit) continue;

      const record = {
        ordinal,
        idSuffix: slice.id_suffix,
        title: slice.title,
        commitSha: hit.sha,
        commitSubject: hit.subject
      };

      // AC-7: the token pair must appear in the SUBJECT alone, not merely
      // once subject and body are concatenated. All three live false
      // positives (71604bb4, c2e77fe7, 3bd6ab95) carry the pair only in the
      // body; the established genuine-evidence convention puts it in the
      // subject. A body-only mention never qualifies, regardless of diff —
      // checked before, and instead of, diff corroboration.
      //
      // AC-8 (SLICE-194): a bullet-shaped body line (see
      // `isBulletShapedBodyLine`) is a subject-equivalent match target — a
      // genuine squash-merge folds each original commit's subject into the
      // merge commit's body as one bullet line (the live 859be561 shape).
      // The pattern is still run per-line, never against the whole body, so
      // this widens WHERE the pair may appear, not WHETHER it must appear
      // together on one line.
      if (!hasSubjectEquivalentMatch(pattern, hit)) {
        textOnlyMatches.push({ ...record, reason: "token-pair-in-body-only" });
        continue;
      }

      const changedFiles = await fetchChangedFiles(repoPath, hit.sha);
      const corroboration = evaluateDiffCorroboration(changedFiles, slice.touches_files);
      if (corroboration.ok) {
        shipped.push(record);
      } else {
        textOnlyMatches.push({ ...record, reason: corroboration.reason! });
      }
    }
    return { ref, shipped, textOnlyMatches, gitError: null };
  } catch (err: unknown) {
    // Belt-and-braces: gitText/gitOk already swallow their own failures, but
    // a malformed config or regex construction should still fail open.
    return {
      ref: null,
      shipped: [],
      textOnlyMatches: [],
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
