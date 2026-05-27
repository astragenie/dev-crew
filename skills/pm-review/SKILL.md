---
name: loop:pm-review
description: Deep interactive review of a single backlog feature. Shows PM reasoning, asks user to confirm or override scores. Use when user wants to challenge a triage result or review a high-stakes feature. Trigger on "/loop:pm-review" or "review this feature" or "challenge this priority".
---

# PM Review — Single Feature

Deep review a single FEAT with interactive confirmation.

## Usage

`/loop:pm-review --id FEAT-NNN`

## Steps

1. Read the FEAT file (frontmatter + body).
2. If `derived_from` is set, read the linked SPEC file for context.
3. Scan recent grades for demand evidence.
4. Apply all three PM frameworks with detailed reasoning shown to the user:
   - **Demand Assessment:** Who wants this, evidence, workaround, frequency.
   - **Scope Challenge:** Smallest deliverable, what to cut, overlap, AC clarity.
   - **Risk Radar:** Technical unknowns, dependency chain, grade history, blast radius.
5. Present scores for each dimension (0.0-1.0) with reasoning.
6. Ask user to confirm or override each dimension.
7. Compute final `composite_priority` and `autonomous_safe` from confirmed scores.
8. Update FEAT frontmatter with `pm_*` fields.
9. Write PM review artifact to `.claude/artifacts/loop/pm-reviews/`.

## When to use

- User disagrees with auto-triage scores
- High-stakes feature (new spec, P0 candidate)
- Feature flagged as `autonomous_safe: false` and user wants to understand why
- User asks to "review", "challenge", or "re-score" a feature
