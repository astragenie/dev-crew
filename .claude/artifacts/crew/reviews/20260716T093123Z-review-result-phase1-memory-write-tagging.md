# Review Result — Phase 1 memory write-tagging fix (project/agent top-level)

- **Reviewer:** Reviewer A (correctness + AC coverage)
- **Scope:** `src/scripts/lib/memory-transport.mts`, `src/scripts/lib/memory-sink.mts`, `src/tests/memory-sink.test.mts`, `src/tests/memory-transport.test.mts`, `docs/sop/memory-bridge.md` (all uncommitted against HEAD)
- **Builder handoff:** `.claude/artifacts/crew/handoffs/20260716T092751Z-handoff-memory-write-tagging-phase1.md`
- **Plan:** `.claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md` (Phase 1, item 1)
- **review_decision: approved**

## Summary

`recordMemory` now spreads `project`/`agent` as top-level fields on the `ProviderIngestPayload` handed to `sendViaProvider`, in addition to the pre-existing `metadata.project`/`metadata.agent` copy. Verified against the installed `@astragenie/astramem-client@0.3.0` type declarations in `node_modules`: its write-side `IngestPayload` (`types.d.ts`) has no top-level `project`/`agent` — only the read-side `RecallRequest`/`RecallFilters`/`SearchParams` and the daemon's own `RememberRequest` (`daemon-types.d.ts`) declare them, and always as bare `project`/`agent`, never `projectId`/`agentId`. `calls.js::rememberSilent` forwards the payload object to `provider.remember(payload)` untouched (no stripping), so the widened local type is a safe additive superset. The builder's citations in the handoff match what I independently found in the same files.

## Findings

1. [INFO] `src/scripts/lib/memory-transport.mts:22` — the pre-existing header comment references `IngestPayloadSchema` in `astramem-plugin src/contracts/wire.ts`, a schema that lives outside this repo and outside `astramem-client` (I found no Zod/strict-schema validation code in the installed client package itself — only in `calls.js`'s untouched pass-through). Whether the real installed `astramem-plugin` provider validates with `.strict()` and would reject the two new top-level keys is unverifiable from this repo. This is the same risk the handoff already flags under "Risks / open questions" #1 — not a defect in this diff, just confirming it's a genuinely open, correctly-disclosed unknown rather than an overclaim.
2. [INFO] Docs (`docs/sop/memory-bridge.md`) correctly hedge: they state `GepaPayload`/`emitGepaEvent()` still carry no project/agent (unchanged, out of scope) and do not claim the live daemon roundtrip AC is closed — that's explicitly deferred to Phase 2 per the plan. No overclaiming found.

No other findings — no correctness bugs, no scope violations, no test-quality issues.

## Checklist verification

1. **CANARY-REVIEWER-8801 / TOPLEVEL-PROJECT-CANARY-7731 (top-level vs metadata-only)** — PASS. `memory-sink.mts:154-155` spreads `...(project ? { project } : {})` / `...(agent ? { agent } : {})` directly onto the object literal passed to `sendViaProvider`, sitting alongside (not instead of) the `metadata` key. Field names are bare `project`/`agent`, matching every top-level occurrence in the installed client (`RecallRequest.project/.agent`, `RecallFilters.project/.agent`, `SearchParams.project/.agent`, `RememberRequest.project/.agent`) — no `projectId`/`agentId` naming exists anywhere in the installed package, confirming the builder's claim.
2. **Back-compat / clean omission** — PASS. `project`/`agent` are computed as `sanitizeArg(...)` or `""` (falsy) when absent (`memory-sink.mts:136-137`), and both the top-level spread and the `metadata` object use a truthy guard (`project ? {...} : {}`), so an unset value never leaks as an empty string or `undefined` key. Confirmed empirically: `memory-transport.test.mts:169-170` and `memory-sink.test.mts:284-288` assert both representations are populated together; `memory-sink.test.mts:297-299` (new) and the existing `memory-transport.test.mts` "no project metadata key" test assert clean omission.
3. **Fail-silent contract** — PASS. `recordMemory`'s outer `try {...} catch { return { recorded: false, reason: "error" } }` (`memory-sink.mts:122-165`) is untouched; cap/deadline computation (`capMs`, `deadline - Date.now()`) is untouched.
4. **Test quality (no mock-mirrors-assertion trap)** — PASS. Both `installCapturingProvider()` (`memory-sink.test.mts:44-54`) and the transport-level `_setProvider` fake push the raw `req` object the production code actually constructs (`calls.push(req as CapturedCall)` / `seen.push(req)`), not a hand-shaped stub. These assertions would fail against the pre-fix nested-only shape since `req.project`/`req.agent` would be `undefined` on the raw object. Ran both files directly: `bun test src/tests/memory-sink.test.mts src/tests/memory-transport.test.mts --timeout 60000` → **39 pass, 0 fail, 90 expect() calls** (5.19s).
5. **docs/sop/memory-bridge.md accuracy** — PASS. Grepped the rewritten file for stray CLI-era claims (`resolveCli`, `buildRememberArgs`, `emit()`); the only hit is the intentional historical note ("its CLI-spawn `emit()`/`buildRememberArgs()` were... deleted") explaining what was removed, not a live claim. The provider-path contract described (`sendViaProvider`, `ProviderIngestPayload`, top-level + metadata field table) matches the code.
6. **No scope creep** — PASS. `git diff --stat` against HEAD shows exactly the five files in scope changed; `memory-gepa.mts`, `astramem-e2e-preflight.mts`, backlog files, `agents/`, `skills/`, and all SLICE-160 files in the working tree are untouched by this diff.

## Gate re-verification

- `bun test src/tests/memory-sink.test.mts src/tests/memory-transport.test.mts --timeout 60000` → PASS, 39 pass / 0 fail / 90 expect() calls (independently re-run, not just trusting the handoff).
- `bunx tsc --project tsconfig.json --noEmit` → PASS (no output).
- `bunx tsc --project tsconfig.test.json --noEmit` → PASS (no output).
- `bunx biome lint` on the 4 touched files → PASS, 16 pre-existing `useLiteralKeys` infos only (info severity, matches handoff claim, none new/blocking).
- `bunx biome format` on the 4 touched files → PASS, "No fixes applied."

## AC coverage (Plan Phase 1, item 1 — the only item this dispatch addresses)

| AC | Status | Evidence |
|---|---|---|
| `recordMemory` hoists `project`+`agent` to top-level `IngestPayload`-shaped fields | PASS | `memory-sink.mts:154-155`, type widened in `memory-transport.mts:42-44` |
| metadata copy kept for back-compat | PASS | `memory-sink.mts:146-148,156` |
| `write → search_memory project=runner-plugin finds it` (plan's full Phase-1 AC-5) | **NOT VERIFIED HERE** | Requires a live daemon-connected check; correctly deferred to Phase 2 (e2e smoke suite) / a manual `ASTRAMEM_E2E=1` run per the handoff's own Risk #1. Code-level mechanism is structurally correct and non-regressive but the live round-trip is unconfirmed — this is a known, disclosed gap, not something the reviewer can close without daemon access. |
| `why_memory` shows top-level project + correct agent + scope team | **OUT OF SCOPE** | `scope:"team"` default (plan item 4) and agent-threading through `memory-gepa.mts` (plan item 3) were explicitly not touched by this dispatch, consistent with its stated authorized-file-list boundary. |

The dispatch fully satisfies plan item 1 (the code-level fix + its own review checklist) but does not close the plan's overall Phase-1 AC on its own — that requires either the deferred live daemon check or the follow-up items (2-4) the handoff already flags as open. This is scoping, not a defect, and the handoff is transparent about it.

## Recommendation

**Approved.** The fix is correct, evidence-backed against the actual installed package types (not just the builder's say-so), additive/non-regressive, tested with assertions that would genuinely catch a regression to the old shape, and honestly scoped/documented. No changes requested. Suggest folding the remaining Phase-1 items (GEPA project/agent threading, `scope:"team"` default) into a follow-up slice as the handoff already recommends, and closing plan item 1's live-verification gap in Phase 2.
