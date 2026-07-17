---
id: FEAT-263
status: pending
priority: null
category: methodology
target_release: null
created: 2026-07-17
updated: 2026-07-17
depends_on: []
slices: []
derived_from: null
autonomous_safe: null
pm_reviewed: null
triage_notes: "Filed 2026-07-17 from kb productivity audit (kb/12-research/productivity-2026-07/README.md, R4/F4). Not yet PM-scored."
github_issue: null
github_url: null
---
# FEAT-263: pre-build QA gate — independent test authority before builder dispatch

## Problem

QA currently runs post-build only. Evidence from the 2026-07 productivity audit
(kb `12-research/productivity-2026-07/README.md`, finding F4):

- No `qa_gate` key exists in any of the 23 `.claude/loop.json` files across the
  ecosystem; the only gate-related key anywhere is `phaseGateArtifactDir` (an
  output path, present in 4 repos).
- `runner:pm` writes Given-When-Then ACs only for P0/P1 FEATs (or `--deep`/`--spec`);
  most FEATs reach the builder with no testable ACs.
- `crew:qa-expert` is dispatched at `/crew:ship` — after the code exists. Test
  authority is never independent of implementation.

External anchor: independent test-writing agents with no knowledge of the
implementation raised test-generation accuracy from 61% to 87.8%; multi-agent
test-first hit 96.3% pass@1 vs 67% single-agent
(https://medium.com/@shivam.agarwal.in/claude-code-pair-programming-sub-agents-that-tdd-with-minimal-supervision-904e586ed009).
Sub-agent context isolation makes this free — the test author must be a separate
dispatch that reads only the AC/spec, never the diff.

## Proposed scope

a) **runner:pm** emits Given-When-Then ACs for **every** triaged FEAT (drop the
   P0/P1-only condition).
b) **Slice ceremony** (`runner:start` / orchestration path) inserts, between
   slice creation and builder dispatch: context-isolated `crew:qa-expert`
   dispatch that reads FEAT ACs only and writes
   `.claude/artifacts/crew/validations/<slice>-test-plan.md`; then
   `crew:test-automator` implements failing tests from the plan (red); builder
   is dispatched with "make these tests pass" (green). Builder never edits the
   test plan; the `/crew:ship` qa-expert pass validates against the SAME plan
   (no goalpost-moving).
c) **Config:** new `loop.qa_gate` key in `loop.json` schema
   (`"pre-build" | "post-build" | "off"`, default preserves current behavior)
   so wave/auto modes enforce (b) per repo.
d) **Grade gate:** testability dimension < 0.80 fails the slice (currently
   recorded but never gating) — behind the same config key.

## Acceptance criteria (suggested, PM to refine)

- Given a FEAT with no ACs, when `runner:triage` scores it, then the FEAT file
  contains Given-When-Then ACs regardless of priority.
- Given `qa_gate: "pre-build"`, when a slice starts, then a test-plan artifact
  exists before any builder dispatch is recorded in events.jsonl.
- Given the test-plan artifact, when the builder completes, then `/crew:ship`
  validation references the same artifact path (no new plan generated).
- Given `qa_gate` absent from loop.json, when a slice runs, then behavior is
  unchanged (backward compatible for all 23 adopter repos).
- Given a slice grade with testability < 0.80 and `qa_gate: "pre-build"`, when
  `runner:close` runs, then the close is blocked with a FIX badge instead of
  completing.

## Notes

- Rollout: land schema + ceremony in runner-plugin first; adopters opt in
  per-repo by adding the key. Suggest piloting on `memory` (highest loop
  activity: 4,502 events) before defaulting.
- Related: kb audit R5 (authentic has zero E2E) is a separate per-repo ticket,
  not part of this FEAT.
