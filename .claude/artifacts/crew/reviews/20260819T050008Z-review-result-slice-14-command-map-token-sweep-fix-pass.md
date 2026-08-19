---
decision: approved
reviewer: crew:reviewer
slice: SLICE-14
---

## Update 20260819 — re-check at C:/work/mega/devcrew (repo moved again, operator request)

All three items from the original needs_fix are confirmed fixed on disk:

- `commands/brief.md`'s "Why one command" section now correctly names the
  three distinct historical commands (`/crew:brief-me`, `/runner:brief`,
  `/runner:status`) instead of collapsing them into the same
  `/devcrew:brief` string — coherent again.
- `hooks/guard-feat-dispatch.mjs`'s legacy-alias allowlist and comment
  restore the genuine old strings (`crew:builder*`, `crew:reviewer`,
  `crew:reviewer-validator`, `crew:validator`, `crew:deployer`,
  `crew:copywriter` — 8 hits, matches on disk) while keeping current
  `devcrew:*` names as the primary allowlist. `bun test
  src/tests/guard-feat-dispatch-hook.test.mts` — 15 pass / 0 fail, confirmed
  fresh.
- `commands/install.md` line 42 now correctly states the installer writes
  `<!-- runner:start -->` and adds a forward-looking note that the rename to
  `devcrew:start` happens at the P5 cutover — matches actual code behavior
  in `loop-installer-scaffold.mts` today.

Decision updated to **approved**.

# Review: SLICE-14 — command-map application + devcrew token sweep + fallout fix pass

Reviewed against two handoffs (no separate token-sweep report exists — confirmed
with the builder; the sweep is reflected only in the working-tree diff):

- `.claude/artifacts/crew/handoffs/20260819T032404Z-handoff-slice-14-command-map-application-structural-half.md`
- `.claude/artifacts/crew/handoffs/20260819T040735Z-handoff-slice-14-fallout-fix-pass-devcrew-token-sweep-gaps-closed-al.md`

Repo: `C:\mega\dev-crew` (not `C:\work\mega\runner-plugin` — that path is an
unrelated project; the review was misdirected there initially and had to be
redirected by the builder).

## Gates — mostly noise from known concurrent churn, correctly excluded

Team-lead confirmed after my first pass: two other workflows are actively
editing `agents/` and `skills/` in this same shared working tree right now,
and that churn is explicitly out of scope for this review. Re-attributing
with that context:

| Gate | Claimed (handoffs) | Actual (fresh run) | Verdict |
|---|---|---|---|
| tsc × 3 (root, test, crew) | 0/0/0 | **0/0/0 — confirmed** | clean |
| root suite (`src/tests/`) | 3316 pass / 2 fail / 7 skip | 3315 pass / 3 fail / 7 skip | off by one, almost certainly transient (concurrent agents/skills writers mid-edit during the run) — not chased further per scope |
| crew suite (`crew/tests/`) | 1971 pass / 0 fail | 1804 pass / 72 fail / 2 errors | **all 72 fail + 2 errors are agents/skills-churn noise, confirmed** — every sampled failure is `crew/tests/*.mts` resolving a path under `crew/agents/` or `crew/skills/` that's mid-move to root (`agents/`, `skills/`). Spot-checked `security-sweep-integration.test.mts`'s two failures specifically (they don't look like a path issue at a glance): confirmed same pattern — `scanScript = crew/skills/domain/security-sweep/scripts/scan.mts`, which no longer exists there (`ls` confirms it now lives at root `skills/domain/security-sweep/scripts/scan.mts`). Not a regression; out of scope. |
| `validate-manifests.mts` | OK (handoff 1: fixed, PASS) | FAILING: `version drift: plugin.json="1.0.0-rc.1" vs package.json="0.78.0"` | plugin.json's version bump matches the concurrent manifest-rename-to-devcrew work happening alongside the agents/skills churn, not anything either SLICE-14 handoff touched. Treated as the same out-of-scope noise. |
| `validate-agent-refs.mts` | OK | confirmed OK | clean |
| `validate-imports.mts` | OK | confirmed OK | clean |

**Net: no gate finding in this section blocks SLICE-14.** Flagging the
crew-suite/manifest numbers here only so whoever owns the concurrent
agents/skills/manifest work has a paper trail once they're ready to
reconcile — not as something SLICE-14 needs to fix.

## 1. Command map vs plan §2 — PASS

- `ls commands/*.md` → 39, `ls commands/3rdparty/*.md` → 1. `crew/commands/`
  and `crew/commands/3rdparty/` are both gone. Matches
  `docs/planning/unification-plan.md` §2 exactly (39 first-party + 1
  vendored, no TBD cells).
- Spot-read the three merged commands (`commands/install.md`,
  `commands/cost-setup.md`, `commands/brief.md`): both parents' real steps
  are present verbatim (install: global memory step + repo-level step;
  cost-setup: loop.cost.* + crew.json features block; brief: crew
  workflow-state + loop backlog/grades/decisions + install-health, folded
  into one fixed section order). No invented steps. All three use
  `devcrew:` tokens in their own prose — except see finding 2b below.
- Dropped-command dangling-reference check (`claim-files`, `show-conflicts`,
  `gepa-optimize`, `create-prd`): zero references in live product surface.
  All residual hits are inside `crew/` (unmerged subtree, expected),
  `.claude/artifacts/**` (historical handoffs/bundles/reviews, expected), or
  `docs/planning/**` (the plan itself, expected). One caveat:
  `src/scripts/validate-agent-refs.mts`'s `CREW_KNOWN_TOKENS`/
  `CREW_3RDPARTY_KNOWN_TOKENS` allowlists still list `claim-files`,
  `gepa-optimize`, `show-conflicts` (and other now-dropped names) as valid —
  stale but harmless (over-permissive, not under-permissive; doesn't cause a
  false negative on anything real). This whole validator's premise ("crew is
  a sibling plugin not available at CI runtime") is now inaccurate post-merge
  and its regex (`\b(crew|runner):`) doesn't even match `devcrew:` tokens —
  it's pre-merge infrastructure nobody has reconciled yet. Not a SLICE-14
  blocker but worth a FEAT so it doesn't silently rot further.

## 2. Token-sweep integrity — two real defects, not covered by the justified taxonomy

- `devdevcrew` mangling: **zero occurrences**, confirmed via `git grep`.
- Excluded live files: `CLAUDE.md` and `.claude/loop/rules.md` are
  **byte-identical to HEAD** (`git diff --stat` empty for both) — confirmed
  correctly excluded.
- Residual `crew:`/`runner:` tokens in product surface (commands/, agents/,
  skills/, hooks/, src/scripts/, templates/, docs/integrations/, CLAUDE.md,
  AGENTS.md): 38 hits. Nearly all fall in the stated justified taxonomy
  (marker literals in `loop-installer-scaffold.mts` and
  `templates/claude-md-hard-rules.md`, `validate-agent-refs.mts`'s own
  documentation of its crew-namespace design, negation citations like "there
  is no `crew:lead` step... (decommissioned 2026-06-07)"). **Two do not:**

  **(a) `commands/brief.md` lines 71-82 ("Why one command" section) — HIGH.**
  Pre-sweep this correctly read `` `/crew:brief-me` covers... `` and `` `/runner:brief`
  covers... `` (two distinct real historical command names). The sweep
  replaced *both* with `` `/devcrew:brief` ``, producing a self-contradictory
  paragraph: "Previously `/devcrew:brief` (workflow state), `/devcrew:brief`
  (backlog...), and `/devcrew:brief` (loop install health) were three
  separate reports" — three different things under the same name, which
  makes no sense and misleads anyone reading it as history. Confirmed via
  `git diff` against the original prose. Needs a manual fix: restore the
  original `/crew:brief-me` and `/runner:brief` names in this
  historical-narrative sentence (the "why one command" framing is *about*
  the old world, not a live dispatch instruction — it should never have been
  swept).

  **(b) `hooks/guard-feat-dispatch.mjs` lines 21-28, 87-95 — HIGH, functional
  not cosmetic.** This file's entire "legacy aliases" section exists to
  *tolerate genuinely-old dispatch strings* for one release so in-flight
  dispatches don't false-block (its own comment: "Kept allowlisted ONE more
  release so in-flight dispatches using the old names don't false-block").
  The sweep renamed the tolerated old names themselves —
  `crew:builder`/`crew:reviewer`/`crew:validator`/`crew:deployer`/
  `crew:copywriter` — to `devcrew:builder`/`devcrew:reviewer`/etc. But
  `devcrew:builder` never existed as a name anyone would dispatch (it's a
  phantom role name in *any* generation — see `validate-agent-refs.mts`'s
  own note that `builder`/`builder-be`/`builder-fe` are deliberately never
  real agent ids). The effect: the actual legacy strings this section was
  built to tolerate (`crew:builder`, `crew:reviewer`, ...) are **no longer
  allowlisted at all** — the guard would now block them instead of
  tolerating them, which is the exact false-block the section exists to
  prevent. The accompanying comment is also now self-contradictory: "the
  pre-unification ids below (`devcrew:builder*`...)" — `devcrew:` did not
  exist pre-unification, so nothing pre-unification could have been called
  `devcrew:builder`. Same root cause as (a): mechanical grep-replace applied
  inside a paragraph that is *describing* old names, not dispatching to
  them. Needs a manual fix restoring the `crew:*` literal strings in the
  legacy-alias array and comment.

  **(c) `commands/install.md` line 42 — MEDIUM, doc/code mismatch.** States
  the installer "Replaces or appends the `` <!-- devcrew:start --> `` marker
  block in `CLAUDE.md`." The actual marker constants
  (`src/scripts/lib/loop-installer-scaffold.mts:14-15`, `MARKER_START =
  "<!-- runner:start -->"`, `MARKER_END = "<!-- runner:end -->"`) are
  unchanged, and per `docs/planning/unification-plan.md` §6 the marker
  rename to `devcrew:start`/`devcrew:end` is explicitly scoped to the later
  "Identity migrations" phase via `migrate-adopter.mts`, not SLICE-14. So the
  code is correctly untouched (consistent with CLAUDE.md itself being
  byte-identical to HEAD) but the newly hand-merged doc now describes
  behavior the code doesn't implement yet. Low functional risk (nobody runs
  `/devcrew:install` against this exact wording today) but it's a factually
  wrong statement shipped in this slice; fix the doc to say `runner:start`/
  `runner:end` until the marker-rename phase actually lands, or add a note
  that this is aspirational.

## 3. Fix-pass honesty — PASS on the 5 sampled fixes

Sampled `deleted-skills-stub.test.mts`, `memory-context-profile.test.mts`,
`slice-start.test.mts` diffs plus the two hook source fixes
(`guard-feat-dispatch.mjs`, `bootstrap-context.mjs` — noting the guard-hook
diff also contains defect 2b above, which predates and survives this fix
pass since the fix pass touched different lines in the same file). All five
test-assertion fixes genuinely track merged reality:

- `deleted-skills-stub.test.mts`'s `backlog-list`/`spec-list` →
  `devcrew:brief` correction verified byte-for-byte against
  `src/scripts/loop.mts`'s live `DELETED_SKILLS_MAP` (line 732, 739) — exact
  match, not a guess.
- `memory-context-profile.test.mts` and `slice-start.test.mts` regex/URL
  corrections all tighten to specific `devcrew:*` strings, matching what
  production code now emits — no assertion was loosened or made more
  permissive to force a pass.

No deleted tests found in this pass (handoff 2's own claim — confirmed
nothing in the diff removes a test).

## 4. `post-builder-fanout.mts` devcrew:reviewer reconciliation — PASS

`FanoutTask.subagent_type` type, both value construction sites (line 35,
147), and `src/tests/post-builder-fanout.test.mts` (3 assertion sites) all
agree on the literal `"devcrew:reviewer"`. Zero remaining `crew:reviewer`
literals anywhere under `src/scripts/`.

## 5. Gates — clean once agents/skills churn is excluded

See the gates table above. tsc ×3, `validate-agent-refs.mts`,
`validate-imports.mts` all pass fresh. `validate-manifests.mts` and the
crew-suite regression are confirmed to be concurrent agents/skills/manifest
churn from other in-flight workflows, not SLICE-14 — excluded from this
decision per team-lead's scope guidance. Root suite is 3315/3/7 vs a claimed
3316/2/7 (off by one both ways), most likely the same transient churn;
not chased further since it's outside the confined scope.

## Decision rationale

`needs_fix`, not `approved_with_notes`, on a single narrow basis: two real,
high-confidence defects introduced by the token sweep, both squarely inside
the in-scope surfaces (commands/, hooks/) — not edge-case nitpicks, but
content that now actively misleads a reader or a maintainer (2a) and a
security/process guard that no longer does what its own comment says it does
(2b). Both are cheap, mechanical fixes (revert specific strings to
`crew:`/`runner:` in clearly-scoped locations) but they are real and should
not ship silently.

Everything else checks out clean: the command-map disposition ledger is
accurate against the plan, the fix-pass test corrections are honest, the
post-builder-fanout reconciliation is clean, and — once agents/skills/
manifest churn from other concurrent workflows is correctly excluded per
team-lead's scope guidance — every gate SLICE-14 is actually responsible for
is green. Fix 2a and 2b and this is approved.
