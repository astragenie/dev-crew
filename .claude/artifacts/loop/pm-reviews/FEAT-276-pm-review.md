---
id: PM-REVIEW-FEAT-276
feature: FEAT-276
reviewed_at: 2026-08-03
pm_customer_impact: 0.7
pm_effort_estimate: 0.62
pm_strategic_alignment: 0.75
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-276

## Demand Assessment

- **Evidence:** SUPERSEDES the prior scoring of this FEAT after operator correction (2026-08-03) sharpened the root cause. Re-verified directly: src/scripts/lib/wave/touches-files.mts::readTouchesFiles already implements the three-tier declared -> inferred (body regex over src|docs|scripts|commands|agents|skills paths) -> missing fallback the FEAT's own '(4) conservative inferred fallback' proposal asked for — that proposal is dropped as already-shipped. The real defect is in src/scripts/lib/wave/planner.mts::packWave lines 43-48: `if (cand.touches.confidence === "missing") { if (picked.length === 0) { picked.push(cand); break; } ... }` — when the FIRST-ranked candidate has missing confidence, the loop pushes it solo and `break`s immediately, discarding every remaining candidate regardless of whether they have clean, non-conflicting declared paths. A missing-confidence candidate ranked anywhere AFTER the first is correctly rejected-and-continued (verified: src/tests/wave/planner.test.mts:69-75, 'missing touches_files rejected when picked is non-empty'). This is a top-of-ranking poison-pill ordering bug, not a general degradation of packing quality. Confirmed the existing test at planner.test.mts:61-67 ('missing touches_files dispatched solo when picked is empty') currently PINS the buggy collapse-and-break behavior as the expected/passing assertion (p.size===1) — fixing this FEAT means rewriting that assertion, not just adding a new one. Also empirically verified (operator's live run) that `loop.mts wave plan --size 4 --json` currently returns `size: 0, items: []` against this repo's present state (14 files sit in slices/pending/ at time of this re-score, but the planner's own loadCandidates additionally requires each slice's parent FEAT to be present in backlog/triaged|in-progress, which may not hold for all 14) — so end-to-end verification cannot rely on a live wave-plan run against this repo today; fixture construction (as planner.test.mts already does) is the only reliable verification path.

## Scope Challenge

- **Scope notes:** Scope is narrower and more surgical than originally filed, per the operator's correction — dropping this reduces effort_estimate from 0.78/13pts to 0.62/8pts (0.56-0.7 -> 8 per the FEAT-259 precedent banding). Real remaining work: (a) fix the solo-collapse ordering bug in packWave (skip past a missing-confidence candidate and keep evaluating the rest, rather than collapse-and-break — or equivalently sort missing-confidence candidates to the back of the ranking before packing) plus rewrite the now-wrong pinned test; (b) improve `declared` frontmatter coverage at slice-creation time across the remaining writers (architect-feature/PM/start-slice) — still real work, since `inferred` is a lower-confidence regex heuristic and not a substitute for accurate declared paths when conflict-safety matters; (c) surface packing width + rejection reasons in wave telemetry so a solo-only wave (whether from a real conflict or the ordering bug) is visible rather than silent. No cost-report analog exists for 'fix a single-function ordering bug + writer-coverage follow-up' at this specific blast radius; scored from the dimension table per Framework 5's 'no cost analog' fallback. Weak-dimension check unchanged: no grade dimension is below 0.80 in the last-5 averages.

## Scores

- customer_impact: 0.70
- effort_estimate: 0.62
- strategic_alignment: 0.75
- technical_risk: 0.60
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: P1 (unchanged tier, revised composition): customer_impact (0.7) and strategic_alignment (0.75) are unchanged — wave mode's core value proposition is still silently defeated and this is still a flagship-differentiator surface. effort_estimate drops from 0.78/13pts to 0.62/8pts and technical_risk from 0.65 to 0.6 now that the root cause is a precisely-diagnosed, small-blast-radius ordering bug in one function rather than an assumed epic-wide writer overhaul — the remaining decomposition below is leaner (4 slices, 8 points) than originally filed.

## Risks

- Two weeks later this could fail review/validation because the ordering fix (skip-past-missing instead of collapse-and-break) changes which candidate is considered 'first packed' — if any downstream consumer of WavePlan implicitly assumed items[0] is always the single highest-ranked candidate (an assumption only true under the old solo-collapse behavior), that assumption breaks silently. Must grep every WavePlan/WavePlanItem consumer before merging, not just the packer itself.
- Rollback: this is now a clean, low-blast-radius `git revert` — the ordering fix lives in one function (packWave) plus its one test file, no schema/frontmatter migration involved (unlike the originally-filed broader scope). This genuinely lowers rollback risk versus the prior scoring; technical_risk stays at 0.6 rather than dropping further only because the writer-coverage follow-up (b above) still has cross-module reach into architect-feature/PM output.
- Existing test gap (self-correcting, but exploitable): planner.test.mts:61-67 currently asserts the BUGGY behavior directly, so a real fix will show red CI immediately — good — but a builder under time pressure could weaken or delete that assertion instead of replacing it with a correct one proving the fix. Reviewer must confirm the replacement assertion actually exercises the fixed ordering (missing-candidate-ranked-first no longer starves later clean candidates), not just that some test still passes.
