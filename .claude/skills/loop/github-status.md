---
name: loop:github-status
description: Sync milestones and status labels for all published FEATs to match their current local state. Assigns issues to Phase milestones, updates status labels (done/in-progress/pending), and closes GitHub issues for completed FEATs. Idempotent — safe to run multiple times.
---

# /loop:github-status

Sync GitHub issue state to match local FEAT state across all published features.

## What it does

For every FEAT that has `github_issue` set in its frontmatter:

- **Milestone** — assigns the issue to the correct phase milestone (`Phase 1`, `Phase 2`, etc.) based on the FEAT's `phase` field
- **Status label** — updates to match local state:
  - `done` → `status:done`
  - `in-progress` → `status:in-progress`
  - `triaged` / `pending` → `status:pending`
- **Closes** GitHub issues for FEATs in `done` state

## Prerequisites

1. `gh` CLI installed and authenticated (`gh auth login`)
2. `"github": { "enabled": true }` in `.claude/loop.json`
3. FEATs published via `/loop:publish` (have `github_issue` in frontmatter)
4. FEATs have `phase` field set (for milestone assignment)

## Run

```js
import { syncMilestones } from "./scripts/lib/github-sync.mjs";
const result = await syncMilestones(process.cwd());
// { milestones: 2, updated: 18, closed: 9 }
```

## When to run

- After bulk-setting `phase` on FEATs
- After FEATs move state (triaged → in-progress → done)
- When GitHub issues fall out of sync with local artifact state
