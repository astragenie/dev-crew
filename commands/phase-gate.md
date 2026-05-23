---
description: Run the configured phase-gate test suite, capture all output, write the validation artifact via crew.
---

# Run Phase Gate

Use at the end of a phase — after the last slice in a phase is marked
COMPLETED in `<backlogPath>/approved-slices.md`. The plugin runs every
configured stage (build, test, frontend build, infra plan, Aspire boot +
healthchecks), captures stdout/stderr/exit/duration for each, renders a
markdown report, writes it under
`<phaseGateArtifactDir>/phase-<N>-gate-<date>.md`, and registers the artifact
through `crew write-validation-result`.

Every command runs via `execFile` with an argv array — no shell
interpretation, no injection surface. Stages with `null` in config are
skipped. `aspireBoot` is skipped automatically when no `healthchecks` are
configured (otherwise it would hang).

Workflow:

1. Confirm the phase number to record. Phase numbering is user-assigned:
   pick the next integer beyond the last `phase-<N>-gate-*.md` in
   `<phaseGateArtifactDir>/`.
2. Run the gate:
   ```bash
   set -euo pipefail
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" phase-gate \
     --repo "$PWD" \
     --phase <N> \
     --note "<optional short context>"
   ```
3. Read the returned JSON. If `status` is `PASS`, append the entry in
   `<backlogPath>/completed-slices.md` for the closing slice with a link to
   the new phase-gate artifact, then `/loop:next-slice`.
4. If `status` is `FAIL`, do NOT proceed to the next phase. Read the artifact
   under `<phaseGateArtifactDir>/` to see which stage failed and the
   stdout/stderr tail. Fix the failure, then re-run the gate.
5. If `crewArtifactRegistered` is `false`, the artifact was written to disk
   but the crew workflow state was not updated. Read `crewArtifactError`,
   fix, and either re-run the gate or invoke
   `crew write-validation-result` manually with the same evidence path.

The plugin does NOT auto-detect phase boundaries. The agent decides when a
phase closes based on slice metadata in `approved-slices.md`.
