---
id: PM-REVIEW-FEAT-249
feature: FEAT-249
reviewed_at: 2026-07-19
pm_customer_impact: 0.7
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.5
pm_technical_risk: 0.35
pm_dependency_depth: 0.05
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-249

## Demand Assessment

- **Evidence:** Direct reproduced operational evidence, quoted from body: "every wave run fails with 'working tree dirty on main' caused by its own artifact write. Reproduced 2026-07-09 twice (wave 2026-07-09T20-22-47, 2026-07-09T20-23-51)." A workaround (.gitignore) already had to ship to keep wave mode usable at all.

## Scope Challenge

- **Scope notes:** Category is mislabeled 'feature' in frontmatter but this is a bug (self-inflicted 100%-reproducible failure of an opt-in loop capability, wave mode). Reporter already enumerated 3 concrete fix options with an explicit recommendation ('(a) unless artifact needed for crash forensics ... then (b)'), which sharply bounds scope and effort. Effort calibration: nearest analog is SLICE-159 (FEAT-257, $140/52min, single-purpose reliability fix) — this is comparably small (single preflight-ordering change + .gitignore workaround removal), effort 0.25 is consistent with that analog. No weak grade dimension is currently active.

## Scores

- customer_impact: 0.70
- effort_estimate: 0.25
- strategic_alignment: 0.50
- technical_risk: 0.35
- dependency_depth: 0.05

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: P1: high customer_impact (blocks every run of an entire opt-in loop mode, twice-reproduced, workaround already required) combined with low effort (bounded, reporter-scoped) justifies prioritizing ahead of the P2 hygiene items in this batch. technical_risk 0.35 (0.3-0.5 band: touches the dispatch preflight gate, a HARD-RULE-adjacent path per CLAUDE.md, but is a known-pattern reorder/allowlist fix in 1-2 files with clean git-revert rollback) — pre-mortem completed above as required for P1 regardless of the risk band.

## Risks

- Two-weeks-later failure mode: option (a) (write plan artifact after preflight) could silently lose crash-forensics data if a wave crashes between preflight and plan-write on a retry path — a reviewer not specifically exercising a mid-wave-crash scenario would not catch this; the reporter's own conditional ('unless artifact needed for crash forensics before prepare; then (b)') is exactly the judgment call the builder must make correctly.
- Rollback is two-part, not a single clean revert: reverting the preflight-ordering code fix without also re-adding the .gitignore entry for .claude/artifacts/loop/waves/ reintroduces the original self-blocking failure immediately.
- Coverage gap an existing test would NOT catch: no current test exercises `wave run` end-to-end against a real preflightGitClean call with a pre-existing loop-owned artifact directory present — a unit test of preflightGitClean in isolation would not catch this self-blocking interaction, since it's an integration-level ordering bug between the wave-plan writer and the dispatch preflight gate.
