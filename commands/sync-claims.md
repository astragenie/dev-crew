---
description: Reconcile crew claims with loop backlog state — promote claimed FEAT files to in-progress, warn on orphan in-progress without claim.
---

# Sync Claims

Bridges crew's file-ownership claims (`.claude/state/crew/claims.json`)
with loop's backlog state machine. Two directions of drift:

1. **Agent claimed a FEAT file but didn't run slice from-feature**
   → claim references the file, but feature is still in `pending/` or
   `triaged/`. Plugin moves it to `in-progress/`.

2. **Feature is in-progress with no claim**
   → orphan — file ownership isn't registered with crew. Plugin emits
   warning + suggests `crew claim <path>` command.

Plugin does NOT write to `claims.json` (that's crew's state, owned by
crew). Only adjusts the loop side.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" sync-claims \
  --repo "$PWD"
```

Returns:

```json
{
  "claimsTracked": 3,
  "claimedFeatureIds": ["FEAT-007", "FEAT-012"],
  "actions": [
    { "type": "promote-to-in-progress", "featureId": "FEAT-007", "from": "triaged", "to": "in-progress" },
    { "type": "in-progress-without-claim", "featureId": "FEAT-019", "suggestion": "crew claim docs/backlog/in-progress/FEAT-019.md so file ownership is registered" }
  ]
}
```

## Action types

- `promote-to-in-progress` — backlog state advanced to match claim
- `in-progress-without-claim` — orphan; suggest crew claim invocation
- `claim-without-feature` — claim references FEAT id whose file doesn't exist (stale claim)
- `would-promote` — dry-run output (when --apply=false)

## How feature ids are extracted from claims

- Direct path match: `FEAT-NNN` literal anywhere in the claimed file path
- Optional metadata: claim record has `feature: FEAT-NNN` field (crew can
  populate this when claim is opened via slice context)

## When to run

- At session start, after crew brief-me (catches drift from prior session)
- Before slice complete (ensures state is consistent before close ceremony)
- As part of Cross-Slice Continuation if needed
