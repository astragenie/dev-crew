# Review Result — Phase 2 ASTRAMEM_E2E smoke suite

- **Reviewer:** crew:reviewer (Reviewer A — correctness + AC coverage)
- **Scope:** uncommitted diff vs `961f96d0`, limited to the 6 files listed
  in the dispatch (bounded-fetch.mts + test, astramem-e2e-preflight.mts
  strict addition + test, astramem-e2e.test.mts new T1-T6 suite,
  docs/sop/memory-bridge.md). `.claude/artifacts/**` excluded per brief.
- **review_decision: approved**

## Summary

This closes the SLICE-160 review MEDIUM (no consumer previously exercised
`preflightAstramemDaemon()`/`astramemE2eMode()` for real). The new
`boundedFetch()` helper, the `strict` preflight option, and the T1-T6
`ASTRAMEM_E2E`-gated suite are all sound, CI-safe in skip mode, and the
factual claims in the builder's handoff about daemon-client endpoints check
out against the actual installed package. One MEDIUM-severity design gap
(strict mode exists but isn't used where the suite's own docs say it
should be) and two LOW notes below; none block approval.

## Gate results (independently re-run)

| Gate | Result |
|---|---|
| `bun test src/tests/astramem-e2e.test.mts src/tests/astramem-e2e-preflight.test.mts src/tests/bounded-fetch.test.mts` (no `ASTRAMEM_E2E`) | PASS — 22 pass, 6 skip, 0 fail, 1.59s |
| `bunx tsc --project tsconfig.test.json --noEmit` | PASS, exit 0, no output |
| `bunx biome lint` (5 files) | PASS, 0 findings |
| `bunx biome format --check` (5 files) | PASS, no diffs |
| `.claude/artifacts/loop/memory-e2e/` write check | Confirmed: only pre-existing file from the builder's earlier live run (`2026-07-16T10-15-46-703Z-smoke.jsonl`); re-running the suite in skip mode did not touch it — `recordTiming()`'s `if (SKIP) return;` guard works as documented |

Live daemon run was not attempted (not needed to judge the diff; builder's
handoff already documents a live PASS with real timings).

## Focus-by-focus findings

**1. CI safety — ZERO network calls in skip mode.** Verified by trace, not
just test outcome. All top-level statements in `astramem-e2e.test.mts` are
imports, constant computation (`astramemE2eMode`, `SKIP`), function
declarations, and `registerTest()` calls that route to `test.skip(name, fn)`
without invoking `fn`. `beforeAll`/`afterAll` both `return` immediately on
`SKIP`. `recordTiming()` also short-circuits before any `fs.mkdir`/
`fs.appendFile`. Confirmed empirically: the artifact directory's single file
is untouched by a skip-mode run. No defect.

**2. Strict preflight default-unchanged + strict semantics — PASS, with one
design-consistency gap (MEDIUM).** Unit tests in
`astramem-e2e-preflight.test.mts` correctly pin both sides: strict rejects
`degraded` even reachable (line 188-200), rejects `status:"ok"` with
`embed.ok:false` (202-213), accepts `ok`+`embed.ok:true` (215-227), and a
dedicated backwards-compat test confirms the non-strict default still
accepts `degraded` (229-240). Implementation (`astramem-e2e-preflight.mts`
readHealthResponse, lines 120-142) matches: strict path only tightens
`ok`/`message`, never touches the non-strict branch.

Gap: `docs/sop/memory-bridge.md` (lines 205-210) and the `PreflightOptions.strict`
docstring itself (`astramem-e2e-preflight.mts:33-42`) both explicitly say
"Semantic-recall-dependent tests are meaningless under a dead embedder, so
those callers should opt into `strict: true`." T3 (`astramem-e2e.test.mts`)
is exactly that caller — 10 semantic `/recall` queries — yet the suite's
`beforeAll` (`astramem-e2e.test.mts:141-145`) calls
`preflightAstramemDaemon({ timeoutMs: 2000 })` with no `strict: true`. Under
a degraded (embedder-down) daemon, preflight passes, and T3 then runs
FTS-only recall — it may still return HTTP 200 within budget (so not
necessarily a hard fail), but the resulting p50/p95 numbers are measuring a
degraded code path while every other signal (docs, the option's own
docstring) says this exact case is the reason `strict` exists. Recommend
either passing `strict: true` in `beforeAll`, or if a mixed-mode preflight
(strict-but-non-fatal) was the actual intent, documenting why T3 tolerates a
degraded embedder. Not a blocker — doesn't break CI-safety or the primary
ACs, and the plan/handoff didn't call out this specific interaction — but
worth a fast follow-up so the option isn't dead code for its own stated use
case.

**3. bounded-fetch dual bound — correct, no leaks.** `boundedFetch()`
mirrors `preflightAstramemDaemon()`'s exact pattern: `AbortSignal` fired at
`timeoutMs` via `controller.abort()`, hard `Promise.race` fallback at
`timeoutMs + 500`, both timers cleared in `finally`, and the hard-timeout
promise gets an immediate no-op `.catch()` so a lost race never surfaces as
an unhandled rejection (`bounded-fetch.mts:64-66`). The offline unit test
"resolves within a bounded window when fetchImpl never settles"
(`bounded-fetch.test.mts:16-27`) uses a fake `fetchImpl` that returns
`new Promise(() => undefined)` — pure in-memory, no socket — so it can't
hang or leak a real connection; asserts `elapsed < 5000` against a 100ms
bound, generous enough to be non-flaky. The abort-signal test
(29-44) and the T6 suite test (`astramem-e2e.test.mts:366-389`, which does
open a real loopback `net.createServer` that never writes a response, then
explicitly `server.close()`s in a `finally`) both confirm the bound actually
fires against a genuinely non-responding peer, not just a fake promise.
Error message (`BoundedFetchTimeoutError`, includes url + timeoutMs) is
actionable.

**4. T2 poll window and no-cli message — correct.** Poll loop
(`astramem-e2e.test.mts:205-217`) is a `while (Date.now() < deadline)` with
a fixed 10s deadline and 500ms `sleep()` between attempts — bounded, no
risk of infinite loop (worst case ~20 iterations, each itself
bounded by `boundedFetch`'s own 10s cap inside `recallHitsFor`, so a
pathological worst case is bounded, not compounding indefinitely in a
runaway way in the intended require-mode usage). The `recordMemory`
`no-cli` failure path (`assert.fail` at line 193-200) names
`CLAUDE_PLUGIN_ROOT_MEMORY` explicitly and gives a concrete example path —
actionable, matches the doc's own explanation
(`docs/sop/memory-bridge.md:234-240`).

**5. T4/T5 endpoint claims — verified independently, correct.** Checked
`node_modules/@astragenie/astramem-client/dist/daemon-client.d.ts` and
`profile-calls.d.ts` directly (not just trusting the handoff): `agentProfile()`
on `AstramemDaemonClient` is documented as `GET /agents/:agent/profile`
(daemon-client.d.ts:45-55), and `markUsed()`'s implementation
(`daemon-client.js:209-210`) POSTs to
`` `/memory/${id}/used` ``, matching the builder's "POST /memory/:id/used"
claim exactly. `profileSilent(agent, {capMs})` and
`feedbackSilent(atomId, {capMs})` are real exports from `profile-calls.ts`
(re-exported via `index.d.ts`), with signatures matching exactly how the
suite calls them (`AGENT_TYPE`/`canaryAtomId`, `{ capMs: 3000 }` /
`{ capMs: 5000 }`). No fabricated API surface.

`recallHitsFor(query, { project, agent })`'s filter shape
(`astramem-e2e.test.mts:123-139`) also matches the real `RecallFilters`
type (`daemon-types.d.ts:118-128`, which documents `project`/`agent` as
single-or-array exact-match filters) — the raw-fetch fallback path in T4
sends a request shape the daemon actually understands, not a guessed one.

**6. Canary hygiene — clean.** `CANARY_MARKER` is a fresh
`randomUUID().slice(0,8)`-suffixed string generated once per test run
(`astramem-e2e.test.mts:93`); every assertion in T2-T5 filters on
`h.text.includes(CANARY_MARKER)` or the `canaryAtomId` that T2 itself
produced — no test reads or asserts against any pre-existing memory. Kind is
`"lesson"`, no importance override (defaults apply). `afterAll`
(147-153) is a documented no-op with a rationale (no delete-by-marker
primitive), not a silent skip of real teardown — acceptable for a
low-importance canary per the brief's own hygiene bar.

**7. registerTest workaround — plausible and non-swallowing.** Grepped the
whole `src/tests/` tree for `test\(...,...,\d+\)` (no matches) and for
`skipIf` (only the new file's own comments reference it) — confirms nobody
in this codebase used a third `test()` argument before, consistent with the
handoff's claim that this had never surfaced. The workaround itself
(`registerTest`, lines 71-77) is a plain two-arg branch to `test.skip` vs
`test` — in skip mode this genuinely registers 6 tests as skipped (visible
in the `6 skip` count above), not omitted from the run, so a regression that
silently dropped the tests would still show up as a test-count change in
CI. Documented inline with a "why" (module header, lines 11-19) so a future
editor won't blindly "fix" it back to `skipIf`.

**8. JSONL timing artifact — correct.** `recordTiming()`
(`astramem-e2e.test.mts:99-111`) only writes in require mode (guarded by
the same `SKIP` check), lazily `mkdir -p`s the parent dir on first write,
and appends one JSON line per call; a write failure is swallowed
(best-effort, matches the inline comment) rather than failing a test over
timing-log IO — reasonable given it's diagnostic, not an AC.

**9. Runtime transport boundary + repo caps — confirmed clean.**
`git diff 961f96d0 -- src/scripts/lib/memory-sink.mts src/scripts/lib/memory-transport.mts`
produced zero output — genuinely untouched, as claimed. Module sizes:
`bounded-fetch.mts` 77 lines, `astramem-e2e-preflight.mts` 216 lines (both
well under the ~400-line split guideline; the content-length CI gate itself
only caps `agents/*.md`/`SKILL.md`, not these). No cognitive-complexity
concerns — both modules are short, linear, and `bunx biome lint` (which
enforces the complexity-15 rule repo-wide) is clean.

## AC coverage table

| AC | Covered | Evidence |
|---|---|---|
| Skip mode: zero network calls, clean skip | Yes | Trace + empirical artifact-dir check above |
| Strict preflight: opt-in, default unchanged | Yes | 4 new unit tests, all pass; implementation isolated to strict branch |
| bounded-fetch: dual bound, no hangs/leaks | Yes | Unit tests + T6 real-socket test, all pass |
| T2 poll window bounded, actionable no-cli message | Yes | Code trace, deadline-bounded loop, explicit env var named in failure message |
| T4/T5 endpoint claims accurate | Yes | Independently verified against `daemon-client.d.ts`/`profile-calls.d.ts` source, not just trusted |
| Canary hygiene (writes/asserts only its own atom) | Yes | Every assertion keys off `CANARY_MARKER`/`canaryAtomId` |
| registerTest workaround plausible, non-swallowing | Yes | Repo-wide grep confirms no prior 3-arg `test()` usage; skip count in test run proves registration still happens |
| JSONL artifact require-mode-only, lazy dir | Yes | Code trace + `SKIP` guard |
| memory-sink.mts / memory-transport.mts untouched | Yes | `git diff` empty for both files |
| Repo caps (module length, complexity) respected | Yes | Line counts + clean `biome lint` |

## Findings

- **[MEDIUM]** `src/tests/astramem-e2e.test.mts:141-145` — `beforeAll` calls
  `preflightAstramemDaemon({ timeoutMs: 2000 })` without `strict: true`,
  even though T3 is a semantic-recall-dependent test and both
  `docs/sop/memory-bridge.md:205-210` and the `strict` option's own
  docstring (`astramem-e2e-preflight.mts:33-42`) say exactly this kind of
  caller should opt into strict mode. Not a functional break (FTS-only
  recall under `degraded` likely still returns 200 within budget), but it
  leaves the new `strict` option unused by the one caller its own
  documentation was written for. Suggested follow-up: pass `strict: true`
  in the suite's `beforeAll`, or add a line explaining why T3 is fine
  running against a degraded embedder.
- **[LOW]** `src/tests/astramem-e2e.test.mts:170-172` (T1) and `:263-265`
  (T3) — the "fail budget" vs "warn budget" split logs a `console.warn` on
  the warn threshold but doesn't record `warn` visibly anywhere other than
  the JSONL line; fine for a smoke suite, just noting there's no operator
  console summary distinguishing "PASS-with-warn" from "PASS-clean" at a
  glance beyond grepping the JSONL. Cosmetic, not a correctness issue.
- **[LOW]** `docs/sop/memory-bridge.md` — solid and accurate throughout;
  the new "Strict mode" and "e2e smoke suite" sections match the code
  exactly. No corrections needed.

## Decision rationale

No correctness bugs, no fabricated API surface, no CI-safety violations, no
scope creep into the fail-silent runtime path. The one MEDIUM is a
consistency gap between documented intent and actual usage of the new
option, not a defect in the option itself — approved, with the follow-up
noted above.
