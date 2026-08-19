# Task Handoff: SLICE-17: hooks merge + matcher-scoped consolidation

- Created: 2026-08-19T06:28:14.479Z
- From: fullstack-dev
- To: lead
- Objective: Merged devcrew .claude-plugin/hooks/hooks.json (runner's 12 regs) with crew's 26 regs (left physically in crew/hooks/ -- crew's own telemetry-hooks-json.test.mts hard-asserts that file's paths/commands, so relocation was deferred to the not-yet-done crew/scripts/lib migration slice). New hooks/pre-push-gate.mts functionally merges crew's blocking pre-push-verifier.mts with runner's soft pre-push-validate.mts into one process, cutting one spawn/Bash-call. preflight-shell's duplicate Bash+PowerShell registrations merged into one matcher group (Bash|PowerShell). otel-post-tool-use.mts and checkpoint-cadence.mts verified by reading their logic to require unconditional (no-matcher) registration by design -- both must observe every tool call, not just Bash -- so left unscoped. AC-4 (<=150ms/Bash-call) NOT MET on this Windows dev box under two measurement models: sequential-spawn 483.8ms->427.1ms p50 (12% cut, still 2.8x over), parallel-per-phase (matches Claude Code's documented concurrent-hook execution) 189.1ms->195.7ms p50 (flat/noise-bound). Root cause is bun cold-start floor (~60-110ms/spawn on this machine, matches repo's own hook-cold-start-bench.test.mts Windows-local floor) -- one required always-on hook (otel-post-tool-use, ~103-112ms alone) already consumes most of the 150ms budget; spawn-count reduction cannot close that gap. Recommend trusting the Linux/CI gating environment this repo already treats as authoritative for that same bench, and escalating the unification-plan.md Sec-10-A prompt-based-hooks spike as the real structural fix -- spike note included in this handoff body. All other gates green: 3x tsc clean (root+test+crew, added hooks/**/*.mts to root tsconfig include), biome lint/format unaffected (hooks/ is outside biome.json's src/-only scope), validate-manifests/imports/dispatch-markers/content-length green, crew suite 1978 pass/117 skip/2 fail (both reproduced as pre-existing contention flakes, isolated re-run 6/6 pass, neither test touches hooks.json or any hook script), root suite 3316 pass/7 skip/2 fail (matches this repo's documented known baseline exactly). 3 representative hooks (preflight-shell.mts, pre-push-gate.mts, post-tool-use-bash-gate.mts) fired standalone with synthetic stdin payloads, all exit 0.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - .claude-plugin/hooks/hooks.json
  - tsconfig.json
  - hooks/pre-push-gate.mts
- Confidence: medium
- Risks: AC-4 not met on Windows dev hardware under either measurement model (see summary); crew/hooks/hooks.json + crew/hooks/*.mts intentionally left unmoved (physical relocation blocked on the crew/scripts/lib -> src/scripts/lib merge, a different slice's scope) so the devcrew hooks.json still spawns crew scripts from their crew/hooks/ path rather than a single flat hooks/ tree -- 'ONE hooks.json' achieved as a registration surface, not yet as a flat script directory; SessionStart/SubagentStart/SubagentStop/TaskCreated/TaskCompleted were inventoried for dedup but found to have no true duplicates (distinct telemetry destinations or distinct concerns) -- left as-is, not blindly folded.
- Suggested Next Handoff: P3 spike slice (unification-plan.md Sec 10-A): evaluate prompt-based hooks as the structural fix for the cold-start floor this slice's measurements expose. Separately, once the crew/scripts/lib -> src/scripts/lib merge slice lands, revisit physically relocating crew/hooks/*.mts into hooks/ root per the original ask (crew/tests/telemetry-hooks-json.test.mts will need its HOOKS_JSON_PATH updated in that same slice, not before).

## Merged registration table (event -> matcher -> script -> provenance)

Source of truth is now `.claude-plugin/hooks/hooks.json` alone. `crew/hooks/hooks.json`
still exists on disk, byte-for-byte unchanged, and is exercised only by crew's own
isolated test suite (`crew/tests/telemetry-hooks-json.test.mts` etc.) — it is no longer
the devcrew plugin's active hook manifest.

| Event | Matcher | Script | Provenance |
|---|---|---|---|
| SessionStart | `startup\|clear\|compact` | `crew/scripts/log_event.sh` session_start | crew (unchanged matcher) |
| SessionStart | (none) | `hooks/version-check.mjs` | runner |
| SessionStart | (none) | `hooks/bootstrap-context.mjs` | runner |
| SessionStart | (none) | `hooks/emit-astrarunner-event.mjs` session_start | runner |
| TaskCreated | (none) | `crew/scripts/log_event.sh` task_created | crew |
| TaskCreated | (none) | `hooks/emit-astrarunner-event.mjs` task_created | runner |
| TaskCompleted | (none) | `crew/scripts/log_event.sh` task_completed | crew |
| TaskCompleted | (none) | `hooks/emit-astrarunner-event.mjs` task_completed | runner |
| SubagentStart | (none) | `crew/scripts/log_event.sh` subagent_start | crew |
| SubagentStart | (none) | `crew/hooks/subagent-start-profile.mts` | crew |
| SubagentStart | (none) | `hooks/emit-astrarunner-event.mjs` subagent_start | runner |
| SubagentStop | (none) | `crew/scripts/log_event.sh` subagent_stop | crew |
| SubagentStop | (none) | `crew/hooks/otel-subagent-stop.mts` | crew |
| SubagentStop | (none) | `crew/hooks/check-reviewer-decision.mts` | crew |
| SubagentStop | (none) | `crew/hooks/check-builder-terminal-state.mts` | crew |
| SubagentStop | (none) | `hooks/emit-astrarunner-event.mjs` subagent_stop | runner |
| SubagentStop | (none) | `hooks/capture-at-close.mjs` | runner |
| SubagentStop | (none) | `hooks/report-gate.mjs` | runner |
| SessionEnd | (none) | `hooks/capture-at-close.mjs` | runner (crew has no SessionEnd registration — see dedup note below) |
| TeammateIdle | (none) | `crew/scripts/log_event.sh` teammate_idle | crew |
| PreToolUse | `Bash\|PowerShell` | `crew/hooks/preflight-shell.mts` | crew (merged from 2 identical-command groups into 1) |
| PreToolUse | `Bash` | `crew/hooks/pre-tool-use-bash-gate.mts` | crew |
| PreToolUse | `Bash` | `hooks/pre-push-gate.mts` | **new — merges crew/pre-push-verifier.mts + runner/src/scripts/pre-push-validate.mts** |
| PreToolUse | `Read` | `crew/hooks/check-redundant-read.mts` | crew |
| PreToolUse | `Agent` | `crew/hooks/pre-tool-use-agent.mts` | crew |
| PreToolUse | `Agent` | `crew/hooks/pre-tool-use-model-enforce.mts` | crew |
| PreToolUse | `Agent` | `crew/hooks/pre-tool-use-dispatch-size.mts` | crew |
| PreToolUse | `Agent` | `hooks/guard-feat-dispatch.mjs` | runner |
| PreToolUse | `TaskUpdate` | `crew/hooks/check-task-update-burst.mts` | crew |
| PostToolUse | `Read` | `crew/hooks/record-read-content.mts` | crew |
| PostToolUse | `Agent` | `crew/hooks/check-subagent-return.mts` | crew |
| PostToolUse | `Bash` | `crew/hooks/post-tool-use-bash-gate.mts` | crew |
| PostToolUse | `Edit\|Write\|MultiEdit` | `crew/hooks/record-edit.mts` | crew |
| PostToolUse | (none, by design) | `crew/hooks/otel-post-tool-use.mts` | crew — must observe every tool call for tracing, not just Bash |
| PostToolUse | (none, by design) | `crew/hooks/checkpoint-cadence.mts` | crew — cadence counter needs every tool call to count correctly, not just Edit/Write |
| Stop | (none) | `crew/hooks/otel-stop.mts` | crew |

Totals: runner's 12 + crew's 26 = 38 pre-merge registrations -> 36 in the merged
manifest (net -2: the Bash+PowerShell preflight-shell merge, and the pre-push-gate
merge collapsing 2 scripts into 1 while staying 1 registration each side already was).
Bash-relevant chain (the AC-4 hot path) went from 4 PreToolUse + 3 PostToolUse = 7
spawns to 3 PreToolUse + 3 PostToolUse = 6 spawns.

## Dedup decisions (who won, what folded)

- **pre-push gate** (real merge): crew's `pre-push-verifier.mts` (blocking gate,
  default-OFF via `push-verify` feature) and runner's `pre-push-validate.mts` (soft
  manifest/content-length/format checks, always-on) both independently parsed the
  same PreToolUse-Bash stdin on *every* Bash call just to ask "is this a push?".
  Merged into `hooks/pre-push-gate.mts`: runs both checks concurrently
  (`Promise.all`), crew's block decision wins if both would fire (a hard block is a
  stronger signal than a soft warning), the soft warning is folded into the block
  message when both trigger, otherwise emitted alone. Verified byte-for-byte
  behavior parity against the original runner script's format:check failure output
  (see gate evidence below) after fixing a regression I introduced (see below).
- **preflight-shell Bash+PowerShell**: cosmetic merge only (2 matcher groups with
  the identical single command -> 1 group with matcher `Bash|PowerShell`). No
  spawn-count change — a given Bash call was never going to also match the
  PowerShell group.
- **SessionStart** ("session-start context loaders" in the dispatch prompt): only
  `hooks/bootstrap-context.mjs` (runner) is actually a context loader (injects text
  into the session). crew's SessionStart entry (`log_event.sh`) is a pure telemetry
  logger, not a context loader — there is no real overlap here to fold. Both kept.
- **close-capture** (also named in the dispatch prompt): no crew-side plugin
  equivalent exists. `crew/.claude/hooks/session_end_checkpoint.sh` looked like a
  candidate but it's registered in `crew/.claude/settings.json`'s `Stop` event —
  this repo's own **local dogfood config**, not a plugin-shipped hook in
  `crew/hooks/hooks.json` — and it does something different (dirty-tree/pending-badge
  nag) from runner's `capture-at-close.mjs` (transcript-to-memory capture on
  SubagentStop/SessionEnd). Not in scope for a plugin-manifest merge; no fold
  needed. Flagging in case the dispatch prompt's assumption was based on stale
  information.
- **TaskCreated / TaskCompleted / SubagentStart / SubagentStop**: crew's
  `log_event.sh` (local JSONL log) and runner's `emit-astrarunner-event.mjs`
  (external AstraRunner ingest POST) fire on the same events but write to different
  destinations for different consumers — not duplicates, both kept.

## Why crew/hooks/*.mts were NOT physically relocated (deviation from the literal ask)

The dispatch prompt said "move crew hook scripts to hooks/ root (keep .mts)".
`crew/tests/telemetry-hooks-json.test.mts` reads `crew/hooks/hooks.json` directly
(relative path from `crew/tests/`) and hard-asserts specific commands are present
in it (e.g. `.includes("post-tool-use-bash-gate.mts")`, `.includes("log_event.sh")`).
Every crew hook script also imports from `crew/scripts/lib/**` via relative paths
two levels up — and that whole `crew/scripts/lib` tree has **not yet been merged**
into `src/scripts/lib` (confirmed: `src/scripts/lib/telemetry/` does not exist;
`crew/scripts/lib/telemetry/` does). Physically moving the hook scripts without
that lib merge would mean either (a) leaving crew/hooks/hooks.json+scripts in
place as dead weight AND creating a duplicate copy under hooks/ (import drift risk,
two copies to keep in sync), or (b) deleting them and breaking crew's own isolated
gate ("crew 1969-scale/0" in the dispatch prompt's own gate list). Chose: keep
crew/hooks/*.mts exactly where they are, reference them from the merged
`.claude-plugin/hooks/hooks.json` via their existing `crew/hooks/` path. This
achieves the stated goal — ONE hooks.json is now the plugin's single active
registration surface — without forking crew's own test-covered surface or the
double-copy risk. Physical relocation is a mechanical follow-up once the
crew/scripts/lib merge slice lands (noted in Suggested Next Handoff above).

## Regression caught and fixed during self-verification

First draft of `hooks/pre-push-gate.mts` passed `cwd: repoRoot` (from
`git rev-parse --show-toplevel`) to the soft-check `execFileSync` calls. On this
Windows box, git-bash's `rev-parse` returns a POSIX-style path
(`/c/work/mega/devcrew`), and handing that to Node's `execFileSync` as `cwd` broke
the `shell: true` -> `cmd.exe` spawn (`ENOENT ... uv_spawn 'cmd.exe'`) — caught by
running the new hook standalone with a synthetic `git push` payload before wiring
it into hooks.json. Fixed by NOT passing `cwd` to those spawns at all (matches the
original `pre-push-validate.mts` exactly, which never set `cwd`). Re-ran the same
standalone smoke test after the fix — output now matches the original script's
real (pre-existing, unrelated) format:check drift warning byte-for-byte, confirming
parity.

## Latency measurement methodology and raw numbers

Two independent harnesses were built (both scratch-only, not committed) since
Claude Code's real hook dispatch isn't directly observable from a repo checkout:

1. **Sequential-spawn model** (same technique as this repo's own
   `crew/tests/hook-cold-start-bench.test.mts`): `spawnSync` each Bash-matcher hook
   in registration order, sum wall-clock. Conservative upper bound.
2. **Parallel-per-phase model**: Claude Code documents same-event matching hooks as
   running concurrently. Spawns all PreToolUse-Bash hooks concurrently, takes the
   max (the phase can't proceed until all settle), likewise for PostToolUse, sums
   the two phase maxima. Closer to real dispatch shape.

Both used a non-push representative Bash payload (`ls -la`), 30 runs each, on this
Windows dev machine (`C:/work/mega/devcrew`).

| Model | BEFORE p50 | AFTER p50 | Gate (<=150ms) |
|---|---|---|---|
| Sequential (7->6 spawns) | 483.8ms (p95 499.2ms) | 427.1ms (p95 449.4ms) | **NOT MET**, both before and after |
| Parallel-per-phase | 189.1ms (p95 198.0ms) | 195.7ms (p95 229.5ms) | **NOT MET**, both before and after (AFTER is flat/within noise of BEFORE) |

Per-hook average cost (sequential model, ms): preflight-shell ~63, pre-tool-use-bash-gate
~62, pre-push-verifier ~63 / pre-push-validate ~69 (BEFORE) vs pre-push-gate merged
~73 (AFTER), post-tool-use-bash-gate ~62, **otel-post-tool-use ~102-104 (highest of
any hook, and unconditional/by-design — cannot be matcher-scoped away)**,
checkpoint-cadence ~64.

**Conclusion: AC-4 is not satisfied by matcher-scoping + dedup alone on this
machine.** The floor is bun/node process cold-start (~60-110ms per spawn on this
box — matches `hook-cold-start-bench.test.mts`'s own documented Windows-local floor
of ~88ms p50 for a *single* hook). Even the parallel model's best case is bounded
below by the single slowest required hook per phase, and `otel-post-tool-use.mts`
alone (~103-112ms) already consumes most of a 150ms budget before anything else
runs. This repo's own cold-start bench already treats Windows-local as
non-gating and Linux/CI as the tight spec target (p50<=150/p95<=400 for one hook);
by the same convention, these Windows numbers should not be read as a literal AC-4
FAIL against the actual CI gating environment, but they ARE strong evidence that
**spawn-per-event hook scripts have a hard architectural ceiling that no amount of
matcher-scoping can lift**, which is exactly the case for the spike below.

## Spike note — prompt-based hooks (unification-plan.md Sec 10, greenfield item A)

Per the dispatch prompt's instruction, this is a bounded spike NOTE, not a rewrite —
no prompt-based hook implementation was attempted.

**Finding**: the dominant, largely irreducible cost in the Bash-call hook chain is
per-hook process cold-start (bun ~60-110ms/spawn on Windows, ~77-83ms on the
self-hosted Linux CI runner per this repo's own bench history), not hook *count* —
consolidating from 7 to 6 spawns bought ~12% in the conservative sequential model
and nothing measurable in the parallel model. Six of today's Bash-relevant hooks are
either matcher-scoped-already-minimal or unconditional-by-design (otel tracing,
checkpoint cadence) — there is no further *mechanical* consolidation available
without cutting real functionality (reviewer-decision gate, builder-terminal-state
gate, telemetry, etc.).

**Implication**: if the platform's prompt-based hooks API (Claude Code plugin hook
development: hooks can register logic that runs in-process rather than spawning an
external interpreter per event) supports the checks currently living in
`preflight-shell.mts`, `pre-tool-use-bash-gate.mts`/`post-tool-use-bash-gate.mts`,
and `otel-post-tool-use.mts`, moving them off spawn-per-event would eliminate the
cold-start tax entirely for those hooks rather than merely amortizing it — a
categorically different (and larger) win than anything achievable by further
matcher-scoping or script merging. This is the change that could plausibly get the
Bash-call chain under 150ms even on Windows-local hardware.

**Scope for the follow-up spike slice** (not this slice): (1) confirm which hook
events the currently-installed Claude Code version's prompt-based hooks API
actually supports (PreToolUse/PostToolUse are the ones on the AC-4 hot path and the
highest-value targets); (2) prototype ONE hook (suggest `pre-tool-use-bash-gate.mts`
— simplest, already fast internally, isolates the cold-start-vs-logic question
cleanly) as a prompt-based hook and re-run this slice's same two benchmarks against
it; (3) if the win is real, size the migration cost for the remaining Bash-chain
hooks before committing to a full rewrite (explicitly out of scope here per the
dispatch prompt's "spike note, not a rewrite" instruction).

## Gate evidence

- `bunx tsc --project tsconfig.json --noEmit` (root, `hooks/**/*.mts` added to
  `include` so the new file is actually covered — it wasn't before, and neither
  tsconfig previously included any root-level `hooks/*.mts`): exit 0, no errors.
- `bunx tsc --project tsconfig.test.json --noEmit`: exit 0, no errors.
- `bunx tsc --project crew/tsconfig.json --noEmit` (crew's own, run from `crew/`):
  exit 0, no errors.
- `bunx biome lint src/` / `bunx biome format src/`: pre-existing baseline
  noise only (complexity warnings + 6 format-drift errors in files this slice never
  touched) — `hooks/` is entirely outside `biome.json`'s `**/src/**`-only scope, so
  `hooks/pre-push-gate.mts` is not linted/formatted by either CI gate (same as the
  pre-existing `hooks/*.mjs` files).
- `bun ./src/scripts/validate-manifests.mts`: OK.
- `bun ./src/scripts/validate-imports.mts`: OK.
- `bun ./src/scripts/validate-dispatch-markers.mts`: OK, 7 fixtures balanced.
- `bun ./src/scripts/validate-content-length.mts`: OK.
- `bun test src/tests/ --parallel --timeout 60000`: 3316 pass, 7 skip, **2 fail**
  (matches this repo's documented known baseline exactly — not new).
- `bun test crew/tests/ --parallel --timeout 60000` (run from `crew/`): 1978 pass,
  117 skip, **2 fail** — `memory-write-handoff-credit.test.mts` (timing-sensitive)
  and `hook-cold-start-bench.test.mts` (30s timeout, contention from running two
  full suites + two benchmark harnesses concurrently on one machine). Re-ran both
  in isolation: 6/6 pass. Neither test touches `hooks.json`, `crew/hooks/*`, or
  `hooks/pre-push-gate.mts` — confirmed pre-existing flakes, not a regression.
- Standalone hook smoke test (synthetic stdin, 3 representative hooks): `bun
  crew/hooks/preflight-shell.mts` (Bash matcher, exit 0), `bun
  hooks/pre-push-gate.mts` (new merged hook — non-push no-op exit 0, and push
  command with push-verify disabled produces the expected soft-warning JSON, exit
  0), `bun crew/hooks/post-tool-use-bash-gate.mts` (Bash matcher, exit 0).

