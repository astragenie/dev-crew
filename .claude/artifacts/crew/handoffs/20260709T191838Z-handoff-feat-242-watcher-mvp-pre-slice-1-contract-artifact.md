# Task Handoff: FEAT-242 watcher MVP - pre-slice-1 contract artifact

- Created: 2026-07-09T19:18:38.856Z
- From: lead-session
- To: -
- Objective: Pinned registry/state/module/envelope contracts for SLICE-143..146: separate tick.json/reaction.json files (not keyed sections) resolve the COND-2 lost-update race by construction; envelopes route via a new RegistryFile.controlRepoPath while attribution rides in payload.tenantId/appId from the registry entry.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - .claude/artifacts/crew/contracts/20260709-feat242-watcher-contracts.md
- Confidence: high
- Risks: verifier: none (schema/module contract, no OpenAPI/Mermaid emitted); two open trade-offs flagged in the artifact (loop.json watch.shard placement, lock-dir stale-reap policy) left for SLICE-143 to resolve, not decided here
- Suggested Next Handoff: -

