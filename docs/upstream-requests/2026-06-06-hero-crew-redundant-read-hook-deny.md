---
filed: 2026-06-06
target_plugin: hero-crew
target_repo: sergeymilashico/hero-crew
status: pending-upstream-fix
loop_tracking_feat: FEAT-058
loop_related_slice: SLICE-54 (scope conflict resolution), SLICE-59 (this doc)
---

# Upstream-request: `check-redundant-read` hook deny verdict

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **File:** `hooks/check-redundant-read.mjs`
- **Reason:** the hook lives in hero-crew, not loop. Loop tracks the request for visibility.

## Problem

The `check-redundant-read` hook currently emits `decision: "approve"` with a `systemMessage` warning when a redundant Read call is detected. This is a passive observation — the assistant CAN continue re-reading the same path indefinitely, wasting tokens and busting the prompt cache.

From the cost-advisor output in this repo's session 2026-06-06 (slice in flight, name redacted):

```
file-rereads: 30 redundant Read calls — busts cache, wastes tokens
```

30 redundant reads of the same file path in a single slice is the observation that motivated this request. The hook saw all 30 and emitted a warning each time, but did nothing to block.

## Current behavior (excerpt)

`hooks/check-redundant-read.mjs` line 116-118:

```js
if (result.action === "warn" && result.message !== null) {
  process.stdout.write(JSON.stringify({ decision: "approve", systemMessage: result.message }));
}
```

`decision: "approve"` is the wrong verdict for genuine redundant-read pattern. The warning is logged but the assistant has no programmatic incentive to stop.

## Requested behavior

At a configurable cap (default suggestion: 5 redundant reads of the same absolute path within a session, with NO intervening Edit / Write touching that path), the hook should emit:

```js
{
  decision: "block",
  systemMessage: `Redundant Read denied: <path> has been read <N> times this session without intervening Edit/Write. Trust the prior Read result, or re-grep the file if you need different content. Increase 'crew.redundantReadCap' in .claude/crew.json to override.`
}
```

## Suggested ACs for hero-crew implementation

- **AC-1**: hook config knob in `crew.json` (or `hooks.json`): `crew.redundantReadCap: number` (default `5`)
- **AC-2**: hook tracks per-session, per-absolute-path read count via existing `scripts/lib/cost-hygiene/state.mjs` (state already exists for the warn path)
- **AC-3**: at `>= cap` redundant reads (no intervening Edit / Write touching the path within the same session), hook emits `decision: "block"` with reason message including count + path
- **AC-4**: post-edit / post-write resets the count for that path (recordRead clears the counter, or a new `recordEdit` helper does so explicitly)
- **AC-5**: existing warn-path stays for counts under cap (graceful warning before block)
- **AC-6**: tests cover: under-cap pass-through, over-cap block, post-edit reset, missing-config fallback to default, malformed-config fallback to default

## Evidence

- Cost-advisor slice report 2026-06-06 (one slice): `file-rereads: 30 redundant Read calls — busts cache, wastes tokens` — high-severity recommendation
- Loop FEAT-058 logged 2026-06-06: scope conflict resolution from SLICE-54 (loop cannot ship the fix; hook is upstream)
- 6 slices in same session each hit cache-bust patterns surfaced by cost-advisor; redundant-read was one root cause

## Loop-side alternative (out of scope here, separate FEAT if upstream stalls)

If upstream does not adopt this within a reasonable window, a loop-side surrogate gate can read the hook's `cost-hygiene` `events.jsonl` log and emit a `redundant_read_stop` halt badge from `stop-conditions.mts` (parallel to today's `cost_regression_stop` and `session_drift_stop`). This delivers the EFFECT of the upstream fix without modifying the hook — but it surfaces only at slice-iteration boundaries, not per-Read-call. Less surgical than the upstream deny verdict; logged as a fallback path, not a substitute.

## Tracking

| Date | Event |
|---|---|
| 2026-06-06 | Filed (this doc) — scope conflict resolved on SLICE-54; doc-only artifact landed on SLICE-59 |
| TBD | Upstream issue / PR opened against `sergeymilashico/hero-crew` |
| TBD | Upstream merged / rejected — update `status:` frontmatter |
| TBD | Cache version bumped → loop session sees the fix → close FEAT-058 + update SOP |

Close FEAT-058 in the loop backlog only after the upstream cache version that ships the fix is the one loop is pinned against (`scripts/lib/plugin-identity.mjs::MIN_CREW_VERSION`).
