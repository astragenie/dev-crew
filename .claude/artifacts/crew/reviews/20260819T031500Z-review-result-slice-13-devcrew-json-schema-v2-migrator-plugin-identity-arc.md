---
decision: approved
reviewer: crew:reviewer
slice: SLICE-13
---

# Review Result: SLICE-13 — devcrew.json schema v2 + migrator, plugin-identity/arch-gate/loop-installer crew-CLI deletions

- Reviewer: crew:reviewer (independent gate)
- Slice: SLICE-13 (FEAT-003 P2, final slice)
- Contract: `docs/planning/p2-seam-contract.md` §5/§6/§7
- Handoff reviewed: `.claude/artifacts/crew/handoffs/20260819T025505Z-handoff-slice-13-devcrew-json-schema-v2-migrator-plugin-identity-arc.md`
- Decision: **PASS**

## What was checked

### 1. Deletion completeness + safety
- `grep -rw "MIN_CREW_VERSION\|findCrewCli\|crewCliRuntime\|CREW_MARKETPLACE_NAME" src/ crew/scripts/` — zero live references. Every hit is a comment explaining the removal (`loop-installer.mts:91`, `phase-gate.mts:200-201`, `validate-agent-refs.mts:31,72`, three test-file comments).
- `ArchGateConditionInput` — defined and consumed only inside `arch-gate.mts` itself; its one caller (`maybeBuildArchGatePreflight`) no longer builds a `crewAvailable` field. No external caller anywhere passes/expects that field.
- `shouldRunArchGate` / `maybeBuildArchGatePreflight` callers — grepped repo-wide; the only production caller is `src/scripts/lib/slice-linker/start-slice.mts:195`, which calls the async orchestrator with the current (crew-free) signature — no stale `deps.checkCrewAvailable` argument anywhere.
- `installLoop`/`reportStatus` `.crewCli` field — grepped `\.crewCli\b|crewCli:` across `src/`, `commands/`, `crew/scripts/` — zero consumers. The field was cleanly dropped from both the `installLoop` return object and `reportStatus`'s status object, and no renderer/command reads it.
- `crewCliOverride`/`crewVersionOverride` test-seam options — grepped repo-wide, zero remaining references (production code and tests both). The two boundary tests that exercised `MIN_CREW_VERSION` via this seam were deleted along with the seam, consistent with the guard itself being deleted (verified against `loop-installer.mts` diff — the whole hard-dependency block is gone, not narrowed).

### 2. Migrator correctness
Ran `bun src/scripts/loop.mts config migrate-devcrew --repo <fresh temp fixture>` against a synthetic `loop.json` (`schemaVersion:1`, preset/stack/loop fields) + `crew.json` (`features` block):
- Output shape matched contract §5's table exactly: all `loop.json` top-level keys carried over verbatim, `schemaVersion:1` renamed to `presetSchemaVersion:1` (no key collision with the new document-level `schemaVersion:2`), `crew.json`'s `features` block merged in verbatim under `features`, root `schemaVersion:2` added.
- `.bak` byte-identity: `diff loop.json loop.json.bak` and `diff crew.json crew.json.bak` both identical.
- Idempotent second run: `written:false`, `reason:"already-migrated"`, `backups:[]`, and the devcrew.json content was unchanged (verified via the shipped `devcrew-config.test.mts` idempotency test as well, independently).
- This repo's own live state verified the same way: `.claude/devcrew.json` has `schemaVersion:2` + `presetSchemaVersion:1` (no collision), `.claude/loop.json.bak` and `.claude/crew.json.bak` are both present and byte-identical to their current originals, and re-running the migrator against this repo returns `written:false` / `already-migrated`.

### 3. resolveConfig precedence
Read `config-resolver.mts`'s `resolveConfig`: the `options.preset` branch (install-time scaffold path) returns before the devcrew.json read is ever reached — confirming the deliberate carve-out holds. The normal runtime path calls `readDevcrewConfigIfPresent` first and returns it when present (schemaVersion must equal 2, otherwise treated as absent/stale and falls through to legacy `loop.json`). Ran `devcrew-config.test.mts` standalone (10 tests, all green) covering: migrate merge shape, `.bak` byte-identity, idempotent no-op, no-source-config, loop-only-no-features, `readDevcrewConfigIfPresent` null/stale/ok, and the two `resolveConfig` integration tests (devcrew-wins-when-both-present via a deliberately-mutated stale `loop.json` to prove which file is actually read; falls-back-pre-migration).

### 4. Test honesty
- `phase-gate.test.mts`: the `crew-init` helper (`initRepoWithCrewState`) now shells out directly to `crew/scripts/crew.mts` under `bun` at a fixed, repo-relative path instead of `findCrewCli()`-discovering a plugin-cache install. All five `if (!crewAvailable) return` skip-guards were removed — these tests previously silently no-op'd on any host without a cached crew plugin; they now run unconditionally since crew is guaranteed present as a same-repo subtree. Net effect is *more* coverage exercised, not less. Ran the file standalone: 5/5 pass.
- `isolateCrewCli()` fixture deletion (`_fixtures.mts`, 12 call sites across auto-merge/close-refusal/gates/integration/integrations/qa-grade-gate/slice-complete*/synergy): its own docstring says it existed solely to short-circuit `findCrewCli()` via `CREW_MARKETPLACE_NAME` so `completeSlice()`'s crew-bridge calls wouldn't shell out to a real, unmocked CLI during tests. Verified via `git show`/grep that `crew-bridge.mts` no longer contains any `execFile` call at all (SLICE-11 already converted every call site to direct imports; only two comments reference the old subprocess behavior) and that `findCrewCli`/`findHeroCrewCli` have zero live references. The guarded code path is gone, so the guard's deletion is correct, not a silent coverage loss. Confirmed no test file still references `isolateCrewCli`.
- `loop-installer.test.mts`: same `if (!crewAvailable) return` pattern removed from every test in the file (14 occurrences), plus the two `MIN_CREW_VERSION`-boundary regression tests deleted along with the `crewCliOverride`/`crewVersionOverride` seam they exercised, plus the final `assert.ok(status.crewCli)` line dropped from `reportStatus reflects install state` in lockstep with the field's removal. All consistent, no orphaned assertions.

### 5. Suites
- Root: `bun test src/tests/ --parallel --timeout 60000` → **3316 pass / 7 skip / 2 fail** across 327 files, matching the handoff's stated baseline exactly. Isolated the 2 failures: `DEC-070 contract record exists for FEAT-229` (`learning-cycle.test.mts`) and `DEC-068 contract record exists for FEAT-222` (`eval-generator.test.mts`) — both are the pre-existing, unrelated contract-record checks the handoff called out as present before and after this slice.
- Crew suite canonical invocation (`bun test --timeout 60000 tests/` from `crew/`, matching `crew/package.json`'s own `"test"` script): **1971 pass / 117 skip / 0 fail** across 209 files — matches the 1971 baseline exactly, confirming the builder's no-args run (2022 pass) picked up extra tests outside the canonical glob (consistent with a broader default discovery, e.g. the skills tree) rather than indicating any new failure. Nothing new fails under the canonical invocation.
- Three typechecks: `tsc --project tsconfig.json --noEmit` (root), `tsc --project tsconfig.test.json --noEmit` (root), `tsc --noEmit` (crew/) — all exit 0, zero errors.
- Validators: `validate-imports.mts` → OK, `validate-manifests.mts` → OK (runner@0.78.0 / devcrew@0.78.0 in sync), `validate-content-length.mts` → OK (agents cap 300, skills cap 200).

### 6. AC-5
Confirmed live on this repo: `.claude/devcrew.json` exists with `schemaVersion: 2`, and `.claude/loop.json.bak` + `.claude/crew.json.bak` are both present and byte-identical to their current source files.

## Risks noted (not blocking)
- Per the handoff: `crew/scripts/lib/features-service.mts`'s `crew.json` reader (gating hooks) is untouched — out of `touches_files`, correctly deferred to a crew/-side cutover slice, not a gap in this slice.
- `installLoop`'s write path still only ever emits `.claude/loop.json` on fresh installs — devcrew.json is read-side/additive only in P2, adopter migration is P5 per the plan. Consistent with contract §7's stated P2 scope.

## Conclusion
Deletions are complete and safe (zero live references to any of the six retired symbols, zero orphaned callers/fields), the migrator matches contract §5 field-for-field and was independently verified both against a fresh synthetic fixture and against this repo's own live state, `resolveConfig`'s precedence and carve-out are correctly wired and covered, every test diff traced back to a real, justified removal (no assertion coverage silently lost), and both root and crew suites are green against their pre-existing baselines with all three typechecks and three validators clean. **PASS.**
