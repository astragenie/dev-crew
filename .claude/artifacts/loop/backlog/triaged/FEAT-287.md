---
id: FEAT-287
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-06
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.65
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.8
pm_technical_risk: 0.5
pm_dependency_depth: 0.25
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-06
autonomous_safe: false
triage_notes: "This is the same defect class as FEAT-281 (P1: tested/gated-but-not-actually-covered) one level up, and arguably worse in one respect: FEAT-281's gap was passive (a function nobody called), while this gate actively prints 'OK — no raw backlog-state writers outside BacklogStore/allowlist' on every run while a live writer bypasses it and has already produced a confirmed external-facing bug (FEAT-285's six duplicate GitHub issues). That combination — false assurance plus a demonstrated live consequence — puts customer_impact and strategic_alignment above FEAT-285 (P2, the symptom) and FEAT-282 (P2, an orphan validator nobody currently relies on and that blocks nothing), but effort and risk are real and multi-file (porting a live external-side-effecting write path, not just widening a scan glob), which is why this sits at P1 alongside FEAT-281 rather than climbing to P0: like FEAT-283, this touches gate-adjacent/live-external-effect code, so autonomous_safe is false pending human sign-off on the port-vs-allowlist calls for the two secondary writers."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Extend backlog-write scan to scripts/ tree + .mjs files; add scanner-reach test
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given validate-backlog-writes.mts's SCAN_ROOT is hardcoded to 'src/scripts' (line 77), When this slice ships, Then the scanner walks both src/scripts and the top-level scripts/ tree, covering .mjs files as well as .mts.", "AC-2: Given scripts/lib/github-sync.mjs's raw fs.writeFile calls against FEAT paths (lines 82, 92, 184) and SLICE paths (lines 115, 121) are not yet ported (that is SLICE-2's scope), When the widened scanner runs against current main, Then it flags all five call sites as disallowed raw writers.", "AC-3: Given a new test asserting the scanner's reach, When a file is added under scripts/ (not src/scripts/) containing a disallowed raw write, Then validate-backlog-writes.mts fails and names that file."]
    touches_files: [src/scripts/validate-backlog-writes.mts, src/tests/validate-backlog-writes.test.mts]
  - id_suffix: -SLICE-2
    title: Port github-sync.mjs raw FEAT/SLICE fs.writeFile calls to BacklogStore
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["AC-1: Given scripts/lib/github-sync.mjs's raw fs.writeFile calls against FEAT paths (lines 82, 92, 184) and SLICE paths (lines 115, 121), When this slice ships, Then each call site is ported to BacklogStore's updateFeatureFrontmatter (feature-store.mts) / updateSliceFrontmatter (slice-store.mts) equivalents so it triggers the same cache-bust as every other sanctioned writer.", "AC-2: Given github-sync.mjs's writes are now routed through BacklogStore, When a slice-from-feature run publishes N sibling slices for one FEAT, Then listBacklog()'s memoized cache is correctly busted by every write, so the FEAT-285 duplicate-parent-issue regression (six identical parent issues for FEAT-284's six slices) does not recur.", "AC-3: Given src/scripts/lib/github-sync-loader.mts's importGithubSync resolves a computed file:// URL to reach github-sync.mjs on every `github publish` path, When this port ships, Then the live `github publish` path continues to function unchanged from the caller's perspective — a behavior-preserving port, not a public API change."]
    touches_files: [scripts/lib/github-sync.mjs, src/tests/github-sync.test.mts]
  - id_suffix: -SLICE-3
    title: "Triage setup-github-sync.mjs + competitor-audit/aggregate.mjs writes: port or allowlist"
    points: 1
    estimated_tokens: 60000
    acceptance_criteria: ["AC-1: Given scripts/setup-github-sync.mjs's fs.writeFile calls, When triaged, Then it is either ported to BacklogStore or added to validate-backlog-writes.mts's ALLOWLIST with a written justification in the existing DEC-076 style.", "AC-2: Given scripts/competitor-audit/aggregate.mjs's fs.writeFile calls, When triaged, Then it is either ported to BacklogStore or added to the ALLOWLIST with a written justification in the existing DEC-076 style.", "AC-3: Given both modules sit outside the backlog-frontmatter write path that caused FEAT-285 (unlike github-sync.mjs), When the triage decision is recorded, Then the written justification states why each does or does not risk the same cache-staleness bug."]
    touches_files: [scripts/setup-github-sync.mjs, scripts/competitor-audit/aggregate.mjs, src/scripts/validate-backlog-writes.mts]
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

## Confirmed live, and structurally hidden from static analysis

The unscanned tree is not dead legacy code. `src/scripts/lib/github-sync-loader.mts`
exists specifically to bridge to it: `importGithubSync(rel)` resolves
`<repoRoot>/scripts/lib/<rel>` and imports it through a computed
`pathToFileURL(candidate).href`. Its own header explains why — these modules
are hand-authored `.mjs` with no `.mts` source, and after the Bun migration
there is no emitted tree, so a plain relative import from `src/scripts/lib/`
would not resolve. Every `github publish` path runs through this loader.

That makes the blind spot worse in two compounding ways:

1. The module is live on a routine code path, not a dormant script someone
   forgot to delete. Its raw FEAT/SLICE writes execute in normal operation.
2. Because the import target is a computed URL rather than a literal
   specifier, the tree is invisible to static resolution as well as to
   `validate-backlog-writes`' hardcoded scan root. Two independent mechanisms
   would each have to be taught about it.

Direct consequence for FEAT-281's design: its proposed unwired-export
validator must treat `importGithubSync` as a call edge, or it will conclude
that everything under `scripts/lib/` has no callers and either flag the whole
tree or (if the allowlist swallows it) silently exempt a live surface. The
same loader indirection that hides these writers from the sole-writer gate
will hide them from the wiring gate. Worth designing the two together rather
than sequentially.

## Acceptance criteria (Given-When-Then)

- Given validate-backlog-writes.mts's scanner, when it runs, then it walks both src/scripts and the top-level scripts/ tree (no single hardcoded SCAN_ROOT), covering .mjs files as well as .mts.
- Given scripts/lib/github-sync.mjs's raw fs.writeFile calls against FEAT paths (lines 82, 92, 184) and SLICE paths (lines 115, 121), when the scanner runs pre-fix, then it flags them; post-fix, they are ported to BacklogStore's updateFeatureFrontmatter/updateSliceFrontmatter so they trigger the same cache-bust as every other sanctioned writer.
- Given scripts/setup-github-sync.mjs and scripts/competitor-audit/aggregate.mjs's fs.writeFile calls, when triaged, then each is either ported to BacklogStore or added to ALLOWLIST with a written justification in the existing DEC-076 style.
- Given src/scripts/lib/github-sync-loader.mts's importGithubSync resolves a computed file:// URL rather than a literal specifier, when any paired static-analysis gate (e.g. FEAT-281's unwired-export validator) evaluates call edges into scripts/lib/, then importGithubSync counts as a real caller, not a dead/unreferenced tree.
- Given a new test asserting the scanner's reach, when a file is added under scripts/ (not src/scripts/) containing a disallowed raw write, then validate-backlog-writes.mts fails and names that file.
- Given github-sync.mjs's writes are ported to BacklogStore, when a slice-from-feature run publishes N sibling slices for one FEAT, then listBacklog()'s memoized cache is correctly busted by every write, so the FEAT-285 duplicate-parent-issue regression does not recur.

## Proposed slices (PM decomposition)

- SLICE-1: Extend backlog-write scan to scripts/ tree + .mjs files; add scanner-reach test (2 pts)
- SLICE-2: Port github-sync.mjs raw FEAT/SLICE fs.writeFile calls to BacklogStore (2 pts)
- SLICE-3: Triage setup-github-sync.mjs + competitor-audit/aggregate.mjs writes: port or allowlist (1 pts)
