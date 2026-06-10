---
feature: FEAT-089
priority: P2
status: completed
created: 2026-06-09
requires_validation: false
autonomous_safe: true
reviews: [20260609T171252Z-review-result-feat-089-slice-85-verification-skill-evidence-table.md]
completed_at: 2026-06-09
updated: 2026-06-09
github_issue: 171
github_url: "https://github.com/sergeymilashico/loop/issues/171"
---
# SLICE-85: Verification skill — typecheck + function-exists evidence rows

- **Priority**: P2
- **Status**: Pending
- **Author**: loop
- **Created**: 2026-06-09

## Objective

Extend `skills/verification-before-completion/SKILL.md` with two missing evidence rows (`typecheck` and `function-exists`) and make the `trigger` field explicit, closing FEAT-089's remaining gap over the SLICE-09 baseline.

## Why now

FEAT-089 was triaged after a competitor gap audit surfaced that loop's verification skill lacked explicit guidance for two common claim types in this repo. The SKILL.md exists (SLICE-09/FEAT-014) but the evidence table predates the `typecheck`/`function-exists` patterns that caused the SLICE-81 fabrication incident. The SLICE-84 trigger-field implementation also left the skill's frontmatter without an explicit `trigger` value — adding it is hygiene.

## In scope

- Add `trigger: "always_on"` to `skills/verification-before-completion/SKILL.md` frontmatter (explicit, now that SLICE-84 defined the field)
- Add `typecheck` row to the evidence table: claim "type-checks" → evidence `npm run typecheck` exit code 0 + output
- Add `function-exists` row: claim "function/module added" → evidence file read or grep showing the symbol in the compiled output

## Out of scope

- Wiring into builder/reviewer dispatch prompt preambles (always_on skills load unconditionally via the skill system; no explicit preamble wiring needed)
- Changing the Iron Law prose or the `<HARD-GATE>` / `<EXTREMELY-IMPORTANT>` tags (already correct from SLICE-09)
- Any runtime code changes — this is a pure Markdown edit

## Acceptance criteria

- [ ] AC-1: `skills/verification-before-completion/SKILL.md` frontmatter contains `trigger: "always_on"`
- [ ] AC-2: Evidence table contains a `typecheck` row mapping "type-checks" claim to `npm run typecheck` with exit-code-0 requirement
- [ ] AC-3: Evidence table contains a `function-exists` row mapping "function/module added" claim to grep or file-read evidence showing the symbol in the compiled output
- [ ] AC-4: Existing Iron Law (`<HARD-GATE>`) and pre-completion checklist (`<EXTREMELY-IMPORTANT>`) blocks are preserved verbatim
- [ ] AC-5: `npm test` passes (1066+ tests, 0 failures) — no tests broken by the SKILL.md edit
- [ ] AC-6: `node ./scripts/validate-manifests.mjs` passes — no manifest regressions

## Done When

- All acceptance criteria above are PASS with evidence
- `npm test` green
- `npm run lint` clean
- `npm run format:check` clean
- `node ./scripts/validate-manifests.mjs` passes
- review-result artifact written
- this slice file moved to completed/

## Reviewer ladder

- Reviewer A: Senior engineer — verify evidence table rows are accurate for this repo's toolchain, ACs are testable
- Reviewer B: Security / production-readiness — verify no accidental weakening of Iron Law, content-length cap respected

## Risks

- Content-length cap: `skills/verification-before-completion/SKILL.md` is currently 88 lines (well under the 200-line cap). Adding 2 table rows + frontmatter field adds ~4 lines — no risk.
- The `function-exists` evidence form (grep/file-read) is less standardized than command-based rows. Phrasing should be concrete but not prescriptive.

## Open questions

- None. Scope is fully specified; skill file exists and only needs additive edits.
