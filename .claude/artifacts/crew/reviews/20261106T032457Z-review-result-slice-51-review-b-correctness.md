---
findings: "[MEDIUM] src/scripts/lib/wave/touches-files.mts:5-13 (INFERENCE_RE widening) and its live effect on .claude/artifacts/loop/ai-loop/slices/pending/SLICE_51_IMPLEMENT-FEAT-034.md's own touches_files inference - the widened regex self-matches the literal example paths quoted inside this very slice's AC-4 text (\"Given a slice body citing `crew/scripts/crew.mts`, `.github/workflows/ci.yml`, and `package.json`...\"), because readTouchesFiles scans the whole markdown body, not just the \"In scope\" section. Reproduced live in this checkout: calling readTouchesFiles() directly on SLICE-51's own file returns paths including \".github/workflows/ci.yml\", \"crew/scripts/crew.mts\", and \"package.json\" - none of which SLICE-51 actually touches (the real diff touches only commands/wave.md, 3 src/scripts/lib/wave*/feature-lifecycle files, and 3 test files). This false-positive touch then caused a real wave-plan rejection: `bun src/scripts/loop.mts wave plan --repo . --json` on this checkout rejects SLICE-47 with reason \"conflict_with_crew/scripts/crew.mts\" - a spurious conflict, since SLICE-47 legitimately cites crew/ paths as real target files in its own ACs while SLICE-51 only quotes them as a documentation example. The builder's AC-5 evidence (\"wave plan --json rc=0\") only checked exit code, not the rejected[] contents, so this was not caught. This is not a brand-new class of bug (the pre-widening regex already mid-token-matched \"scripts/crew.mts\" inside \"crew/scripts/crew.mts\", and inference has always scanned the full body including ACs) but the widening measurably increases its blast radius: package.json and .github/workflows/*.yml are now swept in whole, and these are exactly the kind of paths FEAT/slice prose commonly names as examples (as demonstrated by this very FEAT's own acceptance criteria). Fix: either scope inference to the \"In scope\" section only (tightens an existing design gap, out of this slice's stated scope) or exclude the slice's own \"Acceptance criteria\" section from inference input (narrower, in-scope fix) - or at minimum, note the limitation in commands/wave.md's new widened-inference bullet so operators know to declare touches_files explicitly on slices whose AC prose quotes file-path examples. Non-blocking: inferred-confidence touches_files has always been best-effort (declared frontmatter is the documented reliable path), and no AC explicitly promises freedom from false positives - but it is a real, reproducible planner misbehavior worth a fast-follow, not silent acceptance.\n\nNo other findings. Field-name fix (AC-1/AC-2), sequential-group enforcement (AC-3), and the rest of the widened-inference positive cases (AC-4) all check out against direct code reads and live command runs; pm-apply.mts was correctly left untouched; both targeted validators pass with only pre-existing, unrelated WARNs; the full targeted test suite (145 tests, src/tests/wave/) passes."
decision: approved_with_notes
---
# Review Result: SLICE-51 review B (correctness)

- Created: 2026-11-06T03:24:57.392Z
- Reviewer: reviewer
- Decision: approved_with_notes
- Summary: SLICE-51 / FEAT-034 review B (correctness), scope git diff 58dab7bd..db77759f (9 files).

All 5 FEAT deliverable items have real diff behind them, confirmed by direct read.
1. planner.mts now reads pm_composite_priority/pm_strategic_alignment/pm_technical_risk
   via resolveCompositeScore/resolvePmNumeric, matching exactly what pm-apply.mts:409-412
   (buildPmUpdates) writes. Legacy names (composite_score, pm_strategic_fit, pm_risk_level)
   are a numeric fallback gated behind warnLegacyPmFieldOnce, which calls console.error -
   confirmed stderr-only; a live wave plan --json run produced clean JSON on stdout with an
   empty stderr capture.
2. sequential: true on FEAT frontmatter (sibling to proposed_slices, read as
   featureFM.sequential in feature-lifecycle.mts:736) stamps sequential_group: <FEAT id>
   on every materialized sibling slice; planner.mts's resolveSequentialGroup reads the stamp
   first and falls back to deriving the group live from the FEAT's sequential flag.
   packWave tracks pickedSequentialGroups and rejects a second same-group candidate with
   sequential_group:<id> already packed this wave.
3. touches-files.mts's INFERENCE_RE widened to crew/, .github/, .claude-plugin/,
   hooks/, dist/, templates/ prefixes plus a bare-root-file allowlist
   (package.json, CLAUDE.md, AGENTS.md, .gitignore, README.md, CHANGELOG.md)
   guarded by lookbehind/lookahead against partial-token matches.
4. commands/wave.md documents all of the above plus depends_on's done/-only semantics and
   wave run's slash-only restriction, correcting a stale "not yet enforced" note. 244 lines -
   commands carry no content-length cap (only agents/skills do), so this is fine either way.
5. No pm-apply.mts changes - confirmed, it is absent from the diff stat; scope boundary held.

Validators and tests, run live in this checkout:
- bun test src/tests/wave/ -> 145 pass, 0 fail (matches builder's claim).
- bun src/scripts/validate-slice-touches-files.mts -> rc=0, 2 pre-existing WARNs
  (SLICE-49, SLICE-50 "touches_files missing"). Read both slice bodies: neither cites any
  path string matching old OR new inference patterns (no src/, crew/, .github/ etc.
  prefix, no bare root filename) - these WARNs are correctly unrelated to this diff, not a
  regression.
- bun src/scripts/validate-slice-state-consistency.mts -> rc=0, 51 files scanned, 0 errors.
  Neither validator enforces a frontmatter key allowlist, so the new sequential/
  sequential_group keys are tolerated without any schema change needed - confirmed by
  reading both scripts (no z.object/allowlist pattern present).
- bun src/scripts/loop.mts wave plan --repo . --json -> rc=0, produced a plan: SLICE-51
  picked (solo), SLICE-49/SLICE-50 correctly rejected missing_touches_files_solo_only
  (working as designed - missing-confidence candidates pack only alone, and a wave already
  picked SLICE-51), but SLICE-47 was rejected conflict_with_crew/scripts/crew.mts - this
  is a real false-positive regression, detailed in the findings file.

Regression-risk check for adopter repos: the primary/legacy fallback pattern means
adopter repos whose triaged backlogs still carry the old field names keep working exactly as
before (same 0-fallback numeric behavior they already had, now plus a one-time stderr nudge
to re-triage) - no adopter-breaking change, confirmed by the explicit fallback test
"legacy pm_risk_level name still works as a fallback when pm_technical_risk is absent".

One real bug found by direct reproduction, not covered by any new test: see findings file.
Decision: approved_with_notes. The field-name fix, sequential-group enforcement, and
documentation are all correct and well-tested; the one finding below is a real but
non-blocking correctness gap in the newly-widened inference regex that the builder's own
AC-5 evidence (a green `wave plan` run) did not surface because it did not inspect the
`rejected` array contents, only the exit code.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: builder gates rc=0; reviewer B reran bun test src/tests/wave/ (145 pass), both touches-files/state-consistency validators (rc=0), and a live wave plan --json (rc=0, revealed one spurious conflict, see findings)
- Risks: -
- Required Follow-up: -

