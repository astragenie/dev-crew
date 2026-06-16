---
name: slice-grade
description: Generate a pre-filled grade template at slice close — agent then edits scores, lessons, decisions, narrative.
auto_execute_steps: false
---

# Slice Grade

Two-step ceremony for capturing what happened during a slice:

1. **Generate template** — `/runner:slice grade --id SLICE-NN`
   Plugin creates `docs/grades/SLICE-NN-grade.md` with frontmatter
   pre-filled from the linked feature + spec (target_release, phase,
   spec id). Body has section skeletons + score placeholders. Only-if-missing
   — won't clobber an existing grade.

2. **Agent edits the file inline:**
   - Replace the `0.00` score values with honest assessments (floats in [0, 1])
     for all 7 dimensions: architecture_quality, reliability, observability,
     production_readiness, security, test_confidence, product_completeness.
     Update both the frontmatter `scores:` and the `## Scores` body list.
   - Fill `## Lessons`, `## Surprises`, `## Followups`.
   - For each decision made during the slice, drop a `### DEC-TBD: <title>`
     block under `## Decisions` with **Rationale** + **Consequences**.
   - Fill narrative sections (What went well / wrong / differently).

3. **Persist + extract** — `/runner:slice grade-write --id SLICE-NN`
   (separate command — see slice-grade-write.md).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice grade \
  --repo "$PWD" \
  --id SLICE-52
```

Returns `{ gradePath, created, prefilled }`. If grade already exists,
`created: false` and `prefilled` is undefined — agent should edit the
existing file rather than re-running this command.

## When to grade

The Cross-Slice Continuation HARD RULE invokes this between "On slice close"
and "next slice". Specifically: after all acceptance criteria PASS, after
the feature has moved to `done/`, BEFORE picking the next slice. Grading
takes 5–10 minutes; that's the price of self-improvement.

## What plugin pre-fills

- `id`, `slice`, `feature`, `graded_at`
- `spec` and `target_release` if traceable through `feature → derived_from → spec`
- `phase` if the slice frontmatter has it

All scores start at 0 (placeholder — the agent MUST replace them).
