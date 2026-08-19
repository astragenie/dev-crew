# Task Handoff: SLICE-12: fail-hard write-validation-result direct import

- Created: 2026-08-19T02:26:03.465Z
- From: fullstack-dev
- To: lead
- Objective: Replace the write-validation-result execFile subprocess call (phase-gate.mts's serial path + parallel-orchestrator.mts) with a direct import of crew's validation-result writer, introducing fail-hard control flow — a behavior ADDITION per p2-seam-contract.md finding 2, not a preservation. Before: recordWithCrew shelled out to a CACHED external crew.ts CLI via execFile, caught any failure into {ok:false,error}, and neither caller ever inspected .ok — a writer failure silently left crewArtifactRegistered:false with zero effect on control flow (verified live: gate resolved status:PASS with a broken writer). After: recordWithCrew calls writeValidationResultArtifact (new module, crew/scripts/lib/artifacts/validation-result-writer.mts) which throws on ANY failure (bad decision, schema refusal, fs error); neither call site catches it, so the throw propagates uncaught and runPhaseGate/runPhaseGateParallel reject entirely — no PASS artifact is ever claimed.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: Fail-hard direct import live in phase-gate.mts + parallel-orchestrator.mts; AC-3 satisfied; AC-1 fully satisfied (zero live execFile-with-crew calls remain in src/scripts).
- Changed Files:
  - crew/scripts/lib/artifacts/validation-result-writer.mts
  - crew/scripts/crew.mts
  - src/scripts/lib/phase-gate.mts
  - src/scripts/lib/phase-gate/parallel-orchestrator.mts
  - src/tests/phase-gate.test.mts
- Confidence: high
- Risks: Two pre-existing/unrelated root-suite failures (learning-cycle.test.mts, eval-generator.test.mts — ENOENT on unrelated decision-log fixtures) persist unchanged before/after this slice, confirmed by isolated run. crewArtifactError is now always null once reached (recordWithCrew can no longer return {ok:false} — a failure throws before that point) — kept the field for output-shape stability rather than removing it, since no consumer outside phase-gate.mts/parallel-orchestrator.mts reads it (grepped). AC-2 (findCrewCli/MIN_CREW_VERSION deletion) and AC-5 (devcrew.json schemaVersion 2) are explicitly out of scope (SLICE-13, forbidden per dispatch) — phase-gate.mts's own findCrewCli/crewCliRuntime USAGE was removed (contract-scoped to SLICE-12) but the symbols themselves in plugin-identity.mts are untouched.
- Suggested Next Handoff: SLICE-13: devcrew.json schemaVersion 2 migrator + plugin-identity.mts/arch-gate.mts/loop-installer.mts findCrewCli/MIN_CREW_VERSION deletions (AC-2/AC-5).

## Test evidence

- New tests added to `src/tests/phase-gate.test.mts` (2 total, both pass):
  - `runPhaseGate fail-hard: a write-validation-result failure aborts the run and claims no artifact` — sabotages `.claude/artifacts/crew` into a plain file (ENOTDIR on writeArtifact's mkdir), redirects the unrelated local phase-gate report to a separate directory so only the crew-artifact write is broken, asserts `runPhaseGate` REJECTS, asserts no `validations/` directory exists.
  - `runPhaseGate direct-import happy path: crew validation-result artifact lands on disk` — asserts a real `.claude/artifacts/crew/validations/*validation-result*.md` file lands with `decision: pass` frontmatter and the phase-scoped title, proving the direct-import path (not just a locally-reported PASS).
- **Round-trip verified** (not just "test passes with the fix" — confirmed it also FAILS without it, per this repo's own verify-producer-claims-by-round-trip lesson): ran the identical new test file against the pre-slice `git stash`ed production code. Result: 4 pass / 1 fail — the fail-hard test failed with `AssertionError: Missing expected rejection` (old code resolved `status: PASS, crewArtifactRegistered: false` instead of rejecting), confirming the test actually discriminates old fail-soft behavior from the new fail-hard behavior. Restored the new code afterward; suite back to 5/5.
- `bun test src/tests/phase-gate.test.mts` → 5 pass / 0 fail.
- `bun run test` (root suite) → 3312 pass / 2 fail / 7 skip (was 3310/2/7 before this slice — the 2 failures are pre-existing and unrelated: `learning-cycle.test.mts` / `eval-generator.test.mts`, both ENOENT on unrelated decision-log fixtures, confirmed unchanged by isolated diff).
- `bun run test:crew` (crew subtree suite) → 1971 pass / 0 fail / 117 skip — exact match to the pre-slice baseline.

## Gate outputs

- `bunx tsc --project tsconfig.json --noEmit` → clean.
- `bunx tsc --project tsconfig.test.json --noEmit` → clean.
- `(cd crew && bunx tsc --noEmit)` → clean.
- `bunx biome lint <4 changed source files>` → clean (0 warnings on files this slice touched or added; the repo's overall `bunx biome lint src/` still reports 61 pre-existing warnings across ~605 files, e.g. `renderReport`/`buildPhaseGateLogTail` complexity, all pre-existing and untouched by this slice — exit 0 either way, this repo treats the complexity rule as warn-severity).
- `bunx biome format <4 changed source files>` → clean after two line-wrap fixes.
- `grep -rn "execFile" src/scripts | grep -i crew` → 0 matches (2 residual hits are SLICE-11 code comments, not live calls) — AC-1 fully satisfied.
