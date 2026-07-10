---
id: FEAT-252
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-256]
slices: []
derived_from: null
pm_customer_impact: 0.6
pm_effort_estimate: 0.7
pm_strategic_alignment: 0.75
pm_technical_risk: 0.7
pm_dependency_depth: 0.25
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "New external dependency (Linear GraphQL API) plus auth handling across a cross-module reuse target (IssueBroker/FEAT-245) lands technical_risk at 0.7 (0.6-0.8 band: new dependency, no schema/data-shape change to this repo's own persisted state); real operator-level demand (key + workspace already provisioned, FEAT-245 blocked on this slot) -> P1; effort_estimate 0.7 maps to 8 Fibonacci points, tripping the FEAT-168 decomposition gate -- decomposed into 3 slices below summing to 11 points."
proposed_slices:
  - id_suffix: -SLICE-1
    title: COND-B stamping DEC + auth (LINEAR_API_KEY/token-store) + taskStore.linear config schema
    points: 3
  - id_suffix: -SLICE-2
    title: "Core GraphQL write methods: issueCreate + parentId, state transition, commentCreate"
    points: 5
  - id_suffix: -SLICE-3
    title: COND-C warning-stubs + config seeding + IssueBroker-reusable ops + manual smoke
    points: 3
tags: [api-change, auth, infra]
needs_contract: true
needs_ux: false
---
## Description

Tracker-provider program Phase 3 — real LinearProvider (watcher plan C2; fills the composition slot FEAT-245 IssueBroker explicitly defers). STEP 1 per review COND-B, before any code: architect DEC on the id-stamping + composite contract — publishFeature returns ONE id but composite publish must stamp BOTH github_issue: and linear_issue: frontmatter; locate today's stamping call site (github-sync createFeatureIssue vs caller-side) and decide (a) widen interface to per-provider id map vs (b) CompositeProvider owns stamping; Phase 4 FEAT implements the same DEC. Write methods against Linear GraphQL (https://api.linear.app/graphql): issueCreate (feature), issueCreate+parentId (slice sub-issue), workflow-state transition (closeSlice/updateStatus), commentCreate. Per COND-C default: syncPull + bootstrap DESCOPED to documented warning-stubs in v1 (Linear has no existing sync engine like github-sync.mjs; full sync = cursor pagination + team/project filtering + rate-limit handling ~1500 req/h) — file follow-up FEAT; architect may keep in scope only with raised estimate, DEC states it. Auth: LINEAR_API_KEY env var first (already set user-level on this machine; never commit, never write to loop.json), token-store.mts fallback second. Config: taskStore.linear { teamKey: 'AST', projectId?, stateMap? }, defaults pending->Backlog, triaged->Todo, in-progress->In Progress, done->Done. Workspace: Astragenie, teamId 81cea472-33a9-4fbe-a797-147e17c6ca05. Soft-fail contract per provider-interface.mts (warn + null, never throw). Tests: injectable fetch/mock transport, no live API in CI; one documented manual smoke against Astragenie workspace in validation artifact. Expose low-level Linear ops for IssueBroker (FEAT-245) composition without importing task-store lifecycle logic. Extend setup-task-store.mjs idempotent config seeding. Reuse or delete scripts/linear-sync/ prototype per FEAT-256 DEC. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given taskStore.linear.teamKey set to 'AST' and LINEAR_API_KEY present in the environment (per token-store.mts fallback contract), When LinearProvider.publishFeature(feat) is called for a FEAT not yet published, Then it issues a Linear issueCreate GraphQL mutation against https://api.linear.app/graphql scoped to team AST and returns the created issue's identifier as Promise<string> (matching the TaskStoreProvider.publishFeature contract in provider-interface.mts:35) -- evidenced by a unit test against an injectable mock transport asserting the mutation payload and the parsed return value.
- AC-2: Given a slice with a known parent feature's Linear issue id, When LinearProvider.publishSlice(slice, parentExternalId) is called, Then it issues issueCreate with parentId set to parentExternalId (creating a Linear sub-issue), matching provider-interface.mts:43-46's publishSlice(slice, parentExternalId): Promise<number | string | null> contract -- evidenced by a mock-transport test asserting parentId is present in the mutation variables.
- AC-3 (edge/error path): Given the Linear API returns a non-2xx response, a GraphQL error payload, or LINEAR_API_KEY is unset, When any LinearProvider method is called, Then it resolves (never throws), logs a warning distinguishing 'not configured' (missing key) from 'call failed' (API error), and returns null (or { features: [], slices: [] } for syncPull) per the soft-fail contract in provider-interface.mts:8-9 -- evidenced by three unit tests: missing-key, HTTP-error, and GraphQL-error-payload cases, each asserting no exception propagates and the correct warn-message shape.
- AC-4: Given taskStore.linear.stateMap is unset, When a slice or feature transitions state via LinearProvider.updateStatus, Then the default state mapping (pending->Backlog, triaged->Todo, in-progress->In Progress, done->Done) is applied and the corresponding Linear workflow-state transition mutation is sent -- evidenced by a test asserting the correct target state name is sent for each of the four default mappings.
- AC-5 (COND-C descope path): Given the default v1 scope descopes syncPull and bootstrap to documented warning-stubs (no pagination/rate-limit handling), When either method is called, Then it logs a warning naming the descope and returns an empty-but-well-shaped result ({ features: [], slices: [] } / { features: [] }) without throwing and without making a real API call -- evidenced by a test asserting the warning fires and zero mock-transport calls occur.

## Proposed slices (PM decomposition)

- SLICE-1: COND-B stamping DEC + auth (LINEAR_API_KEY/token-store) + taskStore.linear config schema (3 pts)
- SLICE-2: Core GraphQL write methods: issueCreate + parentId, state transition, commentCreate (5 pts)
- SLICE-3: COND-C warning-stubs + config seeding + IssueBroker-reusable ops + manual smoke (3 pts)
