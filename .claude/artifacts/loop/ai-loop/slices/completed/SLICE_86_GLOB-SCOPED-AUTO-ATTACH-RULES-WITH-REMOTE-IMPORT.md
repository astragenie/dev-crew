---
id: SLICE-86
status: completed
feature: FEAT-082
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-09
updated: 2026-06-09
completed_at: 2026-06-09
---
# SLICE-86: Glob-scoped auto-attach rules with remote import

Implements FEAT-082. See [feature file](../../../backlog/in-progress/FEAT-082.md) for product context.

## Objective

Add glob-scoped rule auto-attachment to the loop installer. Users declare rule
files (Markdown) with `globs:` frontmatter in a configurable `rulesDir`. When
`buildTokens` runs, it reads all rule files, filters to those whose globs
overlap with the current slice's `in_scope_globs`, and renders matching rule
bodies into a `{{rulesBlock}}` template token injected into MASTER_PROMPT.

## In scope

- `src/scripts/lib/rule-loader.mts` — `loadRules(rulesDir: string): Promise<Rule[]>` reads all `*.md` files from `rulesDir`, parses YAML frontmatter (`id`, `globs`, `alwaysApply`, `description`), returns array of `Rule` objects; returns `[]` on missing dir
- `src/scripts/lib/loop-installer-tokens.mts` — new `buildRulesBlock(rules: Rule[], inScopeGlobs: string[]): string` that filters rules matching any overlap between rule `globs` and `inScopeGlobs` (or `alwaysApply: true`), renders each matching rule's body as a fenced section; empty string when no match
- `templates/master-prompt.md` — add `{{rulesBlock}}` token after `{{contextRulesList}}`
- `src/tests/rule-loader.test.mts` — unit tests: empty dir → `[]`, missing dir → `[]`, rule without globs → excluded unless `alwaysApply: true`, glob match → included, no overlap → excluded
- `src/tests/loop-installer-tokens.test.mts` — tests for `buildRulesBlock`: no rules → empty string, alwaysApply → always rendered, glob overlap → rendered, no overlap → empty

## Out of scope

- Remote import from GitHub repos (network dependency, supply-chain risk — separate FEAT)
- Four-tier precedence model (user/project/team/enterprise)
- Wiring `rulesDir` into `loop.json` config schema parsing or `buildTokens` (installer wiring is a follow-up)
- Any `.cursor/rules/` directory compatibility shim
- Changes to existing `contextRules` behavior

## Acceptance criteria

- [ ] AC-1: `npm test` passes, `npm run lint` clean, `npm run typecheck` clean, `npm run format:check` clean, `node ./scripts/validate-manifests.mjs` passes, `node ./scripts/validate-content-length.mjs` passes
- [ ] AC-2: `loadRules(rulesDir)` returns `[]` when `rulesDir` does not exist (no throw)
- [ ] AC-3: `loadRules(rulesDir)` parses frontmatter and returns Rule objects with `id`, `globs`, `alwaysApply`, `description`, `body` fields
- [ ] AC-4: `buildRulesBlock(rules, inScopeGlobs)` returns empty string when rules array is empty or no match
- [ ] AC-5: `buildRulesBlock` renders rules where `alwaysApply: true` regardless of `inScopeGlobs`
- [ ] AC-6: `buildRulesBlock` renders rules where any `globs` entry overlaps with `inScopeGlobs` (using micromatch or glob matching)
- [ ] AC-7: `{{rulesBlock}}` token present in `templates/master-prompt.md`
- [ ] AC-8: Unit tests cover all above paths; test count ≥ previous + 8

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-082 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: spec compliance + AC coverage
- Reviewer B: production-readiness, edge cases, security (no path traversal in rulesDir)
