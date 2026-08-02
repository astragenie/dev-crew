# Context-diet baseline measurement + revised plan (2026-08-02)

Baseline/plan spike for **FEAT-272** (SLICE-170). Read-only measurement —
no product code or `CLAUDE.md`/`AGENTS.md`/`.claude/loop/rules.md` edits in
this slice.

## TL;DR

FEAT-272 was drafted against a 553-line/29.7KB `CLAUDE.md`. Between drafting
and this spike, an unrelated restructure (commit `089194a8`, PR #552,
"docs: rebuild agentic instruction layer") already landed on `main` and cut
`CLAUDE.md` to 278 lines/13.7KB by splitting it into a four-altitude model
(`AGENTS.md` / `CLAUDE.md` / `docs/memory.md` / `docs/README.md`). **That
restructure is exactly the mechanism SLICE-171 was scoped to build** — it
already shipped. `rules.md` (SLICE-172's target) is untouched: byte-identical
before and after #552.

The bigger finding: even fully summing everything in the `CLAUDE.md` →
`AGENTS.md` → `loop-snapshot.md` auto-load chain, the total is ~21.6KB
(~5.4k tokens at a 4-char/token estimate) — nowhere near the ~203k
tokens/message the FEAT cites as the static tax. That figure almost
certainly is dominated by cost outside this repo's control: the Claude Code
tool/skill manifest (every installed plugin's skills + every MCP server's
full tool schemas) and growing conversation history, not repo `CLAUDE.md`
content. See "Reconciling the 203k figure" below. This materially changes
the payoff calculus for the remaining slices.

## 1. What already shipped (PR #552 / commit `089194a8`)

Verified directly against this worktree's git history (parent commit
`f0ec093d`, i.e. immediately before the restructure):

| File | Before (554/553-line era) | After (current, this worktree) | Delta |
|---|---|---|---|
| `CLAUDE.md` | 553 lines / 30,447 bytes (29.7KB) | 278 lines / 14,017 bytes (13.7KB) | **-49.7% lines / -54.0% bytes** |
| `.claude/loop/rules.md` | 248 lines / 20,393 bytes (19.9KB) | 248 lines / 20,393 bytes (19.9KB, byte-identical) | **0% — untouched** |
| `AGENTS.md` | did not exist | 89 lines / 4,734 bytes | new file, now `@`-included from `CLAUDE.md` |
| `docs/memory.md` | did not exist | 175 lines / 9,920 bytes | new file, **plain-link only, not auto-loaded** |
| `docs/ci-gates.md` | did not exist | 97 lines / 6,208 bytes | new file, **plain-link only, not auto-loaded** |

The commit message for `089194a8` states the restructure was verified with a
full validator run and complete test suite (3079 pass / 0 fail) both before
and after, and explicitly preserved the two machine-read contracts this repo
depends on: the `<!-- clause: X -->` id registry consumed by
`validate-decline-citations.mts`, and the `## CI gates` numbered-list count
consumed by `generate-metrics-band.mts`. Both were spot-checked again in
this spike (§4) and are still intact.

## 2. What's actually auto-injected today vs. read-on-demand

This distinction matters more than raw file size: only content pulled in via
Claude Code's `@file` import syntax is loaded into every session's context
automatically (and therefore taxes every message via cache-read for the rest
of the session). Plain markdown links/paths are read on demand via an
explicit tool call — a one-time cost when an agent actually opens them, not
a standing tax.

**Auto-loaded at session start (the `CLAUDE.md` chain):**

- `CLAUDE.md` itself — 14,017 bytes, containing two `@`-import lines
- `@AGENTS.md` (line 3) — substituted inline, +4,734 bytes
- `@.claude/artifacts/loop/loop-snapshot.md` (last line) — substituted
  inline, +2,860 bytes (71 lines)

Net auto-loaded total ≈ **21.6KB** (14,017 + 4,734 + 2,860 − ~50 bytes for
the two import-directive lines they replace).

Compare to the pre-restructure baseline: `CLAUDE.md` (30,447 bytes) + the
same `@loop-snapshot.md` include (comparable size, ~2.8KB) ≈ **~33.3KB**.

**Net reduction already achieved by #552: ~33.3KB → ~21.6KB, ≈ -35%.**

**Not auto-loaded — read on demand only:**

- `docs/memory.md` (9,920 bytes) — referenced only via prose pointers from
  `CLAUDE.md`'s clause sections ("Detail: `docs/memory.md` § ...").
- `docs/ci-gates.md` (6,208 bytes) — referenced the same way from the CI
  gates clause.
- `.claude/loop/rules.md` (20,393 bytes) — referenced only via prose
  ("Full rules: `.claude/loop/rules.md`") in the installer-owned
  `<!-- runner:start -->` block. Confirmed via `grep -rn "@\.claude/loop/rules"`
  across the repo: the only match is an unrelated historical spec file, not
  a live `@`-import anywhere.

`rules.md` is not part of the automatic per-session injection the way
`CLAUDE.md`/`AGENTS.md`/the snapshot are — but the Autonomous Loop HARD RULE
block instructs "First action... read `.claude/loop/rules.md`", so in
practice almost every loop session reads it near the start anyway, after
which it sits in conversation history and is re-sent (cache-read) for the
rest of that session just like an `@`-import would be. **This is why
SLICE-172 (trim `rules.md`) is still fully warranted** even though it isn't
a literal `@`-include — see §5.

## 3. Reconciling the ~203k-tokens/message figure

At a rough 4-characters-per-token estimate for markdown/prose:

- Old CLAUDE.md-chain auto-load (~33.3KB) ≈ **~8.3k tokens**
- New CLAUDE.md-chain auto-load (~21.6KB) ≈ **~5.4k tokens**
- `rules.md`, if read once early in a session (~20.4KB) ≈ **~5.1k tokens**

Even generously summing CLAUDE.md + AGENTS.md + snapshot + a full rules.md
read, that's roughly **10-13k tokens** — against a cited ~203k
tokens/message figure. That's a >15x gap this spike cannot attribute to
anything under this FEAT's control. The far more plausible dominant
contributor, visible directly in this very session's own system-reminder
overhead, is:

- the full Claude Code tool/skill manifest — every installed plugin's skill
  descriptions (this session alone lists 100+ skills across azure, clerk,
  gstack, crew, runner, caveman, plugin-dev, superpowers, dataviz, and
  more) plus every MCP server's full tool-call JSON schemas (github, azure,
  playwright, astramem, context7 — collectively hundreds of tool
  definitions)
- the user's global `~/.claude/CLAUDE.md` chain (`crew/constitution.md` +
  `crew/workflow.md`), which is orthogonal to this repo's own `CLAUDE.md`
- ordinary conversation-history growth over a long session

None of these are addressable by trimming this repo's `CLAUDE.md` or
`rules.md` — they are a function of which plugins/MCP servers the *user*
has installed and how long the *session* runs, not of repo doc structure.
**This is the key finding for re-scoping SLICE-171/172/173**: the
CLAUDE.md-diet work is real and worth finishing, but it is a small,
bounded slice of the originally-cited cost problem, not the majority
driver. The FEAT's framing ("~97% of USD is Opus cache reads") is still
true and still worth addressing, but the fix for the bulk of it is a
model/session/plugin-footprint lever, not a docs-restructure lever — worth
flagging back to whoever owns the cost-hygiene program as a follow-on, out
of scope for this FEAT.

## 4. Live CI-gate check against current HEAD (informs SLICE-173 / AC-2)

All three named gates in FEAT-272 run standalone under Bun with no
`node_modules` install required (confirmed — this worktree has none). Ran
all three against current HEAD:

| Gate | Result | Cause |
|---|---|---|
| `validate-org-refs.mts` | **FAIL** | One stale `sergeymilashico` reference in `docs/research/2026-08-02-citylive-zero-cost-telemetry.md:80` — last touched by an unrelated commit (`66e998cc`), not by the CLAUDE.md restructure or anything in this FEAT's scope. |
| `validate-snapshot-freshness.mts` | **FAIL** | `loop-snapshot.md` is stale relative to current backlog state — expected, since 10 backlog-touching commits have landed since `089194a8` (this is the wave-mode run in progress). Standard "regen after backlog changes" drift, same pattern already documented in this session's memory as routine. |
| `generate-metrics-band.mts --check` | **FAIL** | README metrics band stale for the same reason (backlog/grade counts moved since `089194a8`). |
| `validate-content-length.mts` (bonus, not one of the 3 named gates but cheap to run) | **PASS** | agents/skills within caps. |

**None of these three failures are caused by the CLAUDE.md restructure.**
The commit message for `089194a8` states the full validator suite + test
suite passed both before and after that change; the failures observed here
trace to *later, unrelated* commits (a different docs file's org-ref, and
ordinary backlog churn from concurrent wave-mode slices). Manually
re-verified the two machine-read contracts the restructure needed to
preserve:

- `CLAUDE.md`'s `## CI gates` numbered list: 18 items, exactly matching
  `docs/ci-gates.md`'s 18-item numbering (order and count in sync).
- `<!-- clause: X -->` markers: present and unchanged in shape (11 clause
  ids under `## ` headings), matching what `docs/memory.md`'s "Load-bearing
  CLAUDE.md contracts" section documents as depended-on.

## 5. Revised recommendation per remaining slice

- **SLICE-171 ("Restructure CLAUDE.md to <100-line index + skill-gated
  docs")** — **re-scope, do not close-as-superseded outright.** The
  mechanism (index + delegate detail to `AGENTS.md`/`docs/memory.md`/
  `docs/ci-gates.md`) already shipped in #552 and got `CLAUDE.md` to 278
  lines. The literal "<100 lines" AC-1 bar is not yet met, but most of the
  remaining 278 lines are machine-load-bearing (the 18-line CI-gate list
  that `generate-metrics-band.mts` counts, the 11 `<!-- clause: X -->`
  markers `validate-decline-citations.mts` depends on, and the
  installer-owned `<!-- runner:start -->` HARD-RULES block) — compressing
  further risks breaking those three live contracts for a cosmetic line-count
  win. Recommend rescoping AC-1 to something like "<150 lines, remainder
  documented as machine-read contract lines that cannot move without a
  coordinated script change" rather than a hard <100, and sizing the
  remaining work as a light trim (further tightening "Ecosystem canon" /
  "Decisions not to relitigate" prose) rather than the original 2-point
  full-restructure estimate.
- **SLICE-172 ("Trim `.claude/loop/rules.md` similarly")** — **keep as
  scoped, not superseded.** Confirmed byte-identical before/after #552 —
  zero work has been done here. This is real, valuable remaining work: the
  file's 249 lines carry a lot of prose/tables/code-block rationale (Auto
  Mode gating table, Worktree Parallelism setup steps, Review Dispatch
  Budget examples) that could move to a `docs/*.md` detail file using the
  exact index+delegate pattern just proven on `CLAUDE.md`, leaving crisp
  imperative HARD RULE statements in `rules.md` itself. Bonus finding worth
  folding in: `rules.md`'s "First Action" and "Cross-Slice Continuation"
  sections still reference stale pre-migration paths (`docs/ai-loop/`,
  `docs/backlog/pending/`) that `docs/memory.md`'s "Known path drift"
  section already flags as unfixed, installer-owned drift — SLICE-172
  should either fix this while it's already touching the file or explicitly
  carry the drift forward with a note, not silently re-ship stale paths in
  the trimmed version.
- **SLICE-173 ("Reconcile the 3 named CI gates + record before/after byte
  measurements")** — **re-scope down substantially, most of the
  "reconcile" half is moot.** All three named gates were live-tested in
  §4: none fail because of the restructure. What remains is much smaller
  than a 2-point slice: (a) a routine regen-and-verify pass
  (`snapshot-memory` + `generate-metrics-band --write`) at whichever
  slice actually closes last in this FEAT — ordinary chore work, not novel
  engineering; (b) the before/after byte counts are already captured in §1
  of this doc and copied into FEAT-272's notes below, so SLICE-173 doesn't
  need to re-derive them; (c) optionally fix the one unrelated org-refs
  citation drift as a courtesy since it's blocking a gate this FEAT cares
  about, though it's arguably outside this FEAT's own scope — flag for
  operator/PM call rather than assume it's in-bounds. Recommend folding
  what's left into SLICE-172's close rather than running a standalone
  slice for it.

## 6. Caveats

- Token estimates use a rough 4-chars/token heuristic for markdown/prose;
  no direct access to Claude Code's internal system-prompt token accounting
  from this environment. The qualitative conclusion (CLAUDE.md-chain is a
  small fraction of 203k) is robust to reasonable variation in that ratio —
  even at 2 chars/token the CLAUDE.md chain would be ~10k tokens, still an
  order of magnitude below 203k.
- This spike did not run the full `bun test` suite or `bunx biome`
  (no `node_modules` in this worktree, consistent with a docs-only wave
  dispatch) — the 3 named gates and `validate-content-length` run standalone
  under Bun with zero dependencies and were exercised directly.
- The org-refs/snapshot-freshness/metrics-band failures observed at HEAD are
  a live-repo snapshot as of this spike (2026-08-02) and will drift further
  as the current wave's other slices land; re-run before actually closing
  SLICE-173 or any FEAT-272 sibling.
