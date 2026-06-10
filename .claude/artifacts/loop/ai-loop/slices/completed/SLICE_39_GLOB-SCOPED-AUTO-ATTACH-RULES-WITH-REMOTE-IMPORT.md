---
id: SLICE-39
status: completed
feature: FEAT-007
phase: 2
priority: P3
target_release: null
requires_validation: true
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 39
github_url: "https://github.com/sergeymilashico/loop/issues/39"
---
# SLICE-39: Glob-scoped context rules (contextRules config key)

Implements FEAT-007 SLICE-A (only slice). See [feature file](../../../backlog/in-progress/FEAT-007.md) for product context.

## Objective

Add a `contextRules` array to `.claude/loop.json` so users can declare glob-to-docs mappings.
The installer renders these into a `contextRulesList` token in the MASTER_PROMPT that
instructs the agent to read the matching docs before starting any slice whose
`in_scope_globs` overlaps with the rule's patterns.

**Note:** The remote-import half of FEAT-007 (fetching rules from GitHub URLs at install time)
is explicitly **not implemented** — see DEC-TBD in this slice's grade. The network dependency,
lack of integrity checking, and silent staleness make it worse than just committing docs locally.

## In scope

- New `buildContextRulesList(config)` helper in `src/scripts/lib/loop-installer.mts`
  - Returns a Markdown bullet table when `config.contextRules` is non-empty array
  - Returns empty string when `config.contextRules` is absent, null, or empty
- New `contextRulesList` token added to `buildTokens()` in `loop-installer.mts`
- `templates/master-prompt.md` — new `{{contextRulesList}}` section after mandatory-docs, only rendered when non-empty
- New unit tests in `src/tests/loop-installer.test.mts` covering the two cases

## Out of scope

- Remote import from GitHub URLs (rejected — see DEC-TBD)
- Runtime glob matching at hook/tool-call time (no Claude Code API for file-open events)
- New CLI subcommand (`loop context-rules` or similar)
- Glob expansion at install time (agent evaluates at slice start by reading `in_scope_globs`)
- Config schema validation for `contextRules` entries beyond type checking in tests

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`), linter clean (`npm run lint`), typecheck passes, format-check passes, manifest validator passes, content-length validator passes
- [ ] AC-2: When `contextRules: [{ "globs": ["src/db/**"], "docs": ["docs/db.md"] }]` is present in `.claude/loop.json`, `/loop:install` writes a `contextRulesList` section into the MASTER_PROMPT block in CLAUDE.md that lists the glob-to-docs mapping
- [ ] AC-3: When `contextRules` is absent or is an empty array, the `contextRulesList` token renders as empty string and no "Context rules" heading appears in the MASTER_PROMPT (no blank heading emitted)
- [ ] AC-4: The rendered `contextRulesList` section in MASTER_PROMPT includes an instruction to the agent to check the active slice's `in_scope_globs` frontmatter against the rule patterns and read the matching docs before starting implementation
- [ ] AC-5: Existing `mandatoryDocs` behavior is unchanged — items in `mandatoryDocs` still render in the numbered mandatory-docs list regardless of `contextRules`
- [ ] AC-6: `buildContextRulesList` unit tests in `src/tests/loop-installer.test.mts` cover: (a) absent `contextRules` → empty string, (b) empty array → empty string, (c) populated rules → each rule's globs and docs appear in the output, (d) populated rules → output contains the phrase `in_scope_globs` (instruction prose present)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-007 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: loop:architect (design + AC review)
- Reviewer B: loop:researcher (existing patterns + regression risk)
