# PM Agent — Design Spec

**Date:** 2026-05-27
**Status:** Approved
**Approach:** A — PM Agent + Enhanced Triage (inside loop plugin)

## Problem

Loop triage is regex-based — scans feature body for keywords, fills priority/category with heuristics. No understanding of business impact, customer demand, strategic alignment, dependency topology, or risk. `autonomous_safe` flag set manually. The gap between "cheap regex fill" and "PM-quality prioritization" leaves the autonomous loop picking work without informed judgment.

## Goal

Add a `loop:pm` agent to the loop plugin that replaces regex triage with LLM-powered product management. Agent embeds gstack-style questioning frameworks (ported, no runtime dependency). Runs autonomously in the loop before Cross-Slice Continuation picks the next feature. Produces scored frontmatter + durable PM review artifacts.

## Agent Identity

- **Name:** `pm`
- **Color:** purple
- **Role:** Product manager — read-only. No code edits. Reads specs, features, grades, decisions. Writes frontmatter updates to FEAT files + PM review artifacts.
- **Tools:** Read, Grep, Glob, Bash (read-only git commands)
- **Dispatch:** Loop orchestrator dispatches before picking next slice. Also callable interactively.
- **When to use:** `/loop:pm-triage`, `/loop:pm-review`, `/loop:pm-decompose`, or when the loop needs to score pending features before picking next slice.

## Scoring Dimensions

All dimensions scored 0.0 to 1.0 (consistent with grade scoring convention). Higher = more.

| Dimension | 0.0 | 1.0 |
|---|---|---|
| `customer_impact` | Nice-to-have, no evidence | Critical pain, strong evidence |
| `effort_estimate` | Trivial, single-file change | Multi-slice epic, cross-service |
| `strategic_alignment` | Tangential to mission | Core mission, roadmap centerpiece |
| `technical_risk` | Safe, well-understood patterns | Unknown territory, new deps |
| `dependency_depth` | Fully independent | Blocked by 3+ unresolved items |

## Frontmatter Schema

Added to FEAT-NNN.md by PM agent:

```yaml
pm_review:
  reviewed_at: 2026-05-27
  customer_impact: 0.80
  effort_estimate: 0.35
  strategic_alignment: 0.95
  technical_risk: 0.40
  dependency_depth: 0.15
  composite_priority: P1
  autonomous_safe: true
  demand_evidence: "Grade feedback from SLICE-27 flagged missing pagination"
  scope_notes: "Bounded to API + dashboard. No mobile."
  risks: ["pgvector index rebuild may lock table"]
```

## Priority Derivation (deterministic, in pm-scorer.mjs)

- **P0:** impact >= 0.8 AND (category = bugfix OR technical_risk >= 0.8)
- **P1:** (impact >= 0.7 AND alignment >= 0.6) OR (alignment >= 0.8 AND effort <= 0.4)
- **P3:** effort >= 0.7 AND impact <= 0.3
- **P2:** everything else

## autonomous_safe Computation

- **true** when: risk <= 0.6, effort <= 0.6, has linked spec or clear acceptance criteria, no unresolved dependency
- **false** when: any risk > 0.6, no spec, unclear scope, cross-team dependency, demand_evidence = "none"

## Embedded Frameworks (ported from gstack)

### Framework 1: Demand Assessment (from /office-hours)

For each FEAT, agent answers:
- **Who wants this?** Specific user/persona, not "users would like..."
- **Evidence?** Grade lessons, bug reports, user feedback, or spec mandate. No evidence = impact <= 0.3
- **Current workaround?** If users survive without it, impact drops
- **Frequency?** Daily pain vs. edge case

### Framework 2: Scope Challenge (from /plan-ceo-review)

- **Smallest deliverable?** Strip to minimum that delivers the value
- **What would you cut?** If forced to halve scope, what stays?
- **Overlap?** Does this duplicate existing capability?
- **Acceptance criteria clarity?** Vague AC = autonomous_safe: false

### Framework 3: Risk Radar (loop-native)

- **Technical unknowns?** New tech, external API, schema migration
- **Dependency chain?** Blocks or blocked-by other FEATs/slices
- **Grade history signal?** Past slices in same area — did they score low on reliability/security?
- **Blast radius?** How many files/services touched? Cross-repo?

## Anti-Hallucination Guardrails

Agent MUST:
- Quote evidence from files it actually read (spec body, grade lessons, feature body)
- Say "no evidence found" when there isn't any — never fabricate demand
- Flag `demand_evidence: "none"` explicitly when scoring impact without backing

## Skills

### /loop:pm-triage

Auto-triage all pending FEATs. Dispatched by the loop before Cross-Slice Continuation.

1. Read all `pending/` FEATs via `listBacklog`
2. For each: read body + linked spec (if `derived_from`) + recent grades (for demand evidence)
3. Run PM scoring (demand assessment, scope challenge, risk radar)
4. Write `pm_review` block to FEAT frontmatter
5. Move `pending/` to `triaged/`
6. Return summary table: FEAT-NNN | priority | autonomous_safe | one-line reasoning

### /loop:pm-review --id FEAT-NNN

Deep review of a single feature. Interactive — shows reasoning, asks user to confirm or override scores. Used for high-stakes items or when user disagrees with auto-triage.

### /loop:pm-decompose --id SPEC-NNN

Enhanced spec decomposition. Current `/loop:spec-decompose` creates bare FEAT stubs. PM version:

1. Read spec body
2. Identify natural feature boundaries (using scope challenge framework)
3. Pre-score each proposed feature before creating it
4. Set `autonomous_safe` and estimated priority on creation
5. Flag features that need human review before autonomous work

## Loop Integration

Cross-Slice Continuation rule updated:

1. Scan `specs/` — decompose undecomposed (existing)
2. Scan `backlog/pending/` — **dispatch loop:pm for triage** (NEW)
3. Pick highest-priority triaged feature (existing, now uses `composite_priority`)
4. Promote to slice (existing)

PM agent runs as subagent — same dispatch pattern as `crew:builder`.

## PM Review Artifacts

Written to `.claude/artifacts/loop/pm-reviews/FEAT-NNN-review.md`. Contains full reasoning chain: demand assessment, scope challenge, risk radar, final scores. Referenced from FEAT frontmatter via `pm_review_artifact:` field.

## File Inventory

### New files

| File | Type | Purpose |
|---|---|---|
| `agents/pm.md` | Agent | System prompt with 3 frameworks, scoring contract, guardrails |
| `skills/pm-triage.md` | Skill | Auto-triage all pending FEATs via loop:pm dispatch |
| `skills/pm-review.md` | Skill | Interactive deep review of single FEAT |
| `skills/pm-decompose.md` | Skill | Enhanced spec-to-feature decomposition with pre-scoring |
| `scripts/lib/pm-scorer.mjs` | Module | Parse PM scores from frontmatter, compute composite priority, derive autonomous_safe |
| `scripts/lib/pm-artifact-writer.mjs` | Module | Write PM review artifacts |
| `tests/pm-scorer.test.mjs` | Test | Priority derivation, autonomous_safe logic, edge cases |
| `templates/pm-review.md` | Template | PM review artifact template |

### Modified files

| File | Change |
|---|---|
| `scripts/lib/backlog-triage.mjs` | Replace regex heuristics with pm-scorer import. Keep regex as fast-path fallback |
| `scripts/lib/backlog-writer.mjs` | Add `writePmReview()` to update FEAT frontmatter with `pm_review` block |
| `scripts/lib/backlog-parser.mjs` | Parse `pm_review` from frontmatter. Update `comparePickOrder` to use `composite_priority` when present |
| `templates/loop-rules.md` | Insert PM triage step in Cross-Slice Continuation |
| `templates/backlog/feature-template.md` | Add empty `pm_review:` block |
| `plugin.json` | Register pm agent |

## Out of Scope

- gstack runtime dependency (ported patterns only)
- Crew plugin changes (PM is a loop role)
- Grade parser modifications (PM reads grades, doesn't modify grading)
- UI/dashboard for PM scores (future — LoopObserver could render)
