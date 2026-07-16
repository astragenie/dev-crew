# Task Handoff: memory.scope default + sink-level noise guard (Phase 3a)

- Created: 2026-07-16T10:48:59Z
- From: builder (memory-scope-noise-guard task)
- To: reviewer
- Objective: Phase 3a of `.claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md` — (1) default the loop's astramem writes to `scope: "team"` (astramem's own default, `"private"`, is invisible to shared/team recall), overridable via `.claude/loop.json` `memory.scope` or a per-call `opts.scope`; (2) reject meta-noise content (query echoes, model-capability boilerplate, bare shell one-liners) at the sink before it ever reaches the provider.
- Allowed Scope: `src/scripts/lib/memory-transport.mts`, `src/scripts/lib/memory-sink.mts`, new `src/scripts/lib/memory-noise-guard.mts`, `src/tests/memory-sink.test.mts`, `src/tests/memory-transport.test.mts`.
- Forbidden Scope: `src/tests/astramem-e2e*.test.mts`, `src/scripts/lib/astramem-e2e-preflight.mts`, `src/scripts/lib/bounded-fetch.mts`, `src/tests/bounded-fetch.test.mts`, `docs/sop/memory-bridge.md` (all owned by in-flight PR #516) — untouched. Did not touch `memory-gepa.mts`, backlog, agents, or skills. No commits made.
- Deliverable: scope threading + noise guard, both test-covered; no repo-config changes needed by consumers (default is additive and backward compatible).

## Changed / added files

- `src/scripts/lib/memory-transport.mts:33-45` — widened `ProviderIngestPayload` with optional top-level `scope?: "private" | "team" | "org"`, doc comment follows the existing project/agent local-widening pattern, cites ADR-009 (team/org insert directly).
- `src/scripts/lib/memory-noise-guard.mts` (new, 96 lines) — table-driven `NOISE_PATTERNS` (3 regex classes) + `looksLikeBareCommand` heuristic + `isNoiseContent(content)` export. Pure, no I/O.
- `src/scripts/lib/memory-sink.mts`:
  - `MemoryScope` type (line 38) + `MemoryConfig.scope` (optional, line 60) + `RecordResult.reason` gains `"noise"` (line 65).
  - `readMemoryConfig` now returns `scope: normalizeScope(memObj.scope)` (line 108) — always populated with a valid member, default `"team"`.
  - `normalizeScope` helper (line 127) — 3-value union validate-or-fallback-to-`"team"`.
  - `recordMemory` (line 148): noise check right after the empty-content check (before any I/O — `if (isNoiseContent(content)) return { recorded: false, reason: "noise" }`); `scope = normalizeScope(opts.scope ?? cfg.scope)` (per-call override wins); payload assembly extracted into `buildTagFields(project, agent, scope)` (line 138) to keep `recordMemory`'s cognitive complexity under the repo's cap of 15 (was 17 with the noise check inlined).
  - `recordDecision` / `recordLesson` / `recordNote` / `recordFailure` all gained an optional `scope` passthrough field for API symmetry with `project`/`agentType` (additive, no signature breakage).
- `src/tests/memory-sink.test.mts` — added: `memory.scope` normalization table (absent/private/team/org/invalid-string/wrong-type, all via `readMemoryConfig`), a `recordMemory` scope-delivery block (default team, config override, per-call override wins over config, invalid config falls back to team), and a `"recordMemory noise guard (Phase 3a)"` describe block with one exemplar + one legitimate near-miss per noise class (7 tests total) plus a disabled-repo noise-precedence test.
- `src/tests/memory-transport.test.mts` — added scope assertion to the existing provider-delivery test, plus 4 new tests: config-scope delivered top-level, invalid config falls back to team, and noise content never reaching the injected provider.

## Exact pattern table (`memory-noise-guard.mts`)

| name | pattern / heuristic | exemplar (rejects) | near-miss (passes) |
|---|---|---|---|
| `query-echo` | `/\b(recall_memory\|search_memory\|agent_profile)\b.*\b(query\|search string\|k set to)\b/i` | "recall_memory returned 3 hits for query 'project scope defaults'" | "Lesson: recall_memory must be called with project top-level or hits are lost" |
| `capability-boilerplate` | `/\bI (cannot\|can't\|do not have) (access\|the ability)\b/i` | "I cannot access the underlying provider configuration directly" | "Users cannot access the dashboard without an invite — document this in the FAQ" |
| `training-data-boilerplate` | `/\bbased on (input and )?training data\b/i` | "This summary is based on training data and may be incomplete" | "The model's training data cutoff means recent APIs may be missing — verify before use" |
| bare-command | first whitespace token ∈ `{bun, bunx, git, gh, npm, npx}`, single line, every token matches `/^[\w./:@=+-]+$/` AND no token is a common English stopword (`the/is/should/must/...`) | "bun test src/tests/ --parallel --timeout 60000" | "Run \`bun test ...\` before every commit to catch regressions early" (tool wrapped in prose) and "Git commits should follow the conventional commit format" (tool-name-first prose, caught by the stopword check on "should"/"the"/"follow") |

## Gate outputs

- `bun test src/tests/ --parallel --timeout 60000` → **2924 pass, 7 skip, 0 fail** (2931 total, 295 files) — run twice (once pre-refactor, once post-complexity-fix), identical result both times. Pre-existing offline `git fetch origin main` warnings in unrelated slice-id-allocator tests are baseline noise, not caused by this change.
- `bunx tsc --project tsconfig.json --noEmit` → clean, no output.
- `bunx tsc --project tsconfig.test.json --noEmit` → clean, no output.
- `bunx biome lint src/scripts/lib/memory-sink.mts src/scripts/lib/memory-noise-guard.mts src/scripts/lib/memory-transport.mts` → clean (0 warnings/errors after extracting `buildTagFields` to fix a `noExcessiveCognitiveComplexity` 17→15+ violation, and switching two bracket-key writes to dot-notation to clear `useLiteralKeys` infos).
- `bunx biome format` (check mode) on all 5 touched files → clean, no diffs.
- Did **not** re-lint `memory-transport.test.mts`'s pre-existing 3 `useLiteralKeys` infos (lines 67/68/86, `process.env["CLAUDE_PLUGIN_ROOT_MEMORY"]` / `globalThis[...]`) — those predate this change and sit in a describe block I only appended after, not touched.

## Confidence: high

Both features are additive and backward compatible: `MemoryConfig.scope` and per-helper `scope` params are all optional, so the one out-of-scope caller in `src/tests/astramem-e2e.test.mts:191` (`config: { mode: "on" }`, owned by PR #516) still type-checks and behaves identically (scope resolves to the `"team"` default at the `normalizeScope(opts.scope ?? cfg.scope)` call site, not a compile-time requirement).

## Risks / open questions

- The bare-command stopword list is a heuristic, not exhaustive — a command line that happens to avoid every listed stopword but still reads as prose could theoretically slip through undetected. Given the explicit "false-positive rejection of a real lesson is worse than noise passing" instruction, this is an intentional under-detection bias, not an oversight.
- `scope` is sent top-level only (no `metadata.scope` mirror), unlike `project`/`agent`. This matches ADR-009's "team/org insert directly" framing (as relayed in the task) but I have not read ADR-009 itself — if it turns out astramem also expects a `metadata.scope` fallback for older provider versions, that would need a follow-up.
- Did not add a standalone unit-test file for `memory-noise-guard.mts` in isolation — coverage instead runs through `recordMemory` in the two named test files (per the task's explicit file list), which exercises the guard functionally but doesn't unit-test `isNoiseContent` directly against edge cases beyond the 4 pattern rows above.

## Suggested Next Handoff

Reviewer: confirm the ADR-009 top-level-only (no metadata mirror) scope framing matches the actual daemon contract, and sanity-check the bare-command stopword list against any real historic noise-atom examples in astramem-local#371 if accessible.
