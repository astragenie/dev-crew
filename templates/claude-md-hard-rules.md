<!-- autonomous-loop:start -->
<!-- Installed by /autonomous-loop:install. Edit .claude/autonomous-loop.json to change stack-specific commands; re-run /autonomous-loop:install to regenerate this block. -->

## Autonomous Loop Instruction — HARD RULE

**Run autonomously until ALL acceptance criteria for the current slice are met. Do NOT ask the user for confirmation, clarification, or approval at any point during implementation. Do NOT stop after implementation — run review, fix all findings, run validation, then write artifacts and push. Only stop when every acceptance criterion is marked PASS with evidence (per `{{aiLoopRoot}}/01-loop-control/EVIDENCE_RULES.md`), or the work is externally blocked (missing infrastructure, secret, or external dependency that cannot be resolved without the user). If blocked, state the blocker clearly and stop there.**

**Cross-Slice Continuation — HARD RULE: After all acceptance criteria for the current slice are PASS with evidence and all artifacts written, automatically select the next highest-priority PENDING slice from `{{backlogPath}}/approved-slices.md` and begin the Wiggin Loop for it — without user confirmation. If no PENDING slices exist in `approved-slices.md` but unmet product requirements remain in `{{backlogPath}}/product-backlog.md`, derive the next slice immediately: (1) write slice file to `{{slicesRoot}}/pending/` using `{{aiLoopRoot}}/00-entry/SLICE_TEMPLATE.md`, (2) run Reviewer A and Reviewer B, (3) add to `approved-slices.md`, (4) implement. Never stop because the approved list is empty — stop only when every product requirement is satisfied or the work is externally blocked.**

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
