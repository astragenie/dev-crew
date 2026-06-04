# Task Handoff: Review: dispatch-instruction crew:builder + parent-loop gates

- Created: 2026-06-04T22:43:44.251Z
- From: reviewer
- To: lead
- Objective: Code change approved with notes — runtime correct, six doc/rule locations stale and need a follow-up doc update.
- Allowed Scope:
  - Review of unstaged changes to dispatch.mts and start-slice.mts (plus their compiled .mjs outputs and loop.mjs)
- Forbidden Scope: -
- Deliverable: Review result artifact: approved_with_notes; six specific stale locations identified in rule/template docs
- Changed Files:
  - src/scripts/lib/slice-linker/dispatch.mts
  - src/scripts/lib/slice-linker/start-slice.mts
  - scripts/lib/slice-linker/dispatch.mjs
  - scripts/lib/slice-linker/start-slice.mjs
  - scripts/loop.mjs
  - commands/slice-start.md
- Confidence: high
- Risks: Autonomous loop reads .claude/loop/rules.md at session start; step 4 and dispatch table there still say /crew:build, contradicting the dispatchInstruction text the loop will receive
- Suggested Next Handoff: Doc-update task: fix six stale /crew:build references in CLAUDE.md (line 130), templates/loop-rules.md (lines 54, 65), templates/claude-md-hard-rules.md (line 11), .claude/loop/rules.md (lines 96, 107); fix stale comment in src/scripts/loop.mts (line 83)

