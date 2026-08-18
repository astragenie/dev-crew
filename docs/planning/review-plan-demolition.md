# Architecture design review — dev-crew unification plan

Reviewer: independent design-review pass (fresh session, no authorship stake in
the plan). Target: `unification-plan.md` (v2, 2026-08-18, DRAFT — awaiting
operator approval). Inputs read in full: the target plan,
`demolition-synthesis.md`, `improve-rewrite-today.md`, `improve-cleanup.md`,
`improve-optimize.md`, this repo's `CLAUDE.md`. All quantitative claims below
were re-verified against the live parent repos (`C:/work/mega/dev-team`,
`C:/work/mega/runner-plugin`) this session — read-only, nothing written to
either parent. Where a re-verification confirms a plan claim, that's stated;
where it doesn't, the actual measured number is given alongside the plan's.

---

## 1. Demolition findings

### [CRITICAL] Agent-count self-contradiction inside §2 itself

**Evidence.** §2's repo-layout ASCII tree (line 55) states:
`agents/  27 owned + 3rdparty/ 14 vendored`. Nineteen lines later, the same
§2's agent-map result line states: *"Result: 27 owned (23 + 6 − 2 merged
dupes... = 23 crew + 6 runner − 3 merges = 26; plus zero new) —
**26 owned**, 14 vendored."* The section literally writes "27" twice, then
self-corrects mid-sentence to "26," then bolds "26" as the final number —
but never goes back to fix the layout tree eleven lines above it, which still
reads 27. Independent re-verification confirms 26 is right: dev-team has 23
owned agents, runner has 6 (both counts match Appendix A and my own `ls
agents/*.md | wc -l` on both repos: 23 and 6). Three merges (architect,
researcher, document-writer, each 2→1) reduce 29 to 26. **27 is wrong
everywhere it appears** — it's not a typo isolated to one spot, it's the
number that survived in the repo-layout diagram, which is the part of the
plan most likely to be copy-pasted into an actual directory scaffold or
README without anyone re-deriving it from the prose below.

**Fix.** In §2's repo layout, change:
```
agents/              27 owned + 3rdparty/ 14 vendored
```
to
```
agents/              26 owned + 3rdparty/ 14 vendored
```
And rewrite the agent-map result sentence to drop the visible arithmetic
scratch-work (`"27 owned (23 + 6 − 2 merged dupes... = ... = 26"`) which reads
as the document showing its own confusion — state the number once: *"Result:
26 owned agents (23 crew + 6 runner − 3 role merges), 14 vendored."*

---

### [CRITICAL] Command-collision arithmetic doesn't match its own row

**Evidence.** §2's command table has a row labeled **`collisions (6→3)`**
listing: `crew install + runner install → 1`; `crew cost-setup + runner
cost-setup → 1`; `crew brief-me + runner brief + runner status → 1`. Count
the named commands in that row: install×2, cost-setup×2, brief-me+brief+
status×3 = **7 source commands**, not 6, merging into 3. The label "(6→3)" is
off by one.

This isn't cosmetic — it's the exact class of drift the plan's own §10
digest claims to have fixed (the task brief's cited history: 54→48→39). Check
whether the *final* total still works: crew total commands = 34 (Appendix A,
confirmed by `ls commands/*.md` on dev-team = 34), runner total = 20
(confirmed, `ls commands/*.md` on runner = 20). 34 + 20 = **54**, matching the
task's first historical count. Crew dropped = 11 (explicit list). Collisions
save `(source count) − 3`. The stated final total is 39: 54 − 11 − 3 = 40,
**not** 39. Only `54 − 11 − 4 = 39` lands on the plan's own stated result —
which requires the collision row to be **7→3** (saving 4), not 6→3 (saving
3). The final "39" is actually right, but only because it was computed
correctly elsewhere and the "(6→3)" label in the table header is the thing
that's wrong. A reader who trusts the visible row label over the buried final
arithmetic will file this as a 40-command merge and then be surprised when
CI's command count doesn't match.

**Fix.** Change the table row header from `collisions (6→3)` to
`collisions (7→3)`. Nothing else needs to change — the downstream "39
first-party" total is already correct, it's just resting on a mislabeled
input.

---

### [CRITICAL] Named, numeric exit gates live in the risk register but never appear in the phase table

**Evidence.** §8 (risk register) and §9 (phase table) are the two places an
operator would look to know "is this phase done." They disagree. At least
three risk-register rows name a specific phase and a specific measurable
threshold that **never appears in that phase's Exit gate cell in §9**:

| Risk register row (§8) | Stated tripwire | Present in §9's Exit gate cell for that phase? |
|---|---|---|
| "Hook overhead per tool call" | *"P3 hook-merge exit gate: measured per-Bash-call hook overhead ≤ 150ms"* | **No.** P3's Exit gate cell reads only: `validate-agent-refs` green on merged tree; every old token resolves per map; smoke: one full slice ceremony under `/devcrew:*`. |
| "Agent-cap CI red on day one" | *"P3 task: trim before content-length gate activates; tripwire = `validate-content-length` green on merged tree"* | **No.** Same P3 cell as above — no content-length mention. |
| "Merged CLAUDE.md context tax" | *"P4: set explicit CLAUDE.md byte budget (≤ 12KB before includes); tripwire = measured session static-context delta vs parents"* | **No.** P4's Exit gate cell reads: CI green end-to-end; wiggin sweep 0 hits; clause citations resolve; deletion inventory fully dispositioned. No byte-budget or static-context measurement. |

Two more risk rows (GEPA state corruption's `bun test tests/gepa/` +
`gepa-history` check; SPEC-003 halt-badge schema-test check) are *plausibly*
covered by P4's generic "CI green end-to-end" if those tests run in the
default suite, but they're not named, so there's no way to confirm from the
phase table alone that they ran.

This matters because §9, not §8, is the artifact someone actually works
off phase-by-phase — it's the one with slice counts and a literal "Exit
gate" column meant to be checked off. A risk register is where you *notice*
a danger; a phase table is where you *close* it. Right now the closing step
for three concretely measurable, already-quantified risks (150ms, 300 lines,
12KB) exists only in prose that nothing in §9 points back to. This is
precisely the "exit-gate quality" failure mode the review brief asked about:
these three are checkable-in-principle (they have numbers) but not actually
wired into the phase gate that would enforce them.

**Fix.** Add to §9's table (concrete rewritten cells):

- P3 Exit gate, append: `; validate-content-length green on merged tree (4
  over-cap dev-team agents trimmed to ≤300 lines); measured per-Bash-call
  hook overhead ≤150ms`
- P4 Exit gate, append: `; CLAUDE.md byte budget ≤12KB pre-include, measured
  against merged tree; bun test tests/gepa/ green + gepa-history clean on
  archived trials; docs/halt-badges.md schema tests green`

Every risk-register row that names a phase and a number should have a
mechanical twin in that phase's Exit gate cell — otherwise keep the number
out of the risk register too, so it doesn't read as a promise that's already
broken in the same document.

---

### [CRITICAL] 18 of the GEPA directory's 27 files — including the three largest — are never dispositioned by name

**Evidence.** §5 says: *"Kept: the eval/scoring harness (evals/,
judge/meter/model-profile)... Delete... auto-pr, auto-merge-gate,
branch-protection-check, killswitch."* `improve-rewrite-today.md` finding 5
is the plan's cited source and is more specific but still incomplete: it
names **19 files** and **6,286 lines** as the directory total, and explicitly
keeps 4 (`eval.ts`, `judge-scorer.ts`, `history.ts`, `load-config.ts`) and
deletes 5 (`auto-pr.ts`, `auto-merge-gate.ts`, `branch-protection-check.ts`,
`gepa-killswitch-cmds.ts`, `soak-dispatcher-hook.ts`).

I re-counted `scripts/lib/gepa/*.ts` directly: **27 files, 6,286 lines total**
(the 6,286 LOC figure is exactly right — the file count is not). That leaves
**18 files with no stated disposition anywhere in the plan or its source
review**, including the three largest files in the entire directory:

| File | Lines | Disposition anywhere? |
|---|---|---|
| `candidate-generator-aiplugin.ts` | 715 | **None named.** This is the single biggest GEPA file and is *exactly* what §5/finding-5's own prose says survives ("candidate generation... genuinely useful") — but it's never actually named as KEPT. |
| `gepa-optimize-cmd.ts` | 583 | **None named.** |
| `optimize-runner.ts` | 480 | **None named.** |
| `mine-reviewer-bug-corpus.ts` | 383 | **None named.** |
| `observability-events.ts` | 317 | **None named.** |
| `corpus-sync.ts` | 287 | **None named.** |
| `champion-provenance-writer.ts` | 232 | **None named — and this is the file the plan's own §5 prose says causes the problem** ("`champion-provenance-writer.ts` ties 'champion' status to a git commit SHA on dev-team main... those break under new hashes"). Diagnosed by name, never put on either the keep or the delete list. |
| `corpus-report.ts` | 220 | **None named.** |
| `capture-tee.ts`, `corpus-optimize.ts`, `no-winner-streak-tracker.ts`, `capture-failure-trial.ts`, `split-train-heldout.ts`, `run-with-lock.ts`, `adapt-artifact.ts`, `guarded-fire.ts`, `capture-failure-trial-guard.ts`, `critical-agent-allowlist.ts` | 151→29 | **None named.** |

This is a real execution risk, not a documentation nitpick: whoever executes
the P4 GEPA slice has two bad options given what's actually written down —
(a) interpret "delete the auto-promotion machinery" broadly and sweep the
whole directory except the 4 explicitly-named keepers, which would delete
`candidate-generator-aiplugin.ts` (the thing the plan says it wants to keep)
along with everything else, or (b) interpret it narrowly and keep all 18
undispositioned files by default, which silently ports forward
`champion-provenance-writer.ts` — the file the plan's own diagnosis says is
broken by the merge.

**Fix.** Add an explicit per-file disposition list to §5 before the P4 slice
is built, not during it. Minimum bar: KEEP `candidate-generator-aiplugin.ts`,
`gepa-optimize-cmd.ts`, `optimize-runner.ts` (candidate generation +
optimization loop — the part the plan says earns its LOC); DELETE
`champion-provenance-writer.ts` alongside the other 5 already-named deletes
(it's diagnosed as broken by name, it belongs on that list); the remaining
~10 files (corpus-sync, observability-events, corpus-report, capture-tee,
etc.) need a real read, not a guess — flag them for a dedicated
`improve-cleanup`-style grep pass before P4, the same rigor already applied
to skills/validators/worktree-managers elsewhere in this planning round.

---

### [MAJOR] P1's slice budget (5–7) is sized against a footprint roughly 2–3x smaller than what P1 actually touches

**Evidence.** P1's content, per §9: subtree-import both parents; full
`.ts`→`.mts` rename sweep of dev-team; node:test→bun:test migration; one
tsconfig/biome; N≥20 green `--parallel` runs. Measured footprint (this
session, both repos):

- dev-team `scripts/lib/*.ts`: **138 files**
- dev-team `scripts/**/*.ts` (all, incl. gepa): **169 files**
- dev-team `tests/**/*.ts`: **222 files**
- Total dev-team `.ts` surface the rename sweep must touch: **391 files**

Every one of those 391 files needs (a) an extension rename `.ts`→`.mts`, and
(b) — per this plan's own stated source policy in §3 ("runner convention...
`.mjs` import specifiers") — every relative `import`/`require` line inside
every one of those 391 files checked and, where missing, given an explicit
`.mjs` specifier for Bun/tsc resolution. That's not a `git mv` pass, it's an
import-statement rewrite pass across effectively the whole dev-team
codebase, easily 1,000+ individual import lines once you count each file's
average import count.

Compare that to P3, which is scoped to the command/agent/skill *maps*
(bounded, enumerated in §2's tables) — a much smaller, fully-enumerated
surface — and is *also* budgeted 5–7 slices. P1's raw file-touch footprint
(391 files, effectively every source and test file dev-team owns) is larger
than P3's enumerated surface (≤48 commands, 26 agents, ≤7 skill-dupe merges),
yet both get the same slice budget. That's before counting the
node:test→bun:test migration (next finding) or the N≥20 verification-run
requirement, which is real wall-clock/agent-turn cost even though it
produces no diff.

**Fix.** Split P1 into two exit-gated sub-phases rather than one 5–7-slice
block: **P1a** (subtree import + mechanical rename sweep, wave-dispatchable
by directory since renames are embarrassingly parallel — realistic: 8–12
slices given the 391-file footprint, batched maybe 30–50 files/slice) and
**P1b** (node:test→bun:test migration + flake-rate verification, serialized
because it needs the P1a rename done first and produces the exit gate).
Rough revised total: P1a 8–12 + P1b 3–4 ≈ **11–16 slices for what's currently
budgeted at 5–7** — this is the single most under-scoped phase in the plan
and the one most likely to blow the "20–27 slices total" headline number in
§9 if executed as currently sized.

---

### [MAJOR] The stated root cause of bun#5090 (nested subtests) is not present in any of the files the fix targets

**Evidence.** §3 states: *"the 2 failures are presumed shim false-positives"*
and cites the mechanism as *"NotImplementedError: `test()` inside another
`test()` in Bun's `node:test` compat shim."* I identified all 31 dev-team
test files that actually import from `node:test` (`grep -rlE "from
['\"]node:test['\"]" tests/`) — not the 222 the plan's prose implies ("dev-
team's tests are written against `node:test`"), a real minority (14%), most
of dev-team already uses `bun:test` (184 of 222 files, confirmed). Then I
searched those 31 files specifically for the nested-test / subtest pattern
the plan names as the trigger (`t.test(...)`, nested `test()` calls inside a
running test): **zero matches.** Every node:test file I sampled
(`cli-smoke.test.ts`, `agent-registry.test.ts`, `bun-preflight.test.ts`, and
the full 31-file list) uses flat top-level `test()`/`describe()` calls with
`node:assert/strict` (`assert.equal`, `assert.ok`, `assert.deepEqual`,
`assert.match`) — not the nested-subtest shape the cited bug requires.

Two possibilities follow, and the plan currently investigates neither: (a)
the 2 observed failures in the "live experiment" aren't actually bun#5090 at
all — they could be genuine regressions or an unrelated shim gap, and calling
them "presumed shim false-positives" without identifying *which* two tests
failed or what pattern they hit is exactly the kind of unverified claim
demolition-synthesis.md finding 4 already burned the v1 plan for once; or
(b) bun#5090 triggers on a pattern this session didn't sample (dev-team has
294 total files under `tests/`, only a subset was grepped for the subtest
shape) — plausible, but then the "root cause is the test API, not
parallelism" framing needs to name which specific files/patterns trigger it,
because right now the P1 exit gate ("zero node:test imports") is a fix for a
mechanism nobody has actually located in the code it's supposed to explain.

**Fix.** Before committing to "migrate node:test→bun:test fixes it" as the P1
premise, add a discovery step: run the current dev-team suite under
`--parallel` with verbose failure output, capture the exact 2 (or more)
failing test names and their file:line, and confirm those specific files use
the nested-subtest pattern (or don't — in which case the root-cause story
needs revising before the migration is trusted to fix it). This is cheap
(one CI run with `--reporter=verbose` or equivalent) and belongs before the
P1 exit gate is locked, not folded silently into "N≥20 consecutive green
runs" as if a clean run count alone validates the diagnosis.

---

### [MEDIUM] Wiggin-scrub is scheduled in P4; the operator's own decided constraint says "during content import" (P1)

**Evidence.** This repo's `CLAUDE.md`, under "Decided constraints (operator
decisions, 2026-08-18 — **do not relitigate without operator**)," states:
*"'Wiggin Loop' branding is retired... scrub it during content import."*
"Content import" is unambiguously P1/§5's subtree-add step. But §5 and §9
both schedule the actual scrub for **P4**: §5's "Wiggin scrub" paragraph says
"At import: rename... rewrite references, add... CI sweep" (reads as import-
time) but §9's P4 row is where "Wiggin scrub" actually appears as phase
*content*, and P4's exit gate ("wiggin sweep 0 hits") is the only place the
zero-hits check is scheduled. Between P1 (when the 27 wiggin-referencing
files land via subtree-add) and P4 (when they're scrubbed), the merged repo
carries retired branding through P2 and P3 — three phases where a decided,
"do not relitigate" constraint is not honored by the phase table that's
supposed to implement it.

**Fix.** Either (a) move the wiggin-scrub grep+rename to a P1 sub-step
(cheap — 27 files, already enumerated, mechanical rename per §5's own
description) so "during content import" is literally true, or (b) if P4 is
kept for a good reason (e.g. batching it with the general CI-gate dedupe
pass), change the CLAUDE.md constraint's wording to say "scrubbed no later
than P4" so the plan and the constraint it's supposed to satisfy actually
agree. Silently doing (b) without touching the constraint text is what's
wrong today.

---

### [MINOR] Two more instances of the "hardcoded counts rot" pattern the plan already flagged once

The plan's own §10 digest credits itself with catching count-drift (skill
"8 shared names" → corrected to 7). Two more instances survived into the
version under review:

1. **GEPA file count.** `improve-rewrite-today.md` finding 5 and, by
   extension, this plan's §5, cite "19 files, 6,286 lines" for
   `scripts/lib/gepa/`. Verified: **27 files**, 6,286 lines (LOC is exactly
   right, file count is off by 8 — see the CRITICAL GEPA finding above for
   why this specific miscount matters beyond arithmetic hygiene).
2. **Adopter repo count.** `demolition-synthesis.md`'s "Operator decisions"
   section says *"one migration script over **~9** local repos."*
   `unification-plan.md` Appendix A says *"adopters: **10** distinct repos...
   under C:/work/mega."* §6's migration-script paragraph then says "~10
   adopter repos." Two of three mentions agree on 10; one says 9. Low
   stakes, but it's the same failure class — pin one number, cite the
   enumeration command, and let every mention derive from it rather than
   being retyped.

**Fix.** Both are cheap: correct "19 files" → "27 files" in §5 (and note the
715/583/480-line files by name per the CRITICAL finding above, since fixing
the count without naming the newly-visible files doesn't close the real
gap); correct demolition-synthesis.md's "~9" to "~10" or re-run the
enumeration command and cite its literal output once, everywhere.

---

### [MINOR] GEPA provenance is broken by P1, not remediated until P4

**Evidence.** §5 states the subtree-import (P1) immediately invalidates
`champion-provenance-writer.ts`'s commit-SHA references ("those break under
new hashes"). But the actual archive/reset action — the thing that turns
"broken" into "intentionally archived and labeled" — is P4-scheduled
content. For the P1→P4 window (roughly two-thirds of the program by phase
count), any GEPA provenance-consuming command run against the merged repo
sees silently-broken state with no interim flag. Not severity-blocking (GEPA
usage is sparse — 11 trial files total, per the plan's own citation) but
worth a one-line mitigation.

**Fix.** Add to P1's exit gate or P2's scope: stamp
`.claude/artifacts/crew/gepa/` with an `imported-from: dev-team@<sha>,
provenance-pending-archive: true` marker at import time (P1), even though
the actual archive+cut work stays in P4 — so the broken window is labeled,
not silent.

---

## 2. Greenfield adjustments

The brief asks: if devcrew were designed today for a sole operator on Bun,
which ported subsystems should be *replaced* rather than carried, beyond
what the three review docs already cut? Three areas the existing reviews
didn't reach, plus one explicit caution against over-applying a cut they
already made correctly.

### A. Prompt-based hooks — the biggest hook-latency lever nobody checked

`improve-optimize.md` finding 3 (the plan's own highest-confidence,
highest-payoff item) proposes *consolidating* dev-team's hook scripts —
collapsing 3 separately-spawned Bash-PreToolUse scripts into one process, and
scoping 2 unconditional PostToolUse hooks to matchers. That's a real win
(~540ms/Bash-call → target ≤150ms) but it's still "spawn fewer `bun`
processes," not "stop spawning processes." Claude Code plugins now support
**prompt-based hooks** — declarative hook definitions that run as part of the
agent's own reasoning rather than as a spawned subprocess — which is exactly
the primitive that would let something like `preflight-shell.ts` (a Bash
argv-pattern gate) or `pre-tool-use-bash-gate.ts` become a rule the model
evaluates inline, with **zero** process cold-start rather than a
consolidated-but-still-nonzero one. None of the three review docs (rewrite-
today, cleanup, optimize) evaluated this option — optimize-review's finding 3
treats "fewer spawns" as the ceiling. On a blank-page design, the question
for every one of dev-team's 26 + runner's 12 hook registrations should be
"does this need to shell out at all, or is it a prompt-based rule?" before
asking "how many of the ones that must shell out can share a process."

**What it costs to check:** one focused pass reading dev-team's 5 unconditional-
or-Bash-scoped hook scripts (`preflight-shell.ts`, `pre-tool-use-bash-gate.ts`,
`pre-push-verifier.ts`, `otel-post-tool-use.ts`, `checkpoint-cadence.ts`)
against what prompt-based hooks can express. **What it risks:** prompt-based
hooks are evaluated by the model, not a deterministic script — anything doing
hard-blocking security enforcement (the redundant-read-hook-deny class of
check this repo's own upstream-requests history documents as a recurring
pain point) probably needs to *stay* a deterministic spawned script precisely
because a prompt-based rule is advisory, not enforced. Recommend: triage
each of the 5 into "deterministic enforcement — keep as spawned script,
folded into optimize-review's consolidation" vs. "advisory/informational —
candidate for prompt-based conversion," as a P3 sub-slice before the hook
merge, not a blind wholesale conversion.

### B. `.claude/artifacts/{crew,loop}/...` — two namespaces under one plugin makes no sense post-merge

None of the three reviews flagged this, and the plan's §2 doesn't restructure
it — §5/§9 talk about *content* migration (docs, wiggin scrub, dead-path
purge) but the artifact tree's own top-level shape (`.claude/artifacts/crew/`
vs `.claude/artifacts/loop/`, each with its own `runs/`, `handoffs/`,
`reviews/`, `backlog/`, etc.) survives unexamined. That split exists today
because crew and runner are two plugins writing to two namespaces so they
don't collide. Once there's one plugin (`devcrew`), the two-namespace split
is a fossil of the seam this whole plan exists to remove — carrying it
forward means every future artifact-writing script has to decide "am I a
crew-flavored artifact or a loop-flavored one," a distinction with no
remaining referent.

**Greenfield shape:** collapse to one root, `.claude/artifacts/devcrew/{runs,
handoffs, reviews, validations, deployments, backlog/{pending,triaged,
in-progress,done}, specs, decisions, gepa}/`. **Cost saved:** every
artifact-writer function currently branching on which namespace to target
(and every validator's `LEGACY_ROOTS`-style dual-scan, the same pattern
`doctor.mts` already carries for the `docs/backlog/` vs
`.claude/artifacts/loop/backlog/` split cleanup.md documented) collapses to
one target. **What it risks:** every existing path reference across both
repos' CLAUDE.md, commands, hooks, and scripts needs rewriting, not just
renaming — this is real scope, not free, and should be sized as its own P4
sub-slice (folded into the already-planned config/docs merge) rather than
assumed away.

### C. Backlog-as-moved-files vs. native task tracking — the existing cut is right, don't extend it

`improve-rewrite-today.md` finding 2 correctly scopes the native-Task-tooling
replacement to `auto-dispatch.mts`'s fake dispatch-audit layer — a narrow,
in-session bookkeeping job that never did real work anyway (DEC-011: the
consumer "never shipped"). It would be tempting, on a blank-page pass, to
push this further and ask whether the *entire* backlog state machine — FEAT/
SLICE markdown files physically moved between `pending/`, `triaged/`,
`in-progress/`, `done/` directories — should also become native task
tracking, since this session's own toolset includes `TaskCreate`/
`TaskUpdate`/`TaskList`. **That would be wrong**, and worth stating
explicitly so nobody "fixes" it during the merge the way rewrite-today
finding 9 already warned about the reviewer ladder. Native task primitives
are scoped to the current agent session; the backlog is a durable,
cross-session, weeks-to-months product record with priority scoring, PM
triage frontmatter, and decision-log linkage that has to survive process
restarts, days between sessions, and git history. Nothing in the native task
surface persists that way.

What *should* change on a blank page, though — and this is a real gap
grounded in this repo's own recorded failure history, not a hypothetical —
is the **directory-move-as-state-transition** mechanic itself. runner-
plugin's own `docs/memory.md`-equivalent operational learnings (surfaced in
this session's memory: *"Direct merge strands FEATs in pending — build→PR→
merge skips /runner:close; reconcile pending→done manually"* and *"Run
features via start with guaranteed close — /runner:start alone doesn't
close"*) document a recurring failure class caused specifically by state
being encoded as *which directory a file physically lives in* rather than a
field on the file. Any path that bypasses the ceremony (a direct merge, a
manual move, a crashed session mid-transition) leaves the backlog in an
inconsistent state that nothing detects until someone notices a FEAT sitting
in `pending/` that's actually done. A blank-page design keeps the markdown
files (audit trail, human-readable, git-diffable — genuinely earns its
format) but makes `status:` a frontmatter field in one flat `backlog/`
directory, with tooling filtering by status rather than filesystem location
as the source of truth. This directly removes the failure class the current
design has already produced multiple times, and is a much higher-value
greenfield change than swapping the storage format for something task-tool-
based.

### D. 39 commands — nobody actually ran the blank-page test the brief asked for

The plan disposes every command by *origin* (carry/drop/merge against the
other parent's namesake) but never asks, standalone, "would a fresh design
ship this as its own slash command." This is a real gap: none of the three
review docs touch command-surface design, only content dedup within it. A
few candidates worth a dedicated pass (not resolved here — flagging the
absence, per the brief's ask to go further than the existing reviews):
`runner:status` was already folded into `brief` (§2 shows this reasoning
happening once) — the same question hasn't been asked of, e.g., whether
`triage` needs to be distinct from `intake` (intake already runs "PM scoring
+ architect classification in one call" per this repo's own skill listing;
triage is described as "PM-only... on error, halt" — arguably a mode flag on
intake, not a separate command), or whether `wave` (`plan | run | loop`
subcommands) needs top-level billing distinct from `auto`. Recommend: before
P3 locks the 39-command map, run the same "does this survive a blank-page
test" question §2 already asked of the 7 colliding commands against the
remaining 32 non-colliding ones — cheap, and the plan's own precedent (the
brief-me/status/brief merge) shows it finds real reductions when applied.

---

## Overall verdict: **approve-with-changes**

The plan is a legitimate, well-evidenced piece of work — it correctly
inherited and folded in nearly all of the three source reviews' findings, its
decision record states the rejected alternatives fairly rather than
strawmanning them (demolition-synthesis's own top complaint about v1), and
its grep-verified counts are right far more often than they're wrong. But it
is not yet execution-ready: two of the CRITICAL findings above (the GEPA
disposition gap, the exit-gate/risk-register mismatch) are the kind of thing
that surfaces mid-slice as a stuck builder or a silently-skipped safety
check, not as a clean halt — exactly the failure mode a pre-execution review
exists to catch.

**The 5 changes that matter most, in priority order:**

1. **Name a disposition for all 27 GEPA files, not 9.** This is the one
   finding with a real chance of destroying working code (deleting
   `candidate-generator-aiplugin.ts` by accident) or silently porting broken
   state forward (`champion-provenance-writer.ts` never appearing on the
   delete list despite being diagnosed as broken by name). Fix before P4 is
   built, not during it.
2. **Wire the risk register's three numeric, phase-tagged tripwires (hook
   latency ≤150ms/P3, agent-cap trim/P3, CLAUDE.md ≤12KB/P4) into §9's actual
   Exit gate cells.** Right now they're promises with nowhere to land.
3. **Re-split P1 into P1a (mechanical rename, 391-file footprint) and P1b
   (node:test migration + verification), sized independently** — 5–7 slices
   for the current combined scope undercounts against both the measured
   file footprint and the parent repos' own established slice-granularity
   norms.
4. **Fix the two arithmetic errors in §2** (agent count 27→26 in the layout
   tree; collision row label 6→3 should read 7→3) — small, but both are in
   the part of the document most likely to be trusted verbatim (a directory
   scaffold, a "here's the final count" line) rather than re-derived.
5. **Verify the bun#5090 root-cause story against the actual files before
   locking the P1 exit gate** — the nested-subtest mechanism the plan cites
   doesn't appear in any of the 31 files that trigger the code path it's
   meant to explain; either find where it does appear, or stop calling the
   root cause "identified" in the plan's own language.

None of these require reopening the decision record or the greenfield/port
split that's already settled — they're plan-quality fixes, not plan-shape
disagreements. Recommend the operator require items 1–2 resolved before P4
is built (they're use-time risks, not review-time nitpicks), and 3–5 folded
in at the next plan revision pass.
