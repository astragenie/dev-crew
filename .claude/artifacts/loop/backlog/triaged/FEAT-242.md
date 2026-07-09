---
id: FEAT-242
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: []
slices: []
derived_from: null
tags: [infra, workflow, storage]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.65
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.85
pm_technical_risk: 0.6
pm_dependency_depth: 0
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "P1: foundational, blocks C1/C3/B1.5, architect-approved, high strategic alignment to the core autonomous-loop mission; technical_risk banded at 0.6 (low end of 0.6-0.8 cross-module-reach band: multiple new modules — tick, registry, state, concurrency, scheduler script, CLI command — but no new external dependency and clean git-revert rollback for the code itself) triggers mandatory pre-mortem; effort_estimate 0.65 maps to 8 Fibonacci points, tripping the FEAT-168 decomposition gate."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Tick core + registry/state modules
    points: 3
  - id_suffix: -SLICE-2
    title: Claim-label + TTL self-heal logic (COND-1)
    points: 2
  - id_suffix: -SLICE-3
    title: Concurrency cap + cost ceiling (COND-4)
    points: 2
  - id_suffix: -SLICE-4
    title: "Scheduler setup script + /runner:watch command"
    points: 2
---
## Description

Watcher MVP: deterministic tick + registry/state + scheduler setup (Track B1). Implement watch-tick.mts (pure Bun, zero LLM) run by OS scheduler every ~5 min: sweep assigned shard from ~/.claude/watch/repos.json registry (gh issue list delta, gh run list --status failure, open-PR statusCheckRollup), set claim label + timestamped state entry BEFORE spawning headless claude -p reactions (intake --from-issue / pr-fix / crew:fix), enforce machine-wide reaction concurrency cap (default 3) + cost ceiling, emit watch.tick / watch.reaction envelopes via fanoutEnvelope. Includes /runner:watch interactive command sharing same tick function, tick lockfile, Task Scheduler registration script (platform-neutral tick script). State-write ownership split per COND-2 (tick owns detection fields, reactions own attemptCounts/costSpent). Full ACs AC-1..AC-8: .claude/artifacts/crew/runs/2026-07-07-watcher-acs-eta.md section B1. Design: 2026-07-07-watcher-implementation-plan.md (APPROVED-WITH-CONDITIONS). Est 4 slices, 2-3 days. Blocks C1, C3, B1.5 pilot.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a registry (`~/.claude/watch/repos.json`) with N repo entries assigned to this machine's shard, When `watch-tick.mts` runs, Then it sweeps every assigned entry (`gh issue list` delta / `gh run list --status failure` / open-PR `statusCheckRollup`) and exits without invoking any LLM call — evidenced by a unit test asserting zero `claude -p` spawns during a quiet tick plus a per-repo sweep-count assertion. (source: 2026-07-07-watcher-acs-eta.md AC-1, B1 section)
- AC-2: Given a tick in progress (lockfile held), When a second tick fires on the same machine before the first exits, Then the second tick exits immediately without sweeping — evidenced by a test that holds the lockfile and asserts the second invocation's early-return and exit code. (source: 2026-07-07-watcher-acs-eta.md AC-2, B1 section)
- AC-3: Given a finding (new issue / red build / red PR) not previously claimed, When Layer 1 processes it, Then it sets a claim label via `gh issue edit --add-label loop-claimed` AND writes a timestamped claim entry to that repo's state file BEFORE spawning any Layer 2 `claude -p` reaction — evidenced by a test asserting claim-write happens-before spawn (ordering, not just presence). (source: 2026-07-07-watcher-acs-eta.md AC-3, B1 section)
- AC-4 [COND-4, failure/skip path]: Given machine-wide concurrent reactions at the configured cap (default 3) and/or the configured cost ceiling, When a new finding would exceed either, Then Layer 1 skips spawning and records a `skipped_ceiling` note in state (finding remains unclaimed for next tick) — evidenced by a test seeding 3 in-flight reactions and asserting the 4th finding is not spawned, plus a cost-ceiling variant of the same test. (source: 2026-07-07-watcher-acs-eta.md AC-4, B1 section)
- AC-5 [COND-2, data-integrity edge case]: Given a tick's detection write (`lastSeenIssue`, tick timestamp) and a concurrently-running reaction's write (`attemptCounts`, `costSpent`) to the same repo's state, When both complete, Then neither write is lost — evidenced by a test that interleaves a tick write and a reaction write against the same state file and asserts both field sets are present after both complete (not just that the file parses). (source: 2026-07-07-watcher-acs-eta.md AC-5, B1 section)

## Proposed slices (PM decomposition)

- SLICE-1: Tick core + registry/state modules (3 pts)
- SLICE-2: Claim-label + TTL self-heal logic (COND-1) (2 pts)
- SLICE-3: Concurrency cap + cost ceiling (COND-4) (2 pts)
- SLICE-4: Scheduler setup script + /runner:watch command (2 pts)
