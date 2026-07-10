---
run: slice-157-158-completion
slices: [SLICE-157, SLICE-158]
feature: FEAT-252
validator: main-thread manual smoke (per slice AC "one documented manual smoke against Astragenie workspace")
decision: passed
recorded_at: 2026-07-10T13:15:00Z
---

# Validation — LinearProvider live smoke against Astragenie workspace

Per SLICE-157/158 AC requirement: "one documented manual smoke against
Astragenie workspace in validation artifact". Executed twice on 2026-07-10
from the local machine using the user-level `LINEAR_API_KEY` (env-first auth
path; key never logged or persisted). Team `AST`, teamId
`81cea472-33a9-4fbe-a797-147e17c6ca05`. Test issues clearly labeled
"[SMOKE TEST — safe to delete]" and archived immediately after each run —
workspace left clean.

## Run 1 — pre-fix (commit 19d7e292, main): PARTIAL FAIL → found live bug

| Step | Method | Result |
|------|--------|--------|
| issueCreate (feature) | `publishFeature` | PASS — created `AST-22`, default state Backlog |
| commentCreate | `postSliceComment` | PASS — 1 comment visible via API read-back |
| workflow-state transition | `updateStatus(id, "done")` | **FAIL** — live API rejected: `Variable "$teamId" of type "String!" used in position expecting type "ID".` Soft-fail contract held: warned, returned, no throw. Issue stayed Backlog. |
| cleanup | `issueArchive` | PASS |

Mock-transport unit tests could not catch this (variable-type mismatch only
surfaces at the real GraphQL endpoint). Root cause confirmed against Linear's
published schema: `WorkflowStateFilter.team.id` is an `IDComparator`, so the
`$teamId` variable must be declared `ID!`.

## Fix

`src/scripts/lib/task-store/linear-graphql.mts` — `WORKFLOW_STATE_BY_NAME_QUERY`
declaration `$teamId: String!` → `$teamId: ID!` (commit 8c5c3b0c). All other
ops audited against the schema: `issueUpdate(id: String!)`,
`IssueCreateInput.teamId/parentId: String`, `CommentCreateInput.issueId: String`
— already correct, unchanged. Query-text regression assertions added in
`src/tests/linear-provider.test.mts` so a future revert fails under mocks.

## Run 2 — post-fix (commit 8c5c3b0c, feat/slice-157-158-completion): PASS

| Step | Method | Result |
|------|--------|--------|
| issueCreate (feature) | `publishFeature` | PASS — created `AST-23`, state Backlog |
| commentCreate | `postSliceComment` | PASS — 1 comment |
| workflow-state transition | `updateStatus(id, "done")` | **PASS — state read back as `Done`** (default stateMap done→Done) |
| cleanup | `issueArchive` | PASS — success true |

## Verdict

PASS. All four live write paths (issueCreate, commentCreate, workflow-state
lookup + transition, archive cleanup) verified against the real Linear API;
soft-fail contract verified under a real API error in run 1. Smoke script:
session scratchpad `linear-smoke.mts` (not committed — contains no secrets,
reads `LINEAR_API_KEY` from env only).
