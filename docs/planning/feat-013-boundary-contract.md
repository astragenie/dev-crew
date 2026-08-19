# FEAT-013 contract — root↔crew/ import boundary validator + hooks.json inventory

Status: draft, for builder handoff. Source: `.claude/artifacts/loop/backlog/triaged/FEAT-013.md`.

## Current state (evidence)

- **The boundary is convention-only today.** No script enforces root↔`crew/`
  import direction. `src/scripts/validate-imports.mts` (header, lines 2-16)
  is a **different** concern — sub-module barrel boundaries *within*
  `src/scripts/` (`slice-linker/`, `watch/`, `backlog-store/`) — it says
  nothing about `crew/`. This FEAT's validator is new, not an extension of
  that script.
- **The one sanctioned cross-import**, verified via `hooks/pre-push-gate.mts:29-38`:
  ```
  import { logHookError } from "../crew/hooks/hook-error.mjs";
  import { readCrewConfig, isEnabled } from "../crew/scripts/lib/features-service.mjs";
  import { parseFrontmatterBlock } from "../crew/scripts/lib/briefing/collect-cost-parser.mjs";
  import { isDocsOnlyPush } from "../crew/scripts/lib/docs-only.mjs";
  ```
  Exactly **4** crew modules, matching the FEAT description's count. (The
  file's 5th non-root, non-node import, `../src/scripts/validate-snapshot-freshness.mjs`,
  is root→root and out of scope for this allowlist.)
- **Direction crew→root**: not spot-checked exhaustively here (out of this
  doc's evidence budget) — the validator itself is the mechanism that proves
  this direction is empty; AC-1 covers it generically ("a source file
  outside crew/... imports a crew/-internal module").
- **hooks.json crew/ path census** — `.claude-plugin/hooks/hooks.json` (297
  lines). Parsed programmatically (not grep — grep on raw text undercounts
  by miscounting log_event.sh's shared multi-purpose lines): **26**
  `${CLAUDE_PLUGIN_ROOT}/crew/...` command references, by hook event:
  - `SessionStart` (1): `crew/scripts/log_event.sh` (session_start)
  - `TaskCreated` (1): `crew/scripts/log_event.sh` (task_created)
  - `TaskCompleted` (1): `crew/scripts/log_event.sh` (task_completed)
  - `SubagentStart` (2): `log_event.sh` (subagent_start), `crew/hooks/subagent-start-profile.mts`
  - `SubagentStop` (5): `log_event.sh` (subagent_stop), `crew/hooks/otel-subagent-stop.mts`,
    `crew/hooks/check-reviewer-decision.mts`, `crew/hooks/check-builder-terminal-state.mts`,
    `crew/hooks/subagent-gate-guard.mts`
  - `TeammateIdle` (1): `log_event.sh` (teammate_idle)
  - `PreToolUse` (8): `crew/hooks/preflight-shell.mts`, `crew/hooks/pre-tool-use-bash-gate.mts`,
    `crew/hooks/check-redundant-read.mts`, `crew/hooks/pre-tool-use-agent.mts`,
    `crew/hooks/pre-tool-use-model-enforce.mts`, `crew/hooks/pre-tool-use-dispatch-size.mts`,
    `crew/hooks/check-task-update-burst.mts`, `crew/hooks/pre-tool-use-artifact-lock.mts`
  - `PostToolUse` (6): `crew/hooks/record-read-content.mts`, `crew/hooks/check-subagent-return.mts`,
    `crew/hooks/post-tool-use-bash-gate.mts`, `crew/hooks/record-edit.mts`,
    `crew/hooks/otel-post-tool-use.mts`, `crew/hooks/checkpoint-cadence.mts`
  - `Stop` (1): `crew/hooks/otel-stop.mts`

  **Builder note**: this table was produced by parsing `hooks.json` as JSON
  (`json.load` + walk `hooks[event][].hooks[].command`), not by
  hand-transcription — the inventory script (below) must do the same
  structural walk, not regex over the raw file, or it will silently miss
  entries the way a naive grep does.

## Validator spec

New `src/scripts/validate-repo-boundary.mts` (repo root, not `crew/scripts/` —
mirrors the location of every other root-authored gate in the `fast-gate`
`validators:` block).

Rule: walk every `.mts`/`.ts` file outside `crew/` (root `src/`, `hooks/`,
`scripts/`); for each `import ... from "<spec>"` whose resolved path lands
inside `crew/`, reject **unless** `(file, resolvedCrewModule)` is in a
hardcoded allowlist:

```ts
const ALLOWED_CROSS_IMPORTS: ReadonlyArray<{ file: string; crewModule: string }> = [
  { file: "hooks/pre-push-gate.mts", crewModule: "crew/hooks/hook-error.mjs" },
  { file: "hooks/pre-push-gate.mts", crewModule: "crew/scripts/lib/features-service.mjs" },
  { file: "hooks/pre-push-gate.mts", crewModule: "crew/scripts/lib/briefing/collect-cost-parser.mjs" },
  { file: "hooks/pre-push-gate.mts", crewModule: "crew/scripts/lib/docs-only.mjs" }
];
```

Failure output: `<file>:<line>: disallowed cross-import from "<spec>" —
not on the root↔crew/ allowlist` (AC-1's literal requirement). The reverse
direction (`crew/` importing a root-only module) uses the same script with
an inverted walk root and a zero-entry allowlist — any crew→root import
fails, full stop, per AC-1's "forbidden entirely" framing (see Open
questions on reachability).

## hooks.json inventory format

`scripts/inventory-hooks-crew-paths.mts` (or a `--inventory` mode on the
validator above — builder's call) emits JSON, keyed by hook event name,
each entry `{ command, path, matcherIndex }`:

```json
{
  "SubagentStop": [
    { "path": "crew/scripts/log_event.sh", "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" subagent_stop" },
    { "path": "crew/hooks/otel-subagent-stop.mts", "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-subagent-stop.mts\"" }
  ]
}
```

This is consumed as the prerequisite map for the later hooks-relocation
FEAT (per FEAT-013's own description) — it must be machine-generated from
`hooks.json` at run time, not hand-maintained, so it never drifts from the
live file.

## Where it slots in ci.yml

`fast-gate`'s `validators:` block (`.github/workflows/ci.yml:129-146`) —
insert immediately after `bun ./src/scripts/validate-imports.mts` (line
136, gate #8 per `docs/ci-gates.md:51`), since both are import-boundary
gates and grouping them keeps the numbered list's rationale legible. This
pushes every gate from the current #9 (`validate-backlog-writes.mts`)
onward up by one — `docs/ci-gates.md`'s own numbering-must-stay-in-sync
contract (`generate-metrics-band.mts` counts this list programmatically)
means the builder must renumber the whole list in the same change, not just
insert a gap.

## Open questions

- Exact crew→root reachability (is there any real `crew/**` file importing
  a root module today?) was not exhaustively verified in this doc — a full
  grep across `crew/**/*.mts` for `from "../` or `from "../../src/` is
  cheap and should be the builder's first step before writing the reverse
  check, since it changes whether that half of AC-1 needs an allowlist at
  all or can be a flat "always forbidden."
