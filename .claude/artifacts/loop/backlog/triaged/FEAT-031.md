---
id: FEAT-031
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-05
depends_on: [FEAT-024, FEAT-026, FEAT-028, FEAT-029, FEAT-033]
slices: []
derived_from: null
pm_customer_impact: 0.85
pm_effort_estimate: 0.9
pm_strategic_alignment: 0.85
pm_technical_risk: 0.8
pm_dependency_depth: 0.5
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-11-05
autonomous_safe: false
triage_notes: "P1, holds; autonomousSafe stays false per explicit instruction and independently justified by the now-even-larger cross-cutting blast radius (hooks/hooks.json regeneration, dist/, the command-path rewrite, and 20+ hook checks ported into one registry) plus the newly-confirmed SubagentStop/onFailure CLI-version limitation that the design itself can only partially work around. effort_estimate raised to 0.9 (band 0.85-1.0, mapping to the architect's directed 13 points) reflecting the corrected, larger true scope relative to the original 8-point estimate."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "1/7 Registry: wrap existing hook checks into CHECKS array"
    points: 2
    estimated_tokens: 100000
    touches_files: [crew/hooks/registry.mts]
  - id_suffix: -SLICE-2
    title: "2/7 Dispatcher core: stdin read, filter, allSettled, exit-code logic"
    points: 2
    estimated_tokens: 100000
    touches_files: [crew/hooks/dispatch.mts]
  - id_suffix: -SLICE-3
    title: 3/7 Dispatcher failure modes + hook_dispatch log line
    points: 2
    estimated_tokens: 100000
    touches_files: [crew/hooks/dispatch.mts]
  - id_suffix: -SLICE-4
    title: "4/7 Telemetry port: log-event check, otel spool/flush, delete bash-gate hooks"
    points: 2
    estimated_tokens: 100000
    touches_files: [crew/hooks/otel-flush.mts, crew/hooks/pre-tool-use-bash-gate.mts, crew/hooks/post-tool-use-bash-gate.mts, crew/hooks/lib/bash-gate-timer-tap.mts, crew/scripts/log_event.sh]
  - id_suffix: -SLICE-5
    title: 5/7 render-hooks-json + command/agent path rewrite to dist/
    points: 2
    estimated_tokens: 100000
    touches_files: [src/scripts/render-hooks-json.mts, hooks/hooks.json, docs/planning/hooksjson-crew-path-inventory.json, src/scripts/build-dist.mts, commands/*.md, agents/*.md]
  - id_suffix: -SLICE-6
    title: 6/7 Dispatcher/hooks-json shape tests + before/after perf bench
    points: 2
    estimated_tokens: 100000
    touches_files: [crew/tests/hooks/dispatch.test.mts, crew/tests/hooks/hooks-json-shape.test.mts, src/tests/perf/hook-spawn-bench.mts]
  - id_suffix: -SLICE-7
    title: 7/7 Perf results + residual-risk record
    points: 1
    estimated_tokens: 60000
    touches_files: [docs/audits/2026-11-05/README.md, docs/memory.md]
---
## Description

Audit T8: one bun dispatcher per hook event — timeouts, fail-closed enforcement, spooled telemetry, measured

Source: remediation plan Task 8; audit #3, #11, #12, #25; Codex #3 (fan-out OVERSTATED), #11, #12, #26; architect OBJ-10/OBJ-17; reviewer MAJORs on onFailure scope, perf measurement, slice order. Wave 4, serial, `autonomous_safe: false`. Depends on: FEAT-024 (gates correct first, Codex #24), FEAT-026 (build-dist + dist/), FEAT-028 (report block format the gate-guard keys on), FEAT-029 (refs merged), FEAT-033 (hooks file path), W2.5 path rewrite merged.

Problem: hooks/hooks.json has 38 entries (21 bun, 11 node, 6 shell). PreToolUse Bash = 3 bun spawns across two matchers (`Bash|PowerShell`, `Bash`); Agent = 3 bun + 1 node; SubagentStop = 8 processes. crew/hooks/lib/bash-gate-timer-tap.mts correlates pre/post via a module-local Map across processes (dead). No onFailure fields; crew/scripts/log_event.sh is a shell dependency; nothing writes PreToolUse/PostToolUse/Stop rows to events.jsonl. No perf baseline exists in THIS repo (214 ms is dev-team's); hyperfine is not installed. Constraints discovered: `onFailure:"block"` is honoured only on PreToolUse, UserPromptSubmit, UserPromptExpansion, ConfigChange, PreCompact, PreModelSwitch (ignored on SubagentStop) and only on CLI ≥ 2.1.295 (host is 2.1.270) — so exit 2 must carry enforcement on its own.

Deliverable (slice order fixed — tests ship WITH each slice):
- SLICE-1 registry (2 pts): crew/hooks/registry.mts CHECKS: Array<{event, matcher?, name, enforce, timeoutMs, run(input)→CheckResult}> wrapping each crew/hooks/lib/*.mts run*Hook once, INCLUDING model-routing-enforce (kept; Codex #26). CheckResult = {block?:{reason}, systemMessage?, updatedInput?}; documented merge rule for updatedInput across checks (last enforce:true writer wins per key; blocks take precedence). Tests.
- SLICE-2 dispatcher (4 pts): crew/hooks/dispatch.mts `bun dispatch.js <EventName>`: stdin once, filter by event + matcher, Promise.allSettled with per-check timeout; any block from enforce:true → exit 2 with reasons joined "; "; rejected enforce:false → logged + ignored; rejected enforce:true → exit 2; a throw before the registry loads → exit 2. Appends one `{type:"hook_dispatch", event, matcher, checks[], ms}` row per invocation to .claude/logs/events.jsonl. PreToolUse output via hookSpecificOutput.permissionDecision. Tests (a)-(d) from the source plan + the pre-registry throw.
- SLICE-4 telemetry port (2 pts): log_event.sh → `log-event` check (enforce:false, {schemaVersion, event, session_id, agent_id, ts}); otel checks append to .claude/state/otel-spool.jsonl, crew/hooks/otel-flush.mts on Stop exports with 2 s cap; missing-OTel warning once per session (not per call). Delete pre-tool-use-bash-gate.mts, post-tool-use-bash-gate.mts, lib/bash-gate-timer-tap.mts, crew/scripts/log_event.sh, and the dead rump crew/hooks/hooks.json. Tests.
- SLICE-3 renderer (2 pts): src/scripts/render-hooks-json.mts emits ONE bun entry per event with matchers unified to the union (e.g. `Bash|PowerShell`), `"timeout"` = max check timeout + 1 s (seconds), `onFailure:"block"` on PreToolUse enforcement groups only; node .mjs entries: decide fold-in (they import only ./feature-flag-lite.mjs) or keep — record the decision. Updates build-dist.mts entry list, regenerates hooks/hooks.json, dist/, docs/planning/hooksjson-crew-path-inventory.json; touches_files are globs (`commands/*.md`), not directories.
- SLICE-5 shape test + measurement (2 pts): crew/tests/hooks/hooks-json-shape.test.mts; src/tests/perf/hook-spawn-bench.mts (20 runs, p50 via performance.now(), no hyperfine) recorded BEFORE SLICE-1 on current hooks.json and AFTER SLICE-3 on the same machine into docs/audits/2026-11-05/README.md (create if absent). Residual recorded in docs/memory.md: SubagentStop cannot be fail-closed at runtime level; CLI < 2.1.295 ignores onFailure.

Acceptance criteria (draft):
- Given hooks/hooks.json, then exactly one bun command per event, every entry has timeout, every PreToolUse enforcement group has onFailure block.
- Given a PreToolUse Bash payload with a stub registry where one check throws and another blocks, then exit 2 and the reason lists the blocker; given only a telemetry check throwing, then exit 0 and a hook_dispatch row plus one error row in events.jsonl; given dispatch.js throws before loading the registry on SubagentStop, then exit 2.
- Given a SubagentStop payload whose final message is the FEAT-028 marker-first block with `DONE:` and a red review gate, then exit 2.
- Given an Agent dispatch with loop.modelRouting.enabled true and no model, then updatedInput.model is set.
- Given consumer-smoke (FEAT-022) through dist/hooks/dispatch.js, then PASS; given the perf bench, then after-p50 ≤ 0.5 × before-p50 for PreToolUse Bash and the spawn count is 1.
- validate-agent-refs, validate-repo-boundary, validate-manifests green.

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given `hooks/hooks.json`, Then exactly one `bun` command exists per event, every entry has a `timeout`, and every PreToolUse enforcement group has `onFailure: "block"`.
- AC-2: Given a PreToolUse Bash payload with a stub registry where one check throws and another blocks, Then it exits `2` and the reason lists the blocker; given only a telemetry check throwing, Then it exits `0` with a `hook_dispatch` row plus one error row in `events.jsonl`; given `dispatch.js` throws before loading the registry on SubagentStop, Then it exits `2`.
- AC-3: Given a SubagentStop payload whose final message is the FEAT-028 marker-first block with `DONE:` and a red review gate, Then it exits `2`.
- AC-4: Given an Agent dispatch with `loop.modelRouting.enabled: true` and no `model` set, Then `updatedInput.model` is set.
- AC-5: Given the consumer smoke test (FEAT-022) running through `dist/hooks/dispatch.js`, Then it PASSES; given the before/after perf bench, Then after-p50 is at most half of before-p50 for PreToolUse Bash, with a spawn count of 1; and `validate-agent-refs`, `validate-repo-boundary`, `validate-manifests` are all green.

## Proposed slices (PM decomposition)

- SLICE-1: 1/7 Registry: wrap existing hook checks into CHECKS array (2 pts)
- SLICE-2: 2/7 Dispatcher core: stdin read, filter, allSettled, exit-code logic (2 pts)
- SLICE-3: 3/7 Dispatcher failure modes + hook_dispatch log line (2 pts)
- SLICE-4: 4/7 Telemetry port: log-event check, otel spool/flush, delete bash-gate hooks (2 pts)
- SLICE-5: 5/7 render-hooks-json + command/agent path rewrite to dist/ (2 pts)
- SLICE-6: 6/7 Dispatcher/hooks-json shape tests + before/after perf bench (2 pts)
- SLICE-7: 7/7 Perf results + residual-risk record (1 pts)
