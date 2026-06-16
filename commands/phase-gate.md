---
name: phase-gate
description: Run the configured phase-gate test suite, capture all output, write the validation artifact via crew.
auto_execute_steps: false
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
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" phase-gate \
     --repo "$PWD" \
     --phase <N> \
     --note "<optional short context>"
   ```
3. Read the returned JSON. If `status` is `PASS`, append the entry in
   `<backlogPath>/completed-slices.md` for the closing slice with a link to
   the new phase-gate artifact, then `/runner:next-slice`.
4. If `status` is `FAIL`, do NOT proceed to the next phase. Read the artifact
   under `<phaseGateArtifactDir>/` to see which stage failed and the
   stdout/stderr tail. Fix the failure, then re-run the gate.
5. If `crewArtifactRegistered` is `false`, the artifact was written to disk
   but the crew workflow state was not updated. Read `crewArtifactError`,
   fix, and either re-run the gate or invoke
   `crew write-validation-result` manually with the same evidence path.

The plugin does NOT auto-detect phase boundaries. The agent decides when a
phase closes based on slice metadata in `approved-slices.md`.

## Parallel mode (SLICE-92)

When `.claude/loop.json` defines a top-level `phaseGate` block, the gate
runs each named group in parallel and fails-fast on the first non-zero exit.
Each group is itself a serial list of commands; within a group, the first
failing command stops the group. Output from every group is interleaved into
one combined log, with each line prefixed by `[<group>] ` so the agent can
grep for which group emitted what.

Default config (matches the loop repo itself):

```json
"phaseGate": {
  "parallel": true,
  "groups": {
    "lint": [
      { "cmd": "bun", "args": ["run", "lint"] },
      { "cmd": "bun", "args": ["run", "format:check"] },
      { "cmd": "bun", "args": ["./src/scripts/validate-manifests.mts"] },
      { "cmd": "bun", "args": ["./src/scripts/validate-content-length.mts"] }
    ],
    "typecheck": [
      { "cmd": "bunx", "args": ["tsc", "--project", "tsconfig.json", "--noEmit"] },
      { "cmd": "bunx", "args": ["tsc", "--project", "tsconfig.test.json", "--noEmit"] }
    ],
    "test": [
      { "cmd": "bun", "args": ["test", "src/tests/", "--parallel", "--timeout", "60000"] }
    ]
  }
}
```

CLI flags:

- `--serial` — force the legacy sequential path even when `phaseGate.groups`
  is configured. Useful when bisecting a flaky parallel run or when CI output
  needs unambiguous stage ordering.
- `--only <group>` — run a single group (e.g. `--only lint`, `--only test`).
  Skips every other configured group. Handy for rapid iteration.

If `phaseGate.groups` is missing, or `phaseGate.parallel: false` is set in
`loop.json`, the gate falls through to the original `stack.{build,test,
frontendBuild,infraPlan,aspireBoot}` runners — full back-compat.
