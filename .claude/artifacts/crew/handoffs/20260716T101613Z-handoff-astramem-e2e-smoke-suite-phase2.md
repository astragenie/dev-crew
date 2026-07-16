# Handoff — Phase 2: ASTRAMEM_E2E-gated memory smoke suite

- **Objective:** codify the T1-T6 live memory smoke battery
  (`.claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md`
  Phase 2) as a repeatable `ASTRAMEM_E2E`-gated e2e suite that actually
  imports `preflightAstramemDaemon()`/`astramemE2eMode()` — closes the
  SLICE-160 review MEDIUM.
- **Owner:** builder (this dispatch), reporting to team-lead.
- **Status:** DONE. All deliverables built, all gates green, live run
  executed against the reachable daemon with real timings captured below.

## Changed / new files

| File | Lines | What |
|---|---|---|
| `src/scripts/lib/bounded-fetch.mts` | 71 (new) | Shared `boundedFetch()` helper — AbortSignal + hard `Promise.race` dual bound, mirrors `preflightAstramemDaemon()`'s pattern. Every direct wire call the e2e suite makes goes through it. |
| `src/scripts/lib/astramem-e2e-preflight.mts` | 215 (was 178) | Added opt-in `strict?: boolean` to `PreflightOptions` — when true, additionally requires `embed.ok === true` and `status === "ok"`; default unchanged (still accepts `degraded`). |
| `src/tests/astramem-e2e-preflight.test.mts` | +54 lines | 4 new tests for the strict option (rejects degraded, rejects ok+embed-down, accepts ok+embed-up, confirms non-strict default unchanged). |
| `src/tests/bounded-fetch.test.mts` | 79 (new) | Offline unit tests for `boundedFetch()` — hang-bound, abort-signal, pass-through, init-forwarding, default-timeout. No daemon required, ungated (mirrors the preflight's own test style). |
| `src/tests/astramem-e2e.test.mts` | 335 (new) | **The suite.** T1-T6, gated by `astramemE2eMode(process.env)`. |
| `docs/sop/memory-bridge.md` | +~50 lines | New "Strict mode" + "The e2e smoke suite" subsections under the existing "Memory e2e daemon preflight" section — what each test proves, how to run it, the `CLAUDE_PLUGIN_ROOT_MEMORY` requirement, timing artifact location. |

Nothing else touched — no backlog files, no `agents/`, no `skills/`, no
`.claude/loop.json`, `memory-sink.mts`/`memory-transport.mts` untouched
(fail-silent runtime contract left exactly as-is, per the brief).

## T1-T6 mapping and what each proves

| # | Test | Mechanism | Notes |
|---|---|---|---|
| T1 | health | 5× `boundedFetch` GET `/health` | fail <2000ms, warn ≥100ms (log only) |
| T2 | remember roundtrip | `recordMemory()` (memory-sink.mts) → poll `boundedFetch` POST `/recall` (project filter) up to 10s | write <2s cap; **fails loudly** (not silently) if `recordMemory` returns `no-cli`, naming the `CLAUDE_PLUGIN_ROOT_MEMORY` fix |
| T3 | recall latency | 10× `boundedFetch` POST `/recall`, k=15 | p95 fail >3000ms, warn >1500ms |
| T4 | profile attribution | `profileSilent()` (real `GET /agents/:agent/profile`) with a `boundedFetch` agent-filtered-recall fallback | daemon DOES expose this HTTP endpoint (investigated `@astragenie/astramem-client`'s `daemon-client.d.ts`) — no synthetic workaround needed |
| T5 | feedback loop | `feedbackSilent()` (real `POST /memory/:id/used`) then re-reads `profileSilent()` for the usefulness delta | daemon exposes this too — no skip needed; best-effort corroboration if the canary ages out of `top_lessons` between calls |
| T6 | hang guard | `boundedFetch` against a `node:net` server that accepts the TCP connection but never responds | loopback-only, offline, structurally proves the suite's own wire calls can't hang past their bound |

**Daemon API investigation finding (T4/T5):** the brief anticipated possibly
needing a recall-filter fallback for both. Reading
`node_modules/@astragenie/astramem-client/dist/daemon-{types,client}.d.ts`
confirmed the daemon exposes real HTTP endpoints for both — `GET
/agents/:agent/profile` (→ `profileSilent`) and `POST /memory/:id/used` (→
`feedbackSilent`) — both already wrapped fail-silent by the shared client
package and used elsewhere in this repo (`memory-context.mts`,
`profile-feedback.mts`). No gap; T4 keeps the recall-filter fallback anyway
as defense against `top_lessons`' importance-ranking crowding out a fresh
low-importance canary.

## A tooling incompatibility found and worked around

`test.skipIf(...)` and **any** `test(...)`/`test.skip(...)` call carrying a
third argument (numeric timeout or `TestOptions` object) fail to typecheck
under this repo's `bunx tsc --project tsconfig.test.json --noEmit` gate —
confirmed via isolated repro (minimal file, `test.skipIf(true)("x", async ()
=> {})` alone reproduces "Property 'skipIf' does not exist on type 'typeof
test'"; `test("x", async () => {}, 5000)` alone reproduces a different
"`() => Promise<void>` has no properties in common with `TestOptions`"
error). Root cause looks like a genuine incompatibility between the
installed native TypeScript 7.0.2 (`tsgo`) compiler and `bun-types@1.3.14`'s
generic `Test<T extends ReadonlyArray<unknown>>` interface — both bugs
reproduce with zero project-specific code involved. Grepping the existing
suite confirmed nobody in this codebase had ever used a third `test()`
argument before (only `test.skip("literal", fn)` with exactly two args
existed, in `worktree-manager.test.mts`), so this had never surfaced.

**Workaround (in `astramem-e2e.test.mts`):** a small `registerTest(name, fn)`
helper that branches `if (SKIP) test.skip(name, fn); else test(name, fn);` —
both calls kept to exactly two arguments — plus `setDefaultTimeout(60000)`
at module scope (a plain single-arg function call, unaffected) instead of
per-test timeouts. Functionally equivalent to `test.skipIf(SKIP)(name, fn,
timeout)`, typechecks cleanly, verified against the isolated repro before
and after. Documented inline in the suite's header comment so nobody
"fixes" it back to `skipIf` later without re-hitting the same wall. Worth a
separate ticket against `bun-types`/`typescript` version pinning if it
bites again elsewhere.

## Gate results

- `bun test src/tests/ --parallel --timeout 60000` (no `ASTRAMEM_E2E`) →
  **PASS** — 2900 pass, 7 skip, 0 fail, 1144 expect() calls, 295 files,
  ~34-42s. The 6 new astramem-e2e.test.mts tests are among the 7 skips
  (registered via `test.skip`, zero network calls). Confirms CI-safety.
- `bunx tsc --project tsconfig.json --noEmit` → **PASS** (no output).
- `bunx tsc --project tsconfig.test.json --noEmit` → **PASS** (no output,
  after the `registerTest` workaround above).
- `bunx biome lint` on the 5 touched/new files → **PASS**, 0 findings.
- `bunx biome format` on the 5 touched/new files → **PASS** (auto-fixed 3
  files' wrapping once, then clean).
- Live e2e run: **PASS**, see below.

## Live run — actual timings observed

Daemon was reachable at `127.0.0.1:7777` (version `0.19.0-beta.0`, `status:
ok`, `embed.ok: true` at the time of the run). Ran:

```sh
CLAUDE_PLUGIN_ROOT_MEMORY="$HOME/.claude/plugins/cache/astra/astramem/0.7.0" \
ASTRAMEM_E2E=1 bun test src/tests/astramem-e2e.test.mts
```

Result: **6 pass, 0 fail** (7.87s wall). First attempt actually failed
preflight (daemon `/health` took >2000ms that one time — the "daemon flap"
behavior noted in the 2026-07-15 handoff — a PowerShell latency probe
confirmed it settled back to ~170ms within a few seconds and the retry
passed clean). Captured timing artifact,
`.claude/artifacts/loop/memory-e2e/2026-07-16T10-15-46-703Z-smoke.jsonl`:

| Test | Result |
|---|---|
| T1 health | samples `[1,0,1,0,0]`ms, min 0ms — well under both budgets |
| T2 remember roundtrip | write 293ms, retrieve 642ms (found on first or second poll) — atom id `9c002101-9188-4ef6-be29-2d7d0a8e1557` |
| T3 recall latency (k=15, N=10) | p50 596ms, p95 618ms — under both budgets |
| T4 profile attribution | 21ms, attributed via `profile` (no fallback needed) |
| T5 feedback loop | usefulness `0.5 → 0.6667` |
| T6 hang guard | bounded at 318ms against a genuinely non-responding local socket |

Canary hygiene: one atom (`SMOKE-E2E-<random>`, kind `lesson`, project
`runner-plugin`, agent `runner:researcher`) was written to the real daemon
by this run per the design — low-signal, harmless, left in place per the
"no delete-by-primitive" note in the suite's `afterAll`.

## Risks / open questions

1. **Daemon flap is real and observed firsthand** — the first live attempt
   failed preflight on a `/health` call that took >2000ms, consistent with
   the intermittent instability documented in
   `.claude/artifacts/crew/handoffs/20260715T160000Z-handoff-e2e-memory-experiment-slice160-daemon-flap.md`.
   The suite's behavior here is correct (fail loud, actionable message, no
   silent pass) — but operators running this in CI-adjacent contexts should
   expect an occasional need to retry once the daemon settles, not treat a
   single preflight failure as a suite defect.
2. **The `test.skipIf`/third-arg tsc incompatibility** (above) is an
   environment/toolchain issue, not fixed at its root (that would mean
   patching `bun-types` or downgrading `typescript`, both out of this
   dispatch's scope) — only worked around locally in the new file. If any
   other in-flight work independently reaches for `test.skipIf` or a
   `test(...)` timeout argument, it will hit the same wall.
3. T5's usefulness-delta assertion has a documented soft-fallback (warns
   instead of failing) if the canary ages out of `top_lessons`' cap between
   the before/after profile reads — a corroboration check, not the primary
   AC (which is `feedbackSilent` reporting success).

## Suggested next handoff

Phase 2 is closed. Per the plan's sequencing, Phase 3 (orchestrator-enforced
recall/credit — dispatch-prepended recall digest, close-ceremony feedback
submission) is the next natural slice; it's a larger cross-cutting change
(touches dispatch-assembly + slice-close ceremony) and should get its own
`/runner:intake` FEAT rather than folding into this one.
