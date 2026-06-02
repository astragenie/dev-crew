---
id: FEAT-027
status: pending
priority: P2
category: infrastructure
target_release: null
created: 2026-06-02
updated: 2026-06-02
depends_on: []
slices: []
derived_from: null
---
# FEAT-027: Observability: warn on unknown provider name, log resolved provider at task-store init

Three consecutive slices (SLICE-06, SLICE-14, SLICE-15) scored observability below 0.80. Root cause: getProvider silently returns NoopProvider for unrecognised provider names (DEC-002), and resolved provider name is never logged when loop github sync/bootstrap runs. Fix: emit console.warn when getProvider falls through to noop due to unknown provider, and log the resolved provider name at ceremony-hook entry points.