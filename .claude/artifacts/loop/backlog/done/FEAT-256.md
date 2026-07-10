---
id: FEAT-256
status: done
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-10
depends_on: []
slices: [SLICE-154]
derived_from: null
pm_customer_impact: 0.25
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.5
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-10
autonomous_safe: true
triage_notes: "Small DEC-writing hygiene task reconciling FEAT-102's unmet round-trip AC and deciding scripts/linear-sync/'s fate (fold into FEAT-252 or delete). technical_risk 0.15 confirmed (known repo pattern, 1-2 files, trivially reverted). Moderate strategic value as a gate for Phase 3's reuse decision but no direct customer evidence. P2 confirmed."
tags: [workflow, docs]
needs_contract: false
needs_ux: false
started_at: 2026-07-10
github_issue: 425
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/425"
slices_complete: [SLICE-154]
completed_at: 2026-07-10
---
## Description

Tracker-provider program Phase 0 — hygiene: reconcile FEAT-102 (marked done with unsatisfied AC: Linear webhook receiver never built, LinearProvider still stub, no round-trip) by superseding it with this program's Linear work; record a DEC. Decide fate of scripts/linear-sync/ prototype (mention-parser + webhook router, unit-tested, wired to nothing): fold mention-parser/linear-types into the LinearProvider FEAT or delete — architect decides, record DEC. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5, review-approved: .claude/artifacts/crew/reviews/2026-07-09-tracker-provider-plan-review.md).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1 (DEC artifact exists -- FEAT-102 reconciliation): Given FEAT-102 sits in done/ with unmet AC (webhook receiver never built, round-trip never verified, per its own AC list), When this FEAT's slice closes, Then a new `.claude/artifacts/loop/decisions/DEC-0NN.md` exists that explicitly supersedes FEAT-102, citing which of FEAT-102's ACs remain unmet and stating that this program's Phase 3 (LinearProvider, FEAT-252) and Phase 5 (issue-flow hooks, FEAT-254) are the superseding work items -- evidenced by the DEC file's presence and a `supersedes: FEAT-102` (or equivalent) frontmatter/body reference.
- AC-2 (scripts/linear-sync/ fate -- DEC exists): Given scripts/linear-sync/ contains a unit-tested mention-parser and webhook router (linear-types.mts, mention-parser.mts, webhook-handler.mts) wired to nothing, When architect evaluates it during this FEAT, Then a DEC records one of two explicit outcomes -- (a) fold mention-parser/linear-types into FEAT-252's LinearProvider implementation, or (b) delete the prototype directory -- with rationale for whichever is chosen -- evidenced by the DEC body naming the specific real files retained or removed.
- AC-3 (edge -- fold path leaves no scope creep): Given the DEC in AC-2 chooses to fold scripts/linear-sync/ modules into FEAT-252, When the fold is recorded, Then this FEAT's own scope stops at the DEC -- it does not itself move code -- and the DEC explicitly states execution is deferred to FEAT-252's own slice, preventing this FEAT's small effort_estimate from silently absorbing FEAT-252-sized work -- evidenced by the DEC body containing an explicit 'execution deferred to FEAT-252' (or equivalent) statement.
- AC-4 (edge -- delete path leaves no dangling references): Given the DEC in AC-2 instead chooses deletion, When scripts/linear-sync/ is removed, Then a grep across the repo confirms zero remaining imports/references to the deleted paths (scripts/linear-sync/webhook-handler.mts, mention-parser, linear-types) -- evidenced by a validator or manual grep result recorded in the slice's validation artifact.
- AC-5: Given the DECs required by AC-1 and AC-2 may be combined into a single document, When this FEAT closes, Then .claude/artifacts/loop/loop-snapshot.md's 'Recent decisions' section is regenerated to include the new DEC id(s), satisfying validate-snapshot-freshness.mts -- evidenced by a green CI run of that validator after the DEC(s) land.
