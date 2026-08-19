---
id: FEAT-011
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.5
pm_technical_risk: 0.35
pm_dependency_depth: 0.25
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Bounded, mechanical rollout-completion chore using already-built, already-used tooling (installer + migrate-adopter); the only real unknown is the two repos' specific pre-existing marker-block shape, which is why technical_risk sits at 0.35 rather than the trivial 0.15 band."
tags: ["stack:typescript", "area:adopter-migration", "concern:rollout"]
needs_contract: false
needs_ux: false
---
## Description

Migrate the two skipped adopters (kb, standards): run the devcrew installer against each (they have no .claude/loop.json so migrate-adopter refused to render), pick a sensible preset per repo, then run migrate-adopter to collapse their crew:start marker blocks; both repos end with exactly one devcrew block, a devcrew.json, and a local commit.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the kb repo with no .claude/loop.json, When the devcrew installer is run against it with a selected preset, Then it renders a valid loop.json and the repo becomes migratable.
- AC-2: Given the standards repo in the same pre-migration state, When the same installer+migrate-adopter sequence runs, Then it independently reaches the same end state without depending on kb's migration order.
- AC-3: Given either repo after migration, When its CLAUDE.md is inspected, Then it contains exactly one devcrew marker block (no duplicate or orphaned crew:start blocks) and a devcrew.json is present.
- AC-4: Given the migration is complete for a repo, When the change is reviewed, Then it is captured as a single local commit in that repo (no push performed as part of this FEAT).
