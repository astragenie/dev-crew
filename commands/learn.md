---
name: learn
description: Log or recall operational learnings and slice-grade lessons — log, recent (learnings.jsonl digest), lessons (last N slice grades' Lessons/Surprises/Followups digest). Consolidates the prior lessons-recent command (subcommand `lessons`).
auto_execute_steps: false
---

# Loop Learn

Single command with three subcommands: `log` (record a learning
mid-session), `recent` (view recent entries from the operational
`learnings.jsonl` store), and `lessons` (pull a slice-grade feed-forward
digest before the next slice). Replaces:

- `devcrew:lessons-recent` → `devcrew:learn lessons`

`recent` and `lessons` read two genuinely different stores — `recent` is
the write/read counterpart of `log` (operational learnings you logged
yourself); `lessons` aggregates `## Lessons`/`## Surprises`/`## Followups`
sections out of past slice-grade files. They are kept as distinct
subcommands under one dispatcher rather than merged into a single behavior,
since collapsing them would silently drop one data source.

## log

Log an operational learning to `.claude/artifacts/loop/learnings.jsonl`.
Use this mid-session whenever you observe something that would help future
agent sessions avoid a pitfall or use a better approach.

`startSlice` computes a `learningsDigest` field (the last 3 recent
learnings) at slice start, but today that digest is only returned as a
sibling JSON field on the `startSlice` result — it is **not** spliced
into the builder's `dispatchInstruction` string, so the agent does not
yet inherit it automatically. That wiring is tracked as FEAT-219
SLICE-3. Until it lands, pull recent learnings into context manually
via `learn recent` (below).

### Usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings log \
  --repo "$PWD" \
  --key "<short-key>" \
  --insight "<what you observed>" \
  [--confidence 0.0-1.0] \
  [--slice SLICE-NN]
```

### Parameters

- `--key` (required) — short machine-readable tag, e.g. `tsc-compile-drift`,
  `eslint-complexity-cap`, `test-isolation`
- `--insight` (required) — human-readable observation, one or two sentences
- `--confidence` (optional) — float 0–1 indicating how confident you are;
  omit when uncertain
- `--slice` (optional) — the slice ID where this learning was observed,
  e.g. `SLICE-08`

## Example

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings log \
  --repo "$PWD" \
  --key "tsc-compile-drift" \
  --insight "Always recompile after TypeScript edits; CI drift guard will fail otherwise" \
  --confidence 0.95 \
  --slice SLICE-08
```

Returns the written record with `{ id, timestamp, key, insight, confidence, source }`.

## recent

View recent entries from the operational `learnings.jsonl` store logged via
`learn log`.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" learnings recent \
  --repo "$PWD" \
  --limit 5
```

Returns `{ count, items, digest }` where `digest` is a markdown block ready
to paste into agent context.

### When to log a learning

- You discover a non-obvious constraint (lint cap, compile step, path pattern)
- A test or lint error reveals a repo-specific convention not documented elsewhere
- A subagent dispatch pattern works significantly better than another
- You resolve a blocker that took time to diagnose and want the next session
  to skip that investigation

## lessons

Pulls the last N grade files (default 5) and aggregates their `## Lessons`,
`## Surprises`, `## Followups` sections into a markdown digest the
researcher agent should read before drafting acceptance criteria for the
next slice. Prevents repeating known mistakes. Reads a different store than
`recent` above — slice-grade files, not `learnings.jsonl`.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" lessons recent [N]
```

Default `N = 5`. Returns:

```json
{
  "count": 5,
  "items": [
    {
      "slice": "SLICE-52",
      "graded_at": "2026-05-20",
      "avg_score": 0.829,
      "lessons": ["OTel span naming inconsistencies"],
      "surprises": ["Aspire AppHost rebuild required when adding new ContainerApp env var"],
      "followups": ["Backport pagination pattern to memory-list endpoint"]
    }
  ],
  "digest": "# Lessons feed-forward — last 5 slice(s)\n\n## SLICE-52..."
}
```

### When to run

- Researcher reads this before drafting acceptance criteria for a new
  slice (referenced from Cross-Slice Continuation HARD RULE flow)
- Lead reads before promoting a feature to slice if last 3 grades had
  recurring surprises (pause + address vs charge ahead)
- Before a phase-gate planning session

The `digest` field is ready to paste into an agent context window.
