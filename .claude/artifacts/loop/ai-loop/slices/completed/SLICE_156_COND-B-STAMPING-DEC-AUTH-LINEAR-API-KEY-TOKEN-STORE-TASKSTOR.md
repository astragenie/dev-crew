---
id: SLICE-156
title: COND-B stamping DEC + auth (LINEAR_API_KEY/token-store) + taskStore.linear config schema
status: completed
feature: FEAT-252
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-07-10
updated: 2026-07-10
effort_points: 3
github_issue: 435
github_url: "https://github.com/astragenie/runner-plugin/issues/435"
touches_files: [src/scripts/lib/task-store/providers/linear-provider.mts, src/scripts/lib/task-store/linear-config.mts, .claude/artifacts/loop/decisions/DEC-078.md, scripts/linear-sync/, src/tests/linear-provider-config.test.mts]
completed_at: 2026-07-10
---
# SLICE-156: COND-B stamping DEC + auth (LINEAR_API_KEY/token-store) + taskStore.linear config schema

Implements FEAT-252. See [feature file](../../../backlog/in-progress/FEAT-252.md) for product context.

## Objective

Tracker-provider program Phase 3 — real LinearProvider (watcher plan C2; fills the composition slot FEAT-245 IssueBroker explicitly defers). STEP 1 per review COND-B, before any code: architect DEC on the id-stamping + composite contract — publishFeature returns ONE id but composite publish must stamp BOTH github_issue: and linear_issue: frontmatter; locate today's stamping call site (github-sync createFeatureIssue vs caller-side) and decide (a) widen interface to per-provider id map vs (b) CompositeProvider owns stamping; Phase 4 FEAT implements the same DEC. Write methods against Linear GraphQL (https://api.linear.app/graphql): issueCreate (feature), issueCreate+parentId (slice sub-issue), workflow-state transition (closeSlice/updateStatus), commentCreate. Per COND-C default: syncPull + bootstrap DESCOPED to documented warning-stubs in v1 (Linear has no existing sync engine like github-sync.mjs; full sync = cursor pagination + team/project filtering + rate-limit handling ~1500 req/h) — file follow-up FEAT; architect may keep in scope only with raised estimate, DEC states it. Auth: LINEAR_API_KEY env var first (already set user-level on this machine; never commit, never write to loop.json), token-store.mts fallback second. Config: taskStore.linear { teamKey: 'AST', projectId?, stateMap? }, defaults pending->Backlog, triaged->Todo, in-progress->In Progress, done->Done. Workspace: Astragenie, teamId 81cea472-33a9-4fbe-a797-147e17c6ca05. Soft-fail contract per provider-interface.mts (warn + null, never throw). Tests: injectable fetch/mock transport, no live API in CI; one documented manual smoke against Astragenie workspace in validation artifact. Expose low-level Linear ops for IssueBroker (FEAT-245) composition without importing task-store lifecycle logic. Extend setup-task-store.mjs idempotent config seeding. Reuse or delete scripts/linear-sync/ prototype per FEAT-256 DEC. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given taskStore.linear.teamKey set to 'AST' and LINEAR_API_KEY present in the environment (per token-store.mts fallback contract), When LinearProvider.publishFeature(feat) is called for a FEAT not yet published, Then it issues a Linear issueCreate GraphQL mutation against https://api.linear.app/graphql scoped to team AST and returns the created issue's identifier as Promise<string> (matching the TaskStoreProvider.publishFeature contract in provider-interface.mts:35) -- evidenced by a unit test against an injectable mock transport asserting the mutation payload and the parsed return value.
- [x] AC-2: Given a slice with a known parent feature's Linear issue id, When LinearProvider.publishSlice(slice, parentExternalId) is called, Then it issues issueCreate with parentId set to parentExternalId (creating a Linear sub-issue), matching provider-interface.mts:43-46's publishSlice(slice, parentExternalId): Promise<number | string | null> contract -- evidenced by a mock-transport test asserting parentId is present in the mutation variables.
- [x] AC-3 (edge/error path): Given the Linear API returns a non-2xx response, a GraphQL error payload, or LINEAR_API_KEY is unset, When any LinearProvider method is called, Then it resolves (never throws), logs a warning distinguishing 'not configured' (missing key) from 'call failed' (API error), and returns null (or { features: [], slices: [] } for syncPull) per the soft-fail contract in provider-interface.mts:8-9 -- evidenced by three unit tests: missing-key, HTTP-error, and GraphQL-error-payload cases, each asserting no exception propagates and the correct warn-message shape.
- [x] AC-4: Given taskStore.linear.stateMap is unset, When a slice or feature transitions state via LinearProvider.updateStatus, Then the default state mapping (pending->Backlog, triaged->Todo, in-progress->In Progress, done->Done) is applied and the corresponding Linear workflow-state transition mutation is sent -- evidenced by a test asserting the correct target state name is sent for each of the four default mappings.
- [x] AC-5 (COND-C descope path): Given the default v1 scope descopes syncPull and bootstrap to documented warning-stubs (no pagination/rate-limit handling), When either method is called, Then it logs a warning naming the descope and returns an empty-but-well-shaped result ({ features: [], slices: [] } / { features: [] }) without throwing and without making a real API call -- evidenced by a test asserting the warning fires and zero mock-transport calls occur.

## AC evidence (2026-07-10 close)

- AC-1: `describe("LinearProvider.publishFeature — AC-1")` in `src/tests/linear-provider-config.test.mts` — mock transport asserts `variables.input.teamId`/`title` and parsed `"AST-42"` return. PR #443 CI green.
- AC-2: `describe("LinearProvider.publishSlice — AC-2")` — parentId present with parent id, omitted when null.
- AC-3: `describe("LinearProvider soft-fail contract — AC-3")` — missing-key (zero transport calls, 'not configured' warn), HTTP 401 ('call failed' warn, no throw), GraphQL-error-payload ('Team not found' in warn, no throw). Reviewer additionally verified transport-level rejection and malformed-shape paths (artifact `20260710T120628Z-review-result-slice-156.md`).
- AC-4: `describe("LinearProvider.updateStatus — AC-4 default stateMap")` — one test per default mapping (4) asserting workflow-state lookup `variables.name`, plus stateMap-override test.
- AC-5: `describe("LinearProvider.syncPull / bootstrap — AC-5 COND-C descope")` — warning fires, empty shape returned, `calls.length === 0`.
- DEC-078 (COND-B stamping contract) written and conformance reviewer-verified: no frontmatter writes in provider, id-only publish. Merged via PR #443 (2026-07-10T12:10Z), suite 2635 pass / 0 fail.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-252 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
