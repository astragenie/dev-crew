---
feature: FEAT-175
status: active
---
# Run Brief: FEAT175 SLICE125: Artifact link-integrity checker and graph emitter for FEAT/SPEC/DEC/slice cross-links

- Created: 2026-06-13T14:49:54.428Z
- Tier: full
- Goal: Competitor gap (Maestro v0.15.3). Maestro ships a Document Graph: interactive visualization of markdown wiki-link relationships with orphan detection. Loop's artifact corpus (FEAT <-> SPEC <-> DEC <-> slice <-> grade linkage in frontmatter and bodies) has no validation - broken or orphaned links rot silently as files move between state directories. Proposal: a loop CLI subcommand that walks all artifacts, validates every cross-reference (frontmatter linkage arrays, declined_per clause ids, super
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `src/scripts/lib/artifact-linker.mts`: `checkArtifactLinks(repoPath): Promise<LinkReport>` — validates `depends_on` FEAT ids
  - `derived_from` SPEC ids
  - `supersedes` DEC ids
  - `declined_per` clause ids; reports broken (id not found in any state dir) and orphaned (grade with no referenced slice) items
- Emits Mermaid graph of FEAT → slice → grade topology as a string in `LinkReport.mermaid`
- New `loop lint-artifacts [--repo] [--json]` CLI subcommand
- `src/tests/artifact-linker.test.mts` ≥5 tests using synthetic temp artifact directories
- Out Of Scope:
  - - Wiki-link (`[[...]]`) body text scanning
- CI gate wiring (follow-up FEAT)
- Interactive graph visualization
- Planned Files: -
- Next Step: Begin implementation

