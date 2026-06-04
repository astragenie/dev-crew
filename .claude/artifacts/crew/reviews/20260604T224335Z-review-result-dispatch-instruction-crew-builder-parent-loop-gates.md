# Review Result: dispatch-instruction: crew:builder + parent-loop gates

- Created: 2026-06-04T22:43:35.766Z
- Reviewer: reviewer
- Decision: approved_with_notes
- Summary: Code change is correct and test-backed; six doc/rule locations still reference the old /crew:build dispatch model and must be updated before they mislead the autonomous loop.
- Evidence Checked:
  - 717/717 tests pass; compiled .mjs outputs (dispatch.mjs
  - start-slice.mjs
  - loop.mjs) match updated .mts source; commands/slice-start.md example JSON already updated; test assertions updated to new strings; CLAUDE.md line 130
  - templates/loop-rules.md lines 54+65
  - templates/claude-md-hard-rules.md line 11
  - .claude/loop/rules.md lines 96+107 still say /crew:build; src/scripts/loop.mts line 83 comment stale
- Files Reviewed:
  - src/scripts/lib/slice-linker/dispatch.mts
  - src/scripts/lib/slice-linker/start-slice.mts
  - scripts/lib/slice-linker/dispatch.mjs
  - scripts/lib/slice-linker/start-slice.mjs
  - scripts/loop.mjs
  - commands/slice-start.md
  - src/tests/slice-linker.test.mts
  - src/tests/slice-start.test.mts
- Test Adequacy: 717 pass / 0 fail; slice-linker and slice-start test suites already assert new strings (Dispatch crew:builder subagent, parent loop drives those gates); no test gaps
- Risks: Six rule/doc locations (CLAUDE.md, two spots in templates/loop-rules.md, templates/claude-md-hard-rules.md, two spots in .claude/loop/rules.md) still prescribe /crew:build dispatch; autonomous loop reads .claude/loop/rules.md at session start and will encounter a contradiction between step-4 text and the dispatchInstruction it receives
- Required Follow-up: Update the six stale doc locations to say crew:builder (remove /crew:build wrapper reference from dispatch table and step 4 in rules.md, loop-rules.md template, claude-md-hard-rules.md template, and CLAUDE.md dispatch discipline line); update stale inline comment in src/scripts/loop.mts line 83

