---
id: FEAT-265
status: done
priority: P2
category: methodology
target_release: null
created: 2026-07-18
updated: 2026-07-18
depends_on: []
slices: []
derived_from: null
tags: [methodology, observability, hooks]
autonomous_safe: true
started_at: 2026-07-18
completed_at: 2026-07-18
touches_files:
  - src/scripts/lib/hook-enforcement-snapshot.mts
  - src/scripts/lib/memory-snapshot.mts
  - docs/halt-badges.md
  - src/tests/hook-enforcement-snapshot.test.mts
  - src/tests/memory-snapshot-hook-enforcement.test.mts
  - .claude/artifacts/loop/loop-snapshot.md
  - README.md
resolution: "Surfaced dev-team's gate-guard/artifact-lock hook enforcement (dev-team#257, PR #262) as a non-halting '## Hook enforcement' section in the loop snapshot, plus a structured hookEnforcement field on `bun src/scripts/loop.mts snapshot-memory` output. New src/scripts/lib/hook-enforcement-snapshot.mts::readHookEnforcementSummary tail-safe-reads .claude/logs/events.jsonl; docs/halt-badges.md gains a 'Hook enforcement telemetry' registry section (modeled on the Wave-mode badges precedent, not wired into the stop-conditions.mts webhook fanout since it's a cumulative counter, not a fire/resolve halt)."
---
## FEAT-265: surface dev-team gate-guard/artifact-lock hook events in the loop snapshot

### Problem

FEAT-264 SLICE-4 noted it was externally blocked on dev-team#257 (PreToolUse
`artifact-lock` + SubagentStop `gate-guard` hooks). Those hooks shipped in
dev-team PR #262 and already log every enforcement decision (warn or block)
to `.claude/logs/events.jsonl` in the consumer repo, but nothing in
runner-plugin surfaced that log — an operator would have to grep it by hand
to see how often the gate is firing.

### Scope

Read `.claude/logs/events.jsonl` (tail-safe: absent file, or a file with no
recognized `gate-guard:*`/`artifact-lock:*` lines, is silent — never an
error; corrupt individual lines are skipped, not fatal), count warn vs block
vs other (fail-open diagnostic) events per hook, and render the totals plus
the most recent event timestamp in the durable loop snapshot — both as
Markdown (`## Hook enforcement`) and as structured data on the
`snapshot-memory` CLI's return value.

### Acceptance criteria (Given-When-Then)

- AC-1 (happy path): Given `.claude/logs/events.jsonl` contains
  `gate-guard:warned-red-gate` / `gate-guard:blocked-red-gate` /
  `artifact-lock:warned` / `artifact-lock:denied` lines, When
  `bun src/scripts/loop.mts snapshot-memory` runs, Then
  `.claude/artifacts/loop/loop-snapshot.md` contains a `## Hook enforcement`
  section reporting warn/block/other counts per hook and the latest event
  timestamp, and the CLI's returned object carries the same counts under
  `hookEnforcement`.
- AC-2 (edge — absent log): Given no `.claude/logs/events.jsonl` exists for
  the repo, When the snapshot is generated, Then the `## Hook enforcement`
  section is omitted entirely (no empty/zero-state block) and
  `hookEnforcement` is `null`.
- AC-3 (negative — corrupt lines): Given `events.jsonl` contains a
  non-JSON line interleaved with valid `gate-guard:*`/`artifact-lock:*`
  lines, When the snapshot is generated, Then the corrupt line is skipped
  and the valid lines are still counted — the read never throws.

### Notes

- Not wired into `src/scripts/lib/stop-conditions.mts`'s `HALT_BADGE_FIELDS` /
  webhook fanout: those badges model fire/resolve transitions for an actual
  halt condition, and hook-enforcement counts are a cumulative, non-halting
  signal that doesn't fit that shape. Documented instead alongside the
  Wave-mode badges section in `docs/halt-badges.md`, per that doc's own
  "MUST update when adding a new halt-badge" instruction.
- No time window: `events.jsonl` is a flat append-log with no per-entry file
  boundary (unlike the cost-report directory's one-file-per-report layout),
  so this reports lifetime totals + last-event timestamp rather than a
  rolling window.
