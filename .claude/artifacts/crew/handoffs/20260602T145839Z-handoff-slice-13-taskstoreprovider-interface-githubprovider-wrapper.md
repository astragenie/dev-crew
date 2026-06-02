# Task Handoff: SLICE-13: TaskStoreProvider interface + GithubProvider wrapper

- Created: 2026-06-02T14:58:39.537Z
- From: builder
- To: lead
- Objective: Defined TaskStoreProvider interface (7 methods) and shipped GithubProvider class delegating to existing github-sync layer; zero behavior change, all 7 ACs pass with fresh evidence.
- Allowed Scope:
  - New files only: provider-interface.mts
  - github-provider.mts
  - task-store-github-provider.test.mts plus compiled outputs — no modifications to any existing file
- Forbidden Scope: -
- Deliverable: src/scripts/lib/task-store/provider-interface.mts, src/scripts/lib/task-store/providers/github-provider.mts, src/tests/task-store-github-provider.test.mts (compiled to scripts/lib/task-store/ and tests/)
- Changed Files:
  - src/scripts/lib/task-store/provider-interface.mts
  - src/scripts/lib/task-store/providers/github-provider.mts
  - src/tests/task-store-github-provider.test.mts
  - scripts/lib/task-store/provider-interface.mjs
  - scripts/lib/task-store/providers/github-provider.mjs
  - tests/task-store-github-provider.test.mjs
- Confidence: high
- Risks: none
- Suggested Next Handoff: SLICE-14: NoopProvider + LinearProvider stub + getProvider resolver

