# Handoff — stabilization wave complete (2026-07-16 evening → 2026-07-17)

- **Objective (as executed):** dogfood-watch dashboard for memory usefulness; then
  parallel stabilization of items 3/6/8 from the session fix list (dev-team test rot,
  sync_events index, badge-alias deprecation DEC) in isolated worktrees.
- **Owner:** session lead (this session) → next session resumes from here.
- **Plan artifact:** `.claude/artifacts/crew/runs/20260716T224500Z-plan-parallel-testrot-index-badgealias.md`
- **Confidence:** high — every claim below is a merged PR, a committed review
  artifact, or an independently rerun measurement.

## Delivered — 10 merged PRs across 3 repos

| PR | Repo | What | Review |
|---|---|---|---|
| #831 | memory | `GET /dashboard/usefulness-trend` + OverviewPage chart (served/used/corrected/rate from synced usefulness events) | PASS (+1 advisory → #832) |
| #833 | memory | Obs wave: `sync-event-health`, `usefulness-breakdown`, `top-used-memories` endpoints + 3 ObservabilityPage panels | PASS (+2 advisories → #832 priority, #834) |
| #836 | memory | Index `sync_events(tenant_id, event_type, created_at)` — closed #832 | PASS |
| #243 | dev-team | Slice B: wire-value lead→dispatcher (`crew.ts` `to:` default, `approvals.ts` classification, `lead-session`→`dispatcher-session`, dual-read at all persisted-comparison sites) | PASS + delta re-review PASS |
| #244 | dev-team | DEC-029 badge-alias deprecation plan (`escalated_to_lead`) | PASS + fix cycle (Kill Criterion #3 dropped) |
| #245–#249 | dev-team | bun:test migration, 5 parallel worktree batches (~116 files) | 5× PASS, zero code-defect findings |
| #520 | runner-plugin | Upstream-request doc mirroring DEC-029 | PASS |

## Headline outcomes

1. **dev-team main suite: 860 pass / 117 fail / 116 errors → 1983 pass / 1 fail / 0 errors / 118 skip**
   (2102 tests, 210 files; ~1000 tests were invisible to CI behind bun#5090 loader
   errors). Sole failure = `cli-smoke.test.ts` DEP0190 (known, real) → dev-team#250.
2. **Usefulness dashboard live end-to-end** (worktree `memory-worktrees/main-run`,
   AppHost detached, dashboard :5173, API :5043) — and its first real catch:
   **the local→cloud sync shipper has NEVER delivered any event** (sync-event-health
   `last_seen` = "never (0)" for all 6 event types; the 1,994 memories arrived via a
   different ingestion path). This is the top open item.
3. **DEC-029 accepted-pending:** no dual-emit needed (emits already canonical-only);
   deprecate-warn CLI input → window (2 minors / 45d) → remove; runner-plugin
   MIN_CREW_VERSION bump strictly AFTER removal. Badge *name* never persisted.

## Key technique record (bun#5090 migration — reusable recipe)

Scout manifest: `dev-team/.claude/artifacts/crew/runs/20260716T230000Z-testrot-scout-manifest.md`
(committed via follow-up PR). Root cause: ANY `node:test` import poisons whole-directory
`bun test` runs via cross-file state leak — per-file structure irrelevant. Four traps:
1. Codemod strips `node:assert` import while manual-review `assert.*` sites remain → dangling refs.
2. `assert.ok/equal` carry TS `asserts` narrowing; `expect()` doesn't → run `tsc --noEmit`,
   fix fail-loud (`if (!x) throw`) or `!` after a throwing expect.
3. Naive arg-splitting isn't regex-literal-aware — comma inside `/…/` corrupts statements.
4. SILENT: node:test 3-arg `test(name, {timeout,skip}, fn)` — bun ignores middle options
   without error; skips stop skipping → `test.skipIf(cond)`.
Verification pattern that made it safe: per-file full-suite delta must equal batch size
exactly; reviewers independently rerun the suite, never trust PR bodies.

## Open items (priority order)

1. **Sync shipper never fired** — investigate astramemory-local sync scheduler/config;
   until fixed, all three new panels show empty states. Local astramem daemon serve
   process was also DOWN this session (MCP get_health unreachable) — restart per
   astramem-local#370 rules (check for existing serve process first; 15-min silent boot).
2. dev-team#250 — cli-smoke DEP0190 fix + un-quarantine dispatch-timing wallMs test.
3. memory#834 — two-tenant isolation fixture for the 6 new dashboard endpoint test files.
4. memory Playwright smoke perma-fail: `.github/workflows/dashboard-e2e.yml:113` port-8080
   cleanup misses foreign-named containers → add `docker ps -q --filter publish=8080 | xargs -r docker rm -f`.
5. DEC-029 Phase 1 implementation slice (deprecation warning on `--badge escalated_to_lead`
   + stale-doc fixes) when scheduled.
6. Dogfood watch continues: usefulness rate was 0.6%→1.9%; new panels give the curve
   once sync flows.

## Hygiene done this close

- Removed 8 merged worktrees (`dev-team-wt-{testrot-scout,testrot-b1..b5,badge-dec}`,
  `memory-worktrees/{feat-sync-events-index,feat-dashboard-obs-wave,feat-usefulness-trend}`)
  + their local branches; `git fetch --prune` both repos.
- `dispatch prune`: no stale runIds (earlier 33d runs already closed by merged waves).
- Kept: `memory-worktrees/main-run` (live stack), loop-managed `.claude/worktrees/agent-*`.
- Memory handoff written: `handoff-2026-07-17-stabilization-wave` (MEMORY.md updated).

## Forbidden/parked (unchanged from prior handoff)

- No daemon restarts without checking for existing serve process (#370 split-brain).
- `~/.claude/crew/constitution.md` still declares `lead` role — operator-only edit.
- dev-team main checkout carries another session's dirty state — untouched.
