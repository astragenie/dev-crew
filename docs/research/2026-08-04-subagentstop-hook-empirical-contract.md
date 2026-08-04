# SubagentStop hook — empirical contract check (2026-08-04)

Spike run before committing FEAT-259 SLICE-1 (the SubagentStop report-gate
hook) to a design. FEAT-259's highest-ROI mechanism assumes the hook fires
for dispatched agents and can block their stop; a documentation review
surfaced a closed GitHub issue claiming it does not fire for background
dispatches at all. Since this repo dispatches most specialists in the
background, that claim would have gutted the slice. Verified directly rather
than accepted.

## Method

Temporary `SubagentStop` hook registered via `.claude/settings.local.json`
(globally gitignored, removed after the run) appending each firing's payload
keys to a scratch JSONL. Three agents then stopped: one background
architect dispatch already in flight, one deliberately foreground trivial
agent (`run_in_background: false`), one deliberately background trivial
agent (`run_in_background: true`).

The hook was registered mid-session and fired without a session restart.

## Result — 3 firings, 3 of 3 agents

| agent | dispatch mode | fired |
|---|---|---|
| `arch-classify-281-283` | background | yes |
| `probe-foreground` | foreground | yes |
| `probe-background` | background | yes |

**`SubagentStop` fires for `run_in_background: true` dispatches on this
Claude Code version.** This contradicts [anthropics/claude-code#25147],
closed "not planned", which reported that background agents fire no Stop /
SubagentStop hook at all. Whatever the state of that issue when filed, the
behavior does not reproduce here. [#33049] (foreground subagents sometimes
not firing) also did not reproduce.

Re-verify after a Claude Code upgrade before treating this as stable — the
issue being closed "not planned" rather than "fixed" means the current
behavior is not a guaranteed contract.

## Observed payload keys

```
agent_id, agent_type, agent_transcript_path, last_assistant_message,
stop_hook_active, background_tasks, cwd, effort, hook_event_name,
permission_mode, prompt_id, session_crons, session_id, transcript_path
```

Three consequences for FEAT-259's design:

1. **`last_assistant_message` carries the subagent's full final text.**
   FEAT-259 exists because that text is not delivered to the orchestrator —
   but the hook receives it. The gate therefore has a stronger option than
   block-and-nag: it can detect that a report was produced, and in principle
   surface it. Worth revisiting SLICE-1's scope against this.

2. **`agent_type` carries the dispatch NAME, not the role.** It read
   `arch-classify-281-283`, not `runner:architect`. SLICE-1's "was this
   agent dispatched with a report-back contract?" test cannot key off
   `agent_type` as the FEAT's text implies — the value is caller-chosen.

3. **No field enumerates tools called during the run.** Checking "did it
   call SendMessage before stopping" still requires parsing
   `agent_transcript_path`. This part of the documentation review held.

`stop_hook_active` was `false` on all three firings, consistent with its
documented role as the block-loop guard (true only when the firing was
itself caused by a prior block decision).

## Blocking mechanics (documented, not re-verified here)

Exit code 2 with stderr, or `{"decision": "block", "reason": "..."}` on
stdout, forces the subagent to continue and delivers the reason as a new
turn. Exit 0 stops normally. This repo already encodes the hazard:
`hooks/capture-at-close.mjs` documents a deliberate fail-open contract and
never exits non-zero, "exit 2 would force a stop-retry loop". Any blocking
gate must consult `stop_hook_active` to avoid exactly that.

## Timing correction

An existing claim in this repo's crew agent-report artifacts — "SubagentStop
fires when the orchestrator returns to the user, which can land after
slice-complete" — conflates two events. `Stop` fires for the main session
before it awaits user input; `SubagentStop` fires per-subagent when that
subagent finishes and control returns to its immediate parent, which may be
another subagent. The underlying worry is still sound for both: these are
post-hoc checkpoints that fire after the model stops acting, so a hook can
force a retry but cannot prevent the gap.

[anthropics/claude-code#25147]: https://github.com/anthropics/claude-code/issues/25147
[#33049]: https://github.com/anthropics/claude-code/issues/33049
