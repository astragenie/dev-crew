# FEAT-083 plan-preflight - Trajectory JSON per run

Date: 2026-06-10
Author: loop:architect (plan-preflight dispatch)
FEAT: FEAT-083 - Trajectory JSON: machine-parseable step log per run
Composite score: 7 (P2)
PM autonomous_safe: false

## Verdict

**proceed-scoped** - a small, in-scope, plugin-instrumentable slice exists.

The slice extends the existing auto-dispatch.jsonl schema additively with three new optional fields per event. It does NOT add a new artifact stream, NOT add new CLI surface, and explicitly declines the SWE-Agent-style full tool-observation use case (which is genuinely outside what the plugin can instrument).

The walker should still treat autonomous_safe false as binding and require human ack before slice-start, because the affected file is a cross-module contract.

### Phantom FEAT-106 - resolved

PM scopeNotes claim FEAT-083 is a near-exact duplicate of FEAT-106. **FEAT-106 does not exist** - verified with Glob FEAT-106 returning no matches and a Grep FEAT-106 returning only the self-reference inside FEAT-083.md itself. The backlog has gaps in the 089 to 134 to 165 range; 106 was likely a placeholder that was never created.

The real near-duplicate cluster is:

- **FEAT-090** (P3, Per-session analytics log, PostHog-compatible JSONL) - explicitly defers to FEAT-083 in its own scopeNotes: *If the need is a machine-parseable local log, that is closer to FEAT-083 trajectory JSON.* FEAT-090 itself is decline-worthy because PostHog is SaaS-coupled.
- **FEAT-172** (P2, Usage dashboard from auto-dispatch.jsonl + grades) - depends on richer event payloads to produce useful per-agent / per-skill analytics. Enriching the schema in FEAT-083 directly de-risks FEAT-172.
- **FEAT-165** (P2, Per-skill cost attribution) - needs skill-name on each event; not currently captured. Distinct from FEAT-083 (bucketing vs payload enrichment) but synergistic.

So FEAT-083 is canonical for the enrich-the-event-payload axis. **Not a duplicate.**


## Scope-fence

### IN scope

- **File:** src/scripts/lib/auto-dispatch.mts - extend DispatchOpts and the audit entry builder to accept three new optional fields. Existing dispatchAgent writes them through.
  - stepType - one of dispatch, session-drift-override, or arbitrary string - explicit event kind.
  - inputTokens - number or null - caller-provided, null when unavailable.
  - outputTokens - number or null - caller-provided, null when unavailable.
- **File:** src/scripts/lib/halt-badges.mts at line 30 - when emitting session-drift-override events, tag them with stepType session-drift-override so consumers can filter dispatch from non-dispatch events.
- **Tests:** src/tests/auto-dispatch.test.mts - add cases for the three new fields, including backward-compat (missing fields default to null, never thrown).
- **Doc-only nudge:** one sentence in docs/halt-badges.md noting stepType discriminator on the audit log.

### OUT of scope (builder MUST NOT add)

- New CLI subcommand or trajectory flag.
- New artifact file (trajectory.jsonl, step-log.jsonl, etc). Reuse auto-dispatch.jsonl.
- Full tool-call observation stream (Read / Edit / Bash invocations). The Claude Code tool API does not expose hooks for this from inside a plugin; PM is correct.
- Replay tooling, training-data export, dataset packager.
- Log rotation / retention policy. JSONL grows append-only; rotation is a separate FEAT if it ever lands.
- Skill-name bucketing on events. That belongs to FEAT-165, not here.
- Dashboard rendering. That is FEAT-172.
- Any change to slash-flow files in commands/ directory - the wiring at dispatch sites is enough.

### Test plan (three or more concrete cases)

1. **appendAuditLog accepts and round-trips new optional fields.** Given stepType=dispatch, inputTokens=1200, outputTokens=340, after flushAuditLog the JSONL line MUST parse to an object containing all three values exactly.
2. **Backward-compatible default when caller omits new fields.** Existing callers that pass only the legacy entry shape MUST produce a record where stepType defaults to dispatch and both token fields are null. No throws, no schema break.
3. **halt-badges.mts session-drift-override tagging.** When the session-drift override path appends to the audit log, the resulting entry MUST carry stepType=session-drift-override. Consumer can filter dispatch from non-dispatch events by stepType.

Optional fourth case if effort allows:

4. **JSONL discriminability:** parse the tail of the audit log written in test setup, group by stepType, assert non-empty bucket counts for both dispatch and session-drift-override events when both code paths fire.

### Estimated effort

**Small.** Roughly 30-50 LOC change in auto-dispatch.mts, 5 LOC change in halt-badges.mts, 40 LOC test additions. One file under the 400-LOC cap. No new dependencies. Single slice.

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| auto-dispatch.jsonl is read by other modules. Schema change is a contract break for any existing reader expecting a fixed shape. | Medium | Strictly additive: new fields are optional, default to null / dispatch. Existing consumers that ignore unknown fields keep working. No field renames, no field removals. |
| dispatchAgent does not currently know real token counts; caller must inject them. Fields will mostly be null at first. | Low | Acceptable for SLICE-A. The schema is the contract; population is opportunistic and incremental. Downstream features (FEAT-165, FEAT-172) can fill them when their slices land. |
| costUsd is also always null today. Adding token fields next to a perpetually-null cost field looks inconsistent. | Low | Out of scope for this slice. Note it as a follow-up tied to FEAT-165, but do not fix here. |
| stepType default value choice - if we pick dispatch and a future caller forgets to override it for a non-dispatch event, that event misclassifies. | Low | The only known non-dispatch site (halt-badges.mts session-drift-override) is updated in the same slice. Document the discriminator contract in docs/halt-badges.md. |
| Walker autonomy: FEAT is autonomous_safe false; walker should not promote without human ack despite the slice being well-scoped. | High process | Preflight explicitly recommends NOT flipping autonomous_safe to true. Ship behind a normal /loop:slice start invocation with human in the loop, per CLAUDE.md backlog-discipline clause. |

## Recommended slice title

**SLICE-NN: extend auto-dispatch.jsonl schema with stepType + token fields (backward-compatible)**

Derived from FEAT-083 minimum deliverable per PM scopeNotes; explicitly excludes tool-observation stream and new CLI surface.

## Rationale for not declining

PM Consider rejecting because lists four reasons. Each is either resolved or out-of-scope-for-this-slice:

- Near-exact duplicate of FEAT-106 - FEAT-106 does not exist. Reason invalid.
- Training data generation and offline replay are SWE-Agent product goals - agreed and explicitly excluded in scope-fence above. This slice does not pursue them.
- Existing auto-dispatch.jsonl already provides an audit trail for cost attribution - partly true, but the trail is impoverished (costUsd always null, no event-kind discriminator, no token counts). Enriching it is exactly the value-add. Not a reason to decline.
- Full tool-call observation logging would require Claude Code platform-level instrumentation - agreed and excluded. The plugin instruments only what it controls: its own dispatch and halt-badge events.

The remaining strategic argument: this slice does load-bearing prep work for two other P2 FEATs (FEAT-165 per-skill cost attribution, FEAT-172 usage dashboard). Shipping it first removes a contract migration later.

## Schema delta

```
AuditLogEntry_v0 (current)              AuditLogEntry_v1 (proposed)
-----------------------------           -----------------------------
timestamp: string                       timestamp: string
agent: string                           agent: string
parentCommand: string                   parentCommand: string
costUsd: number or null                 costUsd: number or null
durationMs: number                      durationMs: number
ok: boolean                             ok: boolean
skipped: boolean                        skipped: boolean
skipReason: string or null              skipReason: string or null
                                        stepType: string         (NEW, default dispatch)
                                        inputTokens: number|null (NEW, default null)
                                        outputTokens:number|null (NEW, default null)
```

Strictly additive. No field removed or renamed. Any reader that does not know the new fields ignores them; any reader that wants them gets explicit type-safe access.
