---
id: SLICE-37
status: completed
feature: FEAT-039
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-04
updated: 2026-06-04
autonomous_safe: true
completed_at: 2026-06-04
---
# SLICE-37: re-read guard hook + model routing audit

Implements FEAT-039 (items 2, 3, 4). See [feature file](../../../backlog/in-progress/FEAT-039.md) for full context.

Item 1 (smarter re-read detector in session-cost.mjs) and item 5 (brief-me round-trip fix) live in the crew plugin repo — out of scope here.

## Objective

Reduce per-slice Opus spend via two levers: (a) a PreToolUse hook that warns on post-Edit re-reads of the same file, and (b) a research doc + ADR that audits every Agent dispatch site, recommends Sonnet/Haiku routing for non-Opus work, and updates `loop.json::modelRouting` accordingly.

## In scope

- `hooks/read-guard.sh` — PreToolUse bash hook: inspects `CLAUDE_TOOL_INPUT` for `file_path`, checks `.claude/state/crew/read-guard.jsonl` session log, exits non-zero with message if same path was read AND the immediately prior tool call on that path was a Write or Edit (post-Edit re-read = defect). Paging reads (different offset) pass through.
- `hooks/read-guard.jsonl` log schema + reset-on-session-start behavior documented in the hook.
- `/loop:install` updated to register the hook in `.claude/settings.json` under `PreToolUse`.
- `docs/research/2026-06-04-model-routing-audit.md` — enumerate every `Agent(subagent_type: ...)` and dispatch site across commands/ and skills/, document current effective model, recommended model, estimated per-message cost delta. Output table: `dispatch_site | current_model | recommended | reason`.
- `docs/decisions/DEC-TBD-model-routing-policy.md` — ADR capturing routing decisions from the audit.
- `loop.json::modelRouting` updated to reflect at least 2 confirmed routing changes from the ADR.
- `src/scripts/commands/stop-check.mts` — add per-slice cost ceiling check: read `loop.costSliceCeiling` (new optional field, default 75), compare against latest slice cost report, emit `[HIGH] slice cost exceeded ceiling` if over. Compile + test.

## Out of scope

- Smarter `postEditReReadCount` / `sameRangeReReadCount` split in `session-cost.mjs` (crew plugin, separate repo — tracked as FEAT-039 item 1 follow-up to crew).
- Brief-me JSON round-trip optimization (crew plugin).
- Hook UI / CLI override flag (follow-up if needed).
- Haiku routing (two-tier Sonnet/Opus is sufficient for this slice).

## Acceptance criteria

- [ ] AC-1: `npm test` green (all tests pass); `npm run lint` clean; `npm run typecheck` clean; `npm run format:check` clean; manifests + content-length valid.
- [ ] AC-2: `hooks/read-guard.sh` exists, is executable, and exits non-zero with a human-readable warning when the same `file_path` appears consecutively (prior tool = Edit or Write). Verified by unit test or inline assertion with a synthetic JSONL log.
- [ ] AC-3: `/loop:install` registers the hook — running the install command on a clean repo produces a `PreToolUse` entry referencing `read-guard.sh` in `.claude/settings.json`. Verified by reading the output file after a test run.
- [ ] AC-4: `docs/research/2026-06-04-model-routing-audit.md` written and includes a routing table covering ≥ 8 dispatch sites with current + recommended model and cost-delta rationale.
- [ ] AC-5: `docs/decisions/` contains an ADR for model routing policy; at least 2 dispatch sites in `loop.json::modelRouting` updated per the ADR.
- [ ] AC-6: `stop-check` command emits `[HIGH] slice-cost-ceiling:exceeded` when `loop.costSliceCeiling` is set and the latest slice cost report exceeds it. New unit test covers the path; existing stop-check tests unbroken.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-039 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Files

- `hooks/read-guard.sh` (new)
- `src/scripts/commands/install.mts` (update hook registration)
- `scripts/commands/install.mjs` (compiled output)
- `src/scripts/commands/stop-check.mts` (add costSliceCeiling check)
- `scripts/commands/stop-check.mjs` (compiled output)
- `src/tests/stop-check-cost-ceiling.test.mts` (new)
- `tests/stop-check-cost-ceiling.test.mjs` (compiled output)
- `docs/research/2026-06-04-model-routing-audit.md` (new)
- `docs/decisions/DEC-TBD-model-routing-policy.md` (new)
- `.claude/loop.json` (modelRouting updates)

## Reviewer ladder

- Reviewer A: spec compliance (ACs 2-6 vs implementation)
- Reviewer B: code quality (hook safety, stop-check complexity)
