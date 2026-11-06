---
name: gepa
description: GEPA prompt-optimization trial operations — eval, history, invalidate, resume, revert, thaw. Consolidates the three prior gepa-eval/gepa-history/gepa-invalidate slash commands into one dispatcher; resume/revert/thaw were CLI-only (crew.mts) before this merge and had no slash-command wrapper.
auto_execute_steps: true
allowed-tools: Bash
---

# Gepa

Single command with subcommands. Replaces:

- `devcrew:gepa-eval`       → `devcrew:gepa eval`
- `devcrew:gepa-history`    → `devcrew:gepa history`
- `devcrew:gepa-invalidate` → `devcrew:gepa invalidate`

Also gives a slash-command entry point to three operations that were
previously CLI-only (`bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" gepa-resume|gepa-revert|gepa-thaw`,
no `.md` doc):

- `devcrew:gepa resume`
- `devcrew:gepa revert`
- `devcrew:gepa thaw`

## eval

Run the eval suite for a single agent under a `fileLockManager` lock (from
`@astragenie/gepa-core`). The lock prevents two concurrent runs writing the
same `<agent>.jsonl` file in the trial store.

```
/devcrew:gepa eval <agent> [--live] [--judge <name>] [--validate] [--split N/M]
```

Flags:
- `<agent>` — required. Agent name (e.g. `fullstack-dev`, `reviewer`, `verifier`).
- `--live` — actually call the judge (vs. dry-run mode). Default: dry-run.
- `--judge <name>` — override the judge configured in `evals/agents/<agent>.yaml`.
- `--validate` — fire validate_with chain (cross-judge disagreement detection).
- `--split N/M` — split eval cases into train/heldOut tranches via deterministic hashing. `N` cases land in train, `M` in heldOut. See `scripts/lib/gepa/split-train-heldout.ts`.

Behavior:

1. Resolve `<agent>` to a spec file at `evals/agents/crew-<agent>.yaml`.
2. Acquire `fileLockManager.acquire(agent, "eval")` lock.
3. If lock returns `null` (another run holds it), exit code 2 with `lock_held_by_other_process`.
4. Run `bun run evals --prompt <agent>` with passed flags.
5. Release the lock on exit (success OR failure).

Exit codes: `0` — eval completed; result JSON written under `evals/runs/`.
`1` — eval failed (judge error, fixture missing, etc.); lock released.
`2` — bad args OR lock could not be acquired.

Implementation: `crew/scripts/lib/gepa/run-with-lock.mts`;
`scripts/lib/gepa/split-train-heldout.ts` (train/heldOut splitter).

## history

Show recent GEPA trials for the named agent. Reads from the local fileStore
JSONL log under `.claude/artifacts/crew/gepa/trials/`.

```
/devcrew:gepa history <agent> [--source eval|captured|soak] [--limit N]
```

Shells to `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" gepa-history` with the given args.
Output is one tabular line per trial, sorted by `created_at` desc:

```
trial_id | source | pass | score | cost_usd | latency_ms | created_at
```

Exits 0 on success, 2 on bad args, 1 on internal error.

## invalidate

Soft-delete GEPA trials for a named agent from the trial store. Useful when
a batch of trials was collected under bad conditions (judge misconfiguration,
eval fixture bug, etc.) and should be excluded from future optimization
cycles.

```
/devcrew:gepa invalidate --agent <name> [--since <iso>] [--tag <tag>]
```

Flags:
- `--agent <name>` — required. Agent name (e.g. `fullstack-dev`).
- `--since <iso>` — only invalidate trials created at or after this ISO datetime (e.g. `2026-06-25T00:00:00Z`).
- `--tag <tag>` — only invalidate trials with this tag (fileStore: filter by tag field).

Behavior:

1. Opens the trial store at `.claude/artifacts/crew/gepa/trials/<agent>.jsonl`.
2. Calls `TrialStore.invalidate({ agent, since?, tag? })` — soft-delete semantics: fileStore rewrites the JSONL excluding matching rows.
3. Writes an audit row to `.claude/logs/events.jsonl`: `event: "gepa_invalidate"`, `agent`, `since`, `tag`, `invalidated_count`, `invalidated_by_pid`, `invalidated_at`, `reason: "manual kill-switch via gepa-invalidate"`.
4. Prints `invalidated N trials for <agent> since <iso>` to stdout.

Exit codes: `0` — invalidation completed (count may be 0 if no rows matched). `1` — internal error. `2` — bad args (missing `--agent`).

```bash
# Invalidate all trials for fullstack-dev since June 25
bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" gepa-invalidate --agent fullstack-dev --since 2026-06-25T00:00:00Z

# Invalidate all trials for fullstack-dev with tag "broken-judge"
bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" gepa-invalidate --agent fullstack-dev --tag broken-judge
```

Implementation: `crew/scripts/lib/gepa/gepa-killswitch-cmds.mts` (also backs
`resume`/`revert`/`thaw` below — `runGepaResumeCmdExtended` /
`runGepaRevertCmd` / `runGepaThawCmd`).

## resume

Clear a GEPA no-winner streak for a specific agent (re-enabling optimization
after 3 consecutive no-winner cycles), OR clear the global `optimize.paused`
flag in `gepa.config.json`.

```
/devcrew:gepa resume [<agent>] [--repo <path>]
```

With an agent name: clears that agent's no-winner streak. Without an agent
name: clears the global pause.

## revert

Revert a GEPA champion promotion. Deletes the soak pointer for the agent
from `soak.json` and, if a promotion commit exists on `main`, runs
`git revert <commit>` (never `git reset`, never `git push --force`). Reads
`prior_prompt_hash` from GEPA frontmatter to locate the commit.

```
/devcrew:gepa revert --agent <name> [--repo <path>]
```

## thaw

Remove an agent from the `gepa.config.json` `champion_frozen` list,
re-enabling optimization and promotion cycles for that agent. Uses an
atomic tmp+rename write to prevent partial updates.

```
/devcrew:gepa thaw <agent> [--repo <path>]
```
