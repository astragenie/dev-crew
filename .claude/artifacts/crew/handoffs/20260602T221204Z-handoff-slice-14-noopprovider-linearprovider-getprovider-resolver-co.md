# Task Handoff: SLICE-14: NoopProvider + LinearProvider + getProvider resolver — COMPLETE

- Created: 2026-06-02T22:12:04.531Z
- From: builder
- To: lead
- Objective: Implemented NoopProvider (silent no-ops), LinearProvider stub (throws not-implemented on all 7 methods), and getProvider(config, repoPath) index resolver with back-compat github.enabled alias
- Allowed Scope:
  - src/scripts/lib/task-store/providers/noop-provider.mts
  - src/scripts/lib/task-store/providers/linear-provider.mts
  - src/scripts/lib/task-store/index.mts
  - src/tests/task-store-index.test.mts and compiled .mjs counterparts
- Forbidden Scope: -
- Deliverable: getProvider resolver, NoopProvider, LinearProvider, 14 new tests (514 total pass)
- Changed Files:
  - src/scripts/lib/task-store/providers/noop-provider.mts
  - src/scripts/lib/task-store/providers/linear-provider.mts
  - src/scripts/lib/task-store/index.mts
  - src/tests/task-store-index.test.mts
  - scripts/lib/task-store/index.mjs
  - scripts/lib/task-store/providers/noop-provider.mjs
  - scripts/lib/task-store/providers/linear-provider.mjs
  - tests/task-store-index.test.mjs
- Confidence: high
- Risks: LinearProvider stub throws on every call — callers must guard against it if they mistakenly configure provider=linear
- Suggested Next Handoff: Review then SLICE-15 ceremony hook migration

