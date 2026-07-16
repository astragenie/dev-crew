# Plan — memory lessons/facts tracking: debug, profile, e2e smoke tests, timings (2026-07-16)

- **Objective:** validate + improve lessons/facts tracking for crew and runner agents against astramem-local; establish repeatable e2e smoke suite with timing budgets.
- **Owner:** lead (this session); builder slices via `/runner:intake` → `/runner:start`.
- **Context:** resumes the pending after-analysis from `20260715T160000Z-handoff-e2e-memory-experiment-slice160-daemon-flap.md`. Daemon reachable today; after-analysis executed — results below.

## Evidence gathered today (after-analysis complete)

| Check | Result |
|---|---|
| Daemon health | `ok:true` but **`status: degraded`** — `embed.ok: false`, `"onnx: timeout"`, 11 attempts, `last_ok_at: null` (embed never healthy since start). Uptime 788s; doctor fails: **Crash loop**, Budget cap, Dev no-auth. |
| /health latency | 1–3 ms (3 samples) — transport fine. |
| POST /recall latency | **hung ≥15 s, no response** (curl max-time cutoff) — reproduces astramem-local#347. |
| Profile deltas per role | pm 219→219, fullstack-dev 1075→1075, reviewer 1121→1121 — **zero new atoms**; SLICE-160 in-flap `remember` attempts were lost, not queued. |
| New-atom audit since watermark 1784128028368 | 1 atom only (`20ba3fce`, hook_close event). `why_memory`: has `repo: runner-plugin` but **no `project`**, `agent: claude-code` (not the producing subagent), `scope: private`. |
| Usefulness (ADR-010) | Works: credited canary lessons at 0.667 (off the 0.5 default). But daemon-wide 7d rate = **4/634 = 0.6%** — crediting almost never happens. |
| Consolidation proposals | **768 pending, all `kind: merge`; zero `contradiction`** — FEAT-456 judge did not flag `a65c4ff3` (only appears in a merge pair). Relates to astramem-local#352. |
| Root cause of `project=runner-plugin` → 0 hits | `src/scripts/lib/memory-sink.mts:142-151` still folds `project`/`agent` into `metadata` on the in-process provider path; wire client drops metadata → untagged writes. Canary lessons TOPLEVEL-PROJECT-CANARY-7731 / CANARY-REVIEWER-8801 predicted exactly this. `memory-bridge.mts` CLI path sends no `--project`/`--agent` at all. |
| Embed side-effect on writes | `remember` today returns `vec_indexed: false` — new atoms FTS-only until embed recovers + backfill runs. |

## Phase 0 — stabilize daemon (BLOCKER, upstream astramem-local)

1. Embed provider down = degraded semantic recall + /recall hangs. Known fix direction already decided upstream (OnnxWorkerHostProvider offload approved for serve.ts). Verify installed daemon build includes it; restart; confirm `/health` → `embed.ok: true`, `status: ok`.
2. Crash loop (#343) + 300s hang (#347) already ticketed — retest after embed fix.
3. Verify re-embed/backfill runs for atoms written while `vec_indexed: false`.
4. Gate: no e2e semantic-recall test is meaningful until Phase 0 done. FTS-only tests can proceed.

## Phase 1 — fix write tagging (runner-plugin, 1 slice)

1. `memory-sink.mts::recordMemory` — hoist `project` + `agent` to top-level IngestPayload fields (keep metadata copy for back-compat). Review checklist: CANARY-REVIEWER-8801.
2. `memory-bridge.mts::buildRememberArgs` — add `--project` (from loop.json productName/memory.project) and `--agent` when known; update `docs/sop/memory-bridge.md` wire-contract table.
3. Thread `agentType` through slice-close capture so atoms attribute to `runner:pm` / `crew:reviewer` / `crew:fullstack-dev`, not blanket `claude-code`.
4. Default `scope: "team"` for loop-emitted memories (private is invisible to shared recall).
5. AC: write → `search_memory project=runner-plugin` finds it; `why_memory` shows top-level project + correct agent + scope team.

## Phase 2 — e2e smoke suite + timings (runner-plugin, 1–2 slices; closes SLICE-160 open MEDIUM)

Wire the real `ASTRAMEM_E2E`-gated suite that actually imports `preflightAstramemDaemon()` / `astramemE2eMode()` (AC-4/5 gap).

Tests (each records duration to a JSONL timing artifact under `.claude/artifacts/loop/memory-e2e/`):

| # | Test | Budget (fail) | Budget (warn) |
|---|---|---|---|
| 1 | `/health` reachable, `status: ok`, `embed.ok: true` | 2000 ms (preflight bound) | 100 ms |
| 2 | remember roundtrip: tagged atom → project-filtered search hit → `why_memory` provenance | 5 s | 2 s |
| 3 | semantic recall k=15, N=10 samples → report p50/p95 | p95 < 3 s | p95 < 1.5 s |
| 4 | `agent_profile` for seeded canary agent returns seeded lesson | 3 s | 1 s |
| 5 | feedback loop: `submit_feedback` → usefulness moves off 0.5 on next profile read | 5 s | — |
| 6 | hang guard: every call double-bounded (AbortSignal + Promise.race, reuse preflight pattern); any single call > bound = FAIL with actionable message | — | — |

Preflight hardening: current preflight accepts `degraded` as healthy — add a `strict` mode (embed.ok required) used by semantic tests; `degraded` OK only for FTS-tier tests.

## Phase 3 — lifecycle improvements for crew/runner agents

1. **Orchestrator-enforced recall/credit** (settled lesson: voluntary subagent skill-use failed): dispatch prepends recall digest; close ceremony submits feedback on ids the role reports using. Target the 0.6% usefulness rate — success metric: >10% within a week of slices.
2. Ship the astramem-plugin skill branch `feat/using-memory-project-scope` (operator PRs — project required on recall, project+scope:team on remember).
3. Keep denylist/inherit-all for agent tool access (explicit `tools:` allowlist strips Skill/ToolSearch/mcp__* — invalidated decision `a65c4ff3`, do not regress).

## Phase 4 — hygiene (upstream + local)

1. 768 pending merge proposals — schedule resolution pass (batch resolve or triage top-N by score).
2. FEAT-456 contradiction judge not firing on superseded guidance — extend astramem-local#352 with today's evidence (0 contradiction proposals over 36,927 active atoms, 1176 corrections).
3. `agent_profile` cross-repo pollution — astramem-local#353 (runner:pm profile is mostly .NET/OAuth atoms).

## Sequencing

Phase 0 (upstream, blocker for semantic tests) ∥ Phase 1 (local, unblocked now) → Phase 2 → Phase 3 → Phase 4. File Phase 1+2 as FEATs via `/runner:intake` for the loop.

## Forbidden scope (carried from prior handoff)

- No commit of the still-uncommitted SLICE-160 working tree without operator say-so.
- No pushing the astramem-plugin skill branch — operator PRs it.
- No `mcp__` tool names in agent files (rename-safety).
