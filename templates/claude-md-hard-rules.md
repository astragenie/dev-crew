<!-- autonomous-loop:start -->
<!-- Installed by /autonomous-loop:install. Edit .claude/autonomous-loop.json to change stack-specific commands; re-run /autonomous-loop:install to regenerate this block. The full HARD RULES live at .claude/autonomous-loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

This repo runs the Wiggin Loop autonomously. Full rules: `.claude/autonomous-loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Slice start ceremony.** Every slice MUST open via `/autonomous-loop:slice start --id SLICE-NN` (rotates `currentRun` so cost auto-emit attributes the work correctly + refreshes `.claude/state/crew/slice-progress.md`).
- **Dispatch discipline.** The loop is an orchestrator, not an implementer. Hand the `slice start` return's `dispatchInstruction` to a `/crew:build` subagent; pivot to `/crew:fix` on any review:needs_fix or validation:fail. Inline implementation is reserved for trivial single-line fixups.
- **Slice close ceremony.** Every slice MUST close via `/autonomous-loop:slice complete --id SLICE-NN` (writes handoff + final-synthesis + cost-report + cost-advise) followed by `/autonomous-loop:slice grade*`. Manual file moves + a `docs(slice): mark ... complete` commit are NOT a substitute.
- **Build entry points.** `/crew:build` is the interactive single-slice path (lighter — no run-brief required). Autonomous loop is the unattended multi-slice path (full ceremony). Never run both against the same branch — they race on workflow-state.
- **Auto-continue.** After the ceremony, scan `docs/specs/` → `docs/backlog/pending/` → `docs/backlog/triaged/` and promote the next item without asking.
- **Phase gate.** When the last slice in a phase completes, run `/autonomous-loop:phase-gate` before starting the next phase.
- **Worktree parallelism.** Run parallel features in sibling git worktrees — each has its own `.claude/state/`. Cost attribution is auto-scoped per worktree. Use `crew fleet --repo "$PWD"` for a one-glance view. Never check out the same branch twice; never push from inside the loop.

First action when starting the loop: read `.claude/autonomous-loop/rules.md` → `{{aiLoopRoot}}/00-entry/MASTER_PROMPT.md` → `{{backlogPath}}/approved-slices.md`.

<!-- autonomous-loop:end -->
