# FEAT-235 contract — retire memory-bridge/memory-recall CLI-spawn transport

Author: runner:architect (read-only design pass). Status: draft — hands off
to spec-writer / builder. No source edited by this pass.

## Problem

Two CLI-spawn modules survive from the pre-astramem-client era:
memory-bridge.mts (capture: resolveCli() + spawn fallback inside emit())
and memory-recall.mts (recallPrior(), already orphaned by FEAT-231).
FEAT-235 must finish converging every capture/recall call onto
@astragenie/astramem-client, delete both modules, and leave --type
vocabulary and memory-doctor reporting on a single documented contract.
This pass discovered the FEAT body's consumer list is incomplete:
memory-sink.mts also spawns via resolveCli (a second, undocumented
consumer of the exact fallback pattern this FEAT retires), and
recall-injector.mts is dead code whose only remaining tie to
memory-recall.mts is a type-only import. Both must be accounted for in
the slice plan below or AC-1's grep gate cannot go green.

## Current shape (file:line evidence)

- src/scripts/lib/memory-bridge.mts:127-172 -- resolveCli(): env-pinned
  CLAUDE_PLUGIN_ROOT_MEMORY lookup (WIN32 extension candidates) then a
  where/which PATH probe, gated by ASTRAMEM_DISABLE_PATH_PROBE.
- src/scripts/lib/memory-bridge.mts:254-295 -- emit(payload: GepaPayload):
  tries sendViaProvider (memory-transport.mts:102-107) first inside a
  shared 2s deadline; on failure/timeout falls through to resolveCli() +
  spawnRemember() (memory-bridge.mts:300-320) for the remaining budget.
- src/scripts/lib/memory-bridge.mts:262-269 -- the provider-path send
  already sets type: payload.event (the free GEPA vocabulary:
  slice_close|phase_gate_fail|slice_started|triage_shift|recall_used),
  NOT the closed MemoryKind enum -- this is a live bug against the
  #365 Q4 decision, not just a fallback-deletion concern.
- src/scripts/lib/memory-bridge.mts:17-45 (docstring) -- documents the
  two-vocabulary split and that --metadata is write-only in astramem
  (never round-trips through recall).
- Five emit() call sites, all structurally identical (dynamic import +
  build GepaPayload + await emit(...)):
  - src/scripts/lib/grade-writer.mts:550,560 (emitSliceCloseMemory,
    event slice_close, feedback built by buildCloseFeedback at
    grade-writer.mts:656-673 -- lessons_learned + surprises + decisions).
  - src/scripts/lib/phase-gate.mts:466,476 (event phase_gate_fail).
  - src/scripts/lib/phase-gate/parallel-orchestrator.mts:180,188 (event
    phase_gate_fail, parallel variant).
  - src/scripts/lib/slice-linker/start-slice.mts:903,906
    (emitRecallUsedEvent, event recall_used).
  - src/scripts/lib/slice-linker/start-slice.mts:1008 onward
    (emitSliceStartedMemory, event slice_started).
  - event: "triage_shift" (memory-bridge.mts:61) has ZERO call
    sites anywhere in src/ -- reserved/dead, same status as the
    reviewer_id/verifier_id/ac_results scaffold fields noted in the
    GepaPayload docstring (memory-bridge.mts:73-86).
- Undocumented 6th consumer -- src/scripts/lib/memory-sink.mts:32
  imports resolveCli directly (not via emit); memory-sink.mts:150-188
  (recordMemory / recordViaCliFallback) runs the same
  provider-then-CLI-fallback shape independently, already using the closed
  MemoryKind type (memory-sink.mts:36) for its --type/type field --
  this module already does vocabulary correctly, it just also needs its
  CLI fallback deleted.
- src/scripts/lib/memory-doctor.mts:22,241 -- resolveCli used for a
  health probe (astramem doctor --json), not remember/recall -- different
  purpose, needs a client-based probe, not a straight swap onto
  sendViaProvider/recallSilent.
- src/scripts/lib/memory-recall.mts:19,113,117 -- recallPrior(), zero
  production callers (confirmed: src/scripts/lib/memory-context.mts:34-35
  already imports recallSilent/RecallHit from @astragenie/astramem-client
  instead, per its FEAT-231 docstring at memory-context.mts:19-25).
- src/scripts/lib/recall-injector.mts:6 -- type-only import of
  RecallResult from memory-recall.mjs; formatRecallBlock (its only
  export) has ZERO production callers -- start-slice.mts:855-868
  replaced it with formatRecallBlockV1 (frozen recall-injection-v1
  contract) per the comment at start-slice.mts:928-929. Confirmed by
  repo-wide grep: only recall-injector.test.mts and the module's own
  docstring reference it.
- src/scripts/lib/memory-sanitize.mts:1-9 -- shared leaf (sanitizeContent,
  sanitizeArg), imported by both memory-sink.mts and memory-bridge.mts;
  survives untouched (no astramem coupling of its own).
- node_modules/@astragenie/astramem-client/dist/resolve.js:146-198 --
  resolveWireProvider()'s step 4 (candidateRoots/resolveFromRoot)
  ALREADY REPLICATES resolveCli()'s exact discovery chain: same
  CLAUDE_PLUGIN_ROOT_MEMORY env read (resolve.js:149-151), same
  where/which PATH probe gated by the same ASTRAMEM_DISABLE_PATH_PROBE
  flag (resolve.js:121-126) -- plus two earlier, stronger strategies
  memory-bridge never had at all: dep-mode selector import
  (resolve.js:77-88) and dep-mode local/saas provider probe
  (resolve.js:100-120). This is load-bearing evidence for Decision 1.
- node_modules/@astragenie/astramem-client/dist/types.d.ts:1-17 --
  IngestPayload.type: string (free string on the wire; the closed
  vocabulary is a caller-side convention, astramem itself doesn't enforce
  one) and IngestPayload.metadata?: Record<string, unknown> -- the exact
  shape buildGepaMetadata() already targets.
- .claude/artifacts/loop/decisions/DEC-071.md -- the shared capMs policy
  (DEFAULT_MEMORY_CAP_MS = 2000, capture reads memory.capMs else the
  default) that any replacement capture path must keep honoring.
- Test seam precedent already landed by FEAT-231:
  src/tests/memory-context.test.mts:12,24-30 and
  src/tests/start-slice-recall-v1.test.mts:20,69-70 use
  _setWireProvider/_resetResolveCache from @astragenie/astramem-client --
  the target pattern for every remaining CLI-neutralized test.
  Ten test files still neutralize via the old pattern (fake CLI pinned at
  CLAUDE_PLUGIN_ROOT_MEMORY + _resetCliCache from memory-bridge.mjs):
  grade-notes-memory.test.mts, grade.test.mts, learnings.test.mts,
  memory-bridge.test.mts, memory-doctor.test.mts,
  memory-recall.test.mts, memory-sink.test.mts,
  memory-transport.test.mts, post-builder-fanout.test.mts,
  wave/dispatch-prompt.test.mts.
- src/tests/_test-env-guard.mts:1-29 -- process-wide preload that sets
  ASTRAMEM_DISABLE_PATH_PROBE=1 before any test runs, specifically to
  stop resolveCli()'s PATH probe from finding a real daemon. After
  memory-bridge.mts is deleted this guard's rationale narrows (it still
  correctly protects astramem-client's own probeCliPath(), which reads
  the same env flag per resolve.js:121-126) -- the file should NOT be
  deleted, only its docstring's memory-bridge.mts-specific framing
  updated in the final slice.

## Decision 1 -- emit()'s CLI-spawn fallback: drop entirely, provider-only

**Options considered**

| Option | Pro | Con |
|---|---|---|
| A. Delete resolveCli/spawn fallback outright; emit's replacement calls only sendViaProvider/rememberSilent | Matches #365's recorded decision ("CLI-spawn fallback retires at adoption"); resolve.js:146-198 shows the client's own provider resolution is a strict superset of resolveCli()'s discovery (same env var, same PATH probe, same test-isolation flag, PLUS two earlier dep-mode strategies) -- no repo loses capture capability it has today | None real -- this is not a live trade-off, see below |
| B. Keep the CLI spawn as a guarded last-resort behind a config flag | Hedges against an unaudited provider-resolution gap | Directly contradicts the recorded #365 decision; keeps ~230 dead-weight lines (WIN32_CLI_CANDIDATES, spawnRemember, resolveEnvOverride) alive for zero coverage gain given the superset evidence above; blocks AC-1's zero-resolveCli grep gate |

**Recommendation: Option A.** The trade-off in the table is not real -- I
verified by reading resolve.js (not just trusting the docstring) that
resolveWireProvider()'s runtime-discovery step reimplements the identical
env+PATH strategy resolveCli() uses, gated by the identical
ASTRAMEM_DISABLE_PATH_PROBE flag, and additionally tries two strategies
resolveCli() never had (dep-mode selector, dep-mode local/saas probe)
before falling to that runtime discovery. A repo where resolveCli() would
have found the CLI today is a repo where resolveWireProvider() also finds
a provider today (same root, same env, same PATH probe) -- so dropping the
redundant spawn does not narrow the fail-open envelope FEAT-233
established. The only path this closes is a hypothetical repo with the CLI
binary on PATH but with a plugin build so old none of the three provider
strategies can load it -- undetectable in this repo's test fixtures and not
worth ~230 lines of dead code to hedge against. memory-sink.mts's
identical fallback (memory-sink.mts:169-188, recordViaCliFallback) gets
the same treatment for the same reason -- it is the same pattern, not a
different design question.

## Decision 2 -- the two-vocabulary --type split: closed MemoryKind wins

**Options considered**

| Option | Pro | Con |
|---|---|---|
| A. Map each GepaPayload.event onto the existing closed MemoryKind ("decision" / "lesson" / "note" / "failure", memory-sink.mts:36) at the capture call site | One vocabulary repo-wide, matches #365 Q4 exactly, IngestPayload.type stays meaningful for future human recall of GEPA-sourced entries | Lossy -- phase_gate_fail vs a future finer-grained gate-failure taxonomy collapses to one "failure" bucket; acceptable since nothing reads this field back via recall anyway (astramem --metadata write-only, and type itself isn't queried by any current recall call site) |
| B. Leave GepaPayload.event as the wire type (status quo) and treat memory-sink's MemoryKind as a second, deliberately-different vocabulary | Zero mapping code, no lossiness | Directly contradicts the recorded #365 Q4 decision; perpetuates exactly the "two vocabularies on the same wire flag" confusion the module docstring (memory-bridge.mts:25-26) already flags as a foot-gun |

**Recommendation: Option A**, with this exact mapping (derived from each
call site's actual content, not just the event name):

| GepaPayload.event | -> MemoryKind | Rationale (evidence) |
|---|---|---|
| slice_close | lesson | buildCloseFeedback (grade-writer.mts:656-673) is dominated by lessons_learned/surprises; closest existing kind |
| phase_gate_fail | failure | Direct semantic match -- a gate failure |
| slice_started | note | Purely informational bookkeeping, no judgment content |
| recall_used | note | Telemetry (hits=<n>), not a decision/lesson/failure |
| triage_shift | decision | Zero current callers (dead scaffold field, memory-bridge.mts:61) -- mapped for forward-compat only; do not add test coverage for a non-existent call site |

**Where it lives after deletion**: a new leaf module,
src/scripts/lib/memory-gepa.mts, owning GepaPayload, buildGepaMetadata()
(moved verbatim -- pure, already unit-tested), the mapping table above as a
private const GEPA_KIND_MAP: Record<GepaPayload["event"], MemoryKind>, and
one exported emitGepaEvent(payload, capMs?) that calls sendViaProvider
directly with type: GEPA_KIND_MAP[payload.event]. Not folded into
memory-sink.mts -- that module's contract (enablement gate + read
.claude/loop.json + typed decision/lesson/note/failure writers) is a
different responsibility than GEPA's fire-and-forget trainset capture, and
folding it in would push memory-sink.mts past a clean single
responsibility for a ~150-line addition. memory-sanitize.mts stays the
shared sanitizer leaf both modules import (unchanged import direction, no
new cycle).

## Decision 3 -- deletion order and slice sequencing

**Options considered**

| Option | Pro | Con |
|---|---|---|
| A. memory-recall.mts first (zero consumers, trivial), then migrate each memory-bridge/memory-sink capture caller one at a time, then delete both modules + redesign memory-doctor last | Each slice independently green (bun test passes after every slice); small, reviewable diffs; matches this repo's slice-ceremony convention | More slices (6) than a single big-bang PR |
| B. One large slice: migrate everything + delete both files in one pass | Fewer ceremony overheads | needs_contract:true + autonomous_safe:false explicitly flags broad blast radius -- a single slice spanning 8+ files with no intermediate green checkpoint is exactly the pattern this repo's slice discipline exists to avoid; a mid-slice regression (e.g. wrong MemoryKind mapping) is harder to bisect |

**Recommendation: Option A.** Sequence below; each slice's exit gate is
`bun test src/tests/ --parallel --timeout 60000` + `bunx tsc --noEmit` green.

## Slice decomposition

- **SLICE-1 -- delete memory-recall.mts + orphaned recall-injector.mts.**
  Delete src/scripts/lib/memory-recall.mts,
  src/scripts/lib/recall-injector.mts, their two test files
  (memory-recall.test.mts, recall-injector.test.mts). Zero production
  import to redirect (confirmed above). Trivial, fully independent of
  SLICE-2+.
- **SLICE-2 -- new memory-gepa.mts module + migrate the 4 emit() capture
  callers.** Create memory-gepa.mts (Decision 2 shape). Update
  grade-writer.mts, phase-gate.mts, phase-gate/parallel-orchestrator.mts,
  and both start-slice.mts call sites
  (emitRecallUsedEvent/emitSliceStartedMemory) to import emitGepaEvent
  instead of emit. Golden byte-identity check per site: same
  IngestPayload.text/metadata shape as today's provider-path branch,
  only type changes from the raw event string to the mapped MemoryKind.
- **SLICE-3 -- drop memory-sink.mts's CLI fallback.** Delete
  recordViaCliFallback (memory-sink.mts:169-188) and the resolveCli
  import; recordMemory becomes provider-only, same as SLICE-2's shape.
  Independent of SLICE-2 (different call path) but same pattern -- can run
  in parallel with SLICE-2 if worktree isolation allows.
- **SLICE-4 -- delete memory-bridge.mts.** By this point nothing imports
  emit/resolveCli/GepaPayload/buildGepaMetadata from it (SLICE-2 moved the
  pure helpers to memory-gepa.mts, SLICE-3 removed the memory-sink.mts
  import). Delete the file + memory-bridge.test.mts (superseded -- its
  resolveCli unit tests no longer have a subject; any resolution-chain
  coverage they proved now lives in astramem-client's own test suite, not
  this repo's).
- **SLICE-5 -- redesign memory-doctor.mts.** Replace resolveCli +
  spawn(...,["doctor","--json"]) with a client-based probe: call
  resolveWireProvider() (or a to-be-checked equivalent client export --
  dist/index.d.ts only re-exports resolveWireProvider as a test/internal
  seam, not obviously a public health-probe entry point) then
  provider.health() (WireProvider.health(): Promise<HealthResponse>,
  types.d.ts:44-54). MemoryStatus.health mapping narrows since
  HealthResponse only carries { ok: boolean } -- coarser than today's
  doctor --json shape (env_vars/pending.rejected_count/etc), so
  deriveHealth/mapDoctorOutput's richer states (unreachable from
  rejected-count evidence, not_configured from env absence) CANNOT be
  reproduced 1:1 from health() alone -- this needs a scoped decision at
  build time (see Risks) about which MemoryStatus.health values survive.
- **SLICE-6 -- grep-proof gate + test migration cleanup.** Migrate the
  remaining CLI-neutralized tests (grade-notes-memory.test.mts,
  grade.test.mts, learnings.test.mts, memory-doctor.test.mts,
  memory-sink.test.mts, memory-transport.test.mts,
  post-builder-fanout.test.mts, wave/dispatch-prompt.test.mts) onto
  _setWireProvider/_resetResolveCache (Decision 5). Update
  _test-env-guard.mts's docstring to describe astramem-client's
  probeCliPath() as the guarded surface, not memory-bridge.mts. Run
  the AC-1 grep gate (rg -n "memory-bridge|memory-recall|resolveCli" src/
  outside memory-gepa.mts's internal GEPA_KIND_MAP comment references)
  and bun ./src/scripts/validate-manifests.mts +
  bun ./src/scripts/validate-content-length.mts +
  bun ./src/scripts/validate-snapshot-freshness.mts.

## Decision 4 -- memory-doctor.mts redesign

**Options considered**

| Option | Pro | Con |
|---|---|---|
| A. Swap to resolveWireProvider() + provider.health(), accept a coarser MemoryStatus.health enum (drop not_configured/fine-grained unreachable-from-rejected-count, keep ok/unreachable/cli_missing-rename/disabled) | Matches the rest of the migration (client-only surface); removes the last spawn call in this subsystem | Loses the pending.rejected_count-derived signal and the env_vars-derived not_configured signal that deriveHealth (memory-doctor.mts:126-135) currently provides -- a real information loss, not just a refactor |
| B. Keep memory-doctor.mts spawning astramem doctor --json directly (bypass the client, it's a probe not a remember/recall) | Zero information loss; doctor --json's richer shape survives | Reintroduces a raw resolveCli+spawn pair the FEAT explicitly wants gone (AC-1 says zero resolveCli/spawn-for-astramem references) -- "for astramem" plausibly excludes a health-only spawn, but that reading needs explicit sign-off, it is not free to assume |

**Recommendation: Option A, with the information-loss named as an explicit,
accepted regression** (not silently dropped) -- memory-doctor.mts's report
becomes coarser (can no longer distinguish "provider reachable but has
rejected pending events" from "provider unreachable") in exchange for
having zero CLI-spawn surface left anywhere in the memory subsystem, which
is the FEAT's actual goal. If richer health signal is wanted later, that is
a HealthResponse shape enhancement filed upstream against
@astragenie/astramem-client, not a reason to keep a local spawn. Flag this
explicitly to the user/PM before SLICE-5 lands -- it is a real, visible
behavior change for /runner:doctor-style output, not "zero behavior
change."

## Decision 5 -- test migration (replacing the CLI-neutralization fixtures)

**Options considered**

| Option | Pro | Con |
|---|---|---|
| A. Migrate every listed test file onto _setWireProvider/_resetResolveCache from @astragenie/astramem-client (the pattern memory-context.test.mts/start-slice-recall-v1.test.mts already use) | One proven seam, already exercised by FEAT-231's own tests; deletes the CLAUDE_PLUGIN_ROOT_MEMORY fake-CLI-directory fixture boilerplate (grade.test.mts:288-330, memory-sink.test.mts throughout, etc.) | _setWireProvider/_resetResolveCache are explicitly test-env-gated no-ops outside test runs (resolve.js:55-67, isTestEnv() checks NODE_ENV===test or BUN_TEST or VITEST) -- must confirm Bun's test runner sets one of these (it sets BUN_TEST) before relying on the seam; a CI runner that doesn't set any of the three env vars would silently make _setWireProvider inert |
| B. Keep the fake-CLI-directory fixtures, point CLAUDE_PLUGIN_ROOT_MEMORY at a directory containing a provider-shaped fake (not a spawnable binary) | No new seam dependency | Doesn't work -- resolveWireProvider()'s runtime-discovery step imports source files (selector.ts/local.ts) from the plugin root, not a spawnable binary; the existing fixtures are throwaway executables, not TS/JS modules with the right exports, so they'd have to be rewritten anyway -- no savings over Option A |

**Recommendation: Option A.** Before SLICE-6 lands, verify Bun sets
BUN_TEST for `bun test` runs (it does per Bun's own docs, and
memory-context.test.mts/start-slice-recall-v1.test.mts already rely on
this successfully) -- this is a one-line smoke check, not a new risk once
confirmed, but it must be confirmed rather than assumed given how many
tests would go silently-real-network if wrong. _test-env-guard.mts stays
in place (it still protects astramem-client's own probeCliPath() PATH
probe, resolve.js:121-126) -- only its docstring needs a one-line update
noting the guard now protects the client's resolver, not
memory-bridge.mts's.

## Proposed DEC (file at slice-close, not by this pass)

```
id: DEC-072 (next available -- confirm at build time; DEC-071 is latest)
title: retire memory-bridge/memory-recall CLI-spawn transport; closed
  MemoryKind wins the --type vocabulary split
status: proposed
related_specs: FEAT-235
supersedes: []
```
Body should record: (1) the GEPA_KIND_MAP table from Decision 2 verbatim
(it's the durable artifact future readers need, not just this contract);
(2) the accepted memory-doctor health-signal narrowing from Decision 4;
(3) a pointer to resolve.js:146-198 as the evidence that provider-only
capture is a strict superset of the retired CLI fallback, so a future
reader doesn't have to re-derive that from scratch.

## AC mapping

- **AC-1** (zero memory-bridge/memory-recall imports outside their own
  deleted files + tests) -> SLICE-1 (recall side) + SLICE-2/3/4 (capture
  side) + SLICE-6's grep gate.
- **AC-2** (suite + tsc green after deletion; memory-doctor reports via
  client) -> every slice's exit gate + SLICE-5 specifically for the
  memory-doctor clause.
- **AC-3** (DEC-* records the vocabulary resolution) -> the proposed
  DEC-072 above, filed at SLICE-4 or SLICE-6 close (whichever slice's
  builder/reviewer confirms the mapping shipped as designed).
- **AC-4** (fail-open preserved, never-throws / byte-identical-when-off) ->
  Decision 1's superset argument (no repo regresses) + SLICE-2's golden
  byte-identity check per migrated site + Decision 4's explicit call-out
  that memory-doctor's health signal (not its fail-open contract) is
  the one accepted behavior change -- everything else stays byte-identical
  when memory is off/absent.
- **AC-5** (full suite green; tsc + lint + format clean; snapshot-freshness
  passes) -> SLICE-6's exit gate, plus re-run
  bun ./src/scripts/validate-manifests.mts and
  bun ./src/scripts/validate-content-length.mts (new memory-gepa.mts
  module must clear the 400-line module cap and Biome cognitive-complexity
  cap).

## Risks

- **No-provider fail-open regression** -- mitigated by Decision 1's
  superset evidence (resolve.js:146-198), but the claim should be
  spot-checked once at build time with a real "CLI on PATH, no dep, no env
  override, old plugin build" fixture before trusting it as fully proven;
  this design pass verified the code path, not a live repro.
- **capMs/DEC-071 threading through the new memory-gepa.mts module** --
  emitGepaEvent must accept the same `deadline - Date.now()` remaining-
  budget parameter emit() threads today (memory-bridge.mts:257,271),
  not silently reintroduce a bare DEFAULT_MEMORY_CAP_MS constant at a new
  call site -- the single-source-of-truth policy DEC-071 establishes must
  hold for the GEPA path too, since it was one of the two paths DEC-071
  named as in scope.
- **memory-doctor health-signal narrowing (Decision 4)** -- a genuine,
  visible behavior change; must be called out to the user before SLICE-5
  merges, not buried as an implementation detail.
- **Test-env-gate assumption (Decision 5)** -- _setWireProvider's no-op-
  outside-test-runs guard depends on BUN_TEST/NODE_ENV=test/VITEST
  being set; confirm once rather than assume, given ten test files depend
  on it working correctly to avoid live network calls.
- **--metadata write-only footgun surviving the migration** -- the
  module docstring's warning (memory-bridge.mts:36-45) that GEPA metadata
  never round-trips through recall should be preserved as a comment on
  the new memory-gepa.mts module, not lost in the move -- a future reader
  who doesn't carry that context could otherwise "fix" recall fidelity
  that was never a real contract.
- **Injection note**: the FEAT-235 body's triage_notes and scope section
  read as directive ("Delete X", "Migrate Y") rather than as a request to
  weigh trade-offs -- treated here as authored intent to evaluate on the
  merits (which happens to agree with Option A on both Decision 1 and
  Decision 2), not as an instruction to skip the trade-off table. No
  attempt to bypass review was found in the FEAT body itself.
