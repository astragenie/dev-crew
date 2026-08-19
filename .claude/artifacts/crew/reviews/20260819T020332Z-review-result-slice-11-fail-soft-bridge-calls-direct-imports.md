---
kind: review-result
slice: SLICE-11
feature: FEAT-003
decision: PASS
reviewer: independent-review-agent
created_at: 2026-08-19
---

# Review — SLICE-11: fail-soft bridge calls -> direct imports

## Decision: PASS

## Scope reviewed

Uncommitted working tree in `C:/mega/dev-crew` against `docs/planning/p2-seam-contract.md`
(P2 seam-elimination contract, incl. the two builder correction notes). Files:
`src/scripts/lib/slice-linker/crew-bridge.mts`, `tsconfig.json`, `tsconfig.test.json`,
`crew/scripts/crew.mts`, `crew/scripts/lib/cost-hygiene/cost-slice-handler.mts`,
`crew/scripts/lib/cost-hygiene/cost-advise-writer.mts` (new),
`src/tests/cost-project-slugify.test.mts`, `src/tests/cost-scan-window-regression.test.mts`.

## Findings

### 1. Semantic parity per call — PASS

Diffed old (`git show HEAD:.../crew-bridge.mts`) vs new for all four fail-soft calls:

- **write-run-brief**: CLI flags → `ArtifactFields` object mapping is 1:1 (title/owner/next
  always set; goal/mode/pace/scope/outOfScope/feature/phase conditionally spread exactly as
  the old `pushOptionalFlags` pairs did). `ArtifactFields` (types.mts) declares every one of
  these keys with matching types — confirmed by a clean `tsc --noEmit` too. Fail-soft
  try/catch + `console.error("[crew-bridge] write-run-brief failed (slice=...): ...")`
  structured log present (AC-4).
- **cost-slice**: `buildCostSliceFlags` reproduces the old argv construction (`runTitle`,
  `startedAt`/`completedAt` if present, `sourceProject` xor `aggregateAll` by mode,
  `feature`/`phase` if present). The FEAT-204 "cursor advances only on success" gate is
  preserved verbatim (`if (sliceId && !report?.error)`), now checking the direct-call
  catch-derived `{error}` shape instead of an execFile-catch shape — same semantics, source
  changed only in the value coming from a promise vs. subprocess. **Alias handling
  intentionally dropped**: the old `appendSourceProjectArgs` pushed alias flags before the
  primary (argv last-flag-wins); the new `buildCostSliceFlags` sets only `flags.sourceProject`
  to the primary. This is correct per contract §1's argv table ("aliases can be deleted once
  nothing builds an argv array") and is explicitly locked by the rewritten
  `cost-project-slugify.test.mts` AC-2/AC-4-combined test, which asserts aliases have no
  effect on `result.cost.sourceProject`. `appendSourceProjectArgs` itself is kept exported
  and still has its own unit test in `crew-bridge.test.mts` (unused internally, as the
  handoff claims).
- **cost-advise**: `runCostAdviseCall` chains `buildCostAdvisor` → `renderCostAdvisorMarkdown`
  → `writeCostAdviseArtifact`, and reshapes the result into the same
  `target/recommendations/aggregateFlags/baseline/reportsAnalyzed/artifactPath` object the old
  CLI's JSON stdout produced. Fail-soft + structured log present.
- **mark-badge**: `markWorkflowBadge({ badge: "validation_skipped", note })` direct call;
  `note` fallback string identical to the old `--note` default. Fail-soft + structured log
  present.

No consumer of these four exports branches on internal result shape — `start-slice.mts:680`
and `complete-slice.mts:465-546` both wrap every call in `bestEffort()` and store the opaque
return value into an artifact-summary object, exactly as the contract's §3 risk assessment
claims. Verified by reading both call sites directly.

### 2. Extraction fidelity (`writeCostAdviseArtifact`) — PASS

`crew/scripts/lib/cost-hygiene/cost-advise-writer.mts` is byte-equivalent logic to the deleted
inline helper in `crew.mts` (`buildCostAdviseSlug`, `buildOptionalFrontmatter`, the writer body)
— only difference is top-level `fs`/`path` imports replacing the old per-call dynamic
`await import(...)`, which is not a behavior change. `crew.mts` now imports and calls the same
function from both its own `cost-advise` CLI handler (line ~1284) and the auto-emit helper
(line ~517) — confirmed via grep, no remaining local re-implementation. Crew suite green
(1971/0) is real coverage of this path since `cli-synthesis-cost.test.mts` exercises
`cost-advise` through `runCrew()` (crew's own CLI entry point, a different, unrelated `runCrew`
than the one deleted from crew-bridge.mts — see finding 7).

### 3. Rewritten test coverage — PASS, verified by live guard-flip

Both rewritten test files assert against the real direct-import return value
(`result.cost.sourceProject`, `result.cost.window.{start,end}`) rather than a fake subprocess's
argv — this is a strictly more end-to-end check than what they replaced, not a narrowing.

Did not just read the tests — flipped the guard live per the round-trip-verification
discipline (a test passing with AND without a fix proves nothing). In
`cost-scan-cursor.mts:104`, changed `if (cursor?.lastWindowEnd)` to `if (false && cursor?.lastWindowEnd)`
(simulating the pre-fix always-use-currentRun.startedAt bug), ran
`bun test src/tests/cost-scan-window-regression.test.mts`: the AC-1 integration test went red
exactly as expected (`second scan's Window Start must advance...` — actual value was the stale
`currentRun.startedAt`, not the first call's window end; 4 pass / 1 fail). Reverted the file
(`cp` from a pre-edit backup), reran: 5 pass / 0 fail, `git diff` on the file empty. Confirms
the test is a genuine regression guard, not vacuous.

`cost-project-slugify.test.mts`'s three tests (unslugified name, already-slugified idempotence,
aliases-present) all read `result.cost?.sourceProject` off the real `tryWriteCostReport` →
`costSliceHandler` → `computeSessionCost` chain — this is real coverage of `slugifyProjectSlug`,
not a rename-only rewrite.

### 4. Result-narrowing fix (`!r.ok` → `r.ok === false`) — PASS

Exactly 5 occurrences changed, all correct in direction (each still throws/branches on
*failure*, none inverted):
- `crew-bridge.mts` writeCrewRunBrief: `if (r.ok === false) throw r.error;`
- `crew-bridge.mts` markValidationSkippedBadge: `if (result.ok === false) throw result.error;`
- `cost-slice-handler.mts` ×2: `if (writeResult.ok === false) throw writeResult.error;` and
  `if (r.ok === false) throw r.error;`
- `cost-slice-handler.mts` WorkflowRun cast: `(run as unknown as Record<string, unknown> | null)`
  (cast-through-`unknown` fix for the TS2352 finding, correctly applied once).

Verified against the real `Result<T, Error>` signatures (`writeArtifact` in
`artifacts/write.mts:949`, `markWorkflowBadge` in `workflow-state.mts:373-376` both return
`Result<T, Error>` — `{ok:true, value}` / `{ok:false, error}`), so the unwrap shape matches.
Note: the contract text itself says "the four occurrences this exposed (crew-bridge.mts × 2,
cost-slice-handler.mts × 3)" — that's arithmetically 5, not 4; a pre-existing wording slip in
the contract, not a builder defect (the actual count and every occurrence are correct).

### 5. tsconfig `rootDir` removal — PASS

Both `tsconfig.json` and `tsconfig.test.json` diffs are single-line `"rootDir": "src"` removals,
nothing else touched. `bunx tsc --project tsconfig.json --noEmit` and
`--project tsconfig.test.json --noEmit` both ran clean, 0 errors, 0 output. `noEmit: true` is
set on both configs (unchanged), so this has no build-output effect anywhere in the repo (no
build step exists per AGENTS.md).

### 6. Gates reproduced — PASS

- Root suite: `bun test src/tests/ --timeout 60000` → 3310 pass / 7 skip / **2 fail**, matching
  the stated known baseline exactly. The 2 failures are `DEC-068 contract record exists for
  FEAT-222` and `DEC-070 contract record exists for FEAT-229` — decision-registry checks
  unrelated to crew-bridge/cost-hygiene/tsconfig, pre-existing.
- Crew suite: `cd crew && bun test tests/ --timeout 60000` → 1971 pass / 117 skip / **0 fail**,
  matching stated baseline exactly.
- Biome: `bunx biome check` on all 6 touched non-test/non-config source files → clean, no
  fixes needed.

### 7. Deletion safety — PASS

Grepped `runCrew|findHeroCrewCli|HERO_CREW_PATH|pushOptionalFlags|findCrewCli|crewCliRuntime`
across `src/`, `crew/`, `commands/`:
- `runCrew` (the crew-bridge.mts-local execFile helper) — zero remaining references. The many
  `runCrew(...)` calls found in `crew/tests/*.test.mts` and `crew/scripts/crew.mts:1691,1717`
  are a **different, pre-existing, unrelated symbol** — crew's own CLI argv-processing entry
  point (`export async function runCrew(argv: string[])`) — correctly out of this slice's
  scope, not a leftover reference to the deleted helper.
- `findHeroCrewCli`, `HERO_CREW_PATH` — zero remaining code references; only doc/comment
  mentions survive (`crew/scripts/e2e-smoke.mts:734-736` stale comment,
  `cost-project-slugify.test.mts`/`cost-scan-window-regression.test.mts` header comments
  explaining the migration). Comment-only, acceptable, noted here per the review brief.
- `pushOptionalFlags` — zero remaining references anywhere.
- `findCrewCli`, `crewCliRuntime` (plugin-identity.mts) — still referenced by
  `arch-gate.mts`, `loop-installer.mts`, `phase-gate.mts`, and their tests. **Correctly
  untouched** — contract §7 explicitly scopes their deletion to SLICE-13/SLICE-12, and states
  "SLICE-11 never touches phase-gate* or plugin-identity.mts." Confirmed true: `git diff --stat`
  shows no changes to any of those files.

## Other observations (non-blocking)

- Contract's own §0 finding text has a 4-vs-5 count slip (noted in finding 4) — worth a
  one-line fix in `docs/planning/p2-seam-contract.md` for the next reader, but not this
  slice's code and not review-blocking.
- Housekeeping-only diffs (`workflow-state.json`, `slice-progress.md`, FEAT-003 backlog file
  move triaged→in-progress) are ceremony state, not reviewed as behavior — consistent with a
  slice-start/slice-in-progress transition.

## Verdict

All four fail-soft bridge calls, the cost-advise extraction, the two rewritten tests, the
5 result-narrowing fixes, and the tsconfig rootDir removal are behavior-faithful,
correctly typed, gate-green, and free of dangling references to deleted symbols. No
correctness, regression, or coverage-narrowing issues found. **PASS.**
