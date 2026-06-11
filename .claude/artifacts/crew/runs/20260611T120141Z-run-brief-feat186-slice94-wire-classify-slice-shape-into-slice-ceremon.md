---
feature: FEAT-186
status: active
---
# Run Brief: FEAT186 SLICE94: Wire classify-slice-shape into slice ceremony (inline-path hint)

- Created: 2026-06-11T12:01:41.300Z
- Tier: full
- Goal: SLICE-94 (commit 6eb7154) shipped `classifySliceShape({ files })` library + `classify-slice-shape` CLI returning one of `doc-update | config-tweak | single-module-edit | test-only | none`. Nothing in the ceremony auto-invokes it. Orchestrators don't see the inline-path hint, so `dispatchLimits.preferInlineFor` (extended in the same slice) has no consumer for the 4 new shapes. `perf-report.inlinePathPct` stays at 0% indefinitely.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Add `classify-slice-shape` invocation to `src/scripts/lib/slice-linker/start-slice.mts` (or wherever slice-start emits `dispatchInstruction`). When the slice file has a `## Files` section
  - parse the file list
  - call `classifySliceShape({ files })`
  - and embed the result hint into `dispatchInstruction`.
- New marker file at `.claude/artifacts/loop/shape-markers/<slice-id>.json` recording `{ sliceId
  - shape
  - rationale
  - inlinePath
  - ts }` where `inlinePath = shape ∈ dispatchLimits.preferInlineFor`.
- Best-effort marker write (no crash). Same `SLICE_ID_RE` traversal guard as `fanout-marker.mts` (extract to shared helper `src/scripts/lib/slice-id-guard.mts` if cleaner).
- Extend `src/scripts/lib/grade-telemetry.mts` with `readShapeMarker(repoPath
  - sliceId)` reading the marker; wire into `computeT
- Out Of Scope:
  - - Modifying `crew:lead` agent prompt or orchestrator behavior beyond the dispatch-instruction text change.
- Auto-rerouting the dispatch (the orchestrator can ignore the hint; advisory only per spec).
- Pruning policy for `shape-markers/` (future FEAT).
- Wall-clock measurement of inline-path savings (covered by FEAT-184 telemetry).
- Planned Files: -
- Next Step: Begin implementation

