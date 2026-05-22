# Autonomous Loop — HARD RULES

Plugin-managed by `/autonomous-loop:install`. Do not edit by hand.

## Autonomous Loop Instruction — HARD RULE

**Run autonomously until ALL acceptance criteria for the current slice are met. Do NOT ask the user for confirmation, clarification, or approval at any point during implementation. Do NOT stop after implementation — run review, fix all findings, run validation, then write artifacts and push. Only stop when every acceptance criterion is marked PASS with evidence (per `{{aiLoopRoot}}/01-loop-control/EVIDENCE_RULES.md`), or the work is externally blocked (missing infrastructure, secret, or external dependency that cannot be resolved without the user). If blocked, state the blocker clearly and stop there.**

## Cross-Slice Continuation — HARD RULE

After all acceptance criteria for the current slice are PASS with evidence and all artifacts written, automatically pick the next unit of work using the following scan order — without user confirmation:

1. **Scan `docs/specs/`** — for any spec with `status: approved` and empty `derived_features`, decompose it: `/autonomous-loop:spec decompose --id SPEC-NNN --features "title 1; title 2; ..."`. The agent reads the spec body and supplies the feature titles. New FEAT files land in `docs/backlog/pending/`.

2. **Scan `docs/backlog/pending/`** — if any pending entries exist, run `/autonomous-loop:backlog triage` to fill `priority`, `category`, `target_release` heuristically and move each to `docs/backlog/triaged/`.

3. **Pick the highest-priority triaged feature** — break P0 > P1 > P2 > P3 ties by most recently triaged. Promote it: `/autonomous-loop:slice from-feature --id FEAT-NNN`. The plugin creates a new slice file under `{{slicesRoot}}/pending/`, moves the feature to `docs/backlog/in-progress/`, and cross-links them via frontmatter (`slices: [SLICE-NN]` on the feature; `feature: FEAT-NNN` on the slice).

4. **Begin the Wiggin Loop on the new slice.** Acceptance criteria, evidence, review per `{{aiLoopRoot}}/01-loop-control/`.

5. **On slice close** — run the Slice Close Ceremony (next section). Do NOT skip this and move on to the next slice — every artifact emitted by the ceremony is part of the slice's evidence record.

If `docs/backlog/pending/` and `docs/backlog/triaged/` are both empty AND `docs/specs/` has no undecomposed approved specs, the agent has reached either stop condition A (every spec satisfied — confirm with `/autonomous-loop:spec status`) or stop condition B (externally blocked). Surface which and stop. Never stop because the backlog "feels empty" — confirm via the explicit scan first.

## Slice Close Ceremony — HARD RULE

When every acceptance criterion on the current slice is PASS with evidence, close the slice through the canonical ceremony **before** picking up the next slice. Manual file moves + a `docs(slice): mark SLICE_NN complete` commit are NOT a substitute — they bypass the artifact fan-out and leave `handoffs/`, `runs/`, `cost/`, and `cost-insights/` empty.

Run, in order:

1. **`/autonomous-loop:slice complete --id SLICE-NN`** — atomically moves the slice file to `completed/`, moves the linked feature to `done/`, reconciles parent SPEC status, AND fans out three artifacts in parallel:
   - `.claude/artifacts/crew/handoffs/<timestamp>-slice-nn-complete.md`
   - `.claude/artifacts/crew/runs/<timestamp>-slice-nn-final-synthesis.md` (auto-emits `cost-report` → `.claude/artifacts/crew/cost/` and `cost-advise` → `.claude/artifacts/crew/cost-insights/`)
   - `cost-report` invoked via the hero-crew `cost-slice` CLI as a redundant safety net
2. **`/autonomous-loop:slice grade --id SLICE-NN`** + **`/autonomous-loop:slice grade-write --id SLICE-NN`** — capture scores, lessons, decisions. Skipping grading loses the self-improvement signal for this slice.
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

When a phase of work completes (last slice in a phase marked COMPLETED in `approved-slices.md`), run the configured phase-gate suite by invoking `/autonomous-loop:phase-gate`. The plugin executes every stage configured in `.claude/autonomous-loop.json` (build, test, frontend build, infra plan, Aspire boot + healthchecks) via `execFile` — no shell interpretation, no injection surface — captures all output, and writes a single validation artifact under `{{phaseGateArtifactDir}}/phase-<N>-gate-<date>.md` through `crew write-validation-result`. Do NOT proceed to the next phase if the gate returns FAIL. Do NOT hand-author the gate artifact; let the plugin own it for evidence quality.

## First Action — Starting the Loop

Read in this order, then pick the highest-priority PENDING slice:

1. `{{aiLoopRoot}}/00-entry/MASTER_PROMPT.md` — persona, stack, mandatory reading
2. `{{backlogPath}}/approved-slices.md` — pick highest-priority PENDING slice
3. The slice file listed in `approved-slices.md` (under `{{slicesRoot}}/`)
4. `{{aiLoopRoot}}/01-loop-control/WIGGIN_LOOP.md` — the loop sequence
5. `{{aiLoopRoot}}/01-loop-control/EVIDENCE_RULES.md` — how to mark PASS / PARTIAL / FAIL / BLOCKED
6. `{{aiLoopRoot}}/01-loop-control/STOP_CONDITIONS.md` — when the loop is allowed to stop
