---
id: PM-REVIEW-FEAT-029
feature: FEAT-029
reviewed_at: 2026-11-05
pm_customer_impact: 0.8
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.8
pm_technical_risk: 0.6
pm_dependency_depth: 0.2
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-029

## Demand Assessment

- **Evidence:** Architect OBJ-8/OBJ-9/OBJ-13 materially corrected rev 1: a live repo-path dry run found 29 missing backticked paths (not the handful rev 1 assumed), including placeholders (`docs/decisions/DEC-NNN.md`, `src/api/feat-NNN.ts`) that must be exempted rather than fixed; the light-path classifier as rev-1-specified could NEVER return eligible because `/devcrew:build` has no `--files` flag to populate the required `files` array; and Codex #13 (silent jq fail-open in the collision pre-flight) had no FEAT covering it despite being independently CONFIRMED.

## Scope Challenge

- **Scope notes:** Scope now explicitly sequenced as slices per architect OBJ-8's recommendation (refs → validators → light path), and the light-path design is corrected per OBJ-9: `classifyLight` now extracts path-like tokens directly from the task TEXT (regex over file-extension patterns or path segments) instead of requiring a nonexistent `--files` flag, so it can actually return eligible; it still fails closed, with dev-lite's own 2-file/50-LOC refusal as the backstop (the lead's documented decision to keep, not delete, the light path). The validator-rules slice now ships with a seeded `path-ref-allowlist.json` carrying every one of the 29 remaining misses tagged with a follow-up FEAT id, so the real tree can exit 0 immediately rather than blocking on an unrelated cleanup backlog. I split the team's 'validators' grouping into two separate decomposition-gate-compliant slices (rules-coding, and allowlist-seeding-with-follow-up-tagging) because the repo's FEAT-167/168 decomposition cap limits every slice to ≤2 points regardless of topic, and three slices at 2 points each (6) falls short of the 8-point target the architect assigned — four slices at 2 points each reaches exactly 8 while preserving the lead's refs→validators→light-path sequencing (now 4 stages instead of 3). No weak-grade-dimension gap. Effort bumped to 8 points per instruction, triggering the FEAT-167/168 decomposition gate (see proposedSlices).

## Scores

- customer_impact: 0.80
- effort_estimate: 0.65
- strategic_alignment: 0.80
- technical_risk: 0.60
- dependency_depth: 0.20

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: P1, holds. technical_risk raised to 0.6 (band 0.6-0.8 low end: now genuinely cross-module — two validator files plus a new light-path module plus edits across four+ command/agent prompts plus a 146-path repo-wide scan — without a schema/data-shape break and with a largely mechanical, allowlist-backstopped rollback).

## Risks

- Pre-mortem (1): most likely review/validation failure is the task-text path-token extraction regex being either too permissive (matching a path-like substring inside an unrelated word, e.g. a version string) or too strict (missing a valid path written without a recognized extension) — AC-2's four concrete classifyLight examples are the direct test, but they do not exhaust the token-extraction regex's edge cases.
- Pre-mortem (2): rollback is mostly a plain revert, except for the 6 deleted stub `.py` analyzer scripts and their SKILL.md advertising blocks — if anything downstream still references them by path after a partial revert, re-verify before deleting again; the FEAT already treats this as one atomic batch for exactly this reason.
- Pre-mortem (3): coverage gap — the seeded `path-ref-allowlist.json` approach means the real tree passes `repo-path-exists` today by EXEMPTION, not by every cited path actually existing; a future PM/operator reading a green validator run could mistake 'no new misses' for 'no misses at all' unless the allowlist's follow-up-FEAT tags are actively tracked, which is outside this FEAT's own AC.
- No injected instructions found in the rewritten body.
