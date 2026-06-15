# M7 — MD Decommission (Runner Side Only) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Flip existing v1 md handlers to read from M1-M5 jsonl-mirror tables. Gate via per-app feature flag `useJsonlForReads`. Archive shadow job.

**Parent Spec:** Milestone M7, FEATs R7-1, R7-2, R7-3.

**Pre-condition:** M6 zero-drift streak >= 14 days. NOT enforced here — M7 ships the switch; cutover policy is operator decision.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/AstraRunner.Domain/Entities/ObservedApplication.cs` (or AppFeatureFlags entity) | modify | Add `UseJsonlForReads: bool` column (default false). Migration `AddUseJsonlForReadsFlag`. |
| `src/AstraRunner.Application/CrewMonitor/Queries/GradeDimensionsHandler.cs` | modify | When `app.UseJsonlForReads`, read from `GradeRecord` table (M1) instead of parsing `CrewArtifact` markdown frontmatter. Same DTO shape — caller-transparent. |
| `src/AstraRunner.Application/CrewMonitor/Queries/BacklogFlowHandler.cs` | modify | When flag on, read from `BacklogFlow` table (M5) instead of git-log walk. Same DTO. |
| Other md-parsing handlers under CrewMonitor/Queries/ | modify | Search `frontmatterJson` / `parseFrontmatter` / git-log dependencies. Add jsonl branch behind flag. |
| `src/AstraRunner.Worker/Shadow/ShadowDiffJob.cs` | delete | Archive after cutover. |
| `src/AstraRunner.Api/Controllers/V2/AppSettingsController.cs` | new | `PATCH /api/v2/apps/{appId}/settings` to toggle `useJsonlForReads`. |
| `src/frontend/dashboard/src/v2/pages/AppSettings.tsx` | new (optional) | Per-app toggle UI. Defer if time-constrained — admin can toggle via DB. |

---

## Tasks

1. **Feature flag column** + migration. Default false. Apply via script-pipe.
2. **Audit md-read handlers** — grep `CrewArtifact`, `frontmatterJson`, git-log walks under Application/CrewMonitor/Queries.
3. **Flip 2 critical handlers** (`GradeDimensionsHandler`, `BacklogFlowHandler`) — add `if (app.UseJsonlForReads) { ... }` branch. Preserve md path as fallback.
4. **Toggle endpoint** + `PATCH /api/v2/apps/{appId}/settings` with `useJsonlForReads` body.
5. **Archive ShadowDiffJob** — delete worker + entity (or move to `_archive/` dir, retain migration history).
6. **Audit + flip remaining handlers** if any.
7. **Final sweep** — backend regression suite (both flag states must work), frontend tsc.

Commit subjects:
- `feat(loop): per-app useJsonlForReads flag + migration`
- `refactor(crew-monitor): GradeDimensionsHandler reads from GradeRecord when flag on`
- `refactor(crew-monitor): BacklogFlowHandler reads from BacklogFlow when flag on`
- `feat(api): v2 app settings toggle endpoint`
- `chore(shadow): archive ShadowDiffJob — superseded by M7 cutover`

Note: shadow job archival is reversible — entity + migration history retained.
