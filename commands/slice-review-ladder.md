---
description: Emit structured Reviewer A + B (configurable) task prompts for parallel crew:reviewer subagent dispatch.
---

# Slice Review Ladder

Builds review-task prompts per the `reviewers.ladder` config (default
`["A", "B"]`). Plugin does not spawn agents — the orchestrator (typically
lead) reads the returned tasks and dispatches each via the Task tool with
`subagent_type: crew:reviewer`.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" slice review-ladder \
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
      "subagent_type": "crew:reviewer",
      "description": "Reviewer A review of SLICE-52",
      "prompt": "You are Reviewer A on the Wiggin Loop ladder ..."
    },
    {
      "reviewer": "B",
      "subagent_type": "crew:reviewer",
      "description": "Reviewer B review of SLICE-52",
      "prompt": "You are Reviewer B on the Wiggin Loop ladder ..."
    }
  ],
  "instructions": "Dispatch each task in parallel using the Task tool..."
}
```

## Default focus areas

| Reviewer | Focus |
|---|---|
| A | Correctness, regressions, acceptance criteria coverage. Flag missing test cases. |
| B | Production-readiness, observability (OTel/logs), security posture, edge cases. |

Override per repo in `.claude/autonomous-loop.json`:

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

## Aggregation

Slice passes when all reviewers return `PASS` or `PASS with minor`. Any
single `FAIL` blocks slice complete. Orchestrator (lead) collects verdicts
+ summarizes before grading.

Each reviewer's prompt includes a step to:
1. Find prior decisions relevant to changed files (`/autonomous-loop:decisions relevant --files`)
2. Link their review artifact back to the slice (`/autonomous-loop:slice link`)

So the linkage arrays + decision-awareness build automatically as reviews
happen.
