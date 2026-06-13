---
slice: unknown
builder: fullstack-dev
run_id: 20260613T085500Z
feat: FEAT-112
files_touched: ["commands/slice-start.md"]
files_read: []
diff_stat: { files: 1, additions: 0, deletions: 73 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-115: add role glossary to orchestrate-slice command files

- Created: 2026-06-13T08:55:00.414Z
- From: fullstack-dev
- To: lead
- Objective: Added Role glossary table to commands/slice-start.md listing all 8 roles with agent IDs and one-line descriptions; both CI validation scripts pass.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - commands/slice-start.md
- Confidence: high
- Risks: -
- Suggested Next Handoff: -


## Diff

```diff
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-112.md b/.claude/artifacts/loop/backlog/triaged/FEAT-112.md
deleted file mode 100644
index 1218fdd..0000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-112.md
+++ /dev/null
@@ -1,73 +0,0 @@
----
-id: FEAT-112
-status: triaged
-priority: P3
-category: competitor-gap
-target_release: null
-created: 2026-06-08
-updated: 2026-06-08
-depends_on: []
-slices: []
-derived_from: null
-composite_score: 7
-source_competitors: [GitHub Copilot Workspace / GitHub Copilot App]
-autonomous_safe: true
-tags: [documentation, ux, transparency]
-needs_contract: false
-needs_ux: false
-pm_customer_impact: 0.2
-pm_effort_estimate: 0.1
-pm_strategic_alignment: 0.45
-pm_technical_risk: 0.1
-pm_dependency_depth: 0.05
-triage_notes: "Composite 7 but original Impact: 1, Effort: 0. Named sub-agents with stable user-facing identity. loop already has well-named roles (builder/reviewer/validator/deployer/researcher/pm/architect). The gap is surfacing role attribution per phase in the slice-progress output. This is a docs/template change. Effort: 0 in original is accurate for minimum scope. P3: low customer impact, trivially achievable but marginal value."
-github_issue: 181
-github_milestone: null
-github_url: "https://github.com/sergeymilashico/loop/issues/181"
----
-# FEAT-112: Named sub-agents with stable user-facing identity (brainstorm / plan / repair)
-
-## Source
-
-Competitor gap audit (2026-05-28). Surfaced by:
-- GitHub Copilot Workspace / GitHub Copilot App
-
-## Description
-
-Copilot Workspace names its sub-agents in product UI -- brainstorm, plan, repair. The naming is user-discoverable and discussed in documentation. loop / crew have richer role separation (builder / reviewer / validator / deployer / researcher / pm / architect) but the names are infrastructure-internal; end users invoke slash commands. Publishing a "loop role glossary" at slice-start (the slice-progress dashboard already exists -- add a per-phase role-attribution line) would raise transparency without architecture change.
-
-## PM Scoring
-
-```json
-{
-  "featureId": "FEAT-112",
-  "scores": {
-    "customer_impact": 0.20,
-    "effort_estimate": 0.10,
-    "strategic_alignment": 0.45,
-    "technical_risk": 0.10,
-    "dependency_depth": 0.05
-  },
-  "compositePriority": "P3",
-  "autonomousSafe": true,
-  "demandEvidence": "none — inferred from Copilot Workspace audit. Roles are already documented in CLAUDE.md (builder/reviewer/validator etc.).",
-  "scopeNotes": "Minimum: add a one-line role-attribution header to each phase in the orchestrate-slice.md template. No code change required. If done as docs-only, this is a single-file edit to agents/ or docs/.",
-  "risks": ["No significant risks — docs-only change"],
-  "reasoning": "P3: near-zero effort, near-zero impact; roles are already documented in CLAUDE.md; marginal transparency gain."
-}
-```
-
-## Scoring
-
-- Impact: 1
-- Effort: 0
-- Fit: 3
-- Composite: 7 / 9
-
-## References
-
-- https://github.com/githubnext/copilot-workspace-user-manual/blob/main/overview.md
-
-## Consider rejecting because
-
-Impact score of 1 (lowest tier). loop's role names (builder/reviewer/validator/etc.) are already documented in CLAUDE.md and README.md. This is a docs cosmetic improvement. The role glossary could be added to docs/ as a one-time editorial task without a formal FEAT and slice ceremony.

```

## Files touched

### commands/slice-start.md

```
---
description: Open a slice — rotate workflow-state.currentRun via write-run-brief, refresh slice-progress dashboard.
---

# Slice Start

Symmetric counterpart to `/loop:slice complete`. Run this
**before** beginning acceptance-criteria work on a new slice so cost
auto-emit windows attribute the session to the right slice.

What it does:

1. Looks up the slice's title from the active plan (newest
   `docs/superpowers/plans/*.md` by mtime, falling back to
   `docs/ai-loop/backlog/approved-slices.md`).
2. Reads the slice file's `## Objective` block (if present) to seed the
   run-brief goal.
3. Invokes `crew write-run-brief --title "<SLICE-NN>: <title>"` — this
   rotates `.claude/state/crew/workflow-state.json.currentRun` and sets
   `startedAt` to now. Subsequent cost-slice / cost-advise emits use
   this window.
4. Rewrites `.claude/state/crew/slice-progress.md` so the dashboard
   reflects the new IN_PROGRESS slice.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice start \
  --repo "$PWD" \
  --id SLICE-NN \
  [--goal "<one-line goal override>"] \
  [--no-dispatch]
```

`--no-dispatch` opts out of the dispatch instruction (used for manual /
debugging invocations where the agent is doing the slice work
in-conversation). The autonomous loop should always omit this flag so
implementation runs through a `crew:fullstack-dev` subagent (the parent loop
then drives the `crew:inspector` and `crew:verifier` gates separately
before closing the slice).

Returns:

```json
{
  "slice": { "id": "SLICE-18", "title": "SLICE-18: ICrewArtifactSource + ObservedApplication source fields" },
  "activePlan": { "source": "superpowers", "path": "docs/superpowers/plans/2026-05-22-crew-monitor-phase-2.md" },
  "runBrief": { "artifactPath": ".claude/artifacts/crew/runs/<stamp>-run-brief-slice-18-...md" },
  "sliceProgress": { "path": ".claude/state/crew/slice-progress.md", "completedCount": 17, "totalCount": 19 },
  "dispatchInstruction": "Dispatch crew:fullstack-dev subagent with this prompt:\n\n> Implement SLICE-18: ICrewArtifactSource + ObservedApplication source fields. See `docs/ai-loop/04-implementation-slices/SLICE_18_SOURCE_ABSTRACTION.md` for acceptance criteria. Goal: Add abstraction for artifact sources... You own implementation only — frame, edit, run the self-verify gates, and return a write-handoff artifact path. Do NOT dispatch crew:inspector or crew:verifier yourself; the parent loop drives those gates separately after you return. When acceptance criteria PASS with evidence in your self-verify gates, return control so the parent loop can dispatch crew:inspector, then crew:verifier if behavior changed, then run /loop:slice complete --id SLICE-18.",
  "nextAction": "Dispatch crew:fullstack-dev subagent for SLICE-18; then dispatch crew:inspector (and crew:verifier if behavior changed); close with /loop:slice complete --id SLICE-18."
}
```

`dispatchInstruction` is null when `--no-dispatch` was passed.

## When to run

Per `Slice Start Ceremony — HARD RULE` in `.claude/loop/rules.md`:
at the top of every slice, before any TDD / implementation work. Do
NOT begin a slice without rotating `currentRun` — a stale window makes
the close ceremony's cost auto-emit attribute work to the wrong slice.

## What to do after

The returned `nextAction` is a literal prompt to follow:

1. Dispatch `crew:fullstack-dev` subagent for slice implementation. Builder
   owns implementation only and returns a write-handoff artifact path
   when acceptance criteria PASS in its self-verify gates.
2. Dispatch `crew:inspector` subagent for the review gate. Pass it the
   builder's handoff artifact path and the slice file path.
3. If behavior changed, dispatch `crew:verifier` subagent for the
   validation gate.
4. Run `/loop:slice complete --id SLICE-NN` to close.

## Role glossary

Each slice passes through a fixed set of named roles. This table is the
canonical reference — descriptions match `constitution.md` (Team Roles)
and `CLAUDE.md` (Owned agents).

| Role | Agent ID | Responsibility |
|---|---|---|
| **builder** | `crew:fullstack-dev` / `crew:backend-dev` / `crew:frontend-dev` | Implements acceptance criteria in bounded scope; owns tests for changed behavior |
| **reviewer A** | `crew:inspector` | Correctness, logic, edge cases, AC coverage |
| **reviewer B** | `crew:inspector` | Production-readiness, observability, security |
| **validator** | `crew:verifier` | Behavior validation — runs or inspects the changed behavior against ACs |
| **deployer** | `crew:release-engineer` | Deployment and environment evidence; promotion to dev/prod |
| **researcher** | `loop:researcher` | Read-only code archaeology and fact gathering before a change is proposed |
| **pm** | `loop:pm` | Backlog scoring across 5 dimensions; AC clarity gate; `autonomous_safe` determination |
| **architect** | `loop:architect` | Read-only design and ADR authoring for structural changes; prepend before SLICE-A of new contracts |

```

## Files read

