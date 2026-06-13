---
feature: FEAT-117
status: active
---
# Run Brief: FEAT117 SLICE117: Markdown Workflow recipes with frontmatter + slash invocation

- Created: 2026-06-13T10:58:30.020Z
- Tier: full
- Goal: Competitor gap audit (2026-05-28). Surfaced by:
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Add `name` and `auto_execute_steps: false` frontmatter fields to all 44 `commands/*.md` files
- Export `validateCommandFrontmatter(repoRoot)` from `src/scripts/validate-manifests.mts`
- Wire validator into `validateManifests` function
- Create `src/tests/command-frontmatter.test.mts` with at least 5 test cases
- Out Of Scope:
  - - Runtime wiring of `auto_execute_steps` to `autoMode` logic
- Nested workflow composition (`/command-name` calling another)
- Planned Files: -
- Next Step: Begin implementation

