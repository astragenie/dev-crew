# dev-crew unification — optimization findings

Date: 2026-08-18. Scope: what can be measurably optimized during the merge —
token cost, CI/runtime perf, ceremony efficiency, operator DX. Method: sized
where cheap (`wc -c`/`wc -l`, file counts, grep), estimated where not — every
estimate is marked. Read first: `unification-plan.md`, `demolition-synthesis.md`.
Read-only against `C:/work/mega/dev-team` and `C:/work/mega/runner-plugin`.

---

## 1. [GAIN: avoids shipping a flaky/slow merged CI test job] `bun test --parallel` premise is internally contradicted inside dev-team itself

**Evidence.** `unification-plan.md` §3 treats ADR-002's "amended" spike (2026-06-10,
accepted) as settled: `--parallel` fixes a `node:test` single-process shim gap,
16.5s vs 21.1s Node, and today's fresh re-run (2111 tests/212 files, 1991 pass /
118 skip / **2 fail**, 14.30s) is cited as near-green. But dev-team's own
**current** `CLAUDE.md` (more recent than the ADR) says the opposite happened in
production:

> `bun run test` ... No `--parallel` — removed in `a20f9dd9` to work around Bun's
> `node:test` single-process scheduling bug (bun#5090)

And `dev-team/.github/workflows/test.yml` confirms it operationally: the `test`
job does **not** call `bun test --parallel` at all — it shards the *file list*
across a 3-way `matrix.shard` (`test:shard`, `scripts/test-shard.ts`) specifically
because `--parallel` was found unsafe in that repo's CI. The 2 unclassified fails
in the plan's own fresh 14.3s run are the exact failure signature this workaround
exists for, not necessarily a "log tail truncation" artifact as the plan
speculates.

Countervailing evidence: `runner-plugin`'s own CI (`ci.yml`, `slow-tests` job)
**already runs** `bun test src/tests/ --parallel --timeout 60000 --no-orphans` in
production self-hosted CI today, apparently successfully. So the bug may already
be fixed on runner's pinned Bun version, or may be intermittent and runner has
just been lucky across ~330 test files.

**Proposed change.** Before Phase P1 declares "full suite green, 0 unexplained
fails" as its exit gate, add a step to actually resolve the contradiction:
(a) diff dev-team's and runner-plugin's pinned Bun version/lockfile — if runner's
is newer, the bug may already be closed upstream; (b) run the merged suite under
`--parallel` N≥20 times and record an actual flake rate, not one sample; (c) if
flake rate > 0, adopt dev-team's file-sharded-matrix pattern (3 independent CI
jobs, no in-process `--parallel`) as the CI perf design instead of runner's
single-command `--parallel`, rather than silently keeping whichever one happened
to work in the one experiment run. This changes the P1 exit gate from an
optimistic assumption into a measured one.

**Phase:** P1 (runtime baseline), before the exit gate is signed off.

---

## 2. [GAIN: prevents day-1 CI-red on 4 agents; forces a trim that is itself a token-cost win] 4 of dev-team's agents already exceed the cap the plan says wins

**Evidence.** §2 of the plan: *"repo layout... runner conventions win"* and §7
keeps runner's `validate-content-length` as the surviving CI gate (`AGENT_MAX_LINES
= 300`, `src/scripts/validate-content-length.mts:12`). Measured line counts on
dev-team's 23 owned agents:

| Agent | Lines | Bytes |
|---|---|---|
| `architect.md` | 346 | 23,458 |
| `verifier.md` | 343 | 25,126 |
| `backend-dev.md` | 335 | 23,258 |
| `release-engineer.md` | 326 | 19,676 |

All four exceed 300 lines; three are already the single largest agent prompt
files across *either* repo (`verifier.md` at 25,126 bytes is the single biggest
owned-agent file found in the whole comparison — runner's biggest, `pm.md`, is
23,692 bytes). The agent map (§2) keeps crew's variant as the merge base for
overlapping roles and carries the rest unchanged — none of these four get
edited by the mapping step itself.

**Proposed change.** Add an explicit Phase P3 line item: trim these 4 agents to
≤300 lines before/during the surface merge (extract repeated boilerplate — e.g.
shared dispatch-contract prose — into a skill, matching crew's own skill-tier
pattern already used for `universal/`, `workflow/`), rather than discovering the
CI-red as a surprise after `validate-content-length` runs on the merged tree.
Since these are also the largest prompts, the trim is a real per-dispatch token
saving, not just a compliance fix.

**Phase:** P3 (surface merge), before the "`validate-agent-refs` green on merged
tree" exit gate — add "content-length green" alongside it.

---

## 3. [GAIN, largest single lever found: cuts per-tool-call hook latency by an estimated several hundred ms × every Bash/tool call in a session] dev-team's hook registration fires unconditionally on every tool call; runner's does not

**Evidence.** `dev-team/hooks/hooks.json`: every `Bash` tool call fires **3
separate PreToolUse hook processes** (`preflight-shell.ts`,
`pre-tool-use-bash-gate.ts`, `pre-push-verifier.ts`) plus 1 PostToolUse
(`post-tool-use-bash-gate.ts`), *plus* 2 more PostToolUse hooks that have **no
matcher at all** — `otel-post-tool-use.ts` and `checkpoint-cadence.ts` fire on
**every tool call of every type**, not just Bash. That's up to 6 separate `bun`
process spawns for one Bash call alone. `runner-plugin/.claude-plugin/hooks/hooks.json`
has zero PostToolUse hooks and exactly one PreToolUse hook per matcher (Bash,
Agent) — no unconditional per-tool hook exists in runner today.

Cold-start cost is directly measured in dev-team's own test suite
(`tests/hook-cold-start-bench.test.ts`, comments citing real CI observations):
Windows local floor ~88ms p50 / ~103ms p95; **Windows CI runner (self-hosted) p50
~135ms / p95 ~700ms**, observed 2026-07-01; Linux self-hosted p50 77.9–83.0ms.
Using the conservative Windows-local figure (~88–100ms per spawn, this machine's
own platform), one Bash call today costs roughly 4×~90ms (Bash-matched hooks) +
2×~90ms (unconditional) ≈ **540ms of pure hook overhead**, before the Bash
command itself runs — and the 2 unconditional hooks add ~180ms to *every other*
tool call (Read, Edit, Agent, Glob…) too. This compounds linearly with tool-call
count per session; a session with a few hundred tool calls (typical for a slice
ceremony with multiple subagent dispatches) plausibly loses tens of seconds to
hook cold starts alone — not estimated precisely here, but the per-call cost is
directly measured, not guessed.

**Proposed change.** The hook merge in §2/§7 should not default to a union of
both `hooks.json` files. Specifically: (a) collapse the 3 dev-team Bash PreToolUse
hooks into one script (one cold start instead of three) — they're independent
checks today only because they were added incrementally, not because they need
separate processes; (b) make the 2 unconditional PostToolUse hooks
(`otel-post-tool-use`, `checkpoint-cadence`) either matcher-scoped to the tool
types that actually need them, or move their bookkeeping to a single
Stop-time/SubagentStop aggregation pass instead of firing per tool call. This is
the highest-confidence, highest-payoff item in this review because the cost is
measured (not modeled) and multiplies with every message, for the life of the
merged plugin.

**Phase:** P3 (hooks merge step, §2: *"hooks: crew 26 + runner 12 registrations
merged into one hooks.json"*) — do the consolidation during that merge, not
after, since redoing hook wiring later is another round of the same edit.

---

## 4. [GAIN: addresses the largest already-measured token-cost driver in either repo] no explicit line-count budget set for the merged CLAUDE.md

**Evidence.** Current sizes: `runner-plugin/CLAUDE.md` 278 lines / 14,017 bytes
(`@AGENTS.md` 4,734B + `@.claude/artifacts/loop/loop-snapshot.md` 3,118B, itself
regenerated per slice); `dev-team/CLAUDE.md` 297 lines / 16,061 bytes
(`@.claude/crew/constitution.md` 5,359B + its own loop-snapshot-equivalent
include). Naively concatenated per §2's "merged docs tree" without an explicit
budget, the devcrew CLAUDE.md's *always-loaded, every-session* floor is ≈575
combined lines / ~27KB minimum, before either snapshot file grows.

This static-context tax is not hypothetical: runner-plugin's own prior
measurement (`builder-burn-analysis-2026-08-02`, this repo's memory store, 16
days old at time of writing — a point-in-time estimate, re-verify before
trusting the absolute number) found **~203k tokens/message of static context
reinjection** dominated slice-close sessions (live sample: 16.26M cache-read
tokens / 80 messages vs 150 raw input tokens), attributed to
"CLAUDE.md + rules.md + snapshot embed = flat tax every message," with ~97% of
session USD landing in Opus cache reads. The approved fix at the time was a
"context diet: CLAUDE.md <100-line index + skill-gated detail, snapshot cap" —
this was approved but its completion status wasn't re-verified in this review.

**Proposed change.** Phase P1 or P3 should set an explicit target for the merged
CLAUDE.md (e.g. ≤350 total lines including both `@`-includes) as a *design
constraint* of the merge, not an afterthought — since this is the one moment
both files get rewritten anyway, it's the cheapest point to apply the diet that
was already approved once and not confirmed done.

**Phase:** P1 (runtime baseline) or P3 (surface merge) — whichever phase first
rewrites CLAUDE.md content; set the budget before that rewrite, not after.

---

## 5. [GAIN, unverified/estimate: possible CI wall-time reduction, needs profiling before acting] validator scripts likely duplicate directory walks post-merge

**Evidence (partial — not directly profiled).** 19 dev-team `validate-*.ts` +
15 runner `validate-*.mts` = 34 scripts. §7 dedupes only the 3 *same-named*
validators (org-refs, agent-refs, manifests); the other ~28 are carried forward
unchanged from whichever parent owns them. Several independently `readdir`/glob
over `agents/**`, `skills/**`, `commands/**` (not individually confirmed for all
28 — this is an inference from the validators' evident purpose, e.g.
`validate-skills.ts`, `validate-agents.ts`, `validate-agent-refs.mts`,
`validate-content-length.mts` all plausibly walk overlapping trees). Post-merge
those trees roughly double in size (48 commands vs ~34/20, 26 agents vs 23/6,
~81 skills vs 71/18), so any redundant per-validator walk cost also roughly
doubles.

**Proposed change.** This is flagged as an estimate, not a measured finding —
before restructuring anything, profile actual per-validator wall time in the
merged tree during Phase P4 (`bun ./src/scripts/validate-X.mts` timed
individually, or instrument the CI `fast-gate`/`checks` job). If any single
validator's directory walk is a meaningful fraction of `fast-gate`'s wall time
(target ~1 min per runner's own CI comment), share one file-list producer across
the validators that need the same tree instead of N independent walks.

**Phase:** P4 (content + CI harmonization) — profile first, then decide whether
to act.

---

## 6. [DX, lower confidence] command-doc size asymmetry feeds the plan's already-flagged context-bloat risk

**Evidence.** Crew's dispatch-heavy commands are markedly larger than runner's
largest: `orchestrate-slice.md` 37,907 bytes, `build.md` 20,879 bytes, `fix.md`
18,600 bytes, vs runner's largest, `close.md`, at 9,735 bytes — a 4–15× gap.
These are per-invocation costs (loaded when that specific slash command runs,
not on every message), so they're lower-severity than findings 3/4, but they
directly inform the risk the plan already names in its own risk register: *"48
commands / 26 agents / ~81 skills in one surface... if merged surface > sum of
parents by >10%, tier skills (defer-load domain tier)."* That mitigation is
scoped to skills only; `orchestrate-slice.md` is the single largest first-party
prompt file in either repo (larger than any agent) and is a natural first
candidate if that mitigation ever needs to extend past skills.

**Phase:** P3, opportunistic — no new phase needed, just widen the existing
context-bloat tripwire (§8 risk register) to include command-doc size, not only
skill count.

---

## 7. [DX] two distinct ceremony calling-conventions should not survive the seam merge as two conventions

**Evidence.** Runner's slice-close ceremony funnels through one CLI entry point
(`bun .../loop.mts slice close`, per `commands/close.md`), writing validation,
handoff, and synthesis+grade+decision artifacts from that single call. Crew's
`orchestrate-slice.md` ceremony instead calls `node
"${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" write-final-synthesis` directly, inline
in the command doc — a second, separate calling convention for what §4 already
identifies as the same class of seam call (`write-run-brief`, `cost-slice`,
`mark-badge`, etc., all listed for direct-import conversion). §4's per-call
disposition table doesn't list `write-final-synthesis` explicitly.

**Proposed change.** When P2 (seam elimination) converts the listed crew-bridge
calls to direct imports, fold `write-final-synthesis` into the same
`devcrew.mts` entry point runner already funnels its ceremony through, rather
than leaving one ceremony step on a different calling convention than the rest.
Small scope addition to an already-planned phase, not new work.

**Phase:** P2 (seam elimination) — add to the §4 per-call table.

---

## Top 5 by expected payoff

1. **Finding 3 — hook consolidation.** Highest confidence (numbers are measured,
   not modeled) and compounds with every tool call for the life of the plugin;
   fix is scoped to work already planned for P3's hook merge.
2. **Finding 1 — `--parallel` flake-rate re-measurement.** Prevents locking in a
   CI design decision on a single 14.3s sample when dev-team's own commit
   history shows the identical failure mode was already hit and worked around
   in production once before.
3. **Finding 4 — CLAUDE.md line budget.** Addresses the largest previously
   measured token-cost driver (~203k tok/msg static tax, though that figure is
   16 days old and should be reconfirmed) at the one point in the whole program
   where rewriting CLAUDE.md is unavoidable anyway.
4. **Finding 2 — agent line-cap trim.** Prevents a guaranteed day-1 CI-red on 4
   files and is also the second-largest token-per-dispatch saving found (three
   of the four are the largest agent prompts across both repos).
5. **Finding 5 — validator directory-walk dedupe.** Lowest confidence (estimate,
   not measured) but cheap to check — a profiling pass in P4 either confirms a
   real CI wall-time win or rules it out in minutes.
