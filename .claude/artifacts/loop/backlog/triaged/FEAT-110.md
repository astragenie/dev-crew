---
id: FEAT-110
status: triaged
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-13
depends_on: []
slices: []
derived_from: null
composite_score: 0.52
composite_priority: P2
source_competitors: [GitHub Copilot Workspace / GitHub Copilot App]
autonomous_safe: false
tags: [workflow, pr-lifecycle, ci-integration]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.30
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.70
pm_technical_risk: 0.65
pm_dependency_depth: 0.10
ac_clarity_status: passed
needs_ac_rewrite: false
triage_notes: "Phase-C re-score after spec-writer rewrite. AC are 7 concrete GWT criteria covering /loop:pr-watch with gh CLI polling, retry ceiling, security gate, cost guard, edge cases. customer_impact lowered to 0.30 per anti-hallucination cap (demandEvidence still 'none' — inferred from GitHub Copilot App audit, no user quote or grade lesson cites this pain). Original triage_notes referenced FEAT-084 and FEAT-107 overlap — both phantom (do not exist in backlog), so overlap concern dropped and dependency_depth lowered to 0.10. technical_risk raised slightly to 0.65: cross-plugin halt-badge contract (snapshot.* prWatch.* fields), gh CLI external dependency, prompt-injection blast radius around --allow-human-comments. effort_estimate 0.65 confirmed: new slash command + CLI subcommand + polling lib + 3 halt-badges + cost accumulator + config keys + 7 AC tests. Cost analog: FEAT-189 (new slash command) shipped at effort 0.3 in 1 slice; this is ~2-3× larger surface. No cost analog for new gh CLI integration — flagged. autonomous_safe stays false: architect pre-flight needed for halt-badge schema + gh rate-limit policy + security-gate threat model; needs_contract: true. Pre-mortem: (1) rate-limit handling missing from AC — long watch sessions could silently stall on GitHub 403; (2) halt-badge field publication is cross-plugin per SPEC-003, rollback needs downstream coordination; (3) no AC covers 'builder dispatched but no commit pushed' retry-counter increment (Edge Cases describes it but no test pinned)."
github_issue: 179
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/179"
---
# FEAT-110: Agent Merge -- closed-loop PR follow-through that fixes failing checks and addresses review comments

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- GitHub Copilot Workspace / GitHub Copilot App

## Description

GitHub Copilot App (2026-05) ships "Agent Merge" -- after PR open, the agent iterates on review comments and failing checks until merge conditions are met. Maps directly to loop's deployer + reviewer phase; loop / crew have no post-PR-open monitor that closes the loop on lint, CI, and reviewer comments. (This overlaps with the Devin autofix gap, but Agent Merge is now in a mainstream GitHub product surface and the integration story is cleaner because GitHub owns the check / review APIs.)

## PM Scoring

```json
{
  "featureId": "FEAT-110",
  "scores": {
    "customer_impact": 0.55,
    "effort_estimate": 0.65,
    "strategic_alignment": 0.70,
    "technical_risk": 0.60,
    "dependency_depth": 0.25
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from GitHub Copilot App audit. gh CLI already used in loop; GitHub check/review APIs are accessible. This is the most implementable version of the PR-autofix gap because it uses standard GitHub APIs.",
  "scopeNotes": "Overlaps FEAT-084 and FEAT-107. Minimum: /loop:pr-watch [PR-URL] that polls gh pr checks, extracts failing check names, dispatches crew:builder with fix instructions, and loops until all checks pass or max_retry exceeded. Security gate: only act on failing CI checks, not on human review comments (prompt injection risk).",
  "risks": [
    "Overlaps FEAT-084 (Devin) and FEAT-107 (duplicate) — consolidate before slicing",
    "Runaway cost if CI keeps failing",
    "Acting on human review comments without a human-in-the-loop gate risks adversarial edits",
    "gh CLI polling adds latency; GitHub webhooks would be more efficient but require server infrastructure"
  ],
  "reasoning": "P2: real pain, highest-quality implementation path via gh CLI, but overlap with FEAT-084/107 needs consolidation first."
}
```

## Scoring

- Impact: 3
- Effort: 2
- Fit: 3
- Composite: 7 / 9

## References

- https://github.blog/changelog/2026-05-14-github-copilot-app-is-now-available-in-technical-preview/

## Acceptance Criteria

**AC-001 — Happy path: successful check fix loop**
- Given: a PR URL is passed to `/loop:pr-watch <PR-URL>` and `gh pr checks` returns one or more checks with status `fail`
- When: the command polls at the configured interval (default 30 seconds, configurable via `loop.prWatch.pollIntervalSeconds`), extracts the names and log URLs of all failing checks, and dispatches `crew:builder` with a structured fix prompt that includes: PR URL, failing check names, log excerpts (up to 2000 chars per check), and instruction to push a fix commit
- Then: after `crew:builder` pushes a fix commit, the watch loop re-polls `gh pr checks`; when all checks return `success` or `skipped`, the command prints "PR checks all green — watch complete" and exits 0

**AC-002 — Retry ceiling: halt-badge on max retries**
- Given: `/loop:pr-watch <PR-URL>` has dispatched `crew:builder` fix attempts and checks are still failing
- When: the number of completed builder dispatches reaches `loop.prWatch.maxRetries` (default 3, integer ≥ 1)
- Then: the command emits halt-badge `pr-watch-max-retries` in `snapshot.*` (field `prWatch.haltReason: "max-retries"`, `prWatch.retriesUsed: N`), logs "pr-watch stopped: max retries (3) reached", and exits with code 1 without dispatching another builder

**AC-003 — Security gate: human review comments blocked by default**
- Given: `/loop:pr-watch <PR-URL>` is running without the `--allow-human-comments` flag and `gh pr view --json reviews` returns one or more human reviewer comments
- When: the watch loop evaluates what to act on
- Then: the human review comment text is NOT included in the builder dispatch prompt; the command logs "human review comments detected — pass --allow-human-comments to act on them"; only failing CI check names and logs are forwarded to the builder
- And given: `--allow-human-comments` IS passed
- When: the command starts
- Then: it prints a one-time warning "WARNING: human review comment text will be forwarded to crew:builder. Ensure the PR is from a trusted source to avoid prompt injection." before the first poll, and includes sanitized comment text (truncated to 500 chars per comment, max 5 comments) in the builder prompt alongside check failures

**AC-004 — Cost guard: halt-badge on cost ceiling**
- Given: `/loop:pr-watch <PR-URL>` has completed one or more builder dispatch cycles
- When: the accumulated estimated cost of all builder dispatches in the current watch session reaches or exceeds `loop.prWatch.maxCostUsd` (default 5.0, float, unit USD)
- Then: the command emits halt-badge `pr-watch-cost-exceeded` in `snapshot.*` (field `prWatch.haltReason: "cost-exceeded"`, `prWatch.cumulativeCostUsd: N.NN`), logs "pr-watch stopped: cumulative cost $N.NN exceeds limit $5.00", and exits with code 1 without dispatching another builder

**AC-005 — Edge case: PR already merged before watch starts**
- Given: `/loop:pr-watch <PR-URL>` is invoked and `gh pr view <PR-URL> --json state` returns `"state": "MERGED"` before the first poll
- When: the command evaluates the PR state at startup
- Then: the command logs "PR already merged — nothing to watch", emits no halt-badge, and exits with code 0

**AC-006 — Edge case: PR closed (not merged) before or during watch**
- Given: `/loop:pr-watch <PR-URL>` is running (or starts) and `gh pr view <PR-URL> --json state` returns `"state": "CLOSED"` (not merged)
- When: the state is detected at startup or on any poll iteration
- Then: the command logs "PR is closed — watch aborted", emits halt-badge `pr-watch-pr-closed` (field `prWatch.haltReason: "pr-closed"`), and exits with code 1

**AC-007 — Transient failure: unknown check status is retried**
- Given: `/loop:pr-watch <PR-URL>` polls `gh pr checks` and the response contains a check with status other than `success`, `failure`, `skipped`, or `pending` (e.g., an empty string or `null` due to a transient GitHub API error)
- When: the unknown status is encountered
- Then: the command logs "warn: check '<name>' returned unknown status '<value>' — will retry on next poll" at WARN level, does NOT count this poll iteration as a builder dispatch retry, and continues polling at the next interval without exiting

## Edge Cases

- **Empty check suite**: if `gh pr checks` returns zero checks (no CI configured), the command logs "no checks found on PR — watch exiting (nothing to fix)" and exits 0 without dispatching builder.
- **Builder dispatch produces no commit**: if `crew:builder` completes but `gh pr checks` still shows the same failures and no new commit was pushed, the retry counter increments and the next poll proceeds normally; this avoids an infinite loop where the builder silently no-ops.
- **Poll interval misconfiguration**: if `loop.prWatch.pollIntervalSeconds` is set to a value less than 10, the command uses 10 as the minimum and logs "poll interval clamped to 10s minimum".
- **Concurrent watch sessions**: running two `/loop:pr-watch` instances against the same PR is not prevented by the command; operators must avoid this manually. A future slice may add a lock file.
- **maxRetries = 0**: treated as "no auto-fix, poll-only mode" — the command polls and reports check status but never dispatches builder. Useful for monitoring only.

## Consider rejecting because

Overlaps FEAT-084 and FEAT-107 — consolidation is needed before slicing. Security concern: acting on automated bot comments and human review comments without a review gate is a prompt-injection risk. The gh polling approach adds latency and ongoing infrastructure concerns.
