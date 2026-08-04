---
id: FEAT-287
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
---
## Description

validate-backlog-writes scans only src/scripts, so the entire sibling scripts/ tree escapes the BacklogStore sole-writer gate -- and the module that exploits the gap is the direct cause of FEAT-285.

Finding, 2026-08-04. validate-backlog-writes.mts declares SCAN_ROOT = 'src/scripts' and walks only that tree. But this repo has a second, older top-level scripts/ directory (12 .mjs modules) that is never scanned. scripts/lib/github-sync.mjs writes backlog state directly at multiple sites: fs.writeFile(feat.filePath, ...) at lines 82, 92 and 184, and fs.writeFile(sliceFile, ...) at 115 and 121. These are exactly the raw FEAT/SLICE frontmatter writes DEC-076 designated BacklogStore as the sole sanctioned writer for. The gate nonetheless prints 'validate-backlog-writes: OK -- no raw backlog-state writers outside BacklogStore/allowlist' on every run, because it cannot see the files. Two other modules in the same unscanned tree also call fs.writeFile (scripts/setup-github-sync.mjs, scripts/competitor-audit/aggregate.mjs) and were never assessed against the policy.

Why this matters beyond tidiness. The bypass is not theoretical -- it produced FEAT-285. Because github-sync.mjs writes FEAT frontmatter outside BacklogStore, it never triggers the cache bust that BacklogStore's shared.mts write primitive performs, so listBacklog()'s per-process memoization keeps serving a pre-write snapshot. Every sibling publishSlice call in one slice from-feature run therefore re-reads stale state and re-creates the parent FEAT issue; six identical parent issues were created for FEAT-284's six slices on 2026-08-04. The gate that exists specifically to prevent unsanctioned backlog writes was green throughout.

This is the same defect class as FEAT-281 (tested-but-never-wired), one level up: the gate is implemented, wired into CI, and passes -- but its coverage does not include the surface it claims to protect, so a green result is affirmative evidence of nothing. FEAT-281's proposed validator looks for exported symbols whose only callers are their own tests; this is the sibling case of a validator whose scan root excludes real offenders.

Acceptance direction. Extend the scan to every JS/TS source tree in the repo that can write backlog artifacts -- at minimum scripts/ alongside src/scripts/ -- rather than a single hardcoded root, and cover .mjs as well as .mts. Then triage each newly-surfaced writer: port it to BacklogStore, or add it to ALLOWLIST with a written justification in the same style as the existing entries. github-sync.mjs's writes should be ported rather than allowlisted, since routing them through BacklogStore is what fixes FEAT-285's cache staleness at the root instead of patching one loop. Add a test asserting the scanner actually visits a file under scripts/, so this blind spot cannot silently return.

Related: FEAT-285 (the duplicate-parent-issue symptom), FEAT-281 (the gates-that-do-not-cover-what-they-claim class), DEC-076 (BacklogStore sole-writer decision).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.