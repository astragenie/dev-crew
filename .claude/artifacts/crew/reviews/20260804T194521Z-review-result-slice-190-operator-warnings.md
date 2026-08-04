---
slice: SLICE-190
feature: FEAT-284
kind: review-result
status: completed
decision: approved_with_notes
reviewer: independent (crew:reviewer)
date: 2026-08-04
---

# Review: SLICE-190 — surface reconcile demotions/skips as operator warnings

Commit reviewed: `e56e8428` (parent `3860269f`), 2 files:
`src/scripts/lib/slice-linker/feature-lifecycle.mts`,
`src/tests/git-anchored-completion.test.mts`.

## Verification performed

- `bunx tsc --project tsconfig.json --noEmit` — clean.
- `bunx tsc --project tsconfig.test.json --noEmit` — clean.
- `bunx biome lint src/scripts/lib/slice-linker/feature-lifecycle.mts src/tests/git-anchored-completion.test.mts` — clean.
- `bunx biome format ...` (check) — clean.
- `bun test src/tests/git-anchored-completion.test.mts` — 24 pass, 0 fail (all three new tests included).
- `grep -n "console\." src/scripts/lib/slice-linker/git-anchored-completion.mts` — no matches; confirmed console-free as claimed.
- Wrote two disposable repro scripts under the scratchpad dir (not in the repo) that call `sliceFromFeature` on a real temp git repo, to capture actual (unmocked) console output rather than trusting the test's assertions alone. Both deleted after use; `git status --short` shows no stray files from this review.

## 1. Is the output actually useful to an operator mid-ceremony?

Yes. Real captured output for the demoted case:

```
[git-anchored-completion] FEAT-001: 1 proposed slice(s) demoted to a warning — text matched but not corroborated as shipped:
  - ordinal 1 (-SLICE-1 "Design") — commit 896f34e "test(SLICE-188): rebuild git-anchored-completion fixtures": the FEAT/SLICE reference appears only in the commit body, not its subject. Treating as unshipped; will be materialized.
```

And for the skipped-shipped case (captured live from the pre-existing e2e test, which now also emits this line as a side effect):

```
[git-anchored-completion] FEAT-001: 2 proposed slice(s) skipped as already-shipped (start index advances past them):
  - ordinal 1 (-SLICE-1 "Bridge") — matched commit 40ff451 "feat: FEAT-001 SLICE-1 — bridge shipped"
  - ordinal 2 (-SLICE-2 "ACL") — matched commit f095ea2 "feat: FEAT-001 SLICE-2 — ACL shipped"
```

Each line gives ordinal, title, and a 7-char sha an operator can `git show` directly — enough to decide "investigate" vs. "correctly ignored" without reading FEAT-284 first. The reason labels (`feature-lifecycle.mts:144-152`) are plain English, no jargon, no acronym soup. Volume is one line per affected slice plus a one-line header — for a 5-slice FEAT with several demotions this stays proportionate, not a wall of text.

One precision nitpick: the `token-pair-in-body-only` label reads "the FEAT/SLICE reference appears only in the commit body, not its subject" for every case that reason covers, including the squash-merge shape FEAT-284 documents as its main remaining false-negative source (§"Measured cost of AC-7" — commit `859be561` in this repo's own history: FEAT id in the subject, SLICE ordinal only in the squash body). The message doesn't distinguish "whole pair body-only" from "FEAT id in subject, ordinal in squash body" — a reader wouldn't know from the line alone that this might be the AC-8 squash-bullet shape rather than a genuine prose-only mention. Not a defect (AC-8 is explicitly out of scope, tracked separately), but worth a follow-up line/label refinement when AC-8 lands.

## 2. Does it fire where it matters, and is the coverage honest?

Traced the actual call path rather than trusting the builder's framing. `reconcileProposedSlicesStartIndex` only runs when `proposed.length > 0` (multi-slice path) **and** `existingCount < proposed.length` (`feature-lifecycle.mts:230-231`). I verified experimentally that `materializeProposedSlices` materializes **all** remaining proposed slices in a single call (`toCreate = proposed.slice(startAt)` loop, `feature-lifecycle.mts:549-598`) — it is not invoked once per slice. So for a multi-slice FEAT the reconcile pass (and therefore these warnings) runs essentially once, at the point the FEAT's `proposed_slices` are first (or re-)materialized; a second `sliceFromFeature` call on the same FEAT hits the idempotent early-return and reconcile never runs again. I confirmed this live: a two-slice fixture with an ordinal-1 demotion printed the warning once on the materializing call and printed nothing on a follow-up call. This means my initial suspicion of repeat-warning noise across repeated `runner:start` calls on the same FEAT does not hold — it fires once, not N times.

Two honest coverage gaps, both inherited from SLICE-189's scope rather than introduced here:
- **Single-slice FEATs never reach this code at all** — `gitReconciledStartIndex` is computed only `if (proposed && proposed.length > 0)` (`feature-lifecycle.mts:341-351`). A single-slice FEAT's `materializeSingleSlice` path has no git-anchored check and thus no possible warning, silent or otherwise.
- **A FEAT that is already fully materialized by the time this code runs gets no warning, ever, for its own history.** The builder's own example (FEAT-259, 5/5 materialized) is the demonstration case: `existingCount >= proposed.length` short-circuits before `reconcileProposedSlicesAgainstGit` is even called. The original incident this FEAT exists to fix would not itself re-surface a warning today — it's only forward-looking, for FEATs with remaining unmaterialized proposed slices at the moment evidence exists. That's a legitimate scope limit (there's nothing left to reconcile for an already-complete FEAT), but the review asked me to say plainly if the warning is largely dormant in a specific class of situation, and this is that class: **for any FEAT already fully backfilled/materialized, this warning is permanently dormant, by construction.** Worth stating in the close/retro notes so nobody later expects it to flag historical drift.

## 3. The refuse path

Verified the claim against the actual thrown message (`git-anchored-completion.mts:339-361`, `SliceAlreadyShippedError`'s constructor): it builds `evidenceLines` from `evidence` (the `shipped` array) with exactly `ordinal`, `idSuffix`, `title`, 7-char sha, and `commitSubject` per line, then appends `detail` (the `action.reason` string from `planReconcileAction`). That is a complete, human-readable listing — a separate `logSkippedShipped` call for the refuse path would be duplicate information, not additional information. The reasoning holds. I also confirmed `logDemotedMatches` still fires before the throw (`feature-lifecycle.mts:241-244`, ahead of the `action.kind === "refuse"` branch) — so a refuse-with-textOnlyMatches run gets both the demoted console.warn (different slices) and the thrown error's evidence (shipped slices), which is correct since the two lists are disjoint by construction, not overlapping/duplicated output.

## 4. Silence on clean runs

Confirmed both by the third new test and by re-running it live: `reconcileWarnings` (filtered for the `[git-anchored-completion]` prefix) is asserted `deepEqual([])` when nothing is demoted or skipped, and both `logDemotedMatches`/`logSkippedShipped` early-return on an empty array before printing even a header. No "0 warnings" line anywhere.

## 5. Fail-open

Both helpers are pure formatting/logging with no I/O and no code path that can throw on the inputs they actually receive (all fields are plain strings/numbers off `TextOnlyMatchEvidence`/`ShippedOrdinalEvidence`, populated with `""` fallbacks upstream in `fetchCandidateCommits`, `feature-lifecycle.mts` never sees `null`/`undefined` there). `.slice(0, 7)` on an empty string, an out-of-map `TEXT_ONLY_REASON_LABEL` lookup (would just interpolate `undefined`, not throw), and arbitrarily long title/subject strings all degrade gracefully rather than crash. One consistency nitpick, not a defect: the durable frontmatter stamp a few lines below (`feature-lifecycle.mts:269-279`) is explicitly wrapped in try/catch with a stated fail-open rationale in its comment, but the new `logDemotedMatches`/`logSkippedShipped` calls are not similarly wrapped — logging is lower-risk than an fs write so this is defensible, but it's an asymmetry worth a one-line comment if this file gets touched again.

## 6. Scope

Diff confirmed to touch exactly the two listed files. `git-anchored-completion.mts` unchanged except for the pre-existing `TextOnlyMatchEvidence`/`TextOnlyMatchReason`/`ShippedOrdinalEvidence` type exports SLICE-189 already added — no detection-semantics change, no change to `proposed_slices_shipped`/`proposed_slices_shipped_commits` shape (still `idSuffix`/`commitSha` arrays), `planReconcileAction` untouched, id_suffix keying untouched, no squash-body bullet matching (AC-8) attempted. Grep confirms zero `console.*` calls in `git-anchored-completion.mts`.

## 7. Test quality

The three new tests drive the real public entry point (`sliceFromFeature`), not the two logging helpers directly — they build real temp git repos with real commits via the same `tmpGitRepo`/`commitFixture`/`addFeature` helpers the rest of the file already uses, and assert on captured `console.warn` output with substring/regex checks rather than exact-string equality, so they're resilient to wording tweaks while still proving the ordinal/title/sha actually appear. This is behavior-level testing, not implementation mirroring. The `withCapturedWarnings` save/monkeypatch/restore-in-finally pattern matches the existing convention already used in `src/tests/dispatch-prune.test.mts:225-234` and `src/tests/cost-report-dedup.test.mts:203-210` — consistent with repo convention, not a one-off.

## Decision: approved_with_notes

The implementation does what AC-3 asks, is genuinely wired (verified live output, not just reading the diff), fails open, stays silent on the happy path, and doesn't leak into the pure-evaluator module. Notes for the record (none blocking):

1. The warning is permanently dormant for any FEAT that's already fully materialized by the time this code runs — including the FEAT-259 incident case itself. Forward-looking only; say so in the close/retro write-up so it isn't mistaken for a historical-drift detector.
2. `token-pair-in-body-only`'s label doesn't distinguish plain prose-only mentions from the squash-bullet shape AC-8 will handle — minor label refinement to consider when AC-8 (SLICE-194) lands.
3. Minor asymmetry: the frontmatter-stamp fail-open try/catch has an explicit rationale comment; the new logging calls (equally fail-open in practice) don't. Not worth blocking on.
