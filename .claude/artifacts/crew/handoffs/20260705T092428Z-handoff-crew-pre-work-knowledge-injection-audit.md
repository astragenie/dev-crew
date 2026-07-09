# Task Handoff: crew pre-work knowledge injection audit

- Created: 2026-07-05T09:24:28.117Z
- From: researcher
- To: dispatcher
- Objective: Crew does not inject recent learnings/decisions/memory into agents before work today; FEAT-188 (pending, autonomous_safe:false) in dev-team backlog is the unbuilt design for role-scoped pre-dispatch recall.
- Allowed Scope:
  - Read-only investigation of C:/work/mega/dev-team: hooks/
  - wake-up-brief/brief-me machinery
  - agents/*.md
  - astramem/cortex integration points
  - dispatch-prompt assembly
  - and ownership of agents dispatched as crew:*
- Forbidden Scope: -
- Deliverable: Citation-backed findings across 4 questions: (1) No auto pre-work injection exists today — SessionStart hook is telemetry-only (hooks/hooks.json:3-13), wake-up-brief/brief-me require manual invocation (commands/wake-up-brief.md:6-7, commands/brief-me.md:9) and assemble backlog/decisions/grades on demand (scripts/lib/wakeup.mjs:201,306; scripts/lib/briefing.ts:69-98) with no role scoping. (2) No role-scoped injection found anywhere. (3) Extension points for a future feature: the 6 dispatch-assembly sites referenced in FEAT-188, scripts/lib/slice-linker/dispatch.mts:266-322 buildDispatchPhase (currently structural-only), and the hooks.json SessionStart binding. FEAT-188 (.claude/artifacts/loop/backlog/pending/FEAT-188-memory-provider-capture-recall.md) already specs a MemoryProvider + '## Recent lessons (top-K)' block scoped by agent/tags (lines 26-30, 71-74) — not yet implemented; learnings capture itself is currently stale/broken per its triage note (line 19). (4) Confirmed agent ownership: crew:architect->agents/architect.md, crew:backend-dev->agents/backend-dev.md, crew:frontend-dev->agents/frontend-dev.md, crew:reviewer->agents/reviewer.md; crew:validator and crew:builder and crew:inspector do NOT exist as named — nearest equivalents are crew:verifier (agents/verifier.md), crew:dev-lite/frontend-dev/backend-dev/fullstack-dev (builder split), and crew:investigator (agents/investigator.md) respectively.
- Changed Files:
  - C:/work/mega/dev-team/hooks/hooks.json
  - C:/work/mega/dev-team/hooks/pre-tool-use-agent.ts
  - C:/work/mega/dev-team/commands/wake-up-brief.md
  - C:/work/mega/dev-team/commands/brief-me.md
  - C:/work/mega/dev-team/scripts/lib/wakeup.mjs
  - C:/work/mega/dev-team/scripts/lib/briefing.ts
  - C:/work/mega/dev-team/scripts/lib/slice-linker/dispatch.mts
  - C:/work/mega/dev-team/agents/*.md
  - C:/work/mega/dev-team/.claude/artifacts/loop/backlog/pending/FEAT-188-memory-provider-capture-recall.md
- Confidence: high
- Risks: Sub-agent search for astramem/cortex/MemorySearch was grep-based across the repo and may miss dynamically-constructed call sites or recently added integration not yet indexed; FEAT-188 status (pending) should be re-checked if dev-team has moved since this snapshot; did not verify every one of the '6 dispatch-assembly sites' FEAT-188 references individually beyond dispatch.mts.
- Suggested Next Handoff: If the user wants to design the 'pre-work recall scoped by agent type' feature, hand this findings doc plus FEAT-188 to crew:architect or runner:architect to turn into a concrete design/ADR; otherwise no further action needed.

