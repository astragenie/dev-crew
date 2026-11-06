---
name: pr-fix
description: "Poll a PR's status, categorize unfixed issues (lint, test, review, CI, security), and emit fix plans with circuit breaker. Supports retried dispatches via priorAttempts tracking."
auto_execute_steps: false
---

# PR Issue Fixer

Polls a PR's status from GitHub, categorizes unfixed issues, and emits a structured
fix plan for each category. Tracks attempt counts per category with a circuit breaker
(default: 3 attempts per category) to prevent infinite retry loops.

Designed to feed autonomous PR repair flows (FEAT-009): agents dispatch fixes, loop
tracks attempts, and circuit breaker halts after threshold.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" pr-fix \
  --repo "$PWD" \
  --pr <number> \
  [--body <priorAttemptsJson>]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--pr <number>` | string | required | PR number to poll and categorize. |
| `--body <json>` | string | null | JSON-encoded `priorAttempts` map; tracks previous attempt counts per category. Example: `{"lint":1,"test_failure":2}` |

## Output shape

```json
{
  "prNumber": 42,
  "ciGreen": false,
  "plans": [
    {
      "category": "lint",
      "description": "Fix lint issues in PR #42",
      "dispatchPrompt": "Fix lint issues in PR #42. Run the failing checks and apply fixes.",
      "attemptCount": 0,
      "circuitBroken": false
    },
    {
      "category": "test_failure",
      "description": "Fix test_failure issues in PR #42",
      "dispatchPrompt": "Fix test_failure issues in PR #42. Run the failing checks and apply fixes.",
      "attemptCount": 3,
      "circuitBroken": true
    }
  ],
  "haltReason": null,
  "walkedCategories": ["lint", "test_failure"]
}
```

### Fields

- `prNumber` — PR number (from `--pr`).
- `ciGreen` — `true` when CI is fully green (no FAILURE/ERROR checks).
- `plans` — array of fix plans, one per unique issue category found.
  - `category` — issue type: `"lint"`, `"test_failure"`, `"review_comment"`, `"ci_failure"`, or `"security"`.
  - `description` — human-readable summary.
  - `dispatchPrompt` — template for dispatching to fix agent.
  - `attemptCount` — previous attempts for this category (from `priorAttempts` or 0).
  - `circuitBroken` — `true` when `attemptCount >= 3` (or custom threshold).
- `haltReason` — why the command halted early: `"gh_unavailable"` or `"gh_error"` when gh CLI fails; `null` if normal.
- `walkedCategories` — list of categories found in this PR.

## Issue categories

The categorizer inspects the PR's status checks, reviews, and comments:

| Category | Detection | Example |
|---|---|---|
| `lint` | Failing check name contains "lint" | ESLint check failed |
| `test_failure` | Failing check name contains "test" | npm test failed |
| `ci_failure` | Any check with FAILURE or ERROR conclusion | General CI step failed |
| `review_comment` | Review with state `CHANGES_REQUESTED` | Reviewer requested changes |
| `security` | Failing check name contains "security" | Security scan failed |

Each category appears at most once in `walkedCategories`, even if multiple checks match.

## Circuit breaker

Each plan tracks `attemptCount` from `priorAttempts` (or 0 if not provided).
When `attemptCount >= maxAttemptsPerCategory` (default: 3), that plan's
`circuitBroken` is set to `true`. Orchestrators may skip dispatches with
`circuitBroken: true` to prevent infinite retry loops.

## gh CLI requirement

The command requires `gh` (GitHub CLI) to be installed and authenticated.
If gh is unavailable or fails, `haltReason` is set to `"gh_unavailable"` or `"gh_error"`
and `plans` is empty.

## Relationship to FEAT-009

This command is the core of FEAT-009 (autonomous PR repair flow):
- **SLICE-22** (this): Issue categorizer + fix plan emitter with circuit breaker.
- Later slices: orchestrator (try-catch loop), attempt tracker, escalation handler.

## Example flow

1. `/loop pr-fix --pr 42` — discovers lint + test_failure issues.
2. Orchestrator dispatches `/devcrew:fix` with lint fix prompt.
3. Fix agent commits; PR checks re-run.
4. `/loop pr-fix --pr 42 --body '{"lint":1}'` — lint category now has attemptCount=1; test_failure still 0.
5. Repeat until CI green or circuit breaker fires on any category.
