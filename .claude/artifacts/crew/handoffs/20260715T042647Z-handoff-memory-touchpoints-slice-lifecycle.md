# Task Handoff: Memory touchpoints across the slice lifecycle (start -> build -> close)

- Created: TIMESTAMP_PLACEHOLDER
- From: researcher
- To: dispatcher
- Objective: Map every point where loop reads/writes durable memory during /runner:start -> build -> /runner:close, and determine whether it calls astramem MCP tools or a local transport.
- Allowed Scope: Read-only trace of memory-* lib modules, start-slice.mts, grade-writer.mts, learnings.mts, capture-at-close.mjs, emit-astrarunner-event.mjs, and their tests.
- Forbidden Scope: No edits made.
- Deliverable: 7-point touchpoint map + transport-mechanism finding, returned inline to dispatcher (this artifact is a backup copy since the write-handoff CLI errored: "Cannot find package '@astragenie/plugin-std'").
- Changed Files: none (research only)
- Confidence: high
- Risks: memory-doctor-renderer.mts, memory-sanitize.mts, memory-snapshot.mts were not read in full (diagnostics/formatting only, not new read/write points — low risk). astramem-plugin's own local-provider implementation (outside this repo) was not read line-by-line; daemon-client.js name + README text support "local daemon/SaaS HTTP", not a direct read.
- Suggested Next Handoff: If the memory.project vs CLAUDE.md cortex projectId="loop" discrepancy matters, file a FEAT/DEC to set memory.project explicitly or document the two systems are intentionally separate.

## Full findings

See chat response for the full 7-point table with file:line citations.
