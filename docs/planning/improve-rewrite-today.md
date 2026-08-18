# Rewrite-today review — what to shed, not port

Date: 2026-08-18. Scope: pieces of `dev-team` and `runner-plugin` that would be
written differently if designed fresh today, and should be rewritten during
the unification merge rather than carried over verbatim. Parent repos were
read-only inputs; nothing here was written to them. Every finding is
evidence-backed with `file:line`.

Method: sampled deeply from `runner-plugin/src/scripts/lib` and
`dev-team/scripts/lib` + `agents/` rather than skimming every file. Five hunt
categories from the brief are mapped onto the numbered findings below.

---

## 1. [HIGH] The crew-bridge execFile layer is a cross-process contract that becomes a function call

**What exists:** `runner-plugin/src/scripts/lib/slice-linker/crew-bridge.mts`
(726 lines). Every call — `writeCrewRunBrief`, `tryWriteCostReport`,
`markValidationSkippedBadge` — follows the same shape: build an `argv` array,
`execFile` the crew CLI, `JSON.parse(stdout)` with a `stdout.slice(0, 500)`
fallback when parsing fails, catch `execFile` errors into `{ error }` (lines
193–206, 119–132, 300–314). `writeCrewFinalSynthesis` and `writeCrewHandoff`
(lines 542–725) go further: they render **markdown documents from template
strings** (`renderSynthesisBody`, `renderSynthesisScores`,
`renderSynthesisDecisions`, lines 461–540) whose sole purpose is to be
*parsed back out* by a human or another process later — headers like
`## Continuity hooks` and `## References` exist because the artifact is the
interface, not because the content needs prose.

**Why different today:** this is a same-process, same-repo call once the
merge lands (plan §4 already says so for the CLI-invocation half). But the
plan's §4 table only replaces the `execFile` calls with direct imports — it
doesn't address the *artifact-as-IPC* pattern underneath. A same-process
function doesn't need `stdout.slice(0, 500)` truncation-fallback parsing, and
a handoff writer that's called by the same code that also updates
workflow-state doesn't need to round-trip through a markdown template that
some other process will later re-read structurally. Writing this today: one
function that takes structured slice-close data and writes both the
machine-state update and the human-readable artifact directly from the same
in-memory object — no JSON-over-stdout, no truncation fallback, no template
string reconstructing data the caller already had typed.

**Rewrite sketch:** collapse `crew-bridge.mts` into direct calls against
crew's (soon-to-be-same-repo) workflow-state writer, cost module, and badge
writer per the plan's own table. Additionally: replace the
`renderSynthesisBody`/`renderSynthesisDecisions` template functions with a
single typed `SliceCloseRecord` object that the artifact writer serializes —
delete the `stdout.slice(0,500)` fallback path entirely (dead once there's no
subprocess boundary).

**Phase:** P2 (Seam elimination) — extend the existing scope, don't just
port the template writers unchanged.

---

## 2. [HIGH] `auto-dispatch.mts` is an audit-log wrapper around a function that does nothing

**What exists:** `runner-plugin/src/scripts/lib/auto-dispatch.mts` (257
lines). `dispatchAgent()` (lines 125–257) times itself, checks a cost
advisor, and returns `{ output: "<dispatch-acknowledged>" }` (line 230) — it
never spawns anything. The real work is: build an audit-log entry, batch it
in a `Map` (`pendingBatches`, lines 66–107), flush it to
`.claude/artifacts/loop/auto-dispatch.jsonl`, then fan out a webhook envelope
per entry (lines 96–107). `DEC-011` (`.claude/artifacts/loop/decisions/DEC-011.md:33-58`)
confirms *why*: this module used to write "marker files" for a consumer that
was supposed to drain them and actually invoke agents — that consumer "never
shipped" and "is not planned." What survives is described in the decision
itself as "opt-in audit infrastructure" kept alive for exactly one caller
(`feature-lifecycle.mts::classifySlice`, DEC-011 Neutral section). Sitting on
top of this dead center is a small family of dispatch-telemetry modules that
exist only to slice and re-aggregate the same audit log:
`dispatch-metrics.mts` (62 lines), `dispatch-aggregate.mts` (33 lines),
`dispatch-trace.mts` (42 lines), `dispatch-tree-snapshot.mts` (138 lines) —
275 lines reading back out what `auto-dispatch.mts` wrote in, for a dispatch
event that was never real to begin with.

**Why different today:** this repo's own tool surface, visible in this very
planning session, now includes native `TaskCreate` / `TaskUpdate` /
`TaskList` primitives for exactly this job — tracking dispatched work with
status, without a bespoke JSONL-plus-webhook audit trail bolted on top of a
function that fakes success. Written today, "record that an agent was
dispatched" is a `TaskCreate` call, not a queue-then-flush batch writer with
its own Map-keyed pending-state and its own webhook fanout kind
(`agent.dispatch`).

**Rewrite sketch:** delete `dispatchAgent`'s audit-log/fanout machinery.
Where dispatch lifecycle needs to be visible (slice-event stream, which is
legitimately useful — `emitEvent` calls at lines 172–180, 207–215, 234–241,
248–254 write real `agent_dispatched`/`agent_completed`/`agent_error`
events), keep the slice-event emission but drop the parallel audit-log path;
represent the "did we dispatch" bookkeeping via native task tracking instead
of a repo-local JSONL file nobody drains. Retire `dispatch-metrics.mts`,
`dispatch-aggregate.mts`, `dispatch-trace.mts`, `dispatch-tree-snapshot.mts`
once their sole data source is gone (verify no other producer feeds them
first).

**Phase:** P2/P3 — verify the `classifySlice` call site (DEC-011's stated
survivor) before deleting; this is a scoped slice, not a blanket delete.

---

## 3. [MED] `plugin-identity.mts` is a compat-scar file that is already correctly slated for deletion — confirm the blast radius is bigger than the plan states

**What exists:** `runner-plugin/src/scripts/lib/plugin-identity.mts` (141
lines). `MIN_CREW_VERSION = "0.57.0"` (line 81) carries a six-paragraph
comment (lines 55–80) narrating three successive version-floor bumps and the
specific crew CLI flags each one unlocked. `crewCliRuntime()` (lines 51–53)
branches `bun` vs `node` **by file extension** (`crew.ts` → bun, `crew.mjs`
→ node) because crew shipped two CLI eras concurrently — the comment (lines
46–50) names the exact test-failure cluster (2026-07-02) this was fixed for.
`findCrewCli()` (lines 19–44) walks a plugin-cache directory, sorts semver
strings naively (`compareSemver`, lines 104–117, with a comment admitting it
"does not parse pre-release tags"), and picks a winner.

**Why different today:** the plan (§4 table, `plugin-identity.mts` row) is
already right — this whole file becomes unnecessary once crew and runner
share a repo and a runtime. Nothing here needs rewriting *into* something
else; it needs deleting outright, extension-branching and version-floor
comment-archaeology included. The one thing worth separating out: `MIN_BUN_VERSION`
/ `checkBunVersion` (lines 119–141) check the *host's* Bun version, not
crew's — that's a legitimate startup check unrelated to the crew-CLI-lookup
problem this file otherwise exists to solve, and shouldn't die with the rest
or get ported under a filename (`plugin-identity`) whose entire remaining
reason to exist just disappeared.

**Rewrite sketch:** delete `findCrewCli`, `crewCliRuntime`, `MIN_CREW_VERSION`,
`compareSemver`, `getCrewVersion` wholesale (plan already says this). Move
`MIN_BUN_VERSION`/`getBunVersion`/`checkBunVersion` into a generic
`runtime-check.mts` under the merged `src/scripts/lib/` — a Bun-floor check
belongs to devcrew's own startup, not to a file named for resolving a
now-nonexistent sibling plugin.

**Phase:** P2, exactly where the plan puts it — flagged here mainly to make
the sub-split (delete vs. relocate) explicit so the Bun-version check doesn't
get deleted by association.

---

## 4. [MED] The preset/config-resolver layer solves a distribution problem this repo no longer has

**What exists:** `runner-plugin/src/scripts/lib/config-resolver.mts` (259
lines). Presets are install-time templates inlined into
`.claude/loop.json` (comment, lines 8–11); `resolveConfig` has two branches —
preset-merge (install path) and read-only (runtime path, lines 120–144).
Layered on top: `applyLightLadder` (172–188) and `retrofitLightLadder`
(234–259) exist because a repo might have been installed *before* the
`--light` flag existed, so there's a whole "read the persisted preset name
back off disk, fall back to a hardcoded constant if that preset can't be
resolved" retrofit path — with a comment candidly admitting the fallback
constant is only "honest" because "the block is identical across every
preset today" (lines 192–200). Six near-identical stack presets live under
`scripts/presets/*.json`, each carrying its own copy of that same `light`
block.

**Why different today:** this machinery exists to let *adopters* — repos the
author doesn't control, installed at different times, on different stacks —
converge safely without a shared migration script. Per the unification
plan's own operator decision (`unification-plan.md` §6, "Local repo
migration script"), devcrew's actual situation is the opposite: ~10 known
repos, one operator, one `migrate-adopter.mts` script that touches all of
them in one pass, `--dry-run` first. A single migration script run once
across every target repo makes the retrofit-for-repos-installed-at-different-times
problem `retrofitLightLadder` was built for simply not exist anymore. Preset
selection as an install-time templating layer is solving "many strangers,
many stacks, staggered installs" — devcrew today is "one operator, ~10 known
repos, one coordinated migration."

**Rewrite sketch:** replace the preset-inlining + retrofit system with one
documented default `devcrew.json` shape and direct per-repo overrides
written by `migrate-adopter.mts` itself (which already has to touch every
repo per plan §6) — no preset name persisted, no "resolve the preset back
off a name that might not exist anymore" fallback chain, no six
near-duplicate preset JSON files to keep in sync. If genuinely different
stacks need different defaults, that's a lookup table `migrate-adopter.mts`
consults once at migration time, not a runtime-resolved, retrofittable,
versioned preset system.

**Phase:** P4 (Content + CI) alongside the `devcrew.json` schemaVersion 2
merge already planned in §4 — fold this simplification into that same slice
rather than porting six presets forward unchanged.

---

## 5. [HIGH] GEPA machinery is sized for a multi-consumer prompt-optimization product, not a sole operator's private prompt tuning

**What exists:** `dev-team/scripts/lib/gepa/` — 19 files, 6,286 lines:
`candidate-generator-aiplugin.ts` (715), `gepa-optimize-cmd.ts` (583),
`gepa-killswitch-cmds.ts` (523), `optimize-runner.ts` (480),
`mine-reviewer-bug-corpus.ts` (383), `auto-pr.ts` (424),
`auto-merge-gate.ts` (345), `soak-dispatcher-hook.ts` (267),
`corpus-sync.ts` (287), `champion-provenance-writer.ts` (232),
`corpus-report.ts` (220), `judge-scorer.ts` (200),
`branch-protection-check.ts` (199), plus eval/observability/tee support
files. This is a full auto-promotion pipeline: generate candidate prompt
variants, Pareto-score them, dispatch a "soak" period, gate auto-merge behind
branch-protection checks, open a promotion PR automatically
(`auto-pr.ts`), and support a kill-switch for runaway promotions
(`gepa-killswitch-cmds.ts`). Actual usage on disk:
`.claude/artifacts/crew/gepa/` holds **11 trial files total** across every
agent this machinery targets.

**Why different today:** auto-merge gates, branch-protection checks, and
kill-switches exist to make automated prompt promotion *safe when other
people's work could be affected by a bad promotion landing unattended*. A
sole operator reviewing their own repo's prompt changes doesn't need a
killswitch for a promotion they'd see land in their own `git log` — they
need candidate generation and a scoring table, then a human `git commit`.
The plan's own §5 ("GEPA state") independently surfaces a second reason this
machinery is weaker than it looks: `champion-provenance-writer.ts` ties
"champion" status to a **git commit SHA on dev-team main**, and the plan has
to archive+reset all of it because "those break under new hashes" after the
subtree import — the provenance mechanism this pipeline exists to protect
doesn't survive the merge it's supposedly guarding against. That's a strong
signal the auto-promotion safety machinery was never earning its keep even
before the merge.

**Rewrite sketch:** keep `eval.ts`, `judge-scorer.ts`, `history.ts`,
`load-config.ts` (scoring and candidate generation are genuinely useful).
Delete or fold to a single flag: `auto-pr.ts`, `auto-merge-gate.ts`,
`branch-protection-check.ts`, `gepa-killswitch-cmds.ts`,
`soak-dispatcher-hook.ts`. Target shape: one `devcrew:gepa-optimize` command
that generates candidates, scores them, prints a comparison table, and stops
— promotion is a manual `git commit` the operator makes after reading the
table, the same way any other prompt edit lands.

**Phase:** not currently scoped in the plan (§5 only covers archive+reset of
*data*, not a machinery simplification pass). Recommend adding a P4 sub-slice
for this — it's the single largest volume-to-usage mismatch found in either
repo.

---

## 6. [MED] `claims.ts` + `approvals.ts` hand-roll coordination that worktree isolation already solves

**What exists:** `dev-team/scripts/lib/claims.ts` (468 lines) — a JSON-file
claim ledger (`ClaimsState`, `ClaimEntry`, lines 10–21) giving agents file-path
ownership locks, conflict detection, and release semantics — plus
`approvals.ts` (307 lines), a parallel gate system for risky/blocked work.
These back `crew:claim-files`, `crew:release-files`, `crew:request-approval`,
`crew:resolve-approval`, `crew:show-claims`, `crew:show-approvals` — six
commands coordinating shared mutable state between concurrently-running
agents in the *same working tree*.

**Why different today:** the mechanism this session itself is using —
`Agent(isolation: "worktree")` — sidesteps the whole problem class by giving
each parallel agent its own git worktree, so there's no shared file state to
claim or conflict over in the first place. `runner-plugin`'s own
`dispatch-worktree.mts` (576 lines, already the plan's chosen keeper per §5
"two worktree-managers → keep runner's, wave-hardened") independently solved
parallel-agent safety via isolation rather than locking. The plan's §5
direction — "port crew's claim/approval integration" into the kept
worktree-manager — risks re-introducing the coordination problem worktree
isolation already eliminates for wave/parallel dispatch.

**Rewrite sketch:** before porting claim/approval integration wholesale,
confirm where it's actually load-bearing: `crew:parallel-review` and
`crew:claim-files` look like they exist specifically for the case where
multiple agents *intentionally* share one working tree (e.g. live pairing,
not wave-isolated dispatch) — that's the one case claims stay meaningful.
For anything already running through worktree-isolated dispatch (wave mode,
`crew:parallel`), skip the claim/approval port entirely; isolation already
provides the guarantee locking was approximating.

**Phase:** P3 (Surface merge) — resolve this as a scope question before the
mechanical port, not after.

---

## 7. [MED] `verifier.md`'s `pre-loaded-universals` block is defensive prompt engineering written for a weaker model, and it's an outlier even within this repo

**What exists:** `dev-team/agents/verifier.md:18-54` — a
hash-stamped (`<!-- pre-loaded-universals:BEGIN hash=798a811c... -->`) block
containing lines like "If you think there is even a 1% chance a skill might
apply to what you are doing, you ABSOLUTELY MUST invoke the skill... This is
not negotiable. This is not optional. You cannot rationalize your way out of
this." (lines 22–24) and "If you haven't run the verification command in
this message, you cannot claim it passes" (line 35). A repo-wide grep for
this exact block across every owned agent in both repos
(`agents/*.md`) found it in **exactly one file** — `verifier.md` — nowhere
else. Every other owned agent (architect.md, backend-dev.md, pm.md,
reviewer.md, etc.) states the same "invoke skills when relevant,
verify before claiming done" guidance once, in plain sentences, without the
repetition-for-emphasis pattern.

**Why different today:** all-caps imperative repetition ("ABSOLUTELY MUST,"
"not negotiable," "cannot rationalize") is a technique for models that need
redundant emphasis to reliably follow an instruction under competing
pressure — current-generation models follow a single clearly-stated
constraint without needing it restated four ways. That this block appears in
only one agent, hash-stamped as if machine-generated, suggests it's leftover
output from a GEPA candidate-generation pass (`candidate-generator-aiplugin.ts`
is exactly the kind of tool that would produce this shape) that never got
reconciled back to the plain-prose convention every other agent uses.

**Rewrite sketch:** collapse the block to the one or two sentences of actual
new information it carries (skill-invocation trigger, verification-before-claim
rule) in the same plain register as the rest of `verifier.md` and every
sibling agent. This is also the single largest owned-agent file by size
(25,126 bytes / ~343 lines) — most of that size is legitimate validation-mode
tables (Decision rules, Environment matrix, Timeout policy), but the
universals block is the one section adding length without adding content
found nowhere else.

**Top 5 owned-agent prompts by size** (proxy for token count, byte count
via `wc -c`, both repos):

| Rank | File | Bytes | Note |
|---|---|---|---|
| 1 | `dev-team/agents/verifier.md` | 25,126 | carries the outlier universals block (this finding) |
| 2 | `runner-plugin/agents/pm.md` | 23,692 | mostly earned complexity — 6 scoring frameworks, decomposition rules, inline-AC drafting (see finding 8 for one cuttable piece) |
| 3 | `dev-team/agents/architect.md` | 23,458 | not sampled in depth this pass — flag for a follow-up read before rewrite |
| 4 | `dev-team/agents/backend-dev.md` | 23,258 | not sampled in depth this pass |
| 5 | `dev-team/agents/release-engineer.md` | 19,676 | not sampled in depth this pass |

**Phase:** P3 (Surface merge) — cheap, low-risk, do during the agent-map
mechanical pass.

---

## 8. [LOW] PM's `declined_per` clause-citation contract is compliance theater for a team that no longer exists

**What exists:** `runner-plugin/agents/pm.md:206-224` — when the PM agent
declines a FEAT (P4), it must cite a clause id from `CLAUDE.md`
(`declined_per: ["<clause-id>"]`), enforced by a dedicated CI gate
(`validate-decline-citations.mts`, CLAUDE.md CI gate #4). The stated purpose
(pm.md:224) is auditability: "a cite-less decline is an audit gap."

**Why different today:** an audit trail for *why a decision was made* earns
its cost when someone other than the decision-maker needs to review it later
— a reviewer, a teammate, a future hire. Sole-operator context (this repo's
own CLAUDE.md: "Sole operator, no external adopters to protect") means the
PM agent is declining the operator's own backlog items on the operator's own
behalf; the clause-id citation is a formality with a dedicated CI gate
guarding it, for an audience of one who was in the room. This is the
smallest finding in this document by risk and effort, included because it's
a clean example of category 4 (over-engineered vs. actual usage) that's easy
to miss next to the bigger GEPA/claims findings.

**Rewrite sketch:** either drop the clause-citation requirement and its CI
gate, or downgrade it to advisory (present if convenient, not
schema-required) — keep `scopeNotes` free-text as the actual record of why.

**Phase:** P4 (CI harmonization) — bundle with the general CI-gate dedupe
pass already planned; don't let it survive as gate #N in the new ~30-gate
list without a fresh "does a sole operator need this" pass, which the plan's
§7 disposition table currently skips (it disposes gates by name/origin, not
by whether the underlying need still exists).

---

## 9. [LOW] Reviewer ladder — already right-sized, cited here only to say "don't undo it"

**What exists:** `runner-plugin/CLAUDE.md` § "Reviewer ladder presets" — the
two-reviewer ladder (`["A","B"]`) is config-driven down to a one-reviewer
`["A"]` default in this repo, with `loop.validation.satisfiedByReview: true`
replacing a separate post-builder validator dispatch.

**Why flagged at all:** the brief asked to hunt for over-engineered surfaces
like "reviewer ladders" as a category. Sampling this one shows the opposite
of the pattern: it was already trimmed for solo use (`docs/memory.md` §
"Reviewer ladder"), and the trim is config-driven, not hardcoded — exactly
the shape a from-scratch design would choose. No rewrite needed; call this
out explicitly in the merge so nobody "fixes" it back toward a two-reviewer
default while porting.

**Phase:** none — carry as-is, note only.

---

## Top-10 priority list

1. **GEPA auto-promotion machinery** (finding 5) — 6,286 lines guarding 11
   trial artifacts; provenance mechanism doesn't survive the merge it's
   guarding against. Highest volume-to-value mismatch found.
2. **`auto-dispatch.mts` fake-dispatch audit layer + its 275 lines of
   downstream telemetry modules** (finding 2) — replace with native
   TaskCreate/TaskUpdate now that the platform has them.
3. **crew-bridge.mts artifact-as-IPC pattern** (finding 1) — not just the
   `execFile` calls (plan already covers those) but the markdown-template
   handoff/synthesis writers underneath them.
4. **`claims.ts`/`approvals.ts` vs. worktree isolation** (finding 6) —
   resolve as a scope question before porting into the kept worktree
   manager, or risk re-adding a solved problem.
5. **preset/config-resolver retrofit system** (finding 4) — solves a
   staggered-adopter-install problem that a single coordinated migration
   script makes moot.
6. **`plugin-identity.mts`** (finding 3) — already correctly slated for
   deletion; split out `MIN_BUN_VERSION` before the rest goes.
7. **`verifier.md` universals block** (finding 7) — cheap, isolated, an
   outlier even within its own repo.
8. **Top-5 agent prompts by size** (finding 7 table) — architect.md,
   backend-dev.md, release-engineer.md need the same depth pass verifier.md
   got here before the P3 agent-map merge.
9. **`declined_per` clause-citation CI gate** (finding 8) — small, but a
   clean instance of "gate survives because it's on a list, not because
   the need survived."
10. **Reviewer ladder** (finding 9) — not a rewrite target; explicit note
    to prevent regression during the merge.
