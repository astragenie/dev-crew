# M2 — Wave Surface (Loop Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Emit wave-level telemetry through the M0+M1 webhook transport so the runner dashboard can render a live wave surface (list, detail, gantt). Add 3 new wave events (`wave_member_slice`, `worktree_cleaned`, `merge_conflict_detail`) and wire every wave event + `waves/index.json` mutation through `fanoutEnvelope`.

**Architecture:** Reuse the M1 `webhook-fanout` helper. The wave runner already calls `appendWaveEvent` from 7 emit sites — extend `appendWaveEvent` to also fan out, mirroring M1's `appendSliceEvent` fanout pattern. Add 3 new event types + interfaces. Add `wave_member_slice` emission in the planner (once per slice when it enters a wave). Add `worktree_cleaned` emission in the worktree-cleanup path. Add `merge_conflict_detail` emission when `auto-merge.mts` produces a structured conflict report.

**Tech Stack:** Bun runtime, TypeScript `.mts` ESM, existing `webhook-fanout.mts` (M1), `wave/events.mts`, `wave/conflict.mts`, `wave/runner.mts`, `wave/index.json` writer.

**Parent Spec:** `docs/superpowers/specs/2026-06-15-loop-runner-jsonl-adoption-design.md` (Milestone M2, Loop FEATs L2-1, L2-2, L2-3).

**Wave-run target:** Single repo (`C:\work\mega\loop`). Commit on main.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/scripts/lib/wave/events.mts` | modify | Add 3 new `WaveEventType` values (`wave_member_slice`, `worktree_cleaned`, `merge_conflict_detail`) + 3 new interfaces. Extend `appendWaveEvent` to fan out via `webhook-fanout.mts` after the JSONL write. |
| `src/scripts/lib/wave/planner.mts` | modify | After packing slices into a wave, emit one `wave_member_slice` per included slice (`{ waveId, sliceId, position }`). |
| `src/scripts/lib/wave/runner.mts` (or wherever worktree cleanup lives) | modify | After successful worktree removal, emit `worktree_cleaned` (`{ waveId, sliceId, branch, path, status }`). |
| `src/scripts/lib/wave/conflict.mts` (or auto-merge call site) | modify | On structured merge conflict, emit `merge_conflict_detail` (`{ waveId, sliceId, conflictedPaths, baseSha, headSha }`). |
| `src/scripts/lib/wave/index-sync.mts` | new | Append helper for `.claude/artifacts/loop/waves/index.json`. After mutation, fan out `kind: "wave.index_updated"` (rolling rolling-50 entries summary). Existing `index.json` writer (wherever it lives) is the call site. |
| `schemas/loop-events/wave-event.schema.json` | modify | Extend payload optionals so new fields validate: `position`, `branch`, `path`, `conflictedPaths`, `baseSha`, `headSha`, `index` (array of rolling summaries). |
| `schemas/loop-events/index.json` | modify | Add kinds: `wave.member_slice`, `wave.worktree_cleaned`, `wave.merge_conflict_detail`, `wave.index_updated`. Map all to `wave-event.schema.json`. |
| `src/tests/wave-events-fanout.test.mts` | new | Tests: each wave event type fans out as kind `wave.<event-type>`. |
| `src/tests/wave-new-events.test.mts` | new | Tests: planner emits `wave_member_slice` per slice. Cleanup emits `worktree_cleaned`. Auto-merge emits `merge_conflict_detail`. |
| `src/tests/wave-index-sync.test.mts` | new | Tests: index sync writer appends + fans out. |

---

### Task 1: Extend wave events module with 3 new types + fanout

**Files:**
- Modify: `src/scripts/lib/wave/events.mts`
- Create: `src/tests/wave-events-fanout.test.mts`
- Modify: `schemas/loop-events/wave-event.schema.json`
- Modify: `schemas/loop-events/index.json`

- [ ] **Step 1: Extend `WaveEventType` union**

Add to the existing union in `src/scripts/lib/wave/events.mts`:

```typescript
export type WaveEventType =
  | "wave_started"
  | "plan_built"
  | "wave_dispatched"
  | "wave_finalized"
  | "post_merge_test"
  | "wave_pivoted"
  | "wave_completed"
  | "wave_member_slice"
  | "worktree_cleaned"
  | "merge_conflict_detail";
```

Add 3 new interfaces:

```typescript
export interface WaveMemberSliceEvent extends WaveEventBase {
  type: "wave_member_slice";
  sliceId: string;
  position: number; // 0-based position within the wave
}

export interface WorktreeCleanedEvent extends WaveEventBase {
  type: "worktree_cleaned";
  sliceId: string;
  branch: string;
  path: string;
  status: "ok" | "force_removed" | "skipped";
}

export interface MergeConflictDetailEvent extends WaveEventBase {
  type: "merge_conflict_detail";
  sliceId: string;
  conflictedPaths: string[];
  baseSha?: string;
  headSha?: string;
}
```

Extend `WaveEvent` union:

```typescript
export type WaveEvent =
  | WaveStartedEvent
  | PlanBuiltEvent
  | WaveDispatchedEvent
  | WaveFinalizedEvent
  | PostMergeTestEvent
  | WavePivotedEvent
  | WaveCompletedEvent
  | WaveMemberSliceEvent
  | WorktreeCleanedEvent
  | MergeConflictDetailEvent;
```

- [ ] **Step 2: Wire `appendWaveEvent` through fanout**

At the top of `wave/events.mts`:

```typescript
import { fanoutEnvelope } from "../webhook-fanout.mjs";
```

Inside `appendWaveEvent`, AFTER the existing JSONL write, add:

```typescript
  const kind = `wave.${event.type}`;
  const { type: _t, ...payload } = event;
  await fanoutEnvelope(repoRoot, kind, payload as Record<string, unknown>);
```

If `appendWaveEvent` is currently synchronous (no `await`), promote it to `async`. Update callers if needed (they should already `await` it).

- [ ] **Step 3: Update wave-event schema**

Edit `schemas/loop-events/wave-event.schema.json`. Add to `properties`:

```json
    "position": { "type": "integer", "minimum": 0 },
    "branch": { "type": "string" },
    "path": { "type": "string" },
    "conflictedPaths": { "type": "array", "items": { "type": "string" } },
    "baseSha": { "type": "string" },
    "headSha": { "type": "string" },
    "index": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "waveId": { "type": "string" },
          "size": { "type": "integer" },
          "passCount": { "type": "integer" },
          "failCount": { "type": "integer" },
          "postMergeTest": { "type": "string" },
          "durationMs": { "type": "integer" }
        }
      }
    }
```

Update `wave-event.schema.json` `status` enum to include any new values added.

- [ ] **Step 4: Update kinds index**

Edit `schemas/loop-events/index.json`. Add to `kinds`:

```json
    "wave.wave_member_slice": "wave-event.schema.json",
    "wave.worktree_cleaned": "wave-event.schema.json",
    "wave.merge_conflict_detail": "wave-event.schema.json",
    "wave.index_updated": "wave-event.schema.json"
```

- [ ] **Step 5: Write fanout test**

`src/tests/wave-events-fanout.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendWaveEvent } from "../scripts/lib/wave/events.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-wave-fanout-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify({
    loop: { notifications: { mode: "webhook", webhook: { url: "https://runner.local/h", tenantId: "T", appId: "A", bearer: "B" } } }
  }));
  return dir;
}

describe("appendWaveEvent — webhook fanout", () => {
  test("posts envelope with kind wave.<event-type>", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => { calls.push({ init }); return new Response(null, { status: 202 }); }) as typeof fanoutInternals.fetch;
    try {
      await appendWaveEvent(repo, ".claude/artifacts/loop/waves", "WAVE-1", {
        type: "wave_member_slice",
        waveId: "WAVE-1",
        sliceId: "SLICE-1",
        position: 0,
        timestamp: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("wave.wave_member_slice");
    expect(body.payload.waveId).toBe("WAVE-1");
    expect(body.payload.sliceId).toBe("SLICE-1");
    expect(body.payload.position).toBe(0);
  });
});
```

Adjust the `appendWaveEvent` call signature to match the actual function (3rd arg may be different — read the existing signature).

- [ ] **Step 6: Run tests → confirm pass + regression**

```pwsh
bun test src/tests/wave-events-fanout.test.mts
bun test src/tests/wave-events*.test.mts
bun ./src/scripts/validate-event-schemas.mts
```

Expected: PASS. `Event schemas OK`.

- [ ] **Step 7: Commit**

```pwsh
git add src/scripts/lib/wave/events.mts schemas/loop-events/wave-event.schema.json schemas/loop-events/index.json src/tests/wave-events-fanout.test.mts
git commit -m "feat(wave-events): 3 new types + fanout to runner webhook"
```

---

### Task 2: Emit `wave_member_slice` from planner

**Files:**
- Modify: `src/scripts/lib/wave/planner.mts` (or wherever wave membership is finalized)
- Create: `src/tests/wave-planner-member-emit.test.mts`

Find where the planner finalizes the list of slices in a wave (likely returns `{ sliceIds, rejected }`). After the list is finalized but before the `plan_built` event is emitted, iterate `sliceIds` and emit `wave_member_slice` per entry with `position = idx`.

Write a test that runs the planner with a fixture of 3 slices and asserts 3 `wave_member_slice` events were appended.

Commit: `feat(wave-planner): emit wave_member_slice per packed slice`.

---

### Task 3: Emit `worktree_cleaned` and `merge_conflict_detail`

**Files:**
- Modify: `src/scripts/lib/wave/runner.mts` (worktree-cleanup site) + `src/scripts/lib/wave/conflict.mts` (or auto-merge call site)
- Create: `src/tests/wave-worktree-cleaned.test.mts`
- Create: `src/tests/wave-merge-conflict-detail.test.mts`

Find the worktree-removal call (likely `git worktree remove ...`). After success, emit `worktree_cleaned` with `status: "ok"`. On force-removal fallback (`--force`), emit `status: "force_removed"`. On skip (worktree doesn't exist), emit `status: "skipped"`.

Find the auto-merge conflict path. When the merge fails with a structured conflict report, emit `merge_conflict_detail` with the conflicted paths + sha pair. If the existing auto-merge doesn't surface this info, log a TODO + skip — don't refactor auto-merge in M2.

2 commits: `feat(wave-runner): emit worktree_cleaned on cleanup paths` and `feat(wave-conflict): emit merge_conflict_detail on auto-merge conflict`.

---

### Task 4: Index-sync helper for `waves/index.json`

**Files:**
- Create: `src/scripts/lib/wave/index-sync.mts`
- Modify: existing `index.json` writer (find via grep `waves/index.json`)
- Create: `src/tests/wave-index-sync.test.mts`

`index-sync.mts` exports `appendWaveIndexEntry(repoPath, entry)`: appends to rolling rolling-50 array, writes file, fans out `kind: "wave.index_updated"` with full updated array. Replace existing index.json writer calls with this helper.

Test: append → verify file content + fanout body.

Commit: `feat(wave-index): index-sync helper with fanout`.

---

### Task 5: Final green sweep

- [ ] Full bun test, lint, format, tsc x2, validators, event-schema validator.
- [ ] `bun ./src/scripts/validate-event-schemas.mts` prints `Event schemas OK`.
- [ ] All wave-event JSONL emissions still write to disk (verified by existing tests).

Commit any formatter fixups under `style: prettier fixups for m2-loop-wave-surface`.

---

## Self-Review Notes

- L2-1 → Task 1 + Task 2 (event type + planner emission).
- L2-2 → Task 3 (worktree_cleaned + merge_conflict_detail).
- L2-3 → Task 1 (wire appendWaveEvent through fanout — covers ALL existing wave events) + Task 4 (index.json fanout).
- New kinds: `wave.wave_member_slice`, `wave.worktree_cleaned`, `wave.merge_conflict_detail`, `wave.index_updated`.

## Out of scope

- Cost + agent-perf telemetry (M3).
- Halt-badge events (M4).
- Shape/phase-gate events (M5).
- Decommission md reading (M7).
