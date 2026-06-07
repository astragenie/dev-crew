---
id: SLICE-80
status: completed
feature: FEAT-077
phase: 1
priority: P3
target_release: v0.28.2
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: [chore, workflow, "stack:node"]
needs_contract: false
needs_ux: false
completed_at: 2026-06-07
linkage:
  - .claude/artifacts/loop/backlog/done/FEAT-077.md
  - docs/upstream-requests/2026-06-07-hero-crew-forward-declared-skill-ids.md
---
# SLICE-80: Triage wire + post-release backfill (v0.28.1 + v0.28.2)

Implements FEAT-077. See [feature file](../../../backlog/done/FEAT-077.md) for product context.

## Objective

Close the asymmetry between architect-wiring (done in v0.28.0) and PM-wiring (not done). Then sweep the five Minor/Important follow-ups flagged during v0.27.0 final review.

## In scope (v0.28.1)

- `skills/triage/SKILL.md` — add resolver call (variant=pm) before `loop:pm` dispatch; prepend block to prompt.
- `CLAUDE.md` — mark which slash flows are wired (architect, PM) vs not (backlog-add, spec-decompose, slice-complete, slice-from-feature).

## In scope (v0.28.2)

- `src/scripts/lib/backlog-pm-write.mts` — `writePmScores` auto-moves pending → triaged via `moveFeature("triaged")` when the source file was under `pending/`. Closes the long-standing skill-contract gap.
- `src/scripts/loop.mts` — `--strict` flag emits stderr warn (no-op honesty).
- `src/scripts/lib/skill-resolver.mts` — `presetRaw` / `overrideRaw` typed `unknown`; explicit cast at `deepMerge` boundary.
- `src/tests/validate-manifests.test.mts` — NEW 5-test file (clean dir, missing dir, single SchemaError, single SyntaxError, multi-accumulation with non-JSON filter).
- `src/tests/backlog-pm-write.test.mts` — flip "preserves pending status" test to "auto-promotes pending → triaged"; update 4 existing tests to use returned `filePath`.
- `src/tests/cli-resolve-skills.test.mts` — new test asserting `--strict` warn message.
- `docs/upstream-requests/2026-06-07-hero-crew-forward-declared-skill-ids.md` — NEW; lists `csharp-pro`, `a11y-advisory`, `vue-engineering` as the top three IDs to author upstream.
- CHANGELOG entry, plugin version bump.

## Out of scope

- Authoring the upstream skills themselves (hero-crew side, separate slice).
- Wiring other role flows (researcher / document-writer dispatchers) — those flows don't currently dispatch role agents inline; deferred.
- Cross-plugin slice-from-feature wiring (dispatches `crew:architect`, lives upstream).

## Acceptance criteria

- PASS: triage skill body shows `node loop.mjs resolve-skills --variant pm` invocation block before the PM dispatch.
- PASS: pm-write auto-move test (`writePmScores auto-promotes pending FEAT to triaged`) green.
- PASS: CLI `--strict` test asserts stderr matches `/--strict.*reserved.*no-op/i`.
- PASS: `validateAllPresets` failure-path file (5 tests) green.
- PASS: 964 tests total at v0.28.2.
- PASS: lint + format + manifest + content-length gates clean; `scripts/` diff clean.
- PASS: loop v0.28.1 + v0.28.2 tagged + pushed.

## Validation

`requires_validation: false` — same rationale as SLICE-78 / SLICE-79. Behavior change (auto-promote) is covered by the unit test that asserts the file no longer exists at the pending path.

## Status note

Retroactive ceremony slice covering two consecutive patch releases. Implementation already on `main` at v0.28.2 (commit `733e27b`).
