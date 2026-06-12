---
description: Emit structured Reviewer A + B (configurable) task prompts for parallel crew:inspector subagent dispatch.
---

# Slice Review Ladder

Builds review-task prompts per the `reviewers.ladder` config (default
`["A", "B"]`). Plugin does not spawn agents — the orchestrator (typically
lead) reads the returned tasks and dispatches each via the Task tool with
`subagent_type: crew:inspector`.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice review-ladder \
  --repo "$PWD" \
  --id SLICE-52
```

Returns:

```json
{
  "sliceId": "SLICE-52",
  "ladder": ["A", "B"],
  "tasks": [
    {
      "reviewer": "A",
      "subagent_type": "crew:inspector",
      "description": "Reviewer A review of SLICE-52",
      "prompt": "You are Reviewer A on the Wiggin Loop ladder ..."
    },
    {
      "reviewer": "B",
      "subagent_type": "crew:inspector",
      "description": "Reviewer B review of SLICE-52",
      "prompt": "You are Reviewer B on the Wiggin Loop ladder ..."
    }
  ],
  "instructions": "PARALLEL_DISPATCH_CONTRACT v1\nrequired: emit exactly ONE message containing N=2 Agent tool calls\nforbidden: send any message between dispatches\nforbidden: wait for one reviewer return before next dispatch\nviolation: serial-reviewer-warning badge logged to grade\n\nAggregate verdicts — slice passes when all reviewers return PASS or PASS with minor."
}
```

## Default focus areas

| Reviewer | Focus |
|---|---|
| A | Correctness, regressions, acceptance criteria coverage. Flag missing test cases. |
| B | Production-readiness, observability (OTel/logs), security posture, edge cases. |

Override per repo in `.claude/loop.json`:

```jsonc
{
  "reviewers": {
    "ladder": ["A", "B", "Security"],
    "focus": {
      "Security": "Threat-model the new surface. Check auth, scope, audit log, secret handling, input validation. Review against SPEC-003 if present."
    }
  }
}
```

## Multidim preset

Set `reviewers.ladder` to an object with `preset: "multidim"` to expand the
ladder to three orthogonal narrow-dimension reviewers dispatched in parallel:

```jsonc
{
  "reviewers": {
    "ladder": { "preset": "multidim" }
  }
}
```

This resolves to ladder `["correctness", "test-coverage", "conventions"]`.
Each generated prompt:

- Declares **one dimension only** and explicitly forbids out-of-scope findings
  (scope-fence: "NOT in scope: …") to prevent overlap between parallel reviewers.
- Enforces a **hard budget** (≤15 tool calls, ≤8 min) with an inline-output
  fallback reminder per `docs/sop/specialist-pause-handling.md` — prevents
  the pause-without-artifact pattern seen in earlier demo runs.

### Multidim dimension focus areas

| Reviewer | Focus |
|---|---|
| correctness | Logic correctness, behavior preservation, race conditions, error-propagation. |
| test-coverage | Happy-path, partial-failure, and edge-case test coverage. Flag missing scenarios. |
| conventions | ESM/.mts parity, line caps, complexity ≤15, comment hygiene, banned patterns. |

### When to pick `multidim` vs default `["A", "B"]`

| Signal | Recommendation |
|---|---|
| Diff touches >5 files or >200 lines changed | Use `multidim` — parallel dimensions catch more in less wall-clock time. |
| Slice introduces new public API or schema | Use `multidim` — correctness + conventions reviewers both apply. |
| Large feature slice with complex acceptance criteria | Use `multidim` — test-coverage reviewer validates AC surface systematically. |
| Typo fix, single-line config change, doc-only update | Use default `["A", "B"]` — multidim cost overhead is not justified. |
| Quick iterative fixup (e.g. lint/format only) | Use default `["A", "B"]` or skip review ladder entirely (mark `review_skipped`). |

**Cost tradeoff**: multidim dispatches 3 concurrent reviewers (roughly 3× token
cost) but wall-clock time is `max(dim)` instead of `sum(dim)`. On large diffs
the quality gain outweighs the cost; on trivial diffs it is overkill.

The preset is opt-in per repo via `reviewers.ladder`. A follow-up CLAUDE.md
update will document the preset for autonomous-loop dispatch.

## Aggregation

Slice passes when all reviewers return `PASS` or `PASS with minor`. Any
single `FAIL` blocks slice complete. Orchestrator (lead) collects verdicts
+ summarizes before grading.

Each reviewer's prompt includes a step to:
1. Find prior decisions relevant to changed files (`/loop:decisions relevant --files`)
2. Link their review artifact back to the slice (`/loop:slice link`)

So the linkage arrays + decision-awareness build automatically as reviews
happen.
