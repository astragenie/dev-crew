<!-- runner:start -->
<!-- Installed by /runner:install. Edit .claude/loop.json to change stack-specific commands; re-run /runner:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Auto mode (default — `loop.marathonMode: true`).** Loop walks the entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts. Iteration cap and soft `blocked` badge are advisory in this mode — set `loop.marathonMode: false` in `.claude/loop.json` to restore the legacy five-condition gating.
- **Slice start ceremony.** Every slice MUST open via `/runner:slice start --id SLICE-NN` (rotates `currentRun` so cost auto-emit attributes the work correctly + refreshes `.claude/state/crew/slice-progress.md`).
- **Dispatch discipline.** The loop is an orchestrator, not an implementer. Hand the `slice start` return's `dispatchInstruction` to a crew builder subagent — `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` (implementation only; there is no agent literally named `crew:builder`); after it returns, dispatch `crew:reviewer`, then `crew:validator` if behavior changed; pivot to `/crew:fix` on any needs_fix or fail. Inline implementation is reserved for trivial single-line fixups.
- **Slice close ceremony.** Every slice MUST close via `/runner:slice complete --id SLICE-NN` (writes handoff + final-synthesis + cost-report + cost-advise) followed by `/runner:slice grade*`. Manual file moves + a `docs(slice): mark ... complete` commit are NOT a substitute.
- **Build entry points.** `/crew:build` is the interactive single-slice path (lighter — no run-brief required). Autonomous loop is the unattended multi-slice path (full ceremony). Never run both against the same branch — they race on workflow-state.
- **Auto-continue.** After the ceremony, scan `{{specsRoot}}/` → `{{backlogRoot}}/pending/` → `{{backlogRoot}}/triaged/` and promote the next item without asking.
- **Phase gate.** When the last slice in a phase completes, run `/runner:phase-gate` before starting the next phase.
- **Worktree parallelism.** Run parallel features in sibling git worktrees — each has its own `.claude/state/`. Cost attribution is auto-scoped per worktree. Use `crew fleet --repo "$PWD"` for a one-glance view. Never check out the same branch twice; never push from inside the loop.

First action when starting the runner: read `.claude/loop/rules.md` → `{{aiLoopRoot}}/00-entry/MASTER_PROMPT.md` → `{{backlogPath}}/approved-slices.md`.

<!-- runner:end -->
