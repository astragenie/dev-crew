---
id: FEAT-058
status: pending
priority: P2
category: upstream-request
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: []
derived_from: null
---
# FEAT-058: Upstream-request check-redundant-read hook deny verdict in hero-crew

Upstream-request against hero-crew: hooks/check-redundant-read.mjs currently emits decision: approve with a warning systemMessage. Should emit decision: block (deny verdict) at configurable threshold so the assistant cannot continue re-reading the same path.

Logged from loop FEAT-057 scope-conflict resolution (2026-06-06). The hook source lives in cache/astra/crew/0.15.0/hooks/check-redundant-read.mjs and cannot be modified from the loop plugin.

Suggested ACs (for hero-crew):
- AC-1: hook config knob redundant_read_cap (default 5)
- AC-2: hook tracks per-session, per-path read count via existing cost-hygiene state.mjs
- AC-3: at >= cap redundant reads, hook emits decision: block with reason message
- AC-4: post-edit/write resets count for that path
- AC-5: tests cover under-cap pass, over-cap block, post-edit reset

Routing: file upstream issue against hero-crew. Track here for visibility until upstream merges.