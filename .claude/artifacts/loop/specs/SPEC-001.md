---
id: SPEC-001
type: sre
title: Observability baseline for task-store provider layer
status: draft
priority: P2
target_release: null
created: 2026-06-02
updated: 2026-06-02
owner: null
derived_features: []
---
## Problem\n\nThree consecutive slices (SLICE-06, SLICE-14, SLICE-15) scored observability below 0.80. Root causes:\n\n1. getProvider() silently returns NoopProvider for unknown provider names (DEC-002) — typos in loop.json taskStore.provider produce silent no-ops with no diagnostic.\n2. Resolved provider name is never logged at ceremony-hook entry points (loop github sync / bootstrap).\n3. NoopProvider intentionally emits nothing — but callers cannot distinguish 'configured noop' from 'fell through due to bad config'.\n\n## Acceptance criteria\n\n- AC1: getProvider() emits console.warn when falling through to NoopProvider due to an unrecognised provider name (not when provider is explicitly 'noop' or absent).\n- AC2: loop github sync and loop github bootstrap log the resolved provider name at INFO level before calling the provider method.\n- AC3: A new NoopProvider.isExplicit flag (default true, set to false by getProvider fallback) allows callers to distinguish intentional noop from accidental fallback.\n- AC4: All existing tests pass; new tests cover warn path and explicit/fallback noop distinction.\n- AC5: Observability score >= 0.80 on the implementing slice.