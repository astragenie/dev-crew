---
slice: SLICE-208
feature: FEAT-296
reviewer: independent-review-agent
decision: approved_with_notes
commit: 19c0fbd0
branch: main-SLICE-208
worktree: C:\work\mega\runner-plugin-SLICE-208-0
date: 2026-08-06
---

# Review: SLICE-208 — reconcile slice-state drift + directory/status validator

## Gates (independently re-confirmed by lead; not re-run here per instruction)

Test/typecheck/lint/format and the new validator's live run were pre-confirmed
by the dispatching lead (3303/3303 pass, typecheck clean, biome clean,
`Scanned 215 slice files; 0 errors`). This review focuses on the four
priority questions.

## 1. SLICE-118 verdict — verified sound, no data loss

Confirmed the full timeline independently:

- `09a66512` (2026-06-13 08:02) created the `completed/` copy as a
  self-contained ceremony commit: grade, cost report/advise, final-synthesis
  ×2, handoff, FEAT-128 `triaged→done`, and the SLICE-118 file itself — 13
  files, one coherent commit.
- `8f55937c` (2026-06-13 08:54, 52 min later) is a "session cleanup" commit
  that bundles the SLICE-118 `pending/` copy back in alongside SLICE-118 and
  SLICE-119 review/validation artifacts, a plan file, a shape-marker, a
  worktrees.jsonl update, and an unrelated `agents/*.md` YAML-format fix
  across 8 files. This is exactly the shape of a batch sweep of stray
  working-tree files, not a deliberate re-filing — confirms the builder's
  narrative.
- Diffed both copies' full content. The `pending/` copy is a pre-ceremony
  design draft (Design rationale, CLI usage examples, unchecked ACs incl.
  AC-12, and a **stale `github_url` pointing at the pre-transfer
  `sergeymilashico/loop` org** — keeping it would itself have been an
  authored-surface problem, though `.claude/artifacts/**` is excluded from
  `validate-org-refs.mts`'s scan so it wouldn't have failed CI). The
  `completed/` copy is the terminal ceremony summary.
- Checked every artifact the shipped work claims: `paused-for-external-event.mts`
  and its test both exist on disk; `docs/halt-badges.md` has the
  `snapshot.pausedForExternalEvent` entry; `CHANGELOG.md` has the v0.44.0
  entry; and AC-12's specific reasons-string format
  (`paused_for_external_event: <reason> (paused at <pausedAt>)`) is
  implemented verbatim at `stop-conditions.mts:240`.

Nothing unique to the deleted `pending/` copy is actually lost — it's
non-normative prose (design rationale, usage examples) fully superseded by
the shipped module, plus a stale org link better off gone. **Verdict: sound.**

## 2. The three moves — sound outcome, one overstated precedent claim

Confirmed all three are pure `git mv` (0 insertions/deletions in the diff
stat) — no content was rewritten during relocation.

- SLICE-128 / SLICE-130 (`status: done`) → `completed/`: genuine pre-existing
  precedent confirmed. At parent commit `12def791` (before this slice),
  `completed/` already held SLICE-131 and SLICE-132 with `status: done`.
  This is not a new policy, just applying an existing one.
- SLICE-55 (`status: superseded`) → `completed/`: the commit message frames
  this as following "existing precedent," but that's overstated. I confirmed
  SLICE-55 is the **only** slice anywhere in this tree ever filed with
  `status: superseded` — there is no prior superseded-in-`completed/` case to
  follow; this commit is the one setting that precedent, not matching one.
  The cited backlog-side analogy (FEAT-102) also doesn't literally match:
  FEAT-102.md's frontmatter status is `done`, not `superseded` — so the real
  backlog precedent is "superseded-in-substance work gets filed as `done`,"
  not "a literal `status: superseded` value lives in a terminal directory."
  The outcome is still reasonable — no `superseded/` directory exists, and
  relocating without rewriting frontmatter is a defensible minimal-diff
  choice that stops `pending/` from overcounting open work — but the commit
  message should have said "no precedent exists, so we're establishing one"
  rather than implying continuity. Non-blocking.

Confirmed the new validator does not flag any of the three: `DIR_STATUS_RULES.completed`
is an **explicit enumerated allowlist** of exactly three values (`completed`,
`done`, `superseded`), not an "any terminal status" wildcard — a future bogus
status filed in `completed/` would still fail. That answers the "is the rule
defensible or just permissive" question: it's defensible because it's
enumerated, even though the `superseded` entry in that enum is new policy
rather than codified pre-existing convention.

## 3. Validator correctness — both required behaviors independently confirmed

Read `validate-slice-state-consistency.mts` in full. Condition (a)
(`checkDuplicates`) groups by id, builds a `Set` of distinct `dir` values per
id, and only flags when `distinctDirs.size >= 2` — genuinely scoped to
cross-directory placement, not raw same-id file count.

Verified against the real tree, not just the test suite:

- `SLICE-115` appears 4× and `SLICE-117` appears 4× — checked all 8 files
  directly: all four `SLICE-115` copies live in `completed/` only (frontmatter
  `id: SLICE-115` confirmed in each), all four `SLICE-117` copies live in
  `pending/` only. Both are same-directory collisions (the tracked FEAT-298
  defect) and neither trips condition (a) — confirmed live (`0 errors`) and
  by direct inspection of `dir` values.
- True cross-directory duplication is exercised by
  `validate-slice-state-consistency.test.mts:53-67` and was exercised for
  real by the actual pre-reconciliation SLICE-118 case this slice just fixed.

Both behaviors hold, not just the passing aggregate run.

## 4. CI gate renumber — CLAUDE.md consistent, but `docs/ci-gates.md` was missed

CLAUDE.md's own numbered list: clean 12→19 renumber confirmed via diff, no
gaps or duplicate numbers. README metrics band regenerated correctly (18→19)
— confirmed `generate-metrics-band.mts` counts CLAUDE.md's `## CI gates` list
programmatically (not `docs/ci-gates.md`), so the "19" figure is accurate
regardless of the issue below. Confirmed no hand-edit inside the
`<!-- runner:start -->`/`<!-- runner:end -->` marker block (diff touches only
the numbered-gate lines).

**Real gap: `docs/ci-gates.md` was not updated in this commit at all.**
CLAUDE.md's own CI-gates section says numbering "must stay in sync" with
`docs/ci-gates.md`, and `docs/ci-gates.md`'s header is more explicit still:
*"the count and order there must stay in sync with this file's numbering. If
a gate is added, removed, or reordered, update both files in the same
change."* This slice added a gate and updated only CLAUDE.md. Consequence:
`docs/ci-gates.md`'s gate 12 is still `bun test` (CLAUDE.md's gate 13 now),
gates 12-18 there are all off-by-one against CLAUDE.md's 13-19, and the new
validator has **no rationale entry anywhere in `docs/ci-gates.md`**.

This isn't hypothetical drift — two live authored files cite the old
numbering by pointing at `docs/ci-gates.md` gate 14 for `validate-org-refs.mts`
(`docs/memory.md:175` and `.claude/crew/plugin-marketplace.md:10`). Both are
still internally correct *within `ci-gates.md`'s own (now-stale) frame*, but
that gate is CLAUDE.md gate 15 as of this commit — so the two frames now
silently disagree. No CI gate enforces this sync (it's a documentation
contract, not a script), so nothing is functionally broken and the slice's
own AC-4 (wire into CLAUDE.md's list) is satisfied — but the review's ask was
explicitly to check for exactly this, and it's real.

## Recommendation

Fix before/shortly after merge: update `docs/ci-gates.md`'s numbered list
(add the gate-12 rationale entry for the new validator, renumber 12→18 to
13→19) to match CLAUDE.md, per that file's own stated contract. Not a
merge-blocker — no functional break, no AC violation — but it's a self-
documented sync rule the commit broke without noting it.

## Minor (non-blocking, already flagged by lead)

Commit message attributes the id-collision defect to FEAT-257; FEAT-257/
DEC-079 is the allocation-side fix, the collision backlog item is FEAT-298.
Doesn't affect the scoping decision's substance.

## Decision: `approved_with_notes`

Core reconciliation work (SLICE-118 deletion, three moves, new validator) is
correct, evidence-backed, and independently re-verified against the live
tree rather than taken on the commit message's word. The one real miss is
`docs/ci-gates.md` falling out of sync with its own documented contract —
worth a fast follow-up, not a blocker.
