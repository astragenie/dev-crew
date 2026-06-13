---
name: slice-grade-write
description: Validate grade scores, extract DEC-TBD decisions into docs/decisions/, persist frontmatter linkage. Idempotent.
auto_execute_steps: false
---

# Slice Grade Write

Persists an edited grade file and extracts retrospective decisions into
`docs/decisions/`.

Pre-requisites: agent has run `/loop:slice grade --id SLICE-NN`
to generate the template and then edited the file to fill in real scores,
lessons, decisions, surprises, and narrative.

What grade-write does:

1. Parses `docs/grades/SLICE-NN-grade.md`.
2. Validates the 7 scores are floats in `[0, 1]`. Throws with a clear error
   listing every offending dimension if any are out of range, missing, or
   non-numeric.
3. Scans the `## Decisions` body section for `### DEC-TBD: <title>` blocks.
   For each:
   - Allocates the next `DEC-NNN` id (monotonic across `docs/decisions/`).
   - Writes a full ADR-style file at `docs/decisions/DEC-NNN.md` populated
     with the title + rationale + consequences from the grade.
   - Replaces `DEC-TBD` with the allocated id in the grade body.
4. Updates grade frontmatter:
   - `decisions: [DEC-NNN, ...]` array of allocated + previously-allocated ids.
   - `graded_at` if not already set.
5. Appends a telemetry event to `.claude/logs/loop.jsonl`.

Idempotent: re-running only extracts blocks still marked `DEC-TBD`.
Previously-allocated decisions stay where they are.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice grade-write \
  --repo "$PWD" \
  --id SLICE-52
```

Returns:

```json
{
  "gradePath": "docs/grades/SLICE-52-grade.md",
  "sliceId": "SLICE-52",
  "scoresAverage": 0.83,
  "decisionsAllocated": ["DEC-007"],
  "decisionsTotal": 1
}
```

## Score validation error mode

If a score is 1.5 or "high" or missing, command throws with `code: "SCORE_VALIDATION"`
and a multiline message naming each offending dimension. Agent should fix
the grade file and re-run.

## After grade-write

- Inspect extracted decisions: `/loop:decisions list`
- Move on to the next slice via the Cross-Slice Continuation rule
