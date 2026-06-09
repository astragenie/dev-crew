---
id: SLICE-83
status: completed
feature: FEAT-078
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-09
updated: 2026-06-09
github_issue: 35
github_url: "https://github.com/sergeymilashico/loop/issues/35"
completed_at: 2026-06-09
---
# SLICE-83: Clause-citation discipline for scope decisions

Implements FEAT-078. See [feature file](../../../backlog/in-progress/FEAT-078.md) for product context.

## Objective

Competitor analysis 2026-06-08 — Archon `.archon/maintainer-standup/direction.md` pattern. Every P4 polite-decline cites an explicit clause from policy doc (e.g. "single-developer-tool clause"). Loop's `loop:pm` currently emits free-text reasoning that drifts across sessions and is not auditable against policy.

## In scope

- Annotate every `##` H2 section in `CLAUDE.md` with a stable HTML-comment clause ID immediately after the header (e.g. `<!-- clause: commit-discipline -->`). Additive — header text unchanged.
- New `src/scripts/validate-decline-citations.mts` (emits `.mjs`): walks `.claude/artifacts/loop/backlog/{triaged,done}/FEAT-*.md`; for every entry with `composite_priority: P4`, requires non-empty `declined_per: [<clause-id>, ...]` frontmatter. Clause IDs validated against the set extracted live from CLAUDE.md. Non-zero exit on any violation; clean exit otherwise.
- New `src/scripts/lib/clause-registry.mts`: tiny helper that reads `CLAUDE.md`, extracts all `<!-- clause: NAME -->` markers, returns `Set<string>`. Reused by validator + future PM auditing.
- 3+ unit tests in `src/tests/validate-decline-citations.test.mts` covering: cite-present passes, missing citation fails with clear message, malformed clause-id (typo) fails, non-P4 entries ignored, fixture-based.
- Wire validator into `.github/workflows/*.yml` as new CI step after the existing manifest/content-length gates.
- Update `agents/pm.md` prompt: instruct PM that when `composite_priority: P4` OR rejected, FEAT frontmatter MUST include `declined_per: [<clause-id>]` citing one or more CLAUDE.md clause IDs; missing field = invalid PM output.
- Update `commands/triage.md` (or skill body) to surface the contract — `declined_per` required for P4.

## Out of scope

- Backfill existing P4 backlog entries with citations (separate data-only slice — current FEAT-079 file said historical entries may be exempt; document this in a followup).
- `policy_revision: <git-sha>` field (stretch in FEAT-078).
- `loop:architect` ADR-side clause citation (mentioned in FEAT-078 notes — separate slice).
- Adding new H3 clause IDs beyond H2 — only H2 sections get clause IDs in this slice; H3 nesting is later cleanup.
- Rewording CLAUDE.md content — comments only, no copy edits.

## Acceptance criteria

- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)
- [ ] AC-2: Every `##` H2 section in `CLAUDE.md` is followed by exactly one `<!-- clause: <kebab-case-id> -->` HTML comment on the next non-blank line; IDs are unique within the file; sections "Project state (auto-generated)" + the file title H1 are exempt
- [ ] AC-3: `node scripts/validate-decline-citations.mjs --repo "$PWD"` exits 0 against current backlog (which has no P4 entries yet, so should pass trivially) and exits non-zero against a tmp fixture FEAT with `composite_priority: P4` and missing `declined_per`
- [ ] AC-4: Validator rejects a `declined_per: ["bogus-clause-id"]` value when "bogus-clause-id" is not present in `CLAUDE.md`; error message names both the FEAT id and the unknown clause id
- [ ] AC-5: 3+ unit tests in `src/tests/validate-decline-citations.test.mts` cover: cite-present passes, missing citation fails, unknown clause fails, non-P4 entry ignored
- [ ] AC-6: `agents/pm.md` prompt contains a "Decline contract" section stating `declined_per` requirement for P4 with example, and `commands/triage.md` (or the triage skill body) references this contract
- [ ] AC-7: `.github/workflows/ci.yml` (or equivalent) invokes `node scripts/validate-decline-citations.mjs` as a CI step after the existing manifest/content-length gates

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-078 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A (correctness): Verify clause-id annotation in CLAUDE.md is additive (no copy changes), clause IDs are kebab-case + unique, validator correctly extracts them, validator correctly rejects missing/unknown citations. Read diff for CLAUDE.md, validator, registry helper, tests, agents/pm.md.
- Reviewer B (production-readiness): Verify CI gate wiring (workflow file syntax + step ordering), error message wording is operator-friendly + names both FEAT id and clause id, validator handles edge cases (empty backlog, no P4 entries, FEAT missing frontmatter, FEAT with malformed yaml), agents/pm.md prompt change does not break existing PM contract.
