---
id: SLICE-84
status: completed
feature: FEAT-134
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-09
reviews: [.claude/artifacts/crew/reviews/20260609T144908Z-review-result-feat-134-slice-84-skill-activation-triggers-parser-and-integ.md]
updated: 2026-06-09
completed_at: 2026-06-09
github_issue: 187
github_url: "https://github.com/sergeymilashico/loop/issues/187"
---
# SLICE-84: Skill activation triggers (always_on | glob | manual)

Implements FEAT-134 SLICE-A (first slice). See [feature file](../../../backlog/triaged/FEAT-134.md) for product context.

## Objective

Skills in `skills/**/SKILL.md` declare a `trigger` field in YAML frontmatter controlling when the loop installer renders invocation instructions into MASTER_PROMPT. Default `always_on` preserves backward compatibility. `manual` renders a note that the skill should only be invoked when the user explicitly requests it. `glob` renders a conditional instruction tied to file patterns. `model_decision` is explicitly deferred to a second slice.

## In scope

- New `src/scripts/lib/skill-frontmatter.mts`:
  - `parseSkillFrontmatter(content: string): SkillMeta` — reads `name`, `description`, `trigger` (default `"always_on"`), and `globs?: string[]` from SKILL.md YAML frontmatter
  - `SkillMeta` type: `{ name: string; description: string; trigger: "always_on" | "glob" | "manual" | "model_decision"; globs: string[] }`
- New async `buildSkillActivationBlock(skillsDir: string): Promise<string>` in `src/scripts/lib/loop-installer-tokens.mts`:
  - Walks `skillsDir` for `**/SKILL.md` files, parses each with `parseSkillFrontmatter`
  - Filters to skills whose trigger is `"manual"` or `"glob"` (always_on rendered nothing — backward-compat)
  - Returns empty string when no conditional skills found (no heading emitted) or when `skillsDir` does not exist (ENOENT handled gracefully)
  - Renders a `## Conditional skill activation` section with per-trigger instructions
- Update `buildTokens()` in `loop-installer-tokens.mts` to accept optional `extras?: { skillActivationBlock?: string }` and include it in the returned tokens map
- Update `loop-installer.mts` to call `buildSkillActivationBlock(skillsDir)` and pass result to `buildTokens`
- Add `{{skillActivationBlock}}` token to `templates/master-prompt.md` after the `{{contextRulesList}}` line
- Unit tests in `src/tests/skill-frontmatter.test.mts`:
  - `parseSkillFrontmatter` with no `trigger` field → defaults to `"always_on"`, empty `globs`
  - `trigger: "always_on"` explicit → `"always_on"`
  - `trigger: "manual"` → `"manual"`, empty `globs`
  - `trigger: "glob"` + `globs: ["**/*.test.ts"]` → correct fields
  - `trigger: "model_decision"` → accepted by parser (value preserved), not rendered by `buildSkillActivationBlock`
- Unit tests in `src/tests/loop-installer-tokens.test.mts` extending existing suite:
  - `buildSkillActivationBlock` with empty dir (or no conditional skills) → empty string
  - One `manual` skill → renders "only when user explicitly requests" instruction containing the skill name
  - One `glob` skill with patterns → renders instruction with glob patterns
  - Mixed `always_on` + `manual` → only `manual` skill appears in output
  - `buildTokens({ skillActivationBlock: "..." })` → output contains passed block

## Out of scope

- `model_decision` lazy-load mechanism (description-first fetch) — deferred to SLICE-85
- Runtime glob matching at tool-call time (Claude Code has no file-open event API)
- New `loop context-rules` or `loop skills` CLI subcommand
- Backfilling existing SKILL.md files with `trigger` field (builder may add to a few key skills as examples but is not required)
- Config schema validation for `trigger` values beyond TypeScript type checking

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`), linter clean (`npm run lint`), typecheck passes (`npm run typecheck`), format-check passes (`npm run format:check`), manifest validator passes, content-length validator passes
- [ ] AC-2: `parseSkillFrontmatter` correctly reads `trigger` (defaulting to `"always_on"` when absent) and `globs` (defaulting to `[]`) from a SKILL.md string; returns a typed `SkillMeta` object
- [ ] AC-3: `buildSkillActivationBlock` returns empty string when the skills directory contains no `manual` or `glob` trigger skills (no "Conditional skill activation" heading emitted into MASTER_PROMPT)
- [ ] AC-4: `buildSkillActivationBlock` with a `trigger: "manual"` SKILL.md renders a conditional instruction stating the skill name should only be invoked when the user explicitly requests it
- [ ] AC-5: `buildSkillActivationBlock` with a `trigger: "glob"` SKILL.md and `globs: ["**/*.test.ts"]` renders a conditional instruction containing both the skill name and the glob pattern
- [ ] AC-6: Unit tests in `src/tests/skill-frontmatter.test.mts` cover: absent trigger (default), explicit `always_on`, `manual`, `glob` + globs, `model_decision` (parsed but not rendered)
- [ ] AC-7: `buildTokens` output includes a `skillActivationBlock` key, and `{{skillActivationBlock}}` in `templates/master-prompt.md` renders as empty string when no conditional skills are present (no blank heading)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-134 moved from `triaged/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (correctness): Verify `parseSkillFrontmatter` handles missing/empty frontmatter gracefully, `trigger` type union is exhaustive, `buildSkillActivationBlock` correctly filters `always_on` + `model_decision` from output, `buildTokens` extras passthrough is backward-compatible, template token placement correct.
- Reviewer B (production-readiness): Verify async `buildSkillActivationBlock` handles ENOENT on missing skills dir gracefully (returns empty string), no cyclomatic complexity violations in new helpers, content-length validator passes for any updated SKILL.md files, template renders no blank `##` heading when block is empty.
