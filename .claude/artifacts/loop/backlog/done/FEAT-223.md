---
id: FEAT-223
status: done
priority: P1
category: architecture
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [architecture, backend, memory, learning-loop, cross-plugin]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Surfaced by #324 investigation (PR #328). memory-bridge emit() invokes a non-existent astramem `ingest` subcommand -> the astramem mirror silently writes nothing. Needs a DESIGN DECISION before build (upstream-request a generic single-event ingest subcommand vs reshape emit()'s payload through the existing `remember` subcommand). Cross-plugin (astramem owns the CLI surface). needs_contract, NOT autonomous_safe. High priority — this is why half the learning loop's persistence is dead."
---
# FEAT-223: fix emit() — astramem mirror writes nothing (`ingest` subcommand does not exist)

## Origin

#324 investigation (findings: `docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md`,
shipped in PR #328). `memory-bridge.mts::emit()` invokes an `ingest` subcommand
that is not in astramem's real CLI surface
(`ingest-transcript | recall | remember | health | config | doctor | connect`).
`emit()` spawns, gets "unknown subcommand", and swallows it under the fail-silent
contract — so every GEPA/decision/lesson event mirrored via `emit()` **persists
nothing to astramem**. `recallPrior()` is unaffected (its `recall` matches). This
is one of the two dormancy bugs that killed the learning loop (the other,
worktree-isolation of the local JSONL store, is fixed in PR #327).

## Design decision required (before build)

No clean drop-in subcommand exists. Two candidate paths — pick one via a DEC:

- **(a) Upstream request** an `astramem` generic single-event `ingest`
  subcommand. Keeps `emit()`'s GEPA payload shape and all call sites unchanged;
  least churn on this side. Cost: blocks on an astramem release. File under
  `docs/upstream-requests/`.
- **(b) Reshape `emit()`** to persist through the existing `remember` subcommand
  (`--content --type --metadata --agent`). No upstream dependency, but a genuine
  wire-contract redesign: define `--type` per event kind (`slice_close`,
  circuit-breaker, etc.), decide how `score`/`input`/`output` round-trip through
  `--metadata`, and reconcile with `memory-sink.mts`'s already-correct `remember`
  use for decisions/lessons/notes/failures.

## Scope

1. Record the DEC (path a or b) with rationale — mirrors DEC-065/DEC-066 precedent
   of writing memory-transport decisions down before implementing.
2. Implement the chosen path so `emit()` actually persists to astramem, keeping
   the fire-and-forget / fail-silent / ≤2s contract.
3. Replace the round-trip test that currently asserts the WRONG contract
   (`memory-bridge.test.mts` locks in `argv[0] === "ingest"` against a fake CLI) —
   assert against the real subcommand surface, not a self-consistent fake.

## Acceptance criteria

- AC-1: GIVEN a paired astramem provider, WHEN `emit()` runs with a well-formed
  payload, THEN the invocation uses a subcommand that astramem actually accepts
  (verified against the real CLI surface, not a fabricated fixture).
- AC-2: GIVEN astramem is absent/unpaired, WHEN `emit()` runs, THEN it no-ops
  fail-silently within the ≤2s cap and never throws (contract unchanged).
- AC-3: GIVEN the chosen path, WHEN the suite runs, THEN the memory-bridge
  round-trip test asserts the real contract and would FAIL against the old
  `ingest` invocation (regression guard against re-drift).
- AC-4: A DEC-* record captures path a-vs-b with rationale.
- AC-5: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Risks / open questions

- Path (a) blocks on an astramem release cadence; path (b) touches the wire
  contract + fail-silent tests + `docs/sop/memory-bridge.md` payload section.
- The learning loop (FEAT-220/221/222) treats astramem as a mirror/store-of-truth;
  until this lands, only the local JSONL path (PR #327) carries capture.

## Refs

- `src/scripts/lib/memory-bridge.mts` (`emit`, `spawnIngest`).
- `src/scripts/lib/memory-sink.mts` (correct `remember` usage — the (b) template).
- `docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md` (PR #328).
- `docs/upstream-requests/` (path a surface).
