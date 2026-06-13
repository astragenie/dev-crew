---
id: SLICE-125
title: Artifact link-integrity checker and graph emitter for FEAT/SPEC/DEC/slice cross-links
status: pending
feature: FEAT-175
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 264
github_url: "https://github.com/sergeymilashico/loop/issues/264"
---
# SLICE-125: Artifact link-integrity checker and graph emitter for FEAT/SPEC/DEC/slice cross-links

Implements FEAT-175. See [feature file](../../../backlog/in-progress/FEAT-175.md) for product context.

## Objective

Competitor gap (Maestro v0.15.3). Maestro ships a Document Graph: interactive visualization of markdown wiki-link relationships with orphan detection. Loop's artifact corpus (FEAT <-> SPEC <-> DEC <-> slice <-> grade linkage in frontmatter and bodies) has no validation - broken or orphaned links rot silently as files move between state directories. Proposal: a loop CLI subcommand that walks all artifacts, validates every cross-reference (frontmatter linkage arrays, declined_per clause ids, supersedes chains, spec derivation), reports broken/orphaned links, and emits a Mermaid graph of the artifact topology. Candidate CI gate alongside validate-manifests. Scoring: impact 2 / effort 1 / fit 3 (composite 6).

## In scope

- New `src/scripts/lib/artifact-linker.mts`: `checkArtifactLinks(repoPath): Promise<LinkReport>` — validates `depends_on` FEAT ids, `derived_from` SPEC ids, `supersedes` DEC ids, `declined_per` clause ids; reports broken (id not found in any state dir) and orphaned (grade with no referenced slice) items
- Emits Mermaid graph of FEAT → slice → grade topology as a string in `LinkReport.mermaid`
- New `loop lint-artifacts [--repo] [--json]` CLI subcommand
- `src/tests/artifact-linker.test.mts` ≥5 tests using synthetic temp artifact directories

## Out of scope

- Wiki-link (`[[...]]`) body text scanning
- CI gate wiring (follow-up FEAT)
- Interactive graph visualization

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test`) and linter is clean (`bun run lint`)
- [ ] AC-2: `checkArtifactLinks(repoPath)` identifies a broken `depends_on` reference (FEAT that references a non-existent id) and an orphaned grade file (no matching slice in `completed/`) in a synthetic temp directory. `LinkReport.mermaid` contains at least one valid Mermaid edge. Verified by ≥5 tests.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-175 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
