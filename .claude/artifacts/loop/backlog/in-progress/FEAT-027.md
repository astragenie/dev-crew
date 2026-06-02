---
id: FEAT-027
status: in-progress
priority: P2
category: infrastructure
target_release: null
created: 2026-06-03
updated: 2026-06-03
depends_on: []
slices: [SLICE-16]
slices_complete: []
derived_from: null
started_at: 2026-06-03
---
# FEAT-027: Observability: warn on unknown provider name, log resolved provider at task-store init

Three consecutive slices (SLICE-06, SLICE-14, SLICE-15) scored observability below 0.80. Root cause: getProvider silently returns NoopProvider for unrecognised provider names (DEC-002), and resolved provider name is never logged when loop github sync/bootstrap runs. Fix: emit console.warn when getProvider falls through to noop due to unknown provider, and log the resolved provider name at ceremony-hook entry points.

## Acceptance criteria

- AC1: getProvider emits `console.warn` for unknown provider names (not for explicit noop or unconfigured default)
- AC2: `loop github sync` and `loop github bootstrap` log resolved provider name
- AC3: 3 new tests cover warn/no-warn paths
- AC4: All existing tests pass, lint clean
- AC5: Observability score >= 0.80 on implementing slice
