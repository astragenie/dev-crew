---
decision: approved_with_notes
slice: SLICE-20+SLICE-22
artifact: crew/scripts/lib/gepa/ deletion + crew/scripts/validate-{agent,org}-refs.mts dedupe + dead-path purge
reviewer: independent (fullstack-dev)
date: 2026-08-19
---

# Consolidated review — SLICE-20 (validator dedupe + dead-path purge) + SLICE-22 (GEPA disposition-table deletion executed)

Repo: `C:/work/mega/devcrew`, all changes uncommitted. Scope per task brief: (1)
companion-edit judgment on the 4 caution sites + guarded-fire relocation, (2)
deletion-honesty spot checks, (3) validator dedupe correctness, (4) dead-path
fix quality, (5) the gate matrix, (6) deferred-item sanity. Findings below in
that order; **item 5 surfaces a real, currently-red gate that blocks
approval** — everything else checks out clean.

## 1. Companion-edit judgment — all correct, one minor coverage gap

Read each diff directly (`git diff`), not the handoff's prose description.

- **`write.mts`** — `fireCaptureTeeSilent` + its `__captureTeeLoader` override
  removed wholesale (dead telemetry into deleted `capture-tee.mts`); the
  GEPA-trial dual-write inside `fireFailureCaptureSilent` removed, leaving
  `learnings.jsonl` as sole provider. `fireGuarded` import repointed to the
  relocated `../guarded-fire.mjs`. Comments correctly updated to stop
  referencing the deleted function. Correct.
- **`check-subagent-return.mts`** — `fireFailureTrialSilent` (dynamic import
  of the deleted `capture-failure-trial-guard.mts`, on the `inline-return-warn`
  and `subagent-incomplete` call sites) removed wholesale;
  `captureFailureLearning` (learnings.jsonl) is untouched and remains the sole
  provider. Correct.
- **`report-to-pr.mts`** — single-line import repoint to `./lib/guarded-fire.mjs`.
  Correct, matches the relocation.
- **`dispatch.mts`** — `evaluateSoakHook` re-export dropped; replaced with a
  comment flagging the documented cross-repo risk (runner-plugin vendors this
  file by import path and may expect the re-export). Grep confirms nothing
  in *this* repo imports `evaluateSoakHook` from `dispatch.mjs` except the
  deleted `soak-dispatcher-hook.test.mts` itself. The risk callout is honest,
  not hand-waved — correctly flagged as out-of-scope for this repo, not
  silently dropped.
- **`guarded-fire.mts` relocation** (`lib/gepa/guarded-fire.mts` →
  `lib/guarded-fire.mts`) — confirmed **byte-identical** move (`diff` against
  `git show HEAD:crew/scripts/lib/gepa/guarded-fire.mts`, zero output). Grep
  for all non-test `guarded-fire` references confirms exactly two live
  consumers post-move, both non-gepa (`write.mts`, `report-to-pr.mts`) — the
  "load-bearing outside gepa, not gepa-specific" judgment is correct.
- **`validate-agents.mts`** — `stripGepafrontmatter` import + call removed;
  `parseFrontmatter` now reads the raw text directly. Confirmed via the old
  header comment (FEAT-193 AC-10) that this was a no-op guard for a frontmatter
  shape no committed agent file ever carried — clean removal, matches the
  disposition table's own note.

**Minor gap (non-blocking):** `guarded-fire.mts` survived the deletion (moved,
not removed) and is now load-bearing for two non-gepa modules, but its own
dedicated unit test (`crew/tests/gepa/guarded-fire.test.mts` — direct tests of
the timeout-race contract: resolves at `min(fn duration, timeoutMs)`, the
timer is `.unref()`'d so a fire-and-forget caller never keeps the process
alive) was deleted along with the rest of the gepa test tree. Only one
surviving test exercises `fireGuarded` at all, indirectly and only through the
`write.mts` → memory-credit call site
(`crew/tests/memory-write-handoff-credit.test.mts:119`,
`"writeArtifact returns promptly even when the credit loader is slow"`).
`report-to-pr.mts`'s `fireGuarded` usage has zero test coverage, and no
surviving test exercises the unref/never-hangs contract directly. Recommend a
follow-up: either restore a trimmed version of `guarded-fire.test.mts` next to
its new location, or accept the gap explicitly — don't let it round to zero
coverage on a shared timing-sensitive primitive by accident.

## 2. Deletion-honesty spot checks — all confirmed

**3 deleted lib files, checked for any surviving importer** (`grep -rln
--include="*.mts" crew/ src/`, zero hits for each): `adapt-artifact.mts`,
`candidate-generator-aiplugin.mts`, `mine-reviewer-bug-corpus.mts`. No live
importer remains for any of them.

**3 deleted tests, checked that they actually tested deleted surface** (read
each file's import block via `git show HEAD:<path>`):
`ac3-proof-harness.test.mts` imports `judge-scorer.mts` +
`optimize-runner.mts` (both DELETE); `champion-provenance.test.mts` imports
`writeChampionProvenance`/`stripGepafrontmatter`/`hashPromptBody` from
`champion-provenance-writer.mts` (DELETE); `optimize-budget-halt.test.mts`
imports `candidate-generator-aiplugin.mts` + `optimize-runner.mts` (both
DELETE). All three genuinely died on deleted surface, not swept up
incidentally.

## 3. Validator dedupe — correct, verified structurally

Compared the widened root `validate-org-refs.mts` `SCAN_TARGETS` against the
**old** `crew/scripts/validate-org-refs.mts`'s own scope (`git show
HEAD:crew/scripts/validate-org-refs.mts`): old scope was `README.md,
ADOPTION.md, agents, commands, skills, docs, scripts, .claude-plugin,
.claude/crew` (relative to `crew/`). New root scope adds `crew/docs,
crew/scripts, crew/CLAUDE.md, crew/README.md, crew/.claude-plugin,
crew/crew-architecture-analysis.md, crew/crew-optimization.md,
crew/.claude/crew`. The apparent gaps (`crew/agents`, `crew/commands`,
`crew/skills`, `crew/ADOPTION.md`) are **not** gaps — confirmed by `ls` that
none of those four paths exist anymore (already merged into the unified root
tree by SLICE-14..17, as the diff's own comment claims). The two paths in the
new list that weren't in the old scanner's literal list
(`crew-architecture-analysis.md`, `crew-optimization.md`) both exist on disk
and are legitimately new additions, not scope creep. Read `collectFiles()`
directly (`src/scripts/validate-org-refs.mts:93-110`): it recurses into
directories and treats a bare file target as itself, and silently no-ops a
missing target (`catch { return []; }`) — so mixing directory and file
entries in `SCAN_TARGETS` (as the widened list does) is handled correctly, not
a latent bug. The `docs/parents/runner-plugin-{AGENTS,CLAUDE}.md` allowlist
addition is justified with a concrete precedent (SLICE-08's branding-scrub
grep already exempted the same path) — sound.

Confirmed `crew/scripts/validate-agent-refs.mts`, `validate-org-refs.mts`, and
both their tests are deleted (`D` in git status) — the crew-side copies are
gone, consistent with "dedupe" framing.

## 4. Dead-path fix quality — clean, no behavior change beyond described

- `intake.mts`: removed two `docs/backlog/{pending,done}` scan directories
  from `nextFeatId`'s `dirs` array — those directories are deleted in this
  same batch (confirmed in the diffstat), so this is a real dead-path removal,
  not a functional change to ID allocation logic for the surviving dirs.
- `slice-progress.mts`: comment-only update, no code change.
- `validate-manifests.mts`: comment-only addition explaining why the
  crew-side manifest validator is *not* being deduped yet (Phase-5 gated) —
  no behavior change.
- `templates/claude-md-hard-rules.md` + `templates/loop-rules.md`: both fix
  the same phantom-token bug — `devcrew:validator` → `devcrew:verifier` (the
  real agent name). This is the exact defect SLICE-22's handoff flagged as
  one of the 3 pre-existing root-suite failures — fixing it here is
  consistent with the task brief's "root 3316/2 known (templates
  devcrew:verifier fix included)" framing.

## 5. Gate matrix — MISMATCH FOUND, blocks approval

Ran every gate directly rather than trusting the handoff's self-report.

| Gate | Claimed | Actual (verified) | Status |
|---|---|---|---|
| Root `tsc --project tsconfig.json` | 0 errors | 0 errors | ✅ match |
| Root `tsc --project tsconfig.test.json` | 0 errors | 0 errors | ✅ match |
| Crew `tsc --project tsconfig.json` | 0 errors | 0 errors | ✅ match |
| Root `bun test src/tests/` | 3316 pass / 2 fail (known) | **3316 pass / 7 skip / 2 fail** | ✅ match |
| Root validators (16 scripts) | 16/16 minus learnings-schema red | **15/16 pass; `validate-learnings-schema.mts` exits 1** (4 malformed entries at learnings.jsonl lines 22/29/40/43) | ✅ match, confirmed pre-existing (see below) |
| **Crew `bun test`** | **0 fail** | **1738 pass / 117 skip / 15 fail / 1 error** across 177 files | ❌ **MISMATCH** |

**Root cause of the crew-suite mismatch:** `crew/scripts/lib/approvals.mts`
and `crew/tests/cli-approvals.test.mts` are **missing from the working-tree
filesystem** — `git status --porcelain` shows them as unstaged deletions
(` D`, not staged `D `), meaning git's index still has them but the files are
simply gone from disk. `git log` shows no commit has touched
`approvals.mts` since SLICE-05 (the original `.ts→.mts` port), and there is
no relocation — `find crew -iname "*approval*"` turns up nothing that could
be a successor. This is **not mentioned in either the SLICE-20 or SLICE-22
handoff**, is unrelated to GEPA/validator-dedupe work, and currently breaks:
`crew/tests/cli-smoke.test.mts`'s `"smoke: approvals family
(request-approval)"` test (the CLI subcommand itself fails to run),
`crew/tests/regression.test.mts`'s `"AC-6: resolveApproval returns err() for
unknown approval id"` (direct `Cannot find module ... approvals.mts` error),
and a third, unrelated `"CLI wake-up brief summarizes repo memory and state"`
failure in the same run.

**This blocks sign-off, not because SLICE-20/22's own diff is wrong — every
line of it checks out — but because the working tree this review is gating is
not actually green as claimed, and it contains an unexplained deletion of a
live, unrelated subsystem (the approval-gate feature).** If this batch gets
committed as-is (or via `git add -A`), the approvals feature silently breaks
for anyone who pulls `main`, with zero handoff trail explaining why. Needs one
of: (a) restore the two files from git's index (`git checkout --
crew/scripts/lib/approvals.mts crew/tests/cli-approvals.test.mts`) if this was
accidental, or (b) if the deletion is actually intended by some other
in-flight slice, a real handoff explaining it and confirming the 3 dependent
tests were deliberately triaged — not silently absorbed into this batch.

**`learnings-schema` red confirmed genuinely pre-existing:** `learnings.jsonl`
has no uncommitted diff (`git status --short` empty for that path) — its
current content, including the 4 malformed entries, was already committed at
`321251ea` ("loop(SLICE-19): P3 complete"), which predates SLICE-20's run-brief
creation (`07:11:37Z`) by roughly 5 hours. Confirmed via direct execution
(`bun src/scripts/validate-learnings-schema.mts`, exit 1) that this genuinely
fails today, not just "looked red once." Correctly deferred, not swept under
the rug.

## 6. Known deferreds — sane

- `crew/.github/workflows/test.yml` → SLICE-24: not independently checked
  (out of this review's assigned scope), no red flag encountered elsewhere
  that would contradict deferring it.
- `validate-manifests.mts` root/crew duplication → P5: confirmed by the new
  comment block in `validate-manifests.mts` itself, which gives a concrete,
  checkable reason (`unification-plan.md §6` gates the manifest merge to
  Phase 5) rather than a bare "later." Sound.
- `learnings-schema` producer → follow-up FEAT: appropriate given the defect
  is confirmed real and pre-existing (see above) — deferring a fix for
  unrelated stale data is correct triage, not scope-dodging.

## Verdict

**approved_with_notes.** The SLICE-20 and SLICE-22 diffs themselves are
well-executed — every companion edit, deletion, and validator-scope widening
spot-checked correct, and the root-suite/tsc/validator numbers in the task
brief are all independently verified accurate.

**Resolution (2026-08-19, post-review):** the item-5 crew-suite red was
attributed by lead — the missing `approvals.mts` / `cli-approvals.test.mts`
were in-flight SLICE-23 scope (concurrent deletion of the claims/approvals
machinery per `unification-plan.md §5`), not an unexplained regression.
SLICE-23's handoff (20260819T081518Z) ledgers the deletion, including the
wakeup/briefing strips and test trims this review caught mid-flight, and
keeps claims/auto-dispatch/preset-retrofit (lead-ratified, call-site
evidence). Lead-confirmed fresh crew suite: 1701 pass / 117 skip / 0 fail
(parallel). Root unchanged at 3316 pass / 2 known-fail. Gate matrix now
fully green across both repos' claims. Upgrading decision from `needs_fix`
to `approved_with_notes` per the conditional in the original verdict.

**Standing note (non-blocking, carried forward):** `guarded-fire.mts`'s own
dedicated unit test was deleted with the gepa test tree even though the file
itself survived and relocated to non-gepa infra (§1 above) — only one
indirect integration test covers one of its two live call sites. Worth a
follow-up test restoration, not a blocker.
