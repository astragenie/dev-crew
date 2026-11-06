---
findings: "[HIGH] crew/scripts/lib/workflow-state.mts:132 (resolveReviewerLadder), :468-507 (computeReviewGateStatus/applyReviewVerdict), crew.mts:1083 and ~1149 (default --reviewer/--validator keys) — The new per-reviewer/per-validator aggregation is keyed by the literal `--reviewer`/`--validator` CLI value, but no shipped agent prompt today supplies a key that is both distinct-per-caller and matches the reviewers.ladder snapshot. agents/reviewer.md (generic devcrew:reviewer, used for the standard A/B ladder dispatch) never passes --reviewer/--owner, so both ladder reviewers collapse onto the same default key \"reviewer\" (crew.mts:1083); agents/verifier.md and agents/qa-expert.md never pass --validator and both default to \"verifier\" (used together by crew:ship's parallel qa-expert+verifier fanout). Concretely: dispatch reviewer A = rejected, then reviewer B = approved, both via the stock devcrew:reviewer agent → second write overwrites the first write's map entry under the shared key \"reviewer\" → aggregation degrades to single-slot semantics, reproducing the exact \"reject-then-approve turns the gate green\" bug this slice's own problem statement cites as the live motivator. Separately, in this repo's own config (.claude/loop.json reviewers.ladder=[\"A\",\"B\"]), resolveReviewerLadder snapshots `required: [\"A\",\"B\"]` verbatim, but since no shipped reviewer ever writes under the literal key \"A\" or \"B\", gates.review.status can get stuck at \"required\" forever even after every real reviewer approves — a regression visible to any status surface reading gates.review.status (confirmed consumer: crew/scripts/lib/installer/templates.mts:318, :328, :350-352, :380, which ships to adopter repos). Fix: have crew.mts auto-assign a distinguishing --reviewer/--validator value per dispatch slot (not a shared default string), and/or update agents/reviewer.md, verifier.md, qa-expert.md, and reviewers.ladder resolution to agree on a common key vocabulary (role names vs. ladder letters) so the required-set snapshot can actually be satisfied by real dispatches. Not blocking this slice — the slice-close gate (src/scripts/lib/review-gate.mts) resolves primarily from the review artifact's own `decision` frontmatter rather than workflow-state, so this doesn't break slice completion today, and the failure mode here reproduces rather than worsens the pre-existing single-slot collision bug — but it means the aggregation half of FEAT-024's deliverable is not actually exercised by any real dispatch path yet, and warrants a fast follow-up slice.\n\n[LOW] crew/scripts/lib/workflow-state.mts:468-480 vs :541-552 — computeReviewGateStatus and computeValidationGateStatus are structurally near-identical (dominant-failure-value check + required/fallback checklist + all-satisfied test) with only the dominant value and the \"all approved\" vs \"all written then skipped-check\" predicate differing. Not wrong, just duplicated logic that could be lifted into one generic helper parameterized by the dominant/passing predicates if this area gets touched again.\n\nVerified clean: crew.mts's refuseIfReviewDecisionMissing uses process.exit(2) consistently with every other refusal helper in that same CLI entry-point file (e.g. refuseIfTestAdequacyMissing) — correctly NOT a library-module process.exit violation. validation-result-writer.mts's assertDecisionProvided throws (never process.exit), matching the module's documented \"throws, never process.exit\" contract, and is correctly caught/mapped to exit 2 by crew.mts's existing try/catch around write-validation-result. exactOptionalPropertyTypes-sensitive fields (RegisterFields.reviewer/validator, GateEntry.reviewers/validators/required) follow existing field conventions in both files. .mjs import specifiers on .mts sources are correct throughout. Biome lint clean on all 4 touched script files (`bunx biome lint` from crew/). `bun test tests/review-verdict-aggregation.test.mts tests/enum-verdicts.test.mts` green (32/32, 86 expect() calls) run independently in addition to the builder's reported full-suite 1771-pass run. No complexity concerns in the new/extended functions (handleReviewResult, computeReviewGateStatus, applyReviewVerdict, computeValidationGateStatus, applyValidationVerdict, resolveReviewerLadder) — all well under the 15-branch cap. Tests in crew/tests/review-verdict-aggregation.test.mts are hermetic (makeTempDir per test, cleanup in finally, real registerWorkflowArtifact(repoPath, artifact, fields) signature) and crew/tests/enum-verdicts.test.mts was updated consistently with the new scaffold-never-flips-the-gate behavior (old \"legacy absent verdict defaults to passed\" assertion correctly replaced). --update path was spot-checked via agents/typescript-reviewer.md and architect-reviewer.md's documented blocked-path invocations, which always carry --decision alongside --status blocked/completed, so refuseIfReviewDecisionMissing's terminal-write detection (not --scaffold, status !== \"in-progress\") correctly covers them."
decision: approved_with_notes
---
# Review Result: SLICE-49 review A (typescript)

- Created: 2026-11-06T03:38:26.289Z
- Reviewer: typescript-reviewer
- Decision: approved_with_notes
- Summary: SLICE-49 (FEAT-024) review A — TypeScript stack reviewer.

The --decision-required refusal (the live fail-open gap FEAT-024 set out to
close) is implemented correctly in both crew.mts (refuseIfReviewDecisionMissing,
process.exit(2), entry-point-appropriate) and validation-result-writer.mts
(assertDecisionProvided, throws, lib-appropriate — caught and mapped back to
exit 2 by crew.mts's existing try/catch). Scaffold / --status in-progress
writes correctly register the artifact path without touching the gate.
Biome lint clean on all 4 touched script files; `bun test
tests/review-verdict-aggregation.test.mts tests/enum-verdicts.test.mts` is
green (32/32); no process.exit in the library file; exactOptionalPropertyTypes
usage matches existing conventions; .mjs import specifiers correct.

One HIGH-severity integration gap found: the new per-reviewer/per-validator
aggregation (gates.review.reviewers / .validators, keyed by the literal
--reviewer / --validator value) assumes callers pass a key that is both
(a) distinct per concurrent reviewer/validator, and (b) for review, a match
against the reviewers.ladder snapshot ("A"/"B" in this repo's own
.claude/loop.json). Neither holds for any agent prompt actually shipped in
this repo today:
  - agents/reviewer.md (the generic devcrew:reviewer used by the A/B ladder
    dispatch in src/scripts/lib/post-builder-fanout.mts) never passes
    --reviewer or --owner at all, so both ladder reviewers resolve to the
    same default key "reviewer" (crew.mts:1083).
  - agents/typescript-reviewer.md / csharp-reviewer.md pass role names
    (typescript-reviewer, csharp-reviewer), never "A"/"B".
  - agents/verifier.md / qa-expert.md never pass --validator; both default
    to "verifier" (crew.mts ~1149), and crew:ship fans these two out in
    parallel.

Net effect: for the exact motivating scenario in FEAT-024's own problem
statement ("reviewers.ladder [A,B] dispatched in one message... reject-then-
approve turns gate green"), when both reviewers are the generic
devcrew:reviewer (today's default — no prompt passes a distinguishing key),
the second write still overwrites the first write's map entry under the
same key "reviewer", and the aggregation collapses to single-slot
semantics — reproducing the original bug this slice was written to close.
The same collision applies to qa-expert + verifier on the validation side.
Separately, when a run DOES snapshot required: ["A","B"] at run-brief time
(the per-repo default), no shipped reviewer ever writes under the literal
keys "A"/"B", so gates.review.status can get permanently stuck at
"required" even after every real reviewer has approved — a visible
regression for any status surface that reads gates.review.status
(confirmed consumer: crew/scripts/lib/installer/templates.mts:318,328,
350-352,380, shipped to adopter repos). The higher-priority slice-close gate
(src/scripts/lib/review-gate.mts) is NOT affected — it resolves primarily
from the review artifact's own `decision` frontmatter, not from
workflow-state, so this does not block slice completion today, but it does
undermine part of FEAT-024's stated deliverable and leaves run-brief/
brief-me status reporting wrong.

This is a caller-wiring gap, not a bug in the arithmetic itself
(computeReviewGateStatus / computeValidationGateStatus / applyReviewVerdict /
applyValidationVerdict in workflow-state.mts are correct given well-formed,
distinct keys — confirmed by the AC-3/AC-4 tests, which hand-construct
matching keys rather than going through the real CLI contract end-to-end).
Recommend a fast follow-up slice to either (a) have crew.mts auto-derive a
distinguishing --reviewer/--validator default per dispatch slot instead of
a shared literal string, or (b) update agents/reviewer.md, verifier.md,
qa-expert.md to pass an explicit --reviewer/--validator matching the
resolved ladder role, and decide whether reviewers.ladder entries should be
resolved to role names (not kept verbatim) when the repo uses stack
reviewers instead of literal A/B.

Given the P0-critical half of this slice (the fail-open --decision gap,
which was live on every single dispatch) is correctly and safely closed,
and the aggregation gap fails safe-ish (never silently resolves "passed" on
its own in the stuck-at-required case, and only reproduces — not worsens —
the pre-existing single-slot collision in the other case) rather than
introducing a new exploitable fail-open path, I'm not blocking on it, but
it should not be treated as fully solved — approved_with_notes.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: builder gates rc=0: crew suite 1771 pass, typecheck x2, biome, validate-badges, validate-imports, validate-repo-boundary; independently re-ran bun test tests/review-verdict-aggregation.test.mts tests/enum-verdicts.test.mts (32/32 pass) and biome lint on the 4 touched script files (clean)
- Risks: -
- Required Follow-up: -

