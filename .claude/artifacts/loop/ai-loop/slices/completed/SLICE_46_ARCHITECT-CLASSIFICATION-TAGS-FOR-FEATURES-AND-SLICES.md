---
id: SLICE-46
status: completed
feature: FEAT-048
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-05
updated: 2026-06-05
completed_at: 2026-06-05
github_issue: 104
github_url: "https://github.com/sergeymilashico/loop/issues/104"
---
# SLICE-46: Architect classification tags for features and slices

Implements FEAT-048. See [feature file](../../../backlog/in-progress/FEAT-048.md) for product context.

## Objective

Acceptance criteria: AC-1: sliceFromFeature auto-dispatches loop:architect to classify the new slice and writes tags, needs_contract, needs_ux to slice frontmatter before returning. AC-2: /loop:backlog-enrich command iterates all triaged features missing tags and runs architect classification pass, writing results to FEAT frontmatter. AC-3: classification is skipped (not an error) when feature/slice already has explicit tags or needs_contract/needs_ux set. AC-4: enrich command prints a summary of how many features were enriched vs already tagged. AC-5: sliceFromFeature enrichment can be skipped via --no-classify flag for speed.

## In scope

- `sliceFromFeature` auto-dispatches `loop:architect` to classify the slice; writes `tags`, `needs_contract`, `needs_ux` to slice frontmatter
- New `backlog enrich` (or `backlog-enrich`) CLI subcommand iterating triaged FEATs missing tags
- `--no-classify` flag on `sliceFromFeature` to skip classification
- Skip logic when tags / needs_contract / needs_ux already set

## Out of scope

- Changing architect classification logic itself
- Modifying how orchestrate-slice uses the tags (already wired in v0.7.7)

## Acceptance criteria

- [ ] AC-1: `node scripts/loop.mjs slice from-feature --id FEAT-NNN` auto-dispatches `loop:architect` and writes `tags`, `needs_contract`, `needs_ux` fields to the resulting slice frontmatter
- [ ] AC-2: `node scripts/loop.mjs backlog enrich` iterates all triaged FEATs missing `tags` field, runs architect classification, writes results to FEAT frontmatter; prints summary of enriched vs already-tagged count
- [ ] AC-3: classification is skipped without error when feature/slice already has `tags`, `needs_contract`, or `needs_ux` set
- [ ] AC-4: `node scripts/loop.mjs slice from-feature --id FEAT-NNN --no-classify` completes without dispatching architect
- [ ] AC-5: `npm test` passes; `npm run lint` clean; `npm run typecheck` clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-048 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
