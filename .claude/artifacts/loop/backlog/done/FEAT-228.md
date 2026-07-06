---
id: FEAT-228
status: done
priority: P2
category: enhancement
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: [FEAT-221]
slices: []
derived_from: null
tags: [backend, memory, learning-loop]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Fast-follow from FEAT-221 review (PR #336). The FailureClassifier's grade-file collector only treats a grade as failure signal when `verdict` is present and non-pass-like — but 0/119 grade files set a non-pass verdict today, so grades/*.md (the spec's 'primary input') contributes ZERO signal. Meanwhile ~110/119 files carry Surprises/Followups content (independent of verdict) that IS failure-adjacent signal and is currently unmined. Mine it. Mechanical, self-contained -> autonomous_safe."
---
# FEAT-228: mine grade Surprises/Followups regardless of verdict

## Origin

FEAT-221 review (crew:reviewer, PR #336, 2026-07-06). The classifier's grade-file
collector (`failure-classifier.mts`) counts a grade as failure signal only when
`verdict` is present and non-pass-like. Verified against the real corpus: only
**13/119** grade files set `verdict` at all, and all 13 are pass-like — so the
grade source contributes **0 signals today**, exactly as the code comment
discloses. The spec's "primary input" is inert. But **~110/119** grade files
carry **Surprises** and **Followups** sections (independent of any verdict) that
are genuinely failure-adjacent (surprises = things that went wrong/unexpected;
followups = unresolved issues). Mine those.

This is a refinement of FEAT-221's classifier, not a new subsystem.

## Scope

1. In `failure-classifier.mts`'s grade collector, treat **Surprises** and
   **Followups** bullets (parsed via `lessons-feed`/`grade-parser`) as failure
   signal, independent of `verdict`. Keep the existing non-pass-`verdict` path as
   an additional (stronger) signal.
2. Infer `failure_class` for these entries via the existing `inferFailureClass`
   keyword rules (default `other`); carry the grade's slice/feat id + section as
   `evidence`.
3. Preserve the existing anti-inflation guard — mined-lesson rows
   (`MINED_LESSON_KEY_PREFIX`) must still be excluded from being re-ingested as
   fresh signal, so surfacing Surprises/Followups doesn't create a feedback loop.
4. Keep clustering/ranking/idempotency unchanged.

## Acceptance criteria

- AC-1: GIVEN a grade file with a Surprises bullet and NO `verdict`, WHEN the
  classifier runs, THEN that bullet contributes a failure signal (grades source
  is no longer inert on the real corpus).
- AC-2: GIVEN a Followups bullet, WHEN classified, THEN it is grouped with an
  inferred `failure_class` and carries the grade's id + "followups" section in
  `evidence`.
- AC-3: GIVEN a pass-like grade with no surprises/followups, WHEN classified,
  THEN it contributes no signal (no false positives from clean grades).
- AC-4: GIVEN mined-lesson rows already in `learnings.jsonl`, WHEN the classifier
  re-runs, THEN they are still excluded (anti-inflation guard intact).
- AC-5: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Refs

- `src/scripts/lib/failure-classifier.mts` (grade collector — the gate to widen).
- `src/scripts/lib/grade-parser.mts` / `lessons-feed.mts` (Surprises/Followups parsing).
- FEAT-221 (PR #336) review observation (crew:reviewer).
