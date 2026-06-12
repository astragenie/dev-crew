# Slice Throughput 2x — Ceremony Compression Design

**Date:** 2026-06-11
**Status:** approved (brainstorming session)
**Goal:** cut median per-slice wall-clock by ≥50% (target 2x, math suggests headroom for 2.5x) without dropping average grade below 0.83.

## Pain signal

User reports slices running at extremely slow pace and agents hanging mid-execution cycle.

- Recent grades show median slice ≈ 20 min wall-clock (SLICE-90), median $16 per slice. SLICE-89 inline-only path closed in $10.34 and ~8 min.
- Specialist-pause SOP (`docs/sop/specialist-pause-handling.md`) records 6/6 slices pausing without writing artifacts in one session.
- Reviewer artifact timestamps suggest the documented "parallel ladder" sometimes runs serially in practice (SLICE-90: 4 min gap between reviewer-A and reviewer-B finished_at).

User-locked tactical choice during brainstorming:
- Compress ladder by **parallelizing always** (not stake-based skipping).
- Stay within the loop repo. File upstream-request for `hero-crew` but don't block on it.
- Target 2x wall-clock per slice. Quality floor: average grade ≥ 0.83.

Ceremony surfaces (`/loop:slice start`, `/loop:slice complete`, `/loop:slice grade`) confirmed in scope for edit.

## Levers (all config-gated, default ON)

Five independent levers, each with its own config flag in `.claude/loop.json`. Each ships as its own slice. Each is revertible by flipping the flag.

| Lever | Flag | Expected wall-clock saving |
|---|---|---|
| 1. Strict parallel-dispatch contract on reviewer ladder | `reviewers.strictParallel` | ~2 min/slice |
| 2. Serial-reviewer timing detector → grade warning | `reviewers.serialTimingThresholdMs` | 0 min (telemetry) |
| 3. Expanded inline criteria via `classify-slice-shape` | `dispatchLimits.expandedInlineCriteria` | ~3 min/slice (averaged across slice mix) |
| 4. Phase-gate parallelization (lint ∥ tsc ∥ test) | `phaseGate.parallel` | ~2-3 min/slice (phase-gate runs 2-3× per slice) |
| 5. Post-builder fanout: reviewers ∥ validator | `slice.postBuilderFanout` | ~5 min/slice |

Sum ≈ -12 min off a 20-min baseline → 8 min/slice → 2.5x. Conservative target 2x leaves variance buffer.

## Lever 1 — Strict parallel-dispatch contract

**Files:** `commands/slice-review-ladder.md`, `src/scripts/lib/review-ladder.mts`.

The `slice review-ladder` CLI today returns an `instructions` field with prose telling the orchestrator to dispatch in parallel. Orchestrators sometimes defect to serial. The fix prepends a machine-strict contract block:

```
PARALLEL_DISPATCH_CONTRACT v1
required: emit exactly ONE message containing N=<count> Agent tool calls
forbidden: send any message between dispatches
forbidden: wait for one reviewer return before next dispatch
violation: serial-reviewer-warning badge logged to grade
```

This block is also reused by Lever 5 (DRY).

**Tests:** assert `instructions` field starts with the contract block and contains the required + forbidden + violation lines.

## Lever 2 — Serial-reviewer detector

**Files:** `src/scripts/lib/reviewer-timing.mts` (new), `src/scripts/lib/slice-complete.mts` (wire).

On `slice complete`, parse the artifact-creation timestamp prefix (`YYYYMMDDTHHMMSSZ`) from every review artifact for the slice. Compute:

```
span_ms = max(creationTs) - min(creationTs)
```

Creation timestamps are the only reliable signal — the SOP notes reviewers sometimes pause without writing artifacts at all, so we cannot rely on per-reviewer start/finish fields inside the artifact body.

If `span_ms > reviewers.serialTimingThresholdMs` (default 90000) AND ladder length ≥ 2 → append badge `serial-reviewer-warning` to slice frontmatter and add observation to grade: "Reviewer ladder ran serially (span Xms). Parallel contract violated."

Edge cases:
- Single-reviewer ladder → detector no-ops.
- Missing `startedAt` (lead-attested skip) → detector no-ops.

**Tests:** synthetic artifact sets for parallel, serial, mixed, and threshold-edge cases.

## Lever 3 — Inline criteria expansion

**Files:** `src/scripts/lib/classify-slice-shape.mts` (new), `commands/classify-slice-shape.md` (new), `docs/sop/inline-criteria.md` (new), `loop.json` schema.

New CLI:

```bash
bun src/scripts/loop.mts classify-slice-shape --repo "$PWD" --files "a.mts,b.md"
```

Returns `{ shape, rationale }` where shape ∈ `doc-update | config-tweak | single-module-edit | test-only | none`.

Shape rules:

| Shape | Rule |
|---|---|
| `doc-update` | All changed files match `*.md` or live under `docs/**`. |
| `config-tweak` | All changed files are `.claude/loop.json`, `.eslintrc*`, `prettier.config.*`, or `tsconfig*.json`. |
| `single-module-edit` | 1 source file, gross LOC delta (added + removed) ≤ 50, no exported symbols added or removed, file not on the public-surface guard list. |
| `test-only` | All changed files match `src/tests/**`. |
| `none` | Anything else. |

Public-surface guard list (hard-coded in classifier): files exporting from `src/scripts/lib/auto-dispatch.mts`, `lib/halt-badges.mts`, `lib/auto-walker.mts`, plus any module listed under SPEC-003 cross-plugin contract. Audited quarterly.

`loop.json.dispatchLimits.preferInlineFor` expanded to include the new shapes. Slice-start or post-builder hook calls the classifier with the changed-files list. If the shape is in the inline-preferred set, a hint is emitted into the ceremony output. The hint is advisory — the orchestrator can override with rationale logged to grade.

**Tests:** one case per shape plus three negative cases (public-surface change, large LOC delta, mixed file types).

## Lever 4 — Phase-gate parallelization

**Files:** `src/scripts/lib/phase-gate-runner.mts` (new), `src/scripts/loop.mts` (wire `phase-gate` subcommand), `commands/phase-gate.md` (update), `loop.json` schema.

Today's `phase-gate` runs configured `stack.test` arrays sequentially. New runner groups commands into three concurrent groups:

| Group | Default commands |
|---|---|
| `lint` | `bun run lint`, `bun run format:check`, `validate-manifests`, `validate-content-length`, `validate-decline-citations` |
| `typecheck` | `bunx tsc --project tsconfig.json --noEmit`, `bunx tsc --project tsconfig.test.json --noEmit` |
| `test` | `bun test src/tests/ --parallel --timeout 60000` |

Each group runs sequentially within itself. Groups run via `Promise.all`. stdout/stderr streamed line-buffered with per-group tag (`[lint] line`). Combined log written to `.claude/artifacts/crew/validations/phase-gate-<slice-id>-<timestamp>.log`.

Exit code = first non-zero across groups. Failure summary lists which group failed; full per-group log preserved for triage.

Config schema:

```json
"phaseGate": {
  "parallel": true,
  "groups": { "lint": [...], "typecheck": [...], "test": [...] }
}
```

Missing `groups` falls back to current sequential `stack.test` behavior (back-compat).

Flags:
- `--serial` forces sequential (debug path).
- `--only lint|typecheck|test` runs a single group.

Time math: today lint ≈ 30s, tsc ≈ 25s, test ≈ 90s, total 145s serial. Parallel: max(30, 25, 90) = 90s. Save ≈ 55s per run × 2-3 runs per slice ≈ 2-3 min.

**Tests:** `phase-gate-runner.test.mts` with mock long-running commands, interleaved-output ordering, fail-fast aggregation, `--serial` fallback, `--only` single-group selection.

## Lever 5 — Post-builder fanout (reviewers ∥ validator)

**Files:** `commands/slice-post-builder-fanout.md` (new), `src/scripts/lib/post-builder-fanout.mts` (new), `src/scripts/lib/slice-complete.mts` (wire).

Today after builder PASS, ceremony runs reviewer-A → reviewer-B → validator serially. New CLI emits a single fanout payload with N+1 parallel tasks:

```bash
bun src/scripts/loop.mts slice post-builder-fanout --repo "$PWD" --id SLICE-91
```

Returns:

```json
{
  "sliceId": "SLICE-91",
  "tasks": [
    { "role": "reviewer-A", "subagent_type": "crew:inspector", "prompt": "..." },
    { "role": "reviewer-B", "subagent_type": "crew:inspector", "prompt": "..." },
    { "role": "validator",  "subagent_type": "crew:verifier", "prompt": "..." }
  ],
  "instructions": "PARALLEL_DISPATCH_CONTRACT v1 ...",
  "aggregation": { "halt_on_any_FAIL": true, "wait_for_all": true }
}
```

Inputs:
- Reviewers: builder handoff path + slice file path + scope-fence + per-role focus copy.
- Validator: builder handoff path + slice file path + `phase-gate --slice <id>` command to run independently. Validator does NOT consume reviewer verdicts.

Aggregation (documented in slice-complete prompt):
- Wait for all three to land artifacts.
- Any reviewer FAIL halts slice. Validator result preserved (informational).
- Validator FAIL halts slice. Reviewer results preserved.
- All PASS → ceremony continues to grade.

Wasted-dispatch cost: validator runs even when reviewer-FAIL becomes inevitable. ~$1-2 per FAIL slice. Historical FAIL rate ≈ 10% → expected waste ≈ $0.20/slice. Net win: ≈ 5 min saved on the PASS path dominates.

Independence contract: validator prompt MUST NOT reference reviewer artifact paths. Asserted by test.

**Tests:** `post-builder-fanout.test.mts`:
- Three tasks emitted with the correct subagent_type per role.
- Validator prompt independent of reviewers (no reviewer path references).
- All three reference the same builder handoff path.
- `instructions` contains the canonical parallel contract block from Lever 1.
- `aggregation` matches the documented rules.

## Telemetry

Grade frontmatter additions (`src/scripts/lib/grade-write.mts` schema):

```yaml
timing:
  wall_clock_seconds: <int>
  phase_gate_parallel: <bool>
  post_builder_fanout: <bool>
  reviewer_span_ms: <int>
  serial_reviewer_warning: <bool>
shape:
  classified: <string>
  inline_path_used: <bool>
```

Snapshot dashboard (`docs/loop-snapshot.md` auto-section) surfaces median + p90 wall_clock over last 10 slices, % fanout usage, % serial-reviewer-warnings, inline-path adoption %.

New CLI `bun src/scripts/loop.mts perf-report --window 10` aggregates speedup vs baseline. Baseline pinned at merge time in `loop.json.perfBaseline.medianWallClockSeconds` and `perfBaseline.avgGrade`. Baseline is stored once and never auto-updated.

## Acceptance criteria

**Wall-clock measure** for AC-1: `wall_clock_seconds` is the elapsed time from `/loop:slice start` event in the telemetry log to the corresponding `slice grade-write` event for the same slice id. Includes all dispatches and waits. Excludes time the loop spent on adjacent slices.

| AC | Target | Measure |
|---|---|---|
| AC-1 | Median wall_clock ≥ 50% reduction vs baseline | `perf-report --window 5` (5 slices post-merge) |
| AC-2 | Avg grade across same window ≥ 0.83 | snapshot `grades.avgRecent` |
| AC-3 | No new FAILs attributed to parallel-collision | manual audit of grade Surprises sections |
| AC-4 | All five config flags togglable without code change | flip-and-rerun smoke test per flag |
| AC-5 | Inline-path adoption ≥ 30% on classifiable slices | `perf-report` inline % |

## Rollout sequence

Each lever ships as its own slice. Order minimizes risk and lets telemetry validate the next lever:

| # | Slice | Lever | Files touched | Risk |
|---|---|---|---|---|
| 1 | SLICE-91 | Telemetry seed | `grade-write.mts`, snapshot generator, `perf-report` CLI | Low (read-only on ceremony, establishes baseline) |
| 2 | SLICE-92 | Lever 4: phase-gate parallel | `phase-gate-runner.mts`, `loop.mts` wire, command md, `loop.json` schema | Low (self-contained, single CLI run verifies) |
| 3 | SLICE-93 | Lever 1+2: parallel contract + serial detector | `review-ladder.mts`, `reviewer-timing.mts`, `slice-complete.mts` | Low (prose + detector) |
| 4 | SLICE-94 | Lever 3: classify-slice-shape + inline criteria | `classify-slice-shape.mts`, new CLI, `loop.json` schema | Medium (public-surface guard list is the trap; audit pre-merge) |
| 5 | SLICE-95 | Lever 5: post-builder fanout | `post-builder-fanout.mts`, new CLI, command md, `slice-complete.mts` wire | Medium (biggest behavior delta; ship last so telemetry from 1-4 confirms quality floor holding) |

Between slices: run 2 regular FEATs from the triaged backlog to seed timing data and confirm no regression before the next lever lands.

Halt condition: if avg grade drops below 0.80 in any 3-slice window after a lever lands, flip that lever's flag off, log a retro, investigate before the next lever.

Total ship estimate: 5 slices at the current ~10 min/slice pace ≈ 50 min wall-clock to roll out the full design. After SLICE-95, subsequent slices run at the new 2x pace.

## Out of scope

Deferred per user choice during brainstorming. Each may become its own FEAT later if telemetry shows need.

- Architect preflight cache (hash on FEAT-id + scope-fence + affected paths; reuse within 24h window).
- Broader validator skip criteria (auto-skip when `requires_validation: false` + test delta ≥ AC target + no production code touched).
- Hero-crew upstream-request for `crew:lead` to enforce parallel dispatch at the agent level. File as documentation; do not block on it.
- Aggressive Approach C levers (speculative reviewer-A on builder partials, collapsed grading) — violate the "no quality loss" constraint.

## References

- Specialist-pause SOP: `docs/sop/specialist-pause-handling.md`
- Current review ladder: `commands/slice-review-ladder.md`
- Current loop config: `.claude/loop.json`
- Recent timing baselines: GRADE-SLICE-86, GRADE-SLICE-89, GRADE-SLICE-90 under `.claude/artifacts/loop/grades/`
- Prior performance design (Bun migration): `docs/superpowers/specs/2026-06-10-bun-migration-performance-design.md`
