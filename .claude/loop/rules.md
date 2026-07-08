# Autonomous Loop — HARD RULES

Plugin-managed by `/loop:install`. Do not edit by hand.

## Autonomous Loop Instruction — HARD RULE

**Run autonomously until ALL acceptance criteria for the current slice are met. Do NOT ask the user for confirmation, clarification, or approval at any point during implementation. Do NOT stop after implementation — run review, fix all findings, run validation, then write artifacts and push. Only stop when every acceptance criterion is marked PASS with evidence (per `docs/ai-loop/01-loop-control/EVIDENCE_RULES.md`), or the work is externally blocked (missing infrastructure, secret, or external dependency that cannot be resolved without the user). If blocked, state the blocker clearly and stop there.**

## Auto Mode No-Approval — HARD RULE

When `.claude/loop.json::loop.autoMode` is `true` (default for this repo), the autonomous loop MUST NOT raise per-slice approval gates — not for `autonomous_safe: false` items, not for plan-preflight artifacts, not for architect recommendations. Treat all architect / plan / PM recommendations as ratified by the standing operator authorization and proceed with dispatch.

The walker's `requiresApprovalGate` flag and `start-slice.mts::computeApprovalGate` already honor this by returning `false` when `autoMode` is true. This HARD RULE binds the SESSION LEVEL: never paraphrase the gate as an approval question in chat. Plan-preflight artifacts are recorded for audit, not for sign-off.

Stop only on:
- `crew run escalated_to_human` badge from the artifact trail
- Cost cap exceeded (`loop.costStopThreshold` per `loop.json`)
- Stop conditions per `commands/stop-check.md`
- External blocker (missing infra / secret / sibling repo dep) that cannot be resolved without the user

If you find yourself drafting a chat message asking "approve a/b/c?" while `autoMode: true` — stop. Pick the architect's recommendation as the default and proceed.

## Cross-Slice Continuation — HARD RULE

After all acceptance criteria for the current slice are PASS with evidence and all artifacts written, automatically pick the next unit of work using the following scan order — without user confirmation:

1. **Scan `docs/specs/`** — for any spec with `status: approved` and empty `derived_features`, decompose it: `/loop:spec decompose --id SPEC-NNN --features "title 1; title 2; ..."`. The agent reads the spec body and supplies the feature titles. New FEAT files land in `docs/backlog/pending/`.

2. **Scan `docs/backlog/pending/`** — if any pending entries exist, run `/loop:triage`. The skill dispatches the PM agent with a deterministic id list from disk for 5-dimension scoring, then writes `pm_*` frontmatter and moves entries to `docs/backlog/triaged/`. On PM error, budget exceed (`loop.triageBudgetUsdPerBatch`, default 5.0), or output validation fail, the skill **halts** and surfaces a structured `halted: true` / `halt_reason: <pm_error|budget_exceeded|validation_fail>` result to the operator. No silent regex fallback (removed 2026-06-11).

3. **Pick the highest-priority triaged feature** — order P0 > P1 > P2 > P3; break ties by **lowest FEAT-NNN id ascending** (oldest feature wins). Deterministic; never stall on tied priorities. Promote it: `/loop:slice from-feature --id FEAT-NNN`. The plugin creates a new slice file under `docs/ai-loop/slices/pending/`, moves the feature to `docs/backlog/in-progress/`, and cross-links them via frontmatter (`slices: [SLICE-NN]` on the feature; `feature: FEAT-NNN` on the slice).

4. **Begin the Wiggin Loop on the new slice.** Acceptance criteria, evidence, review per `docs/ai-loop/01-loop-control/`.

5. **On slice close** — run the Slice Close Ceremony (next section). Do NOT skip this and move on to the next slice — every artifact emitted by the ceremony is part of the slice's evidence record.

If `docs/backlog/pending/` and `docs/backlog/triaged/` are both empty AND `docs/specs/` has no undecomposed approved specs, the agent has reached either stop condition A (every spec satisfied — confirm with `/loop:spec status`) or stop condition B (externally blocked). Surface which and stop. Never stop because the backlog "feels empty" — confirm via the explicit scan first.

### Slice frontmatter — optional `phase` field

Slices carry two optional linkage fields that propagate into artifact filenames and frontmatter:

- `feature: FEAT-NNN` — set automatically by `/loop:slice-from-feature` and `/loop:derive-slice`.
- `phase: <string|null>` — free-form phase identifier (`"1"`, `"2"`, `"beta"`). Defaults to `null`. Set on slice files that belong to a named phase.

Both fields propagate to:

- Filenames written by this repo (no timestamp — slug is unique per slice
  close): `runs/phaseN-featNNN-sliceNN-final-synthesis.md`,
  `handoffs/phaseN-featNNN-sliceNN-complete.md`,
  `validations/phaseN-gate.md`.
- Crew-CLI-written filenames (`reviews/`, `validations/`, `runs/run-brief-*`,
  `cost/*`): the loop passes `--title "PHASEN FEATNNN SLICENN: ..."`;
  crew's slugifier turns this into `phaseN-featNNN-sliceNN-...`. Loop then
  post-renames the crew-written file to strip the leading timestamp prefix,
  so filenames match the repo-owned surface on both sides. The same
  TS-strip runs inside `/loop:slice link --kind reviews|validations|
deployments` — agent-invoked `crew write-review-result` / `crew
write-validation-result` outputs land tight after linking.
- Frontmatter of repo-owned artifacts (handoff + final-synthesis):
  `feature:` and `phase:` keys (standard `FEAT-NNN` / `"3"` form).

Segments are internally tight (no dash inside `feat021`) and follow the
standard wide→narrow decomposition hierarchy (phase → feature → slice).
When either optional field is null the corresponding segment drops out:
`featNNN-sliceNN-...` or bare `sliceNN-...` are valid forms. Artifact
consumers (LoopObserver, dashboards) should treat the segments as
optional and ordered.

### Auto mode vs. legacy gating

`loop.marathonMode` in `.claude/loop.json` controls the active stop set (default `true` — auto mode on for new installs):

| Trigger                     | auto mode (default)          | legacy (marathonMode=false) |
| --------------------------- | ---------------------------- | --------------------------- |
| Backlog exhausted           | halt                         | halt                        |
| Crew `escalated_to_human`   | halt                         | halt                        |
| Warn-severity pattern alert | halt                         | halt                        |
| High-severity cost alert    | halt                         | halt                        |
| Iteration cap (default 25)  | advisory (snapshot only)     | halt                        |
| Crew soft `blocked` badge   | advisory (often self-clears) | halt                        |

Iteration counter still increments under auto mode; `stop-check` continues to report `iterationCount`/`iterationCap`/`crewBlocked` in `snapshot` for dashboards. Auto mode disables only the _gating_, not the _telemetry_. Set `marathonMode: false` if your repo prefers the legacy bounded-iteration behavior. The config key stays `marathonMode` for back-compat; the concept is "auto mode".

## Orchestrator Model Gate — HARD RULE

After calling `/loop:slice start`, inspect `orchestratorModel` in the return. If it is non-null and does not match your current session model, stop immediately before any slice work and output:

```
HARD GATE — Orchestrator model mismatch.
  Required: <orchestratorModel value from return>
  Current:  <your session model from system prompt>

Restart this session on the correct model before continuing the loop.
  claude --model claude-sonnet-4-6
Do not continue the loop until restarted on the correct model.
```

The autonomous loop must not proceed past this gate. Resuming on the wrong model burns Opus-tier cost for coordination work that Sonnet handles equally well.

## Slice Start Ceremony — HARD RULE

Open every slice through the canonical start command **before** beginning acceptance-criteria work. Skipping it leaves `workflow-state.json.currentRun` pinned to the previous slice (or a stale "verification" run), so the close ceremony's cost auto-emit attributes the new slice's spend to the wrong window.

Run, in order:

1. **Identify the next slice.** If `docs/superpowers/plans/*.md` exists and has unchecked `## Task N: SLICE_NN — Title` headings, pick the first unchecked one. Otherwise fall back to Cross-Slice Continuation (scan `docs/specs/` → `docs/backlog/pending/` → `docs/backlog/triaged/`).
2. **`/loop:slice start --id SLICE-NN`** — this rotates `currentRun` via `crew write-run-brief`, seeds the goal from the slice file's `## Objective` block when present, and rewrites `.claude/state/crew/slice-progress.md`.
3. **Inspect the return.** Confirm `runBrief.artifactPath` (or `runBrief.runBriefPath`) is populated and `workflow-state.json.currentRun.title` equals `SLICE-NN: <title>`. If not, surface the error and stop — do not proceed with implementation against a stale run.
4. **Dispatch a crew builder subagent.** The `slice start` return includes a `dispatchInstruction` — hand it to a crew builder subagent: `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude`. There is no agent literally named `crew:builder`. Builder owns implementation only; when it returns a write-handoff path, dispatch `crew:reviewer`, then `crew:validator` if behavior changed. **Do not implement inline.** The loop orchestrates the full pipeline; each role runs in its own bounded context.
5. **Wait for the subagent's completion report.** It will tell you what shipped, what was reviewed, what was validated. Then run the Slice Close Ceremony (next section).

Exception: manual invocations may pass `--no-dispatch` (e.g., debugging the loop itself, or a tiny inline change you don't want to spawn a subagent for). The autonomous loop should never pass `--no-dispatch`.

## Dispatch Discipline — HARD RULE

The autonomous loop is an **orchestrator**, not an implementer. Every code-bearing unit of work runs through a crew subagent. Decision matrix:

| Situation                                                         | Dispatch                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Slice implementation (acceptance criteria work)                   | a crew builder subagent — `crew:fullstack-dev` (or `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` (parent loop gates review+validate) |
| Bug found during slice (test fail, regression, integration error) | `/crew:fix` subagent                                        |
| Independent code review pass                                      | `/crew:review` subagent (or the configured reviewer ladder) |
| Behavior validation when something is runnable                    | `/crew:validate` subagent                                   |
| Deployment / shipping a reviewed change                           | `/crew:ship` subagent                                       |
| Trivial inline fixup (typo, fixture path, single-line patch)      | Inline is fine — but log it in the run-brief                |

Pivot triggers — any of these during a slice means **stop, dispatch `/crew:fix`, then resume**:

- A review_result with `status: needs_fix`
- A validation_result with `status: fail`
- A build/test failure that requires a root-cause hunt (not a one-line patch)

When in doubt, prefer dispatch. A subagent run produces its own artifact trail; an inline patch hides in the loop's conversation and loses cost/grade attribution.

## Review Dispatch Budget — HARD RULE

Review agents that roam freely read 25–35 files per review and run the full test suite, causing 3–5 min of unnecessary latency per slice. The following constraints apply:

**Before dispatching any reviewer:**
1. Pre-extract from the slice spec: the `Files:` list and `Done When:` / AC criteria.
2. Run `git diff HEAD~1 -- <changed files>` and capture the output inline.

**Dispatch spec compliance + code quality reviewers in a single message (parallel):**
```
# Reviewer dispatch — send BOTH in one message as parallel Agent tool calls
Agent(spec-compliance-reviewer, prompt = <spec content> + <diff> + scope rule)
Agent(code-quality-reviewer,   prompt = <spec content> + <diff> + scope rule)
```

**Every reviewer prompt MUST include this scope block:**
```
**Files in scope (from slice spec):**
- <exact list from spec Files: section>

Do not read files outside this list unless they are direct imports of the above.
Do not run the full test suite. Run only:
  npm test -- --test-name-pattern "<basename of the changed test file>"
```

If spec review FAILS: dispatch a builder fix, then re-dispatch both reviewers in parallel. Do NOT run quality review on a failing spec.

**Dispatch budget per slice:** builder (1) + parallel reviewers (1 message = 2 agents) = **3 total subagent dispatches**. Do not exceed 4. Inline trivial fixups rather than dispatching a 4th agent.

## Build Entry Points

For one-glance visibility into all slices in the active plan: `cat .claude/state/crew/slice-progress.md`. The dashboard is rewritten by start + close ceremonies; trust it over manual inspection of slice files or commits.

## Build Entry Points

Two ways to start work in this repo. Pick one per session — do **not** mix.

- **`/crew:build` (interactive, single slice or scoped task).** Lead-driven, lighter ceremony. No `slice start` required; no run-brief mandatory. Use when the user is at the keyboard and wants a single focused change. The Slice Close Ceremony **still applies** if the change closes a slice, but the start ceremony is optional.
- **Autonomous loop (unattended, multi-slice).** Full ceremony required. Slice Start (run-brief + slice-progress) → Wiggin Loop → Slice Close (handoff + final-synthesis + cost auto-emit). Invoked via `/loop`, `ScheduleWakeup`, or `CronCreate`. Every slice must rotate `currentRun`.

Never run both simultaneously against the same branch — they will race on `workflow-state.json` and the second writer wins.

## Slice Close Ceremony — HARD RULE

When every acceptance criterion on the current slice is PASS with evidence, close the slice through the canonical ceremony **before** picking up the next slice. Manual file moves + a `docs(slice): mark SLICE_NN complete` commit are NOT a substitute — they bypass the artifact fan-out and leave `handoffs/`, `runs/`, `cost/`, and `cost-insights/` empty.

Run, in order:

0. **Pre-check validation** — before calling `/loop:slice complete`, verify a `validations/` artifact exists for this slice (`ls .claude/artifacts/crew/validations/ | grep -i SLICE-NN`). If none: either dispatch `/crew:validate` now, or plan to pass `--skip-validation-check "<reason>"` to the complete command (the CLI will write the skip badge and allow completion). Skipping without the flag causes complete-slice to reject and forces a re-run of the ceremony.

1. **`/loop:slice complete --id SLICE-NN`** — atomically moves the slice file to `completed/`, moves the linked feature to `done/`, reconciles parent SPEC status, AND fans out three artifacts in parallel:
   - `.claude/artifacts/crew/handoffs/<timestamp>-slice-nn-complete.md`
   - `.claude/artifacts/crew/runs/<timestamp>-slice-nn-final-synthesis.md` (auto-emits `cost-report` → `.claude/artifacts/crew/cost/` and `cost-advise` → `.claude/artifacts/crew/cost-insights/`)
   - `cost-report` invoked via the hero-crew `cost-slice` CLI as a redundant safety net
2. **`/loop:slice grade --id SLICE-NN`** + **`/loop:slice grade-write --id SLICE-NN`** — capture scores, lessons, decisions. Skipping grading loses the self-improvement signal for this slice.
3. **Inspect the ceremony return** — verify `handoff.handoffPath`, `synthesis.synthesisPath`, and `costReport.usd` are all populated. If any returned `{ error: ... }`, surface the error and fix it before continuing; do not silently move on.
4. **Then** apply Cross-Slice Continuation to pick the next unit of work.

Expected artifact set per slice (all must exist before Cross-Slice Continuation):

- `reviews/` — written during the slice via `crew write-review-result`
- `validations/` — written during the slice via `crew write-validation-result` (per-slice runtime evidence, not just phase-gate)
- `runs/run-brief-*.md` — opened at slice start via `crew write-run-brief`
- `runs/final-synthesis-*.md` — emitted by the ceremony
- `handoffs/*.md` — emitted by the ceremony
- `cost/*-cost-report-*.md` + `cost-insights/*-cost-advise-*.md` — auto-emitted by the ceremony

If any of these is missing for a closed slice, the close is incomplete. Re-run the ceremony or invoke the missing `crew write-*` command directly before continuing.

## Phase Completion Gate — HARD RULE

When a phase of work completes (last slice in a phase marked COMPLETED in `approved-slices.md`), run the configured phase-gate suite by invoking `/loop:phase-gate`. The plugin executes every stage configured in `.claude/loop.json` (build, test, frontend build, infra plan, Aspire boot + healthchecks) via `execFile` — no shell interpretation, no injection surface — captures all output, and writes a single validation artifact under `.claude/artifacts/crew/validations/phase-<N>-gate-<date>.md` through `crew write-validation-result`. Do NOT proceed to the next phase if the gate returns FAIL. Do NOT hand-author the gate artifact; let the plugin own it for evidence quality.

## Worktree Parallelism — HARD RULE

Multiple features can be developed concurrently by running an autonomous loop in each git worktree. Each worktree is an isolated working directory with its own `.claude/state/crew/workflow-state.json` and `slice-progress.md` — no state races.

**Setup:**

1. Create one worktree per feature branch: `git worktree add ../repo-feat-a feat-a`.
2. Each worktree gets its own `.claude/loop.json` (copy or git-tracked per branch).
3. Run `/loop` independently in each worktree terminal pane or scheduled invocation.

**Cost attribution in parallel mode:**

`tryWriteCostReport` resolves the scoping mode in this order:

1. `loop.costProject` in `.claude/loop.json` → always uses `--source-project <value>`. Set this for single-worktree repos that share a machine with other active repos to prevent false cost-halt alerts.
2. Linked worktree (git-common-dir ≠ git-dir) **or** multiple worktrees detected → `--source-project <worktree-slug>`.
3. No config, single worktree → `--aggregate-all`.

For the loop stop-check, `loop.costStopThreshold` (default 1) sets how many `[HIGH]` cost-advise flags trigger a halt. Raise this if aggregate mode produces false positives (e.g., `"costStopThreshold": 15` for a repo running alongside several other active repos).

**Fleet view:**

Run `node hero-crew/scripts/crew.mjs fleet --repo "$PWD"` from any worktree to see all sibling active loops, their current IN_PROGRESS slice, and progress counts. The command scans the parent directory for `.claude/state/crew/slice-progress.md` files; no coordination required.

**Constraints:**

- Each worktree must be on its own branch. Checking out the same branch in two worktrees is a git error.
- Never push from inside the autonomous loop. The user reviews + pushes per worktree; the only collision risk is two worktrees trying to push the same remote branch, which git will reject cleanly.
- Do not run both `/crew:build` (interactive) and autonomous loop simultaneously on the same worktree — they race on `workflow-state.json`.

## First Action — Starting the Loop

Read in this order, then pick the highest-priority PENDING slice:

1. `docs/ai-loop/00-entry/MASTER_PROMPT.md` — persona, stack, mandatory reading
2. `docs/ai-loop/backlog/approved-slices.md` — pick highest-priority PENDING slice
3. The slice file listed in `approved-slices.md` (under `docs/ai-loop/slices/`)
4. `docs/ai-loop/01-loop-control/WIGGIN_LOOP.md` — the loop sequence
5. `docs/ai-loop/01-loop-control/EVIDENCE_RULES.md` — how to mark PASS / PARTIAL / FAIL / BLOCKED
6. `docs/ai-loop/01-loop-control/STOP_CONDITIONS.md` — when the loop is allowed to stop
