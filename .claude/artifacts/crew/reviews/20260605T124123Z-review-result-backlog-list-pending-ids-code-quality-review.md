# Review Result: backlog list-pending-ids code quality review

- Created: 2026-06-05T12:41:23.843Z
- Reviewer: reviewer
- Decision: rejected
- Summary: Two Important findings block landing: test 1 name falsely claims sorted-order verification, and the new runBacklogListPendingIds function leaves repoPath untyped (implicit any) — both must be fixed before merge.
- Evidence Checked:
  - git diff --cached for 3 files; full read of backlog-list-ids.mts
  - backlog-list-ids.test.mts
  - loop.mts lines 380-555; backlog-parser.mts filterBacklog/listBacklog implementation verified; FLAG_SPEC and subcommand dispatch chain inspected
- Files Reviewed:
  - src/scripts/lib/backlog-list-ids.mts
  - src/tests/backlog-list-ids.test.mts
  - src/scripts/loop.mts
- Test Adequacy: 3 tests added for listPendingFeatureIds; test 1 name asserts sorted order but both sides are .sort()-ed before deepEqual so ordering is never verified; test 2 name over-claims by listing 3 excluded statuses but only exercises one
- Risks: implicit any on repoPath in runBacklogListPendingIds will not be caught by tsc if strict mode is off; misleading test name could mask a real ordering regression if filterBacklog order ever changes; list-pending-ids absent from usage hint error message
- Required Follow-up: Fix: (1) retype repoPath: string on runBacklogListPendingIds; (2) fix test 1 assertion to deepEqual without sort() or rename to drop 'sorted'; (3) rename test 2 to match what it actually covers; (4) add list-pending-ids to subcommand hint string

