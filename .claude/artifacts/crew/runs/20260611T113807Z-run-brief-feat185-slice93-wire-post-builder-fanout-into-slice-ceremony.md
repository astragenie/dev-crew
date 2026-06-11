---
feature: FEAT-185
status: active
---
# Run Brief: FEAT185 SLICE93: Wire post-builder-fanout into slice ceremony

- Created: 2026-06-11T11:38:07.058Z
- Tier: full
- Goal: SLICE-95 (commit 62541ce + fixup af77628) shipped `buildPostBuilderFanout` library + CLI subcommand emitting a 3-task parallel payload (reviewer-A ∥ reviewer-B ∥ validator) after builder PASS. The actual slice ceremony (`/loop:slice complete` flow + `crew:lead` orchestrator) still dispatches reviewers and validator serially. The largest claimed throughput-2x saving (~5 min/slice) is unrealized today, and `commands/slice-complete.md` misrepresents runtime by documenting fanout as the default.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Extend `slice post-builder-fanout` CLI handler in `src/scripts/loop.mts` to write a marker file at `.claude/artifacts/loop/fanout-markers/<slice-id>.json` recording `{ sliceId
  - taskCount
  - ts }` on every invocation. Marker write is best-effort (no crash on fs error).
- Extend `src/scripts/lib/grade-telemetry.mts` with `readPostBuilderFanout(repoPath
  - sliceId)` that reads the marker and returns `true` when present (within 24h of slice-grade time)
  - `null` when absent. Wire into `computeTelemetry` so `timing.post_builder_fanout` populates in grade frontmatter.
- Update the `dispatchInstruction` string emitted by `src/scripts/lib/slice-linker/start-slice.mts` (or wherever it lives) so it directs the orchestrator: after builder PASS
  - invoke `bun src/scripts/loop.mts slice post-builder-fanout -
- Out Of Scope:
  - - Modifying `crew:lead` agent prompt (upstream in hero-crew). The dispatch-instruction change in slice-start is enough — the orchestrator obeys the string.
- Auto-detection of fanout vs serial by counting reviewer artifacts (use the marker
  - not heuristics).
- Wall-clock measurement of saving (covered by FEAT-184 telemetry + perf-report).
- Wiring `classify-slice-shape` into ceremony (FEAT-186).
- Planned Files: -
- Next Step: Begin implementation

