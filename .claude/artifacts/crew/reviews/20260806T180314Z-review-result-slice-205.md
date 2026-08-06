---
slice: SLICE-205
feature: FEAT-295
reviewer: independent-review-agent
decision: approved_with_notes
commit: 32dec9efcc4e9dc11375f9b9be1613c474d645a0
---

# Review: SLICE-205 — delete validation-gate.mts's unbounded null-decision grandfather clause

## Verdict: approved_with_notes

Gates (bun test / typecheck / biome lint / biome format) were independently
confirmed green by the requester before this review and were not re-run
here per instruction. This review focuses on correctness of the four
priority items requested.

## 1. Out-of-scope test edits — verified clean, no smuggled regression

Checked each of the three collateral files against the genuine negative-path
coverage:

- `gates.test.mts` — `"deriveValidationGate passes when matching artifact
  exists under validations/"` and `"computeFeatureResult moves feature to
  done when all gates pass"`: both test names and bodies are about
  filename-matching / full-gate-pass flow, not about the decision-less
  branch specifically. Rewriting their fixtures to `decision: pass` is
  correct — these were never regression tests for the grandfather clause.
- `integration.test.mts` — the happy-path `startSlice → completeSlice`
  integration test is a full-cycle smoke test, same reasoning.
- `slice-complete.test.mts` — `"completeSlice proceeds when validation
  artifact present for the slice"`: name is superficially closest to the
  removed behavior, but its sibling test directly above it
  (`"completeSlice holds feature open when validation gate unmet (no
  artifact, no badge)"`) already owns the negative/absence case, so this
  test's real job is "an artifact unlocks close" vs. that sibling, not
  "presence alone (no decision) unlocks close." Correct to update.

Crucially, the actual regression test for the removed branch **does**
exist and was added correctly, in-scope, in `validation-gate.test.mts`:
`"deriveValidationGate: artifact with no decision frontmatter is NOT
satisfied"` (replacing the old `"...satisfied when matching validation
artifact present"` test), asserting `satisfied === false`,
`(result as any).legacy === undefined`, and a message match on the new
reason string. This is the mirror of SLICE-202's
`"deriveReviewGate: artifact with no decision frontmatter is unproven, NOT
satisfied"` test in `close-refusal.test.mts`. No test whose real purpose
was exercising the grandfather path was quietly converted to pass — the
failure mode you asked me to hunt for is not present.

## 2. Blast radius — mostly clean, one real interaction worth documenting

- `resolveVerdictOutcome` is not exported and has exactly one call site
  (`deriveValidationGate` in the same file) — no other caller depends on
  the removed branch or its old reason string. A repo-wide grep for
  `validation artifact present` / `grandfathered` turned up only the
  updated test names/comments, nothing load-bearing left behind.
- Confirmed a decision-less artifact now yields `satisfied: false` with an
  actionable message naming the missing key and the remedy (either add
  `decision:` or record an explicit `validation_skipped` badge).
- **`loop.validation.satisfiedByReview: true` interaction (this repo's
  setting):** `readNewestArtifactVerdict` returns a non-null verdict object
  (with `decision: null`) whenever *any* filename-matching artifact exists,
  regardless of whether it carries a decision key
  (`src/scripts/lib/artifact-verdict.mts`). `deriveValidationGate` returns
  from the artifact-verdict branch as soon as `verdict` is truthy — the
  `satisfiedByReview` fallback is only reached when there is **no**
  matching artifact at all. Net effect: a slice with a stray/legacy
  decision-less artifact on file is now *worse off* than a slice with no
  artifact at all, because the artifact-present branch short-circuits
  before the review-badge fallback ever runs. This isn't a bug — it matches
  the intent that explicit-but-insufficient evidence must be fixed
  explicitly rather than silently rescued by an unrelated gate — and the
  builder's own AC-3 remediation for SLICE-118/SLICE-119 already reflects
  it correctly (it names re-validation or an explicit skip badge, not
  "rely on review approval"). But it is non-obvious and worth a one-line
  comment near the `satisfiedByReview` block noting that it is unreachable
  once any matching artifact exists, decision or not — otherwise a future
  reader will assume the fallback is broader than it is.

## 3. Factual claims — both independently verified, exact match

- Corpus count: counted `.claude/artifacts/crew/validations/*.md`
  independently — **47 total, 45 without a `decision:` key, 31 with no
  frontmatter block at all.** Matches the commit message exactly.
- Dead `legacy` field: read `validation-gate.mts` directly —
  `resolveVerdictOutcome`'s three return sites (`null` branch, pass,
  skipped, fail, unrecognized) never included a `legacy` key, before or
  after this diff. Confirmed by contrast against SLICE-202's
  `review-gate.mts` diff, which did remove a real `legacy?: boolean` field
  from `ReviewGateResult` — the asymmetry the builder claims is real, not
  an excuse to skip work.

## 4. AC-3 open-slice sweep — complete, with one disclosure gap

Independently re-derived the sweep: listed all 47 corpus filenames, listed
every currently-open slice file (`slices/pending/` — there is no separate
`in-progress/` directory for slices), and cross-referenced slice-number
tokens. Only four open-slice numbers appear in the corpus at all: 118, 119,
128, 130. Of those, 128 and 130's own slice files carry `status: done`
despite sitting in `slices/pending/`, exactly as the commit message says —
confirmed by reading both files directly. 118 and 119 are the only
remaining candidates, and both of their sole matching validation artifacts
lack a `decision:` key (118's artifact has a frontmatter block with
`findings`/`status` but no `decision`; 119's artifact has no frontmatter at
all) — so both correctly land in the "needs re-validation or explicit
`validation_skipped` badge" bucket. The sweep itself is complete; no
open-slice/frontmatter-less-artifact pairing was missed.

One thing the commit message doesn't disclose: **SLICE-118 exists in both
`slices/pending/` (`status: pending`) and `slices/completed/`
(`status: completed`, `completed_at: 2026-06-13`) simultaneously** — the
same state-drift class SLICE-208 exists to reconcile. This doesn't affect
the correctness of the code change (the gate logic is unaffected either
way), but it does mean AC-3's "SLICE-118 needs action" framing should be
treated as provisional, not settled, until the drift is resolved — a
reader acting on this commit message alone could re-validate a slice that
was in fact already completed under its canonical record. Worth a note in
SLICE-208's reconciliation pass rather than a blocker here.

## Summary

The core deletion is correct, symmetric with SLICE-202's review-gate.mts
fix, and independently verified: behavior, corpus counts, dead-field claim,
and open-slice sweep all check out exactly as reported. The three
out-of-scope test edits are legitimate — genuine grandfather-path coverage
exists and was added correctly in the in-scope test file, so no regression
was smuggled through a fixture rewrite. Two non-blocking notes carried
forward: (1) `artifact-verdict.mts`'s shared module header comment
(`"...are 'legacy' and are grandfathered by callers..."`) is now stale —
neither of its two callers grandfathers anymore after SLICE-202 + this
slice, and nothing in this diff touched it; (2) the `satisfiedByReview`
fallback is silently unreachable once any matching artifact exists
regardless of decision key, which is intentional but undocumented at that
call site; (3) SLICE-118's dual-state-directory drift means its "needs
action" status in AC-3 is provisional, not settled.
