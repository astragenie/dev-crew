---
id: FEAT-255
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-10
depends_on: [FEAT-250]
slices: []
derived_from: null
pm_customer_impact: 0.3
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.5
pm_technical_risk: 0.25
pm_dependency_depth: 0.3
pm_composite_priority: P3
pm_autonomous_safe: false
pm_reviewed: 2026-07-10
autonomous_safe: false
triage_notes: "Low-risk CLI+docs program closeout with a hard COND-E split -- in-repo work (AC-1..4) is autonomous_safe-shaped, the dev-team edit (AC-5) explicitly is not. FEAT-level autonomousSafe stays false pending a slice split that isolates the two; technical_risk 0.25 confirmed (known repo pattern, 1-2 modules, clean rollback). P3 confirmed."
tags: [workflow, docs]
needs_contract: false
needs_ux: false
github_issue: 503
github_url: https://github.com/astragenie/runner-plugin/issues/503
---
## Description

Tracker-provider program Phase 6 — prompt hygiene + docs + release. (1) New CLI subcommand: loop.mts backlog tag-merge --id FEAT-NNN --tags a,b — additive frontmatter tag merge routed through BacklogStore. (2) Cross-repo (manual verification step per review COND-E, NOT a CI AC of this repo): rewrite dev-team commands/architect-feature.md Step 0+3 (lines ~128-148, the only prompt-file offender across both repos — instructs agents to hand-glob and hand-write FEAT frontmatter tags) to call the new CLI, mirroring that file's own Step 4 pattern; verify which loop CLI the command resolves and wire accordingly. (3) Re-run the prompt scan (agents/*.md, commands/*.md, skills/**/SKILL.md in runner-plugin AND dev-team) -> zero remaining direct tracking-file write instructions; record result in Phase 6 validation artifact. (4) Docs: CLAUDE.md task-store section update, docs/halt-badges.md if new badges, CHANGELOG via runner:document-writer, regenerate loop-snapshot (snapshot-freshness CI gate). depends_on: FEAT-250. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1 (in-repo CLI -- happy path): Given a FEAT file with existing `tags: [workflow]`, When `loop.mts backlog tag-merge --id FEAT-NNN --tags docs,hygiene` is invoked, Then it additively merges the new tags into the existing array (result: `[workflow, docs, hygiene]`, no duplicates) routed through BacklogStore's `updateFeatureFrontmatter` rather than a hand-rolled fs write -- evidenced by a CLI test asserting the merged tag array and no duplicate entries when a tag already present is re-passed.
- AC-2 (in-repo CLI -- edge, nonexistent FEAT id): Given `--id FEAT-99999` referencing an id that does not exist in any backlog directory, When `backlog tag-merge` is invoked, Then it exits non-zero with a clear 'FEAT not found' error and makes no writes -- evidenced by a CLI test asserting the exit code and confirming no file mutation occurred.
- AC-3 (in-repo prompt scan -- CI AC): Given this repo's `agents/*.md`, `commands/*.md`, and `skills/**/SKILL.md` files, When the Phase 6 prompt-scan re-run executes, Then zero files in THIS repo (runner-plugin) contain direct tracking-file hand-write instructions -- evidenced by a CI-gated validator script asserting zero matches, with the result recorded in the Phase 6 validation artifact.
- AC-4 (docs, in-repo): Given CLAUDE.md's task-store section and docs/halt-badges.md predate this FEAT's provider/CompositeProvider work (FEAT-251/253), When Phase 6 docs land, Then CLAUDE.md documents the new `backlog tag-merge` subcommand and the `taskStore.providers` array form, docs/halt-badges.md gains an entry for any new halt-badge introduced by this program (or explicitly states none were added), and `bun src/scripts/loop.mts snapshot-memory` is re-run so loop-snapshot.md passes `validate-snapshot-freshness.mts` -- evidenced by a green CI run of that validator plus a CHANGELOG entry via runner:document-writer.
- AC-5 (cross-repo, manual verification -- explicitly NOT a CI AC of this repo, per COND-E): Given dev-team/commands/architect-feature.md Step 0+3 (lines ~128-148) currently hand-writes FEAT frontmatter tags instead of calling the new `backlog tag-merge` CLI, When a human or a dev-team-scoped session rewrites those steps to call the CLI (mirroring that file's own Step 4 pattern) and re-runs the cross-repo prompt scan, Then zero remaining direct tracking-file write instructions exist across BOTH repos -- evidenced by a manually recorded result in the Phase 6 validation artifact, explicitly excluded from this repo's automated CI gate since dev-team is a separate repository outside runner-plugin's dispatch authority.
