---
id: GRADE-SLICE-39
slice: SLICE-39
feature: FEAT-007
spec: null
phase: 2
target_release: null
graded_at: 2026-06-04
duration_hours: null
scores: null
decisions: [DEC-009]
---
# SLICE-39: Glob-scoped context rules (contextRules config key) — Grade

**Phase:** 2 · **Feature:** FEAT-007 · **Slice:** SLICE-39

## Scores

- architecture_quality: 0.88
- reliability: 0.90
- observability: 0.75
- production_readiness: 0.85
- security: 0.92
- test_confidence: 0.87
- product_completeness: 0.82

(Scores prefilled from crew artifacts where signals were available. Override any value if your honest assessment differs.)

### Inference sources

- test_confidence: reviews/20260604T222015Z-review-result-slice-39-buildcontextruleslist-contextruleslist-token.md, reviews/20260604T222101Z-review-result-slice-39-buildcontextruleslist-contextruleslist-token.md
- security: reviews/20260604T222015Z-review-result-slice-39-buildcontextruleslist-contextruleslist-token.md, reviews/20260604T222101Z-review-result-slice-39-buildcontextruleslist-contextruleslist-token.md

### Score rationale

- observability: 0.75 — feature is advisory-only (model compliance, not enforced); no runtime signal when rules are ignored by an agent
- product_completeness: 0.82 — remote import explicitly rejected; feature delivers the config-side half only

## Lessons

- When a competitor feature maps partially (IDE-layer vs config-layer), scope reduction is the right call — implementing the mappable half cleanly beats a faithful mimic with network dependencies
- `renderTemplate` leaves unknown tokens as literal `{{token}}` — always register the token in `buildTokens` before adding it to any template; order of operations matters
- `export function` on a previously-internal helper enables direct unit testing without full `installLoop` round-trips; prefer this for pure-function logic
- Edge cases (null/empty rule entries rendering degenerate bullets) should be guarded or documented in the scope decision at slice definition time, not discovered at review

## Decisions

### DEC-009: Remote import half of FEAT-007 rejected

**Rationale**: Fetching rule docs from GitHub URLs at install time introduces a network dependency, has no integrity check (no hash pinning), suffers from silent staleness when the upstream branch changes, and provides no safety advantage over committing docs locally. The `@include` mechanism in CLAUDE.md already handles static context injection. Risk/benefit ratio is unfavorable.

**Consequences**:
- Feature ships as config-only with no network calls — safe, fast, deterministic
- Teams wanting shared rule sets must commit files locally or use git submodules — explicit, auditable
- If demand for remote import grows, it can be added as FEAT-007-B with explicit version pinning and integrity verification

## Surprises

- The feature needed an architect pass before ACs could be written — the PM's "no clear mapping" flag was accurate; the feature as described doesn't directly apply to a Markdown-first rule system
- Reviewer correctly traced the `renderTemplate` literal-token behavior and confirmed the token registration was in place — small but important detail that would have been invisible in a cursory review

## Followups

- Guard null/empty `globs`/`docs` entries in `buildContextRulesList` (degenerate bullet edge case — low priority)
- Document `contextRules` config key in README or docs
- FEAT-007-B (future, if demand): remote import with SHA pinning and explicit staleness check
- Add `architect_preflight_required: true` frontmatter flag to FEAT triage for competitor-gap items with `pm_implementation_confidence < 0.6`

## What went well

Scope reduction based on architect analysis was clean. Implementation fit neatly into existing `buildMandatoryDocsList`/`buildTokens`/`renderTemplate` pattern — no new module surface, no new dependencies. Single-session. All 6 ACs passed first run after implementation.

## What went wrong

Feature file had no concrete ACs — needed architect pass before slice could be written. This added overhead. Features with PM confidence < 0.6 should get an architect pre-pass at triage, not at slice prep.

## What I would do differently next time

For competitor-gap features with low PM confidence, flag `architect_preflight_required` in FEAT frontmatter at triage time. Would have triggered architect review earlier and avoided blocking loop in the slice-from-feature step.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_39_GLOB-SCOPED-AUTO-ATTACH-RULES-WITH-REMOTE-IMPORT.md`
- feature file: `.claude/artifacts/loop/backlog/done/FEAT-007.md`
- review artifact: `.claude/artifacts/crew/reviews/20260604T222101Z-review-result-slice-39-buildcontextruleslist-contextruleslist-token.md`
- validation: workflow-state badge `validation_passed` (717/717 tests pass including 4 new unit tests)
