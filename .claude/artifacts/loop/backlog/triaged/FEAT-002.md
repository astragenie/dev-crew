---
id: FEAT-002
status: triaged
priority: P1
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: [FEAT-001]
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.9
pm_strategic_alignment: 0.85
pm_technical_risk: 0.9
pm_dependency_depth: 0.7
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-18
autonomous_safe: true
triage_notes: "Largest and highest-risk phase (technical_risk 0.9, banded per rubric row 'hard-to-reverse effects... unknowns needing a spike' -- subtree history rewrite of two codebases is genuinely hard to reverse and the bun#5090 mechanism is admittedly unconfirmed); effort_points=13 forces mandatory 2-point-capped decomposition; strictly blocked by P0 per the plan's own phase ordering, so autonomousSafe=false and pre-mortem is mandatory on both the technical_risk>=0.6 and P0/P1-priority triggers."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Subtree-import dev-team + runner-plugin, preserve history"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: .ts->.mts rename sweep batch 1 (dev-team src)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: .ts->.mts rename sweep batch 2 + import-specifier fixes
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: "node:test -> bun:test migration (31 files)"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-5
    title: Wiggin -> dev-crew branding scrub (27 files)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-6
    title: Single tsconfig/tsconfig.test + biome config merge
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-7
    title: N>=20 green --parallel verification wave + typecheck gate
    points: 1
    estimated_tokens: 60000
tags: ["stack:typescript", "area:build-tooling", "concern:test-migration"]
needs_contract: false
needs_ux: false
arch_attempt: 0
arch_status: approved
arch_review: approved
---
## Description

P1 Runtime baseline: subtree-import dev-team and runner-plugin into dev-crew preserving history; .ts->.mts rename sweep (391 dev-team files incl import-specifier fixes); migrate dev-team test suite node:test->bun:test (31 importing files) to remove Bun compat shim (bun#5090 class); Wiggin->dev-crew branding scrub at import (27 files); single tsconfig+tsconfig.test and biome config. Exit gates: zero node:test imports (grep), zero wiggin hits outside archives, N>=20 consecutive green 'bun test --parallel' runs, typecheck clean. Full spec: unification-plan.md section 3 + P1 row.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the dev-team + runner-plugin subtrees are imported into dev-crew and the .ts->.mts + node:test->bun:test migration is complete, When `grep -rl 'from "node:test"' src/ | wc -l` runs on the merged tree, Then the count is 0.
- AC-2: Given the Wiggin-branding scrub ran at import, When `grep -rli wiggin --exclude-dir=node_modules --exclude-dir=.git .` runs excluding any explicitly archived-parent directory, Then the count is 0.
- AC-3: Given the merged suite claims green, When `bun test --timeout 60000 --parallel` runs 20 consecutive times, Then all 20 runs report 0 failures -- a single failing run among the 20 invalidates this exit gate and P1 does not close (this directly targets the unresolved 2/2111 failure the plan's own live experiment surfaced).
- AC-4: Given the rename sweep and tsconfig consolidation are complete, When `bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit` runs, Then both invocations exit 0.
- AC-5: Given P0 has not yet produced its baseline tags, When P1's subtree-import step is attempted, Then it refuses to start (no `git subtree add` executed) until `git tag --list "pre-devcrew-baseline*"` returns a match in both parent repos.

## Proposed slices (PM decomposition)

- SLICE-1: Subtree-import dev-team + runner-plugin, preserve history (2 pts)
- SLICE-2: .ts->.mts rename sweep batch 1 (dev-team src) (2 pts)
- SLICE-3: .ts->.mts rename sweep batch 2 + import-specifier fixes (2 pts)
- SLICE-4: node:test -> bun:test migration (31 files) (2 pts)
- SLICE-5: Wiggin -> dev-crew branding scrub (27 files) (2 pts)
- SLICE-6: Single tsconfig/tsconfig.test + biome config merge (2 pts)
- SLICE-7: N>=20 green --parallel verification wave + typecheck gate (1 pts)
