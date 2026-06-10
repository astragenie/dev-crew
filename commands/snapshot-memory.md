---
description: Write docs/loop-snapshot.md — durable cross-session memory of backlog/specs/grades/decisions state. Reference from CLAUDE.md via `@`.
---

# Snapshot Memory

Generates `docs/loop-snapshot.md` capturing current plugin
state in a form designed to be loaded at session start (or read by crew
brief-me as cross-session context).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" snapshot-memory \
  --repo "$PWD"
```

Returns `{ artifactPath, counts }`.

## What's in the snapshot

- Backlog counts by state
- In-flight features with linked slices (orphan warning if any)
- Top-priority triaged features (next to slice)
- Specs total + breakdown by status; ⚠ flag for approved-but-undecomposed
- Last 5 grade averages per dimension with ⚠ flag below 0.80
- Last 5 decisions captured

## How to use

Wire into `CLAUDE.md` so the snapshot is in agent context every session:

```markdown
## Project state (auto-generated)

@docs/loop-snapshot.md
```

Regenerate via this command whenever the picture shifts materially:

- After `slice complete`
- After `release plan` cuts a version
- After `spec status` rolls a spec to `satisfied`
- After a triage batch reorders priorities

Skip when work is purely tactical and state hasn't moved.
