---
slice: SLICE-08
feature: FEAT-002
title: Wiggin -> dev-crew branding scrub (27 files)
decision: PASS
reviewed_at: 2026-08-19T00:45:00Z
reviewer: independent-review-agent
---

# Review result — SLICE-08 Wiggin -> dev-crew branding scrub

## Decision: PASS

## Scope reviewed

27-file (+2 renames) uncommitted scrub of "Wiggin"/"Wiggin Loop" branding to
"dev-crew method" wording across root docs, `commands/`, `templates/`, the
`.claude` loop-control scaffold + its `docs/ai-loop` mirror, installer source
(`loop-installer-scaffold.mts`, `loop-installer-tokens.mts`,
`score-inference.mts`), and two test files. Two filename renames
(`templates/wiggin-loop.md` -> `dev-crew-method.md`,
`.../WIGGIN_LOOP.md` -> `DEV_CREW_METHOD.md`, applied to both the
`.claude/artifacts` and `docs/ai-loop` copies = 3 `git mv` pairs total).

## Findings

1. **Coverage — PASS.** Re-ran `grep -rli wiggin . --exclude-dir=node_modules
   --exclude-dir=.git` fresh: 28 hits today (handoff claimed 24 at write
   time; the delta is explained by session artifacts the ceremony itself
   generated afterward — this review's own dispatch handoff, a run-brief, a
   plan file, and a trajectory log, all under `.claude/artifacts/**`).
   Filtered every hit against the four documented buckets
   (`.claude/artifacts/**`, `.claude/state/**`, `crew/**`,
   `docs/parents/**` + `docs/planning/**`) with
   `grep -vE '^\./(\.claude/artifacts/|\.claude/state/|crew/|docs/parents/|docs/planning/)'`
   — **zero hits outside the four buckets**. Spot-checked the bucket-1 items
   that looked most likely to be stray misses (`SLICE_09`/`SLICE_10` pending
   slice files, `FEAT-002.md`, `FEAT-005.md`, `.claude/state/crew/workflow-state.json`)
   — all are self-referential backlog/spec prose describing the scrub
   program itself (AC text citing the `grep -rli wiggin` gate, slice titles,
   a `next` handoff pointer), not missed rebrand targets.

2. **Meaning preservation — PASS.** Sampled 8 files: `CLAUDE.md`, `README.md`,
   `templates/dev-crew-method.md` (byte-diffed against
   `git show HEAD:templates/wiggin-loop.md` — only the two name mentions
   changed, the other 121 lines are identical), `docs/ai-loop/00-entry/MASTER_PROMPT.md`,
   `src/scripts/lib/loop-installer-scaffold.mts`,
   `src/scripts/lib/score-inference.mts`, and
   `docs/prompts/2026-07-02-architecture-retrospective-prompt.md`. Every
   replacement is grammatical and meaning-identical
   ("Wiggin Loop methodology" -> "dev-crew method",
   "the Wiggin loop is..." -> "The dev-crew method is..."). No content
   deleted beyond the name. Code-file changes are confined to a string
   literal (`"wiggin-loop.md"` -> `"dev-crew-method.md"`, matching target
   path) and a code comment — no logic touched.

3. **Rename integrity — PASS.** 3 `git mv` pairs staged and confirmed via
   `git status --short | grep '^R'`. `grep -rli "wiggin-loop\.md"` and
   `grep -rli "WIGGIN_LOOP\.md"` both return zero hits outside the four
   exclusion buckets — no stray old-filename references anywhere in live
   product surface. `bun test src/tests/loop-installer.test.mts` standalone:
   **24/24 pass**, installer scaffold code and its test agree on
   `dev-crew-method.md`/`DEV_CREW_METHOD.md`.

4. **Gates reproduce — PASS.** `validate-manifests.mts` and
   `validate-content-length.mts` both green. Full suite
   (`bun test src/tests/ --parallel --timeout 60000`), run twice
   independently (once truncated for a live read, once to an unfiltered
   file to inspect failure detail): **3310 pass / 7 skip / 2 fail** both
   times, matching the claimed baseline exactly. Confirmed by name, not
   just count: the 2 failures are `DEC-070 contract record exists for
   FEAT-229` (`learning-cycle.test.mts`) and `DEC-068 contract record
   exists for FEAT-222` (`eval-generator.test.mts`), both `ENOENT` on
   fixture lookups — pre-existing, self-referential decision-log contract
   drift, unrelated to this scrub (same two tests already carried as known
   failures in the SLICE-07 review).

5. **Judgment check — CLAUDE.md's history note wording — assessed
   acceptable, not a defect.** `CLAUDE.md`'s two "formerly branded" /
   "Naming" sentences were rewritten to "formerly branded under a different
   working name" / "the prior working-name branding is retired", removing
   the literal old name to reach grep-zero. This is a genuine prose rewrite,
   not grep-dodging markup trickery (no zero-width chars, no split
   spelling) — confirmed by reading the raw diff. On whether losing the
   literal name from CLAUDE.md harms future archaeology: **no** — the name
   is fully preserved verbatim in `docs/planning/unification-plan.md`
   (an explicitly-excluded, git-tracked archive: "Wiggin scrub", "Rename
   `wiggin-loop.md` -> `dev-crew-method.md`", the P1 exit-gate row, etc.,
   confirmed by direct grep) and in git history/blame on this very commit.
   CLAUDE.md's "Ground rules" section is live operating guidance every
   session reads verbatim on every start; carrying a deprecated brand
   mention forward there in perpetuity is exactly the drift this program
   exists to remove, and CLAUDE.md's own text already says not to carry the
   name into docs/templates/prompts/command text — leaving it in CLAUDE.md
   itself while forbidding it everywhere else would be inconsistent. FEAT-002's
   own AC-2 text (checked in `FEAT-002.md`) scopes the exit gate as "excluding
   any explicitly archived-parent directory" and CLAUDE.md is not one of the
   four declared archive buckets, so per the slice's own acceptance
   criterion CLAUDE.md was correctly in scope for the rewrite, not a
   candidate for a 5th ad-hoc exclusion. No action needed — the historical
   fact remains one `grep -r wiggin docs/planning/` away.

## Known/accepted items (verified, not defects)

- 28 vs. handoff's claimed 24 `wiggin` hits — explained by session artifacts
  generated by the ceremony itself after the scrub's own grep ran; all still
  fall inside the four documented buckets.
- Root suite's 2 DEC-file fails (DEC-070/DEC-068) — pre-existing, unrelated
  to this slice, already known from SLICE-07's review.
- `crew/` subtree (~7 remaining wiggin refs) and the 4 backlog/spec files
  citing "wiggin" in their own AC prose — both deliberately out of scope
  per the handoff's own classification, confirmed correct on inspection.

## Mechanical fixes applied during review

None required.

## Confidence

High. Verification was round-trip throughout: re-ran the coverage grep
fresh rather than trusting the handoff's count, diffed the renamed
template byte-for-byte against its pre-scrub `git show` content, ran the
installer test and full suite independently (twice, cross-checking failure
names not just counts), and greped the excluded archive directly to confirm
the judgment-check claim about archaeology preservation rather than taking
the handoff's word for it.
