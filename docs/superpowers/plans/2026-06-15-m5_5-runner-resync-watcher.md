# M5.5 — Loop Resync Watcher (Runner Side Only) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Populate Postgres ingest tables from on-disk loop JSONL files without requiring webhook configuration. Unlocks M6 shadow validation (`ShadowDiffJob` needs populated tables to compute drift).

**Parent Spec:** Cross-repo design doc `docs/superpowers/specs/2026-06-15-loop-runner-jsonl-adoption-design.md` (filesystem-resync rail).

**Why this exists:** Webhook push (M0 transport) is gated on `loop.notifications.webhook` config that is per-deployment and not checked in. Without an alternative ingestion path, `ShadowDiffJob` always reports 100% drift and the 14-day zero-drift gate that M7 cutover depends on never trips. Filesystem-resync gives an authoritative replay path independent of webhook auth.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Loop/LoopResyncWatermark.cs` | new | `{Id, TenantId, AppId, SourcePath, ByteOffset, LastReadAt}`. One row per (app, file) pair. Tracks last-read offset for incremental polling. |
| `src/AstraRunner.Domain/Loop/Interfaces/ILoopResyncWatermarkRepository.cs` | new | Get-by-app-and-path, Upsert. |
| EF + repo + DbContext + DI + migration `AddLoopResyncWatermarks` | new | Mirror M2/M3 pattern. |
| `src/AstraRunner.Application/Loop/Resync/JsonlFileReader.cs` | new | Streaming reader: seek to watermark, read forward, yield envelopes line-by-line, return new offset. Handles partial-line at EOF (do not advance past). |
| `src/AstraRunner.Application/Loop/Resync/LoopResyncCoordinator.cs` | new | Per-app, per-file orchestration: load watermark, call reader, route each envelope through existing `IngestDispatcher`, commit new watermark. Idempotent via existing ingest dedup. |
| `src/AstraRunner.Worker/Resync/LoopResyncWatcher.cs` | new | `BackgroundService`. Configurable poll interval (default 30s). For each `ObservedApplication` with `LoopRepoPath` set: enumerate JSONL files under `<repo>/.claude/artifacts/loop/`, call `LoopResyncCoordinator` per file. |
| `src/AstraRunner.Api/Controllers/V2/ResyncController.cs` | new | `POST /api/v2/apps/{appId}/resync/trigger` — manual one-shot resync for ops debugging. Returns `{filesProcessed, eventsIngested, errors}`. |
| `appsettings.json` | modify | `Loop:Resync:{PollIntervalSeconds, MaxFilesPerCycle, MaxLinesPerFile}` config block. Defaults 30 / 50 / 10000. |

### JSONL files in scope (per loop repo)

- `.claude/artifacts/loop/events.jsonl` — `slice.*`, `wave.*`, `loop.*`, `grade.*`, `agent.*`, `halt_badge`
- `.claude/artifacts/loop/grades.jsonl` — `grade.recorded` mirror
- `.claude/artifacts/loop/auto-dispatch.jsonl` — `agent.dispatch`
- `.claude/artifacts/loop/waves/<runId>/events.jsonl` — wave-scoped events (one runId per wave)

---

## Tasks

1. **Domain entity + repo** + migration. Unit tests for repo (get/upsert).
2. **JsonlFileReader** with unit tests covering: empty file, partial line at EOF, advance watermark only on complete line, malformed JSON (skip + log + advance).
3. **LoopResyncCoordinator** with unit tests covering: watermark loaded, dispatcher called per envelope, watermark committed only after dispatch succeeds, dispatcher error does not advance watermark.
4. **LoopResyncWatcher** BackgroundService with integration test (Testcontainers PG) covering: writes to file → poll cycle → ingest tables populated → watermark advanced; second poll with no new lines → no-op.
5. **ResyncController** with 3 controller tests (happy path, unknown app 404, repo path missing 400).
6. **Wire watcher into Worker startup** + appsettings defaults. Verify boot logs show watcher start.
7. **Final sweep** — backend regression, migration apply, end-to-end smoke against a real loop repo path.

Commit subjects:
- `feat(loop): M5.5 LoopResyncWatermark entity + repo + migration`
- `feat(resync): JsonlFileReader streaming line reader with watermark`
- `feat(resync): LoopResyncCoordinator per-file ingest orchestration`
- `feat(worker): LoopResyncWatcher BackgroundService with config block`
- `feat(api): v2 manual resync trigger endpoint`

---

## Acceptance criteria

- Worker starts cleanly, polls every 30s by default.
- After writing a new line to `events.jsonl`, that envelope appears in `LoopEvent` table within one poll cycle.
- Restart-safe: watermark survives, no duplicate ingest on Worker restart.
- Webhook fanout config not required for any of the above.
- Manual `POST /api/v2/apps/{appId}/resync/trigger` runs end-to-end and returns counts.

---

## Out of scope

- Backfill CLI (separate FEAT — historical replay is one-shot and lives in loop repo as a Bun script).
- Webhook fanout (M0 — already shipped).
- Drift computation (M6 — this plan only ships the data path).
