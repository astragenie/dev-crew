<!-- autonomous-loop:start -->
<!-- Installed by /autonomous-loop:install. Edit .claude/autonomous-loop.json to change stack-specific commands; re-run /autonomous-loop:install to regenerate this block. -->

## Autonomous Loop Instruction — HARD RULE

**Run autonomously until ALL acceptance criteria for the current slice are met. Do NOT ask the user for confirmation, clarification, or approval at any point during implementation. Do NOT stop after implementation — run review, fix all findings, run validation, then write artifacts and push. Only stop when every acceptance criterion is marked PASS with evidence (per `{{aiLoopRoot}}/01-loop-control/EVIDENCE_RULES.md`), or the work is externally blocked (missing infrastructure, secret, or external dependency that cannot be resolved without the user). If blocked, state the blocker clearly and stop there.**

**Cross-Slice Continuation — HARD RULE: After all acceptance criteria for the current slice are PASS with evidence and all artifacts written, automatically pick the next unit of work using the following scan order — without user confirmation:**

1. **Scan `docs/specs/`** — for any spec with `status: approved` and empty `derived_features`, decompose it: `/autonomous-loop:spec decompose --id SPEC-NNN --features "title 1; title 2; ..."`. The agent reads the spec body and supplies the feature titles. New FEAT files land in `docs/backlog/pending/`.

2. **Scan `docs/backlog/pending/`** — if any pending entries exist, run `/autonomous-loop:backlog triage` to fill `priority`, `category`, `target_release` heuristically and move each to `docs/backlog/triaged/`.

3. **Pick the highest-priority triaged feature** — break P0 > P1 > P2 > P3 ties by most recently triaged. Promote it: `/autonomous-loop:slice from-feature --id FEAT-NNN`. The plugin creates a new slice file under `{{slicesRoot}}/pending/`, moves the feature to `docs/backlog/in-progress/`, and cross-links them via frontmatter (`slices: [SLICE-NN]` on the feature; `feature: FEAT-NNN` on the slice).

4. **Begin the Wiggin Loop on the new slice.** Acceptance criteria, evidence, review per `{{aiLoopRoot}}/01-loop-control/`.

5. **On slice close** — move the feature file from `docs/backlog/in-progress/` to `docs/backlog/done/`, update the slice file's `status: completed`, run `/autonomous-loop:spec status` to auto-roll any newly-satisfied parent SPEC.

If `docs/backlog/pending/` and `docs/backlog/triaged/` are both empty AND `docs/specs/` has no undecomposed approved specs, the agent has reached either stop condition A (every spec satisfied — confirm with `/autonomous-loop:spec status`) or stop condition B (externally blocked). Surface which and stop. Never stop because the backlog "feels empty" — confirm via the explicit scan first.**

**Phase Completion Gate — HARD RULE: When a phase of work completes (last slice in a phase marked COMPLETED in `approved-slices.md`), run the configured phase-gate suite by invoking `/autonomous-loop:phase-gate`. The plugin executes every stage configured in `.claude/autonomous-loop.json` (build, test, frontend build, infra plan, Aspire boot + healthchecks) via `execFile` — no shell interpretation, no injection surface — captures all output, and writes a single validation artifact under `{{phaseGateArtifactDir}}/phase-<N>-gate-<date>.md` through `crew write-validation-result`. Do NOT proceed to the next phase if the gate returns FAIL. Do NOT hand-author the gate artifact; let the plugin own it for evidence quality.**

## First Action — Starting the Loop

Read in this order, then pick the highest-priority PENDING slice:

1. `{{aiLoopRoot}}/00-entry/MASTER_PROMPT.md` — persona, stack, mandatory reading
2. `{{backlogPath}}/approved-slices.md` — pick highest-priority PENDING slice
3. The slice file listed in `approved-slices.md` (under `{{slicesRoot}}/`)
4. `{{aiLoopRoot}}/01-loop-control/WIGGIN_LOOP.md` — the loop sequence
5. `{{aiLoopRoot}}/01-loop-control/EVIDENCE_RULES.md` — how to mark PASS / PARTIAL / FAIL / BLOCKED
6. `{{aiLoopRoot}}/01-loop-control/STOP_CONDITIONS.md` — when the loop is allowed to stop

<!-- autonomous-loop:end -->
