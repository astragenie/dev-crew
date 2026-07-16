# Validation — live memory smoke battery (post PR #515 merge)

- **Date:** 2026-07-16
- **Target:** astramem-local daemon 0.19.0-beta.0 @ 127.0.0.1:7777, via merged main `961f96d0` (`memory-sink.mts` provider path with top-level project/agent tagging).
- **Method:** manual execution of the Phase 2 smoke-test table from
  `.claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md`
  (scratchpad bun script + MCP calls). This is validation evidence; the
  repeatable `ASTRAMEM_E2E`-gated suite is still the Phase 2 build item.
- **Verdict: PASS — 5/5 checks, all inside timing budgets.**

| # | Check | Result | Timing | Budget | Verdict |
|---|---|---|---|---|---|
| T1 | `/health` ×5, `status: ok`, `embed.ok: true` | ok / true | 0.3–22.4 ms (min < 100ms) | warn 100ms / fail 2000ms | PASS |
| T2 | remember roundtrip via `recordMemory` → `/recall` with `project=runner-plugin` filter | `recorded: true`, canary found, id `b0918012` | write 216 ms; retrieve 2967 ms (incl. index lag retry) | write < 2 s | PASS |
| T3 | recall latency, k=15, N=10 semantic queries | 0 errors | p50 617 ms, p95 1043 ms | warn p95 1.5 s / fail 3 s | PASS |
| T4 | `agent_profile runner:researcher` attribution | smoke canary in top_lessons; counts + last_active updated | — | — | PASS |
| T5 | feedback loop: `submit_feedback` → usefulness shift | usefulness 0.5 → 0.667; final score 0.649 → 0.663 | — | — | PASS |
| T6 | hang guard (implicit) | every call AbortSignal-bounded; zero hangs across ~20 wire calls | — | — | PASS |

## Notes

- T2 retrieval needed ~3 s total (2 poll retries) before the fresh atom was
  indexed — suggests the Phase 2 suite should allow a small indexing-lag
  poll window on roundtrip, not a single-shot read.
- First `/health` call 22 ms (connection setup), warm calls sub-ms.
- T4 still shows cross-repo profile pollution (astramem-local#353) — known
  upstream, not a regression.
- Contrast with 2026-07-15 baseline: recall was hanging 300 s / ≥15 s;
  project-filtered recall returned 0 hits. Both fixed (daemon embed recovery
  + PR #515 tagging fix).

## Follow-up

Phase 2 build: codify T1–T6 as the `ASTRAMEM_E2E`-gated suite importing
`preflightAstramemDaemon()`, with JSONL timing artifacts — closes the
SLICE-160 review MEDIUM.
