---
feature: FEAT-283
status: active
---
# Run Brief: FEAT283 SLICE201: Sort review artifacts by filename ISO timestamp instead of filesystem mtime

- Created: 2026-08-05T05:01:30.577Z
- Tier: full
- Goal: Fix defect (2) of the three in FEAT-283: newest-review selection sorts by filesystem mtime and ignores the ISO timestamp already present in the filename.  `artifact-verdict.mts:30-44` stats each candidate and sorts on `mtimeMs`. Review filenames already carry the authoritative ordering:      20260803T200500Z-review-result-slice-178-...  mtime is not durable. `git clone`, `checkout`, `cherry-pick` and worktree materialization all assign arbitrary mtimes, so on a fresh clone the ordering for a mul
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/artifact-verdict.mts` — parse the leading ISO timestamp from
  the basename and sort on it; fall back to `mtimeMs` only when a filename
  carries no parseable timestamp.
- Mixed-corpus behavior: some filenames have a timestamp and some do not. Define
  and test the ordering rule for that case rather than leaving it emergent.
- Tests that set mtimes DELIBERATELY OPPOSITE to filename order and assert
  filename order wins. A test where both orderings agree proves nothing — that
  is how this shipped.
- Out Of Scope:
  - - The verdict-vocabulary branch in `review-gate.mts` — shipped in SLICE-200.
- The grandfather-clause cutoff (`review-gate.mts:109-118`) — SLICE-202.
- Changing the review-artifact filename convention itself.
- Planned Files: -
- Next Step: Begin implementation

