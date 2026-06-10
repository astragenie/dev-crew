---
id: SLICE-09
status: completed
feature: FEAT-014
phase: 2
priority: P1
target_release: null
requires_validation: true
created: 2026-06-02
updated: 2026-06-02
completed_at: 2026-06-02
github_issue: 44
github_url: "https://github.com/sergeymilashico/loop/issues/44"
---
# SLICE-09: Evidence-before-claims verification gate as a named skill with evidence table

Implements FEAT-014. See [feature file](../../../backlog/in-progress/FEAT-014.md) for product context.

## Objective

Ship a named loop skill `verification-before-completion` that enforces an **Iron Law** — _"NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE"_ — backed by a lookup table mapping each claim type to the command output that proves it. Triggers on any pre-completion claim, requiring fresh command output (not memory).

Surfaced by competitor gap audit 2026-05-28 (superpowers/verification-before-completion).

## In scope

- New skill file `skills/verification-before-completion/SKILL.md` with:
  - Iron Law banner in `<HARD-GATE>` block (matches FEAT-013 convention)
  - Claim→evidence table covering: tests pass, lint clean, build green, bug fixed, feature works, deploy success
  - Pre-completion checklist agent must run before any "done/passing/fixed" claim
- Wire skill into `loop:loop-discipline` SKILL.md so it's surfaced alongside the existing discipline gates
- Brief mention in `docs/code-conventions.md` to anchor the convention

## Out of scope

- Hook-based enforcement (post-Stop validation) — skill is prompt-level only this slice
- Modifying existing crew validation gate at slice close — separate concern
- Auto-detection of claim language in agent output

## Acceptance criteria

- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)
- [ ] AC-2: `skills/verification-before-completion/SKILL.md` exists, contains `<HARD-GATE>` Iron Law block, and contains a Markdown table with ≥5 claim→evidence rows
- [ ] AC-3: `loop:loop-discipline` SKILL.md references the new skill with a relative link
- [ ] AC-4: `.claude-plugin/plugin.json` and `marketplace.json` still validate via `node ./scripts/validate-manifests.mjs`

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-014 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
