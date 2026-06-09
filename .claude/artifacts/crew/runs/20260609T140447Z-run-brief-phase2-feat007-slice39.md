---
phase: "2"
feature: FEAT-007
---
# Run Brief: PHASE2 FEAT007 SLICE39

- Created: 2026-06-09T14:04:47.442Z
- Goal: Add a `contextRules` array to `.claude/loop.json` so users can declare glob-to-docs mappings. The installer renders these into a `contextRulesList` token in the MASTER_PROMPT that instructs the agent to read the matching docs before starting any slice whose `in_scope_globs` overlaps with the rule's patterns.  **Note:** The remote-import half of FEAT-007 (fetching rules from GitHub URLs at install time) is explicitly **not implemented** — see DEC-TBD in this slice's grade. The network dependency,
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `buildContextRulesList(config)` helper in `src/scripts/lib/loop-installer.mts`
  - Returns a Markdown bullet table when `config.contextRules` is non-empty array
  - Returns empty string when `config.contextRules` is absent
  - null
  - or empty
- New `contextRulesList` token added to `buildTokens()` in `loop-installer.mts`
- `templates/master-prompt.md` — new `{{contextRulesList}}` section after mandatory-docs
  - only rendered when non-empty
- New unit tests in `src/tests/loop-installer.test.mts` covering the two cases
- Out Of Scope:
  - - Remote import from GitHub URLs (rejected — see DEC-TBD)
- Runtime glob matching at hook/tool-call time (no Claude Code API for file-open events)
- New CLI subcommand (`loop context-rules` or similar)
- Glob expansion at install time (agent evaluates at slice start by reading `in_scope_globs`)
- Config schema validation for `contextRules` entries beyond type checking in tests
- Planned Files: -
- Next Step: Begin implementation

