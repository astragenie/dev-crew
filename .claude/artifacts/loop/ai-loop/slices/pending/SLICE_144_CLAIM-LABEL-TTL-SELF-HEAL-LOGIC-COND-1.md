---
id: SLICE-144
title: Claim-label + TTL self-heal logic (COND-1)
status: pending
feature: FEAT-242
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-07-09
updated: 2026-07-09
effort_points: 2
---
# SLICE-144: Claim-label + TTL self-heal logic (COND-1)

Implements FEAT-242. See [feature file](../../../backlog/in-progress/FEAT-242.md) for product context.

## Objective

Watcher MVP: deterministic tick + registry/state + scheduler setup (Track B1). Implement watch-tick.mts (pure Bun, zero LLM) run by OS scheduler every ~5 min: sweep assigned shard from ~/.claude/watch/repos.json registry (gh issue list delta, gh run list --status failure, open-PR statusCheckRollup), set claim label + timestamped state entry BEFORE spawning headless claude -p reactions (intake --from-issue / pr-fix / crew:fix), enforce machine-wide reaction concurrency cap (default 3) + cost ceiling, emit watch.tick / watch.reaction envelopes via fanoutEnvelope. Includes /runner:watch interactive command sharing same tick function, tick lockfile, Task Scheduler registration script (platform-neutral tick script). State-write ownership split per COND-2 (tick owns detection fields, reactions own attemptCounts/costSpent). Full ACs AC-1..AC-8: .claude/artifacts/crew/runs/2026-07-07-watcher-acs-eta.md section B1. Design: 2026-07-07-watcher-implementation-plan.md (APPROVED-WITH-CONDITIONS). Est 4 slices, 2-3 days. Blocks C1, C3, B1.5 pilot.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given a registry (`~/.claude/watch/repos.json`) with N repo entries assigned to this machine's shard, When `watch-tick.mts` runs, Then it sweeps every assigned entry (`gh issue list` delta / `gh run list --status failure` / open-PR `statusCheckRollup`) and exits without invoking any LLM call — evidenced by a unit test asserting zero `claude -p` spawns during a quiet tick plus a per-repo sweep-count assertion. (source: 2026-07-07-watcher-acs-eta.md AC-1, B1 section)
- [ ] AC-2: Given a tick in progress (lockfile held), When a second tick fires on the same machine before the first exits, Then the second tick exits immediately without sweeping — evidenced by a test that holds the lockfile and asserts the second invocation's early-return and exit code. (source: 2026-07-07-watcher-acs-eta.md AC-2, B1 section)
- [ ] AC-3: Given a finding (new issue / red build / red PR) not previously claimed, When Layer 1 processes it, Then it sets a claim label via `gh issue edit --add-label loop-claimed` AND writes a timestamped claim entry to that repo's state file BEFORE spawning any Layer 2 `claude -p` reaction — evidenced by a test asserting claim-write happens-before spawn (ordering, not just presence). (source: 2026-07-07-watcher-acs-eta.md AC-3, B1 section)
- [ ] AC-4 [COND-4, failure/skip path]: Given machine-wide concurrent reactions at the configured cap (default 3) and/or the configured cost ceiling, When a new finding would exceed either, Then Layer 1 skips spawning and records a `skipped_ceiling` note in state (finding remains unclaimed for next tick) — evidenced by a test seeding 3 in-flight reactions and asserting the 4th finding is not spawned, plus a cost-ceiling variant of the same test. (source: 2026-07-07-watcher-acs-eta.md AC-4, B1 section)
- [ ] AC-5 [COND-2, data-integrity edge case]: Given a tick's detection write (`lastSeenIssue`, tick timestamp) and a concurrently-running reaction's write (`attemptCounts`, `costSpent`) to the same repo's state, When both complete, Then neither write is lost — evidenced by a test that interleaves a tick write and a reaction write against the same state file and asserts both field sets are present after both complete (not just that the file parses). (source: 2026-07-07-watcher-acs-eta.md AC-5, B1 section)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-242 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
