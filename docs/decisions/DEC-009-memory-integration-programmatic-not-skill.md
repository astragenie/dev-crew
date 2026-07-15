---
id: DEC-009
title: Runner memory integration loads and feeds back programmatically at dispatch/close, not through a model-invoked skill
status: accepted
introduced_by_slice: FEAT-agent-profile-load-feedback
introduced_at: 2026-07-15
related_specs: []
superseded_by: null
---
# DEC-009: Runner memory integration is programmatic (dispatch/close), not skill-driven

## Context

We want autonomous-loop agents to get smarter over time: load the lessons,
decisions, and past corrections an agent has accumulated (its astramem
**agent profile**) so it stops repeating mistakes and reuses working patterns,
and feed back which of those memories actually rode along a successful slice so
the daemon's usefulness ranking improves.

There are two candidate mechanisms for making an agent "use its memory":

1. **A skill** (`using-memory`) — a Markdown instruction the agent is expected
   to invoke at the start of substantial work. This is the approach shipped in
   the **crew** plugin (`skills/universal/using-memory`, crew v0.65.0) and in
   the standalone **astramem** plugin (v0.7.0).
2. **Programmatic prompt injection + programmatic feedback** — the orchestrator
   splices the agent's memory block into the dispatch prompt as it assembles it,
   and the slice-close ceremony submits feedback in code.

**Skills did not work as expected for the autonomous loop.** Skill invocation is
*model-elective*: the subagent has to decide to invoke `using-memory`, mid-task,
on its own initiative. In the autonomous loop the dispatched builder/reviewer
subagents frequently did **not** invoke it — the load was non-deterministic, so
memory arrived sometimes and not others, and usefulness feedback (which depends
on the agent having loaded and used a memory) was even less reliable. The
session-level hooks that could force it (`SessionStart`, `UserPromptSubmit`) do
not fire for subagents, and the runner does not dispatch through the crew
`SubagentStart` hook. Relying on the skill would make memory a coin-flip on the
exact path where determinism matters most — unattended, multi-slice runs.

The runner already assembles every dispatch prompt in code
(`buildMemoryContext`, `post-builder-fanout`, `wave/dispatch-prompt`), and
already owns a deterministic slice-close ceremony (`completeSlice`). That gives
us two deterministic seams the skill approach lacks.

## Decision

**Runner memory integration is programmatic on both halves of the loop, and does
not depend on the `using-memory` skill firing.**

- **Load at dispatch (deterministic).** `buildMemoryContext` fetches the agent
  profile via `@astragenie/astramem-client`'s `profileSilent` and splices a
  weighted "Recent context" block into the dispatch prompt. No model discretion:
  if `memory.profile.enabled` and the daemon answers, the block is in the prompt.
- **Feed back at slice-close (deterministic).** The ids of the atoms injected
  into a slice's dispatch(es) are recorded to a per-slice sidecar; on a clean
  gate pass, `completeSlice` credits each via `feedbackSilent`
  (`POST /memory/:id/used`). No model discretion here either.

The `using-memory` skill remains valid for **interactive crew** work (a human is
in the loop and the model reliably invokes skills) and for the astramem plugin's
general "make any agent smarter" story. It is **not** the runner's load path and
must not be treated as one.

## Consequences

### Positive

- Memory load and feedback are deterministic on the autonomous path — no
  dependence on a subagent choosing to invoke a skill.
- Reuses transports and seams the runner already owns (astramem-client,
  `buildMemoryContext`, `completeSlice`); no new abstraction.
- Fully opt-in and fail-silent: `memory.profile.enabled` /
  `memory.feedback.enabled` default off, and every path is byte-identical when
  disabled or when the daemon is unreachable.

### Negative

- Two divergent memory surfaces now exist across the plugin family (crew's
  skill + hook vs runner's programmatic injection). They must be kept
  conceptually in sync or they will drift.
- Programmatic feedback is a v1 **outcome backstop**: on a pass it credits every
  injected atom, not only the ones that provably changed the agent's work.

### Neutral

- The feedback signal is positive-only by construction (the daemon has no
  "not used" verb); a failed/blocked gate simply credits nothing.

## Alternatives considered

- **Skill-only (`using-memory`) for the runner** — rejected: model-elective
  invocation made load non-deterministic on autonomous dispatch; this is the
  "skills not working as expected" finding that motivated this decision.
- **Port crew's `SubagentStart` hook to the runner** — rejected for now: the
  runner assembles dispatch prompts in code already, so prompt-splice is simpler
  and needs no hook plumbing. Revisit if the runner ever dispatches subagents
  outside `buildMemoryContext`'s reach.
- **Feedback through the `MemoryProvider` abstraction** (as dev-team does) —
  rejected: the runner standardized on the `astramem-client` transport
  (FEAT-231/238); `feedbackSilent` is one fewer indirection.
- **Credit at grade-time rather than slice-close** — deferred (see Open items):
  a grade PASS is higher-signal than a gate PASS, but grade runs as a separate
  step after close; slice-close is the point the handoff/ceremony already owns.

## References

- Implementation handoff: `docs/integrations/memory-integration.md`
- Code: `src/scripts/lib/memory-context.mts`,
  `src/scripts/lib/profile-feedback.mts`,
  `src/scripts/lib/slice-linker/complete-slice.mts`
- Tests: `src/tests/profile-feedback.test.mts`,
  `src/tests/memory-context-profile.test.mts`
- Released in runner v0.74.0 (load) + v0.75.0 (feedback)
- Sibling skill path: crew `skills/universal/using-memory` (v0.65.0)
