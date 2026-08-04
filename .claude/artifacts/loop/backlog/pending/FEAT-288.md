---
id: FEAT-288
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
---
## Description

touches_files round-trip is broken: the writer emits inline YAML arrays, the only reader parses block-style lists only, so FEAT-276 AC-4 is non-functional end to end and wave planning silently degrades.

Discovered 2026-08-04 by builder-187 while building an unrelated slice, then verified directly.

Evidence. src/scripts/lib/backlog-store/slice-store.mts:237 (the FEAT-276 AC-4 code, shipped earlier the same day via SLICE-181) sets frontmatter.touches_files = touchesFiles, which the frontmatter serializer emits as an inline array: touches_files: [hooks/report-gate.mjs, .claude-plugin/hooks/hooks.json, src/tests/report-gate.test.mts]. Calling readTouchesFiles (src/scripts/lib/wave/touches-files.mts) against those very files returns {paths: [], confidence: "missing"}. Reproduced against SLICE-187 and SLICE-183; validate-slice-touches-files.mts emits the same WARN for 9 slices — every slice created by today's /runner:start batch, i.e. every slice the new writer has produced since it landed.

Why it matters. touches_files exists to feed wave-mode conflict packing. packWave treats confidence: "missing" as a special case: such candidates cannot be packed alongside others and are deferred to solo dispatch (the code path FEAT-276/SLICE-179 rewrote to stop one missing-confidence candidate from poisoning the whole wave). So every slice created since the writer landed presents to the planner exactly as if it had declared nothing, and parallel wave dispatch degrades toward sequential for all of them. FEAT-276 was closed as done on 2026-08-04 with AC-4 recorded as satisfied; the field is genuinely written, but its only consumer cannot read it, so the feature does not exist at runtime.

Defect class. This is the tested-but-never-wired family (FEAT-281) in its writer/reader-mismatch variant, and a near-exact repeat of FEAT-282's two-producers-one-schema shape. Both halves are individually correct and individually tested. Nothing tests the round trip, so both test suites stay green while the composed behavior is dead. The module comment at slice-store.mts:234-236 even anticipates the missing tier as an acceptable fallback for an absent value, which is exactly why a populated-but-unparseable value reads as normal rather than as a bug.

Acceptance direction. Teach readTouchesFiles to accept inline-array frontmatter as well as block-style lists, since the writer legitimately produces the inline form and both are valid YAML. Add a round-trip test that goes through the real writer (createSlice) and the real reader (readTouchesFiles) in one test and asserts the declared paths survive, rather than testing either side against a hand-authored fixture -- a hand-authored fixture is what let this ship, because whoever wrote the reader's tests wrote block-style fixtures by hand and whoever wrote the writer never read one back. Then re-verify FEAT-276 AC-4 against real slices and correct its close record if warranted. Consider promoting validate-slice-touches-files.mts's WARN to an ERROR once the parser is fixed, since after that a missing value on a slice that declared one is unambiguously a bug rather than a parser limitation.

Related: FEAT-276 (AC-4, whose close should be revisited), FEAT-281 (the defect class), FEAT-282 (the same producer/consumer schema-mismatch shape), SLICE-179 (the packWave missing-confidence handling this degrades into).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.