# Plan — memory recall→credit integration, ceremony-neutral (2026-07-16)

- **Objective:** make agent memory *useful* (usefulness coverage 0.7% → >10%) by
  wiring an orchestrator-enforced recall→use→credit loop across crew and runner
  dispatches — **without changing any existing ceremony contract**.
- **Supersedes:** the "Phase 3" sketch in
  `20260716T000000Z-plan-memory-e2e-smoke-timings.md` (this is the full design).
- **Evidence base:** 2026-07-16 smoke sessions —
  `.claude/artifacts/crew/validations/20260716T100500Z-validation-memory-smoke-battery-post-515.md`,
  daemon `/health` usefulness stats (634 served / 4–5 used, 7d), fusion weights
  (BM25 .364 / cosine .364 / usefulness .09 stuck at 0.5 default), settled lesson
  that voluntary subagent crediting failed (astramem skill wired in crew v0.76.0,
  measured credit rate still ~0.7%).

## Hard invariants — what does NOT change

Ceremonies are load-bearing (HARD RULES, gates, autonomous loop). This work is
**additive decoration around dispatch and close, never a new step, gate, or
failure mode**:

1. `/runner:start` and `/runner:close` keep their exact step sequence, artifact
   contract, and halt-badge behavior. No new required inputs. The existing
   slice-start `runRecallHook`/`learningsDigest` stays as-is.
2. `dispatchInstruction` shape unchanged — the recall digest is *prepended
   prompt text*, not a schema change.
3. Review / validation / deployment gates untouched. Credit submission can
   never block, delay, or fail a gate (same fail-silent + wallclock-cap
   contract as `memory-sink.mts`: never throw, bounded, swallow all errors).
4. `memory.enabled: "never"` remains a full off-switch for every new touchpoint.
5. Handoff format: `memories_used: [ids]` is an **optional** field. A handoff
   without it is valid; the orchestrator simply credits nothing. No validator
   or CI gate enforces it (avoids turning memory into a gate by the back door).
6. Agents dispatched with no ceremony at all (ad-hoc `Agent()` calls) work
   exactly as today when the orchestrator chooses not to inject a digest.

## Architecture — split by what each layer uniquely knows

**Layer 1 (primary): dev-team, dispatch-assembly time.** Dispatch-assembly is
the only point that exists on *every* path — `/crew:build`, `/crew:fix`,
`orchestrate-slice`, ad-hoc `Agent()` — most dispatches never see a runner
slice ceremony (5/5 of today's real dispatches had none).

1. Orchestrator (parent thread, **warm** MCP connection — astramem-local#343
   makes cold one-shot `profileSilent`/`feedbackSilent` time out) runs
   `agent_profile` (corrections first) + `recall_memory` (project + agent
   scoped) and prepends a compact digest **with memory ids** to the dispatch
   prompt.
2. Subagent's handoff optionally reports `memories_used: [ids]`.
3. The orchestrator that receives the handoff calls `submit_feedback` per id.
   The subagent never volunteers a tool call — parent-enforced, per the settled
   orchestrator-controlled-path lesson.

**Layer 2: runner, slice-close aggregation (outcome-weighted).** Runner
uniquely knows the outcome (grade PASS/FAIL, lessons). At `/runner:close`,
*after* the existing ceremony steps complete (append-only, fail-silent):
batch-credit ids reported across the slice's dispatches; skip or down-weight
crediting on a failed slice so memories that steered a failure are not
reinforced. Implemented beside the existing grade-capture touchpoint
(`memory-gepa.mts` / `complete-slice.mts`), not inside the gate logic.

**Plumbing:** both layers use the shared `@astragenie/astramem-client` seam
(plugins-common) — no hand-rolled resolution. The only cross-plugin coupling is
the optional handoff field.

## Workstreams

| Id | What | Where | Status |
|---|---|---|---|
| 3a | `scope: "team"` default + meta-noise write guard in `memory-sink.mts` (`memory.scope` config override; astramem-local#371 is the daemon-side twin) | runner | **builder in flight** |
| 3b | Slice-close batch credit, outcome-weighted; thread real `agentType` through slice-close capture (`GepaPayload` gains project/agent via the sink, not a wire change); credit ledger line in the trajectory JSONL for observability | runner | next slice after 3a |
| 3c | Dispatch-time digest injection + `memories_used` handoff contract + orchestrator crediting | dev-team | upstream request doc (below); build happens in dev-team repo |
| 3d | Telemetry: surface usefulness coverage (served/used) in `loop-snapshot.md` so the metric is visible each session | runner | with 3b |

Rollout order: 3a → 3b (runner-only, no cross-plugin risk) → 3c (dev-team, after
the handoff-field convention is agreed) → 3d rides 3b. Each lands behind the
existing `memory.enabled` config; no step depends on the daemon being healthy.

## Success metrics

- Usefulness coverage (daemon `/health` `usefulness.rate_7d`): 0.7% → >10%
  within a week of normal slice traffic.
- `agent_profile` top_lessons for runner/crew roles show usefulness values off
  the 0.5 default (today: ~all 0.5).
- Zero new ceremony failures attributable to memory touchpoints (they are
  fail-silent by contract; any violation is a P1 bug).

## Risks

- Daemon instability (hang mode, astramem-local#370) — mitigated: every
  touchpoint bounded + fail-silent; e2e suite (PR #516) preflights strict.
- Digest bloat in dispatch prompts — cap digest at k=5 hits + corrections,
  content-truncated, same caps discipline as memory-sink.
- Credit inflation (agents listing every id) — outcome-weighting at close and
  ADR-010's serve-count denominator both dampen; acceptable v1 noise.

## Companion docs

- Upstream ask to dev-team: `docs/upstream-requests/2026-07-16-crew-dispatch-memory-credit-loop.md`
- Upstream daemon tickets: astramem-local#370 (hang detect), #371 (distill
  noise), #372 (consolidation backlog), evidence comments on #352/#341.
