# Design: Simplify Gate — Feature-Level Code Simplification

**Date:** 2026-05-22  
**Status:** approved  
**Scope:** ceremonies.mjs extension + slice-linker guard + tests. Loop skill wiring deferred (separate FEAT).

---

## Problem

Code-simplifier runs ad-hoc today. There is no enforcement that simplification happens
before a feature is marked done. Features can slip through without a simplify pass,
resulting in inconsistent code quality across the backlog.

---

## Decision

Extend `featureEnd` in `ceremonies.mjs` to carry a `simplifyRan` boolean.
Add writer/reader helpers to persist the ceremony to disk.
Add a guard in `slice-linker.mjs::completeSlice` that blocks the feature
from moving to `done/` when a ceremony exists with `simplifyRan: false`.

Loop skill wiring (invoking the `code-simplifier` agent and calling the ceremony)
is documented as an integration point and implemented in a future FEAT.

---

## Module: `scripts/lib/ceremonies.mjs` — changes

### `featureEnd` signature change

```js
featureEnd(feat, opts = {})
// feat: { id: string, title: string, phase: string }
// opts: { simplifyRan?: boolean }
```

Returns:

```js
{
  type: 'feature-end',
  id: feat.id,
  timestamp: ISO string,
  status: 'scaffold',
  simplifyRan: opts.simplifyRan ?? false
}
```

`simplifyRan` defaults to `false` when `opts` is omitted or `opts.simplifyRan` is undefined.

### New export: `writeFeatureEndCeremony`

```js
writeFeatureEndCeremony(repoPath, result)
// repoPath: string — absolute repo root
// result: CeremonyResult (output of featureEnd)
// → writes .claude/artifacts/crew/ceremonies/feature-end-{id}-{stamp}.json
// → returns the written file path
```

Pure IO: writes the ceremony object as JSON. Does not call `featureEnd` internally —
caller is responsible for constructing the result first.

### New export: `readFeatureEndCeremony`

```js
readFeatureEndCeremony(repoPath, featureId)
// repoPath: string
// featureId: string — e.g. 'FEAT-005'
// → returns most recent ceremony object for that feature, or null if none found
```

- Reads all `feature-end-{featureId}-*.json` files in the ceremonies dir
- Sorts by `timestamp` field descending, returns the first
- Returns `null` gracefully when directory or files are missing

### Pure/IO split

`featureEnd` stays pure — no file writes. Caller decides whether to persist
via `writeFeatureEndCeremony`. This matches the existing pattern in the module.

---

## Module: `scripts/lib/slice-linker.mjs` — changes

`completeSlice` gains a simplify guard after the existing crew gate check:

```js
import { readFeatureEndCeremony } from "./ceremonies.mjs";

// inside completeSlice, alongside existing isBlocked check:
const blockingGates = await readCrewBlockingGates(repoPath);
const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);

const simpleCeremony = await readFeatureEndCeremony(repoPath, featureId);
const isSimplifyBlocked = Boolean(simpleCeremony && simpleCeremony.simplifyRan === false);

// slice still moves (moveAndStampSlice runs regardless)
// featureResult reflects the block:
const featureResult = (isBlocked || isSimplifyBlocked)
  ? {
      skipped: true,
      reason: isBlocked
        ? `crew run blocked/escalated`
        : 'simplify-gate: featureEnd ceremony exists but simplifyRan is false',
      blockingGates: isBlocked ? blockingGates : null,
      simplifyGate: isSimplifyBlocked ? { simplifyRan: false } : null
    }
  : await moveFeatureToDone(repoPath, featureId, config);
```

### Gate logic

| Ceremony state | Result |
|---------------|--------|
| No file found | Not blocked — feature is still in-progress, no ceremony written yet |
| `simplifyRan: true` | Allowed — proceed to move feature to `done/` |
| `simplifyRan: false` | Blocked — loop must run simplifier and rewrite ceremony |

---

## Tests

### `tests/ceremonies.test.mjs` — 7 new tests

| Test | Assertion |
|------|-----------|
| `featureEnd` with no opts | `simplifyRan === false` |
| `featureEnd` with `{ simplifyRan: true }` | `simplifyRan === true` |
| `featureEnd` with `{ simplifyRan: false }` explicit | `simplifyRan === false` |
| `writeFeatureEndCeremony` writes file | file exists at expected path, JSON parses to ceremony object |
| `readFeatureEndCeremony` reads file for feature id | returns ceremony object with correct `id` and `simplifyRan` |
| `readFeatureEndCeremony` returns null when no file | graceful on missing directory |
| `readFeatureEndCeremony` with two files returns latest | sorts by `timestamp` desc, returns newest |

### `tests/slice-complete.test.mjs` — 3 new tests

| Test | Assertion |
|------|-----------|
| `completeSlice` blocked when ceremony `simplifyRan: false` | returns `{ ok: false, skipped: true, reason: 'simplify-gate: ...' }` |
| `completeSlice` allowed when ceremony `simplifyRan: true` | proceeds to move feature |
| `completeSlice` allowed when no ceremony file | no-ceremony = in-progress state, not blocked |

---

## Integration point (deferred)

The loop skill is responsible for:

1. Detecting the last slice of a feature is done
2. Invoking `code-simplifier:code-simplifier` agent on the feature's touched files
3. Calling `featureEnd(feat, { simplifyRan: true })` on success, `{ simplifyRan: false }` on failure
4. Calling `writeFeatureEndCeremony(repoPath, result)`
5. Only then calling `completeSlice`

This wiring is a separate FEAT. The guard in `completeSlice` is a no-op until a ceremony
file is written — existing features without a ceremony are unaffected.

---

## Out of scope

- Loop skill wiring
- `phaseEnd` / `phaseStart` / `featureStart` changes
- `renderTree` changes
- Any change to `autonomous_safe` semantics
- Config flag to opt out (always-on once ceremony file exists)
