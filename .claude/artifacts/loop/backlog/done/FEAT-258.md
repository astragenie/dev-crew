---
id: FEAT-258
status: done
priority: null
category: tooling
target_release: null
created: 2026-07-10
updated: 2026-07-10
depends_on: []
slices: []
derived_from: null
autonomous_safe: null
pm_reviewed: null
triage_notes: "Filed 2026-07-10 from SLICE-149 grade followup. The FEAT-244 close ceremony emitted two all-zero grade stubs (empty frontmatter, every score 0) — one of them mislabeled with the wrong feature id (feat247 instead of feat244) — and the ceremony reported success. Grading had to be reconstructed manually a session later; until then the telemetry averages silently ingested seven 0.0 scores per stub."
resolution: "Guard already existed (FEAT-145 isAllZeroScores in grade-writer.mts); PR #465 (2026-07-10) added the missing regression coverage: all-zero rejected, normalizer missing-scores-map rejected, partial-zero accepted."
completed_at: 2026-07-10
---
# FEAT-258: grade ceremony must refuse silent all-zero grade stubs

## Problem

`slice grade` drafts a template with all scores 0; if the orchestrator
never fills it, `slice grade-write` (and close) accept the stub as a valid
grade. Zero-score stubs poison the recent-grade averages that the snapshot,
marathon checkpoint, and lessons-feed-forward all consume — and the failure
is invisible: the ceremony exits 0 and the loop moves on. A stub can also
carry a wrong feature id in its filename with nothing cross-checking it.

## Proposed direction

1. `slice grade-write` rejects a grade whose scores are all 0 (or whose
   frontmatter is empty) with a clear "grade template unfilled" error —
   same failure contract the `--grade-yaml` path already has.
2. Cross-check the grade filename's feat/slice tokens against frontmatter
   `feature:`/`slice:` — mismatch is an error, not a silent write.
3. `snapshot-memory` / grade-telemetry ignore (and warn on) any legacy
   all-zero grade files already on disk so historical averages self-heal.

## Acceptance criteria

- [ ] Given an unfilled all-zero grade file, When `slice grade-write --id`
      runs, Then it exits non-zero with a "grade template unfilled" message
      and writes no telemetry.
- [ ] Given a grade file whose filename feature id contradicts its
      frontmatter, When grade-write runs, Then it errors naming both ids.
- [ ] Given legacy all-zero grades on disk, When the snapshot regenerates,
      Then those files are excluded from score averages and counted in a
      warning line.
