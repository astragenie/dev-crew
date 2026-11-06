---
id: SLICE-46
title: Implement FEAT-033
status: pending
feature: FEAT-033
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
---
# SLICE-46: Implement FEAT-033

Implements FEAT-033. See [feature file](../../../backlog/in-progress/FEAT-033.md) for product context.

## Objective

Audit T0b: plugin hooks never load — move hooks.json to the documented discovery path

## In scope

- `git mv .claude-plugin/hooks/hooks.json hooks/hooks.json`; update every hard-coded reference to the old path; add a discovery test and a manual-check writeup.
- `docs/memory.md` load-bearing-contracts entry recording the finding and the fix.

## Out of scope

- Hook logic/content changes (FEAT-031 owns those) — content of hooks.json is unchanged, only its location moved.
- Executing `claude -p --plugin-dir ...` live (AC-2's manual check is documented, not run, by this slice).

## Acceptance criteria

- [x] AC-1: Given the staged plugin copy, When `hooks-discovery.test` runs, Then `hooks/hooks.json` exists, `.claude-plugin/hooks/hooks.json` does not, and `plugin.json` has no `hooks` key. Evidence: `bun test src/tests/install/hooks-discovery.test.mts` → `4 pass, 0 fail` (new file `src/tests/install/hooks-discovery.test.mts`).
- [ ] AC-2: Given a fresh consumer repo and `claude -p --plugin-dir <copy> --max-budget-usd 0.5 "Reply with exactly: OK"`, When the devcrew SessionStart hook runs, Then it leaves its trace, recorded in `docs/audits/2026-11-05/README.md` with the command and observed output. **Not executed** — documented only. `docs/audits/2026-11-05/README.md` § "Hook discovery" → "Manual verification" records the exact command, expected trace, and explicitly flags this as not run by this slice (no live `claude` invocation from an automated dispatch). The validation artifact's own two-plugin marker test (2026-11-05T22:35:00Z) already supplies the underlying discovery evidence that `hooks/hooks.json` loads.
- [x] AC-3: Given the moved file, When `bun src/scripts/validate-repo-boundary.mts` runs, Then it exits `0` with the regenerated inventory, and `validate-manifests`, `validate-agent-refs`, `validate-content-length` are all green. Evidence: `bun src/scripts/validate-repo-boundary.mts --write-inventory` then `bun src/scripts/validate-repo-boundary.mts` → `validate-repo-boundary: OK` rc=0; `bun src/scripts/validate-manifests.mts` rc=0; `bun src/scripts/validate-agent-refs.mts` rc=0; `bun src/scripts/validate-content-length.mts` rc=0.
- [ ] AC-4: Given the two-plugin marker test from the validation artifact, When re-run on the CI runner's CLI version, Then the result is recorded, noting discovery may differ on CLI >= 2.1.295. **Not re-run this slice** — the local host's CLI version (2.1.270, the version the original marker test ran on) is what's available; the CI runner's CLI version was not re-checked. Flagged as an open follow-up in `docs/memory.md`'s new load-bearing-contract entry and in `docs/audits/2026-11-05/README.md`.
- [x] AC-5: Given the moved file and no manifest `hooks` key added at the old location, When both the old and new paths are inspected, Then exactly one hooks file exists so the load path can never double-fire. Evidence: `hooks/hooks.json` exists; `.claude-plugin/hooks/hooks.json` removed (dir no longer exists, confirmed via `ls .claude-plugin/` → only `plugin.json`); `grep -c '"hooks"' .claude-plugin/plugin.json` → no match (no `hooks` key in the manifest).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-033 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
