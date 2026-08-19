---
decision: approved
reviewer: crew:reviewer
slice: SLICE-36
reviewed_commits: [5828f512]
---

# Review — SLICE-36 (FEAT-016): command-surface consolidation

## Note on commit message

Per the lead's framing: `5828f512`'s message ("docs(contract): FEAT-008
amendment...") is wrong — an index race commingled SLICE-36's 12 staged
files into that commit. The actual file-level diff (`git show 5828f512
--stat`) is unambiguous and matches SLICE-36's scope exactly (7 command
files deleted, `adopt.md`/`build.md`/`learn.md` modified, `gepa.md` added,
CHANGELOG updated). I judged the content, per instruction, and don't treat
the mislabeled message as a defect — it's a process artifact of concurrent
builders, not a content-quality issue.

## Summary

Verified against the SLICE-19 blank-page audit's actual MERGE-CANDIDATE(7)/
CUT-CANDIDATE(1) list by independent count (not by trusting the commit
message's "39+1 → 33+1" claim): all 7 merge candidates and the 1 cut
candidate were executed, none dropped or misread. Diffed all 3 requested
content-merge pairs against their deleted originals — every unique
substantive line survives, and the one place content was NOT re-added
(parallel-review's "before starting, provide..."/"write matching
artifacts" boilerplate) is genuinely redundant with build.md's own
pre-existing steps, not a silent drop. The learn/lessons-recent
store-divergence claim is code-verified true. All three new gepa.md
subcommands (resume/revert/thaw) map to real, live `crew.mts` CLI handlers.
All four requested gates pass, and dangling-reference sweep found only
expected "formerly X" breadcrumb notes plus the 3 known `crew/README.md`
danglers already accepted as out of scope (plus one additional, clearly
non-live hit noted below). **Decision: approved.**

## 1. Audit-list execution — independently counted, nothing dropped or misread

Read the audit doc's MERGE-CANDIDATE(7)/CUT-CANDIDATE(1) sections directly
(not the commit message's summary). The 7 named merge candidates:
`audit-repo`, `gepa-eval`, `gepa-history`, `gepa-invalidate`, `learn`
(keeper), `lessons-recent`, `parallel-review`. The 1 cut candidate:
`wake-up-brief`.

Cross-checked against the commit's actual deleted-file list: `audit-repo.md`,
`gepa-eval.md`, `gepa-history.md`, `gepa-invalidate.md`, `lessons-recent.md`,
`parallel-review.md`, `wake-up-brief.md` — **exactly 7 files deleted**,
matching the 6 mergeable-and-deletable names (excluding `learn`, which is
the survivor/keeper) plus the 1 cut. Arithmetic reconciles exactly: 39
audited files − 6 merge-source deletions − 1 cut + 1 new file (`gepa.md`)
= 33, matching the claimed "33+1" final count. No candidate was skipped,
substituted, or misread.

## 2. Content-merge honesty — all 3 requested pairs diffed against originals

- **adopt.md / audit-repo.md**: `git show 5828f512^:commands/audit-repo.md`
  vs current `adopt.md` — the deleted file's entire workflow (audit CLI
  invocation, the 6-item state-report checklist, the adopt-vs-init
  recommendation) survives verbatim in adopt.md's new "## Optional
  pre-check (formerly `/devcrew:audit-repo`)" section.
- **gepa.md / gepa-eval.md** (also checked `gepa-history.md` and
  `gepa-invalidate.md` since all 3 collapse into one file): every
  substantive element from all 3 deleted files — usage syntax, flag
  tables, numbered behavior steps, exit codes, implementation file
  pointers — survives under the corresponding `## eval`/`## history`/
  `## invalidate` sections, word-for-word in most places. The individual
  files' "See also" cross-references to each other are naturally
  subsumed since they're now sections of one file.
- **build.md / parallel-review.md**: `git show 5828f512^:commands/parallel-review.md`
  vs the diff on `build.md` — the 5-bullet anti-pattern rule list and the
  "suggested team shapes" both survive verbatim under a new "**Team-run
  guidance (formerly `/devcrew:parallel-review`)**" sub-block at step 10.
  The remaining parallel-review.md content ("before starting, provide:
  chosen mode / why parallelism helps / who owns what / ... "; "write
  matching artifacts: write-run-brief / write-handoff / ...") was **not**
  re-added — I checked build.md's surrounding steps 5–7 and 13 and
  confirmed this is genuinely pre-existing, near-identical content already
  there (framing-block scope questions at step 5, `write-run-brief` at
  step 7, mandatory `write-handoff` at step 13), matching the audit's own
  characterization ("almost entirely duplicated by build.md/fix.md's own
  'team run' steps"). Not a drop — a correct call to skip re-stating
  content that was already present.

## 3. learn/lessons-recent store-divergence claim — code-verified

`learn.md` claims `recent` and `lessons` "read two genuinely different
stores." Traced both code paths in `src/scripts/loop.mts`:
- `learnings recent` (backs `learn recent`) → `runLearningsSubcommand` →
  `recentLearnings()` from `lib/learnings.mjs`.
- `lessons recent` (backs `learn lessons`) → the `lessons` command handler
  → `recentLessons()` from `lib/lessons-feed.mjs`, which imports
  `listGrades` from `grade-parser.mjs` — reads slice-grade files, not
  `learnings.jsonl`.

Confirmed: genuinely two separate stores, two separate code paths. The
builder's judgment call to keep `log`/`recent`/`lessons` as 3 distinct
subcommands under one dispatcher — rather than force-collapsing `recent`
and `lessons` into a single behavior as the audit's loose phrasing
("Fold into `/devcrew:learn [log|recent]`") might suggest — is the correct
engineering call, and it's explicitly documented in-file with the
rationale ("collapsing them would silently drop one data source"). This
still executes the spirit of the audit (2 command files → 1 dispatcher)
without a lossy behavioral merge.

## 4. gepa.md's resume/revert/thaw — real CLI surface, no phantom commands

Grepped `crew/scripts/crew.mts` and `crew/scripts/lib/gepa/gepa-killswitch-cmds.mts`
directly: `gepa-resume`/`gepa-revert`/`gepa-thaw` are real, live CLI
subcommands backed by real handlers (`runGepaResumeCmdExtended`,
`runGepaRevertCmd`, `runGepaThawCmd`). Spot-checked signatures against
gepa.md's documented usage: `runGepaRevertCmd` parses `--agent <name>`
matching `/devcrew:gepa revert --agent <name>`; `runGepaResumeCmdExtended`
takes an optional positional agent (with-agent = per-agent streak clear,
without = global pause clear) matching gepa.md's "With an agent name...
Without an agent name..." description exactly.

## 5. Gates + dangling-reference sweep

- `bun src/scripts/validate-agent-refs.mts`: OK, no phantom dispatch refs.
- `bun src/scripts/validate-dispatch-markers.mts`: OK, 7 fixtures balanced.
- `bun src/scripts/validate-manifests.mts` + `bun crew/scripts/validate-manifests.mts`:
  both OK.
- Grepped `commands/`, `agents/`, `skills/`, `CLAUDE.md`, `AGENTS.md` for
  all 7 removed names: the only hits are the expected "formerly X" /
  "X → Y" migration-breadcrumb notes in `adopt.md`, `gepa.md`, `learn.md`,
  `build.md` — not stray dispatch tokens. `wake-up-brief` has **zero**
  hits anywhere in that surface (clean cut, no redirect needed).
- Widened the sweep across all `.md` files repo-wide to locate the "3 known
  crew/README.md danglers": confirmed exactly 3 — `crew/README.md` lines
  100-102 list `parallel-review`, `wake-up-brief`, `audit-repo` in what
  reads as a stale command inventory. One additional, unmentioned hit:
  `crew/docs/architecture/v1-spec.md:440` also lists `audit-repo` — but
  reading that file's context, it's an early "Multi-Agent Crew v1" design
  spec proposing commands like `bootstrap-repo`/`create-run`/
  `doctor-framework` that don't match *any* of today's real command names
  either — clearly a historical planning document, same bucket as the
  numerous `crew/.claude/artifacts/**` and `crew/docs/superpowers/specs/**`
  historical hits I excluded from consideration. Not a live reference
  surface; flagging for completeness only, not as a finding.

## Decision rationale

`approved`. Execution against the audit's actual list is complete and
accurate — independently counted, not trusted from the commit message.
All three requested content-merge pairs preserve every unique line of the
deleted originals; the one place content wasn't re-added is a verified,
genuine duplicate of pre-existing build.md content, not a silent drop. The
learn/lessons-recent design decision deviates from the audit's loose
phrasing but is the objectively correct call, code-verified and
self-documented. The new gepa.md subcommands document real CLI surface,
not phantom commands. All four gates pass, and the dangling-reference
sweep found nothing beyond the expected migration breadcrumbs and the
already-accepted out-of-scope README/spec-doc danglers.
