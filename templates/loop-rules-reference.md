# Autonomous Loop — Rules Reference

Detail and rationale trimmed out of `.claude/loop/rules.md` (SLICE-172) so
that file stays a crisp HARD RULE index. Nothing here is a new rule — every
normative statement still lives in `rules.md` itself; this file only holds
the tables, setup steps, and worked examples that explain or apply those
rules. When in doubt about what's binding, `rules.md` wins.

## Slice frontmatter — `phase` field (Cross-Slice Continuation)

Slices carry two optional linkage fields:

- `feature: FEAT-NNN` — set automatically by `/devcrew:start`.
- `phase: <string|null>` — free-form phase identifier (`"1"`, `"2"`,
  `"beta"`). Defaults to `null`.

Both propagate to artifact filenames and frontmatter:

- Filenames: `runs/phaseN-featNNN-sliceNN-final-synthesis.md`,
  `handoffs/phaseN-featNNN-sliceNN-complete.md`,
  `validations/phaseN-gate.md`.
- Crew-CLI-written filenames (`reviews/`, `validations/`, `runs/run-brief-*`,
  `cost/*`) receive `--title "PHASEN FEATNNN SLICENN: ..."`; crew's slugifier
  turns this into `phaseN-featNNN-sliceNN-...`, and the loop post-renames the
  crew-written file to strip the leading timestamp so both sides match.
- Frontmatter of repo-owned artifacts (handoff + final-synthesis): `feature:`
  and `phase:` keys in standard `FEAT-NNN` / `"3"` form.

Segments are internally tight (no dash inside `feat021`) and follow a
wide-to-narrow hierarchy (phase → feature → slice). When a field is null, its
segment drops out: `featNNN-sliceNN-...` or bare `sliceNN-...` are valid.
Artifact consumers (dashboards, LoopObserver) should treat segments as
optional and ordered.

## Auto mode vs. legacy gating (Cross-Slice Continuation)

`loop.marathonMode` in `.claude/loop.json` controls the active stop set
(default `true` — auto mode on for new installs):

| Trigger                     | auto mode (default)          | legacy (marathonMode=false) |
| ---------------------------- | ---------------------------- | ---------------------------- |
| Backlog exhausted           | halt                         | halt                         |
| Crew `escalated_to_human`   | halt                         | halt                         |
| Warn-severity pattern alert | halt                         | halt                         |
| High-severity cost alert    | halt                         | halt                         |
| Iteration cap (default 25)  | advisory (snapshot only)     | halt                         |
| Crew soft `blocked` badge   | advisory (often self-clears) | halt                         |

The iteration counter still increments under auto mode; `stop-check`
continues to report `iterationCount`/`iterationCap`/`crewBlocked` in
`snapshot` for dashboards either way. Auto mode disables only the _gating_,
not the _telemetry_. The config key stays `marathonMode` for back-compat —
the concept is "auto mode."

The walker's `requiresApprovalGate` flag and
`start-slice.mts::computeApprovalGate` already honor this — auto mode is
enforced in code, not only in prose.

## Orchestrator Model Gate — exact stop text

When `orchestratorModel` (returned by `/devcrew:start`) is non-null and
doesn't match the current session model, stop before any slice work and
output:

```
HARD GATE — Orchestrator model mismatch.
  Required: <orchestratorModel value from return>
  Current:  <your session model from system prompt>

Restart this session on the correct model before continuing the loop.
  claude --model <required model>
Do not continue the loop until restarted on the correct model.
```

Resuming on the wrong model burns higher-tier cost for coordination work a
cheaper model handles equally well.

## Review Dispatch Budget — rationale + worked example

Review agents that roam freely read 25-35 files per review and run the full
test suite, adding 3-5 minutes of unnecessary latency per slice. Before
dispatching any reviewer:

1. Pre-extract from the slice spec: the `Files:` list and `Done When:` / AC
   criteria.
2. Run `git diff HEAD~1 -- <changed files>` and capture the output inline.

Dispatch spec-compliance and code-quality reviewers in a single message
(parallel):

```
# Reviewer dispatch — send BOTH in one message as parallel Agent tool calls
Agent(spec-compliance-reviewer, prompt = <spec content> + <diff> + scope rule)
Agent(code-quality-reviewer,   prompt = <spec content> + <diff> + scope rule)
```

Every reviewer prompt must include this scope block:

```
**Files in scope (from slice spec):**
- <exact list from spec Files: section>

Do not read files outside this list unless they are direct imports of the above.
Do not run the full test suite. Run only:
  npm test -- --test-name-pattern "<basename of the changed test file>"
```

If spec review FAILS: dispatch a builder fix, then re-dispatch both
reviewers in parallel. Do NOT run quality review on a failing spec.

## Worktree Parallelism — cost attribution + fleet view

`tryWriteCostReport` resolves the scoping mode in this order:

1. `loop.costProject` in `.claude/loop.json` → always uses `--source-project
   <value>`. Set this for single-worktree repos sharing a machine with other
   active repos, to prevent false cost-halt alerts.
2. Linked worktree (git-common-dir ≠ git-dir) **or** multiple worktrees
   detected → `--source-project <worktree-slug>`.
3. No config, single worktree → `--aggregate-all`.

For the loop stop-check, `loop.costStopThreshold` (default 1) sets how many
`[HIGH]` cost-advise flags trigger a halt. Raise this if aggregate mode
produces false positives (e.g. `"costStopThreshold": 15` for a repo running
alongside several other active repos).

Fleet view: run `node hero-crew/scripts/crew.mjs fleet --repo "$PWD"` from
any worktree to see all sibling active loops, their current IN_PROGRESS
slice, and progress counts. The command scans the parent directory for
`.claude/state/crew/slice-progress.md` files — no coordination required.
