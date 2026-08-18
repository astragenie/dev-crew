# Autonomous Loop — HARD RULES

Plugin-managed by `/runner:install`. Do not edit by hand. Full rationale,
tables, and worked examples for the rules below: `.claude/loop/rules-reference.md`.

## Autonomous Loop Instruction — HARD RULE

**Run autonomously until ALL acceptance criteria for the current slice are met. Do NOT ask the user for confirmation, clarification, or approval at any point during implementation. Do NOT stop after implementation — run review, fix all findings, run validation, then write artifacts and push. Only stop when every acceptance criterion is marked PASS with evidence (per `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md`), or the work is externally blocked (missing infrastructure, secret, or external dependency that cannot be resolved without the user). If blocked, state the blocker clearly and stop there.**

## Auto Mode No-Approval — HARD RULE

When `.claude/loop.json::loop.autoMode` is `true` (default), the loop MUST NOT raise per-slice approval gates — not for `autonomous_safe: false` items, not for plan-preflight artifacts, not for architect recommendations. Treat every architect/plan/PM recommendation as ratified by standing operator authorization and proceed with dispatch. Never paraphrase the gate as an approval question in chat — pick the recommendation and proceed.

Stop only on: a `crew run escalated_to_human` badge, cost cap exceeded (`loop.costStopThreshold`), a stop condition per `.claude/artifacts/loop/ai-loop/01-loop-control/STOP_CONDITIONS.md`, or an external blocker unresolvable without the user.

## Cross-Slice Continuation — HARD RULE

After all acceptance criteria for the current slice are PASS with evidence and all artifacts written, automatically pick the next unit of work — without user confirmation:

1. **Scan `.claude/artifacts/loop/specs/`** — for any spec with `status: approved` and empty `derived_features`, decompose it: `/runner:intake --spec`. New FEAT files land in `.claude/artifacts/loop/backlog/pending/`.
2. **Scan `.claude/artifacts/loop/backlog/pending/`** — if any pending entries exist, run `/runner:triage` to score them; scored entries move to `.claude/artifacts/loop/backlog/triaged/`.
3. **Pick the highest-priority triaged feature** — order P0 > P1 > P2 > P3; break ties by lowest FEAT-NNN id ascending (oldest wins). Promote it: `/runner:start FEAT-NNN`.
4. **Begin the Wiggin Loop on the new slice.** Acceptance criteria, evidence, review per `.claude/artifacts/loop/ai-loop/01-loop-control/`.
5. **On slice close** — run the Slice Close Ceremony (below). Do NOT skip it — every artifact is part of the slice's evidence record.

If `.claude/artifacts/loop/backlog/pending/`, `.claude/artifacts/loop/backlog/triaged/`, and `.claude/artifacts/loop/specs/` are all empty/satisfied, confirm via `/runner:spec-status` and stop. Never stop just because the backlog "feels empty." Slice/phase filename linkage and the auto-mode-vs-legacy gating table: `.claude/loop/rules-reference.md`.

## Orchestrator Model Gate — HARD RULE

After `/runner:start` returns, check `orchestratorModel` in the result. If it is non-null and does not match your current session model, STOP before any slice work. Exact stop text and restart command: `.claude/loop/rules-reference.md`. Resuming on the wrong model is a real cost mistake, not a formality.

## Slice Start Ceremony — HARD RULE

Open every slice through the canonical start command **before** beginning acceptance-criteria work:

1. **Identify the next slice.** Check `docs/superpowers/plans/*.md` for unchecked `## Task N: SLICE_NN` headings first; else fall back to Cross-Slice Continuation.
2. **`/runner:start <FEAT-NNN|SLICE-NN>`** — rotates `currentRun` via `crew write-run-brief`, seeds the goal from `## Objective`, rewrites `.claude/state/crew/slice-progress.md`.
3. **Inspect the return.** Confirm `runBrief.artifactPath` is populated and `workflow-state.json.currentRun.title` equals `SLICE-NN: <title>`. Surface errors and stop — never proceed against a stale run.
4. **Dispatch a crew builder subagent.** The return includes a `dispatchInstruction` — hand it to `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude`. There is no agent literally named `crew:builder`. Builder owns implementation only; when it returns, dispatch `crew:reviewer`, then `crew:validator` if behavior changed. **Do not implement inline.**
5. **Wait for builder, reviewer, and validator reports**, then run the Slice Close Ceremony.

Exception: manual invocations may pass `--no-dispatch`. The autonomous loop itself should never pass `--no-dispatch`.

## Dispatch Discipline — HARD RULE

The autonomous loop is an **orchestrator**, not an implementer. Every code-bearing unit of work runs through a crew subagent:

| Situation                                                          | Dispatch                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Slice implementation (acceptance criteria work)                    | a crew builder subagent — `crew:fullstack-dev` (or `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` |
| Bug found during slice (test fail, regression, integration error)  | `/crew:fix` subagent                                                                                 |
| Independent code review pass                                       | `/crew:review` subagent (or the configured reviewer ladder)                                          |
| Behavior validation when something is runnable                     | `/crew:validate` subagent                                                                            |
| Deployment / shipping a reviewed change                             | `/crew:ship` subagent                                                                                |
| Trivial inline fixup (typo, fixture path, single-line patch)       | Inline is fine — but log it in the run-brief                                                        |

Pivot triggers — any of these means **stop, dispatch `/crew:fix`, then resume**: a review_result with `status: needs_fix`; a validation_result with `status: fail`; a build/test failure that needs a root-cause hunt.

**Never use `caveman:*` agents for slice work** — they lack the full artifact protocol. Always use a real crew builder, `crew:reviewer`, `crew:validator`, `crew:release-engineer` — never `crew:builder`, which is not an agent.

**Dispatch budget:** maximum 3 subagent dispatches per slice. Inline execution for single-file edits, test/lint/format fixes. When in doubt, prefer dispatch — a subagent run produces its own artifact trail.

## Review Dispatch Budget — HARD RULE

Before dispatching any reviewer, pre-extract the slice spec's `Files:` list and AC criteria, and capture `git diff HEAD~1 -- <changed files>` inline. Dispatch spec-compliance and code-quality reviewers in one message (parallel), each scoped to the exact file list from the spec — no free-roaming reads, no full test suite. If spec review FAILS, fix then re-dispatch both; never run quality review on a failing spec. Full worked example: `.claude/loop/rules-reference.md`.

## Build Entry Points

Two ways to start work. Pick one per session — do **not** mix.

- **`/crew:build` (interactive, single slice).** Lead-driven, lighter ceremony. No `/runner:start` required; no run-brief mandatory. The Slice Close Ceremony still applies if the change closes a slice.
- **Autonomous loop (unattended, multi-slice).** Full ceremony required. Slice Start → Wiggin Loop → Slice Close. Invoked via `/runner:auto`, `ScheduleWakeup`, or `CronCreate`. Every slice must rotate `currentRun`.

Never run both simultaneously against the same branch — they race on `workflow-state.json`. One-glance visibility into all slices: `cat .claude/state/crew/slice-progress.md`.

## Slice Close Ceremony — HARD RULE

When every acceptance criterion is PASS with evidence, close the slice **before** picking up the next one. Manual file moves are NOT a substitute — they bypass artifact fan-out:

1. **`/runner:close SLICE-NN`** — atomically moves the slice to `completed/`, moves the linked feature to `done/`, reconciles parent SPEC status, captures grade + lessons, and fans out `handoffs/`, `runs/final-synthesis-*`, and `cost/`+`cost-insights/` artifacts.
2. **Inspect the ceremony return** — verify `handoffPath`, `synthesisPath`, and `costUsd` are populated. Fix any `{ error: ... }` before continuing.
3. **Apply Cross-Slice Continuation** to pick the next unit of work.

Expected artifact set per slice, all present before Cross-Slice Continuation: `reviews/`, `validations/`, `runs/run-brief-*.md`, `runs/final-synthesis-*.md`, `handoffs/*.md`, `cost/*-cost-report-*.md` + `cost-insights/*-cost-advise-*.md`. If any is missing for a closed slice, re-run the ceremony rather than continuing past it.

## Phase Completion Gate — HARD RULE

When the last slice in a phase completes, run `/runner:phase-gate`. The plugin executes every configured stage via `execFile` (no shell interpretation), captures output, and writes one validation artifact under `.claude/artifacts/crew/validations/phase-<N>-gate-<date>.md`. Do NOT proceed to the next phase on FAIL. Do NOT hand-author the gate artifact.

## Worktree Parallelism — HARD RULE

Run concurrent features in sibling git worktrees — each has its own `.claude/state/crew/workflow-state.json`:

1. Create one worktree per branch: `git worktree add ../repo-feat-a feat-a`.
2. Copy or git-track `.claude/loop.json` per branch.
3. Run the loop independently in each worktree.

Cost-attribution scoping order and the fleet-view command: `.claude/loop/rules-reference.md`. Constraints: each worktree must be on its own branch; never push from inside the autonomous loop; never run `/crew:build` and the autonomous loop simultaneously on the same worktree.

## Tool Discipline

- **Prefer dedicated tools over Bash.** Use Read/Grep/Glob for file operations. Reserve Bash for shell-only operations (git, npm, build commands).
- **Pre-validate paths.** Before file operations, verify the target exists. A failed tool call costs tokens for the error response plus the retry.
- **No speculative commands.** Plan the exact command before dispatching. Check flag syntax against the tool's help output if unsure.
- **Target: <2% tool failure rate per slice.** Cost reports track `toolFailureRate`. Above 5% triggers a cost advisory.

## First Action — Starting the Loop

Read in this order, then pick the highest-priority PENDING slice:

1. `.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md` — persona, stack, mandatory reading
2. `.claude/artifacts/loop/ai-loop/backlog/approved-slices.md` — pick highest-priority PENDING slice
3. The slice file listed in `approved-slices.md` (under `.claude/artifacts/loop/ai-loop/slices/`)
4. `.claude/artifacts/loop/ai-loop/01-loop-control/WIGGIN_LOOP.md` — the loop sequence
5. `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md` — how to mark PASS / PARTIAL / FAIL / BLOCKED
6. `.claude/artifacts/loop/ai-loop/01-loop-control/STOP_CONDITIONS.md` — when the loop is allowed to stop
