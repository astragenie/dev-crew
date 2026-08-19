---
id: FEAT-014
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: [FEAT-013]
slices: []
derived_from: null
pm_customer_impact: 0.4
pm_effort_estimate: 0.75
pm_strategic_alignment: 0.55
pm_technical_risk: 0.65
pm_dependency_depth: 0.35
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-19
autonomous_safe: false
triage_notes: "Effort_estimate of 0.75 maps to 8 Fibonacci points (pm-effort-mapper.mts band 0.6-0.85), triggering the decomposition gate; technical_risk of 0.65 (cross-module reach across 287 files plus an unresolved tooling landmine) forces autonomousSafe:false on its own via the >0.6 threshold, independent of the decomposition requirement -- this needs architect/operator involvement before any slice in this FEAT is dispatched autonomously."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Resolve TS6-vs-TS7 compiler-API landmine (design decision + ADR)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Merge crew-only deps into root package.json/bun.lock
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Unify tsconfig moduleResolution (NodeNext vs Bundler) across crew/ and root
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Collapse CI crew-tests job into root suite invocation
    points: 2
    estimated_tokens: 100000
tags: ["stack:typescript", "area:build-tooling", "concern:crew-flatten"]
needs_contract: true
needs_ux: false
---
## Description

crew/ flatten phase 2 — unify tsconfig + package.json: single root package.json/bun.lock and one tsconfig strategy for the 287 crew files. Blockers to resolve: crew pinned TS6 because openapi-typescript needs the JS compiler API (native tsc 7 lacks it — keep typescript 6 as a devDependency for that tool or replace the tool), NodeNext-vs-Bundler moduleResolution divergence, ~10 crew-only deps to merge. CI crew-tests job then collapses into the root suite invocation.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the TS6-vs-TS7 compiler-API conflict (openapi-typescript needs the JS compiler API that native tsc 7 lacks), When the isolated design-decision slice completes, Then an ADR records the chosen resolution (keep typescript 6 as a scoped devDependency, or replace the tool) with the rationale for what was rejected.
- AC-2: Given the ~10 crew-only dependencies and crew's separate package.json, When they are merged into the root package.json/bun.lock, Then a single lockfile resolves for the whole repo with no version conflicts left unresolved.
- AC-3: Given the NodeNext-vs-Bundler moduleResolution divergence between crew/ and root, When the unified tsconfig strategy lands, Then `bunx tsc --noEmit` passes across the full 287-file crew/ tree AND the pre-existing root tree under the single config.
- AC-4: Given the CI crew-tests job currently running separately, When it is collapsed into the root suite invocation, Then `bun test src/tests/ --parallel` (or the unified equivalent) covers what crew-tests previously covered, with no test silently dropped from CI.

## Proposed slices (PM decomposition)

- SLICE-1: Resolve TS6-vs-TS7 compiler-API landmine (design decision + ADR) (2 pts)
- SLICE-2: Merge crew-only deps into root package.json/bun.lock (2 pts)
- SLICE-3: Unify tsconfig moduleResolution (NodeNext vs Bundler) across crew/ and root (2 pts)
- SLICE-4: Collapse CI crew-tests job into root suite invocation (2 pts)

## Architect note

Verified against the live tree: `crew/package.json` pins `"typescript": "^6.0.3"`,
root `package.json` pins `"typescript": "^7.0.0"`; `crew/tsconfig.json` sets
`moduleResolution: "Bundler"` against root's `"NodeNext"`. The sole consumer
forcing crew off native tsc 7 is `crew/scripts/validate-contracts.mts`, which
calls `openapi-typescript`; that package's own `package.json` declares a
`typescript: "^5.x"` peer dependency and vendors `typescript@^5.9.3` as a
devDependency for its internal use of the TS compiler API (`ts.createProgram`
class APIs), which tsc 7's rewritten native binary does not expose. This is
the actual decision surface for SLICE-1, not a green-field choice:

1. **Keep typescript 6 as a scoped devDependency**, isolated to whatever
   package/workspace boundary ends up owning `validate-contracts.mts` after
   the root package.json/bun.lock merge (SLICE-2). Lowest short-term risk,
   but leaves a permanent two-compiler-version split inside one lockfile,
   which SLICE-2's "no version conflicts left unresolved" AC-2 will need to
   explicitly carve out and document as an intentional exception rather than
   an oversight.
2. **Replace `openapi-typescript`** with a tool whose OpenAPI-to-TS codegen
   doesn't route through the legacy compiler API (or vendors its own
   TS-version-independent parser). Removes the split cleanly but is new
   tool-adoption risk on a load-bearing contract-validation path
   (`validate-contracts.mts`) with no drop-in replacement confirmed yet —
   needs a spike before it can be the accepted option.
3. **Dual-install via a nested/workspace-scoped `typescript@6`** resolved
   only inside the `openapi-typescript` invocation (e.g. `bunx --package
   typescript@6 ...` or a subpackage with its own lockfile entry), keeping
   the root `bun.lock` and `tsconfig.json` on tsc 7/NodeNext untouched.
   Avoids polluting the unified root config that SLICE-3's AC-3 depends on,
   at the cost of one more moving part in CI.

None of these can be inferred from the description alone — the tradeoff is
between accepting a permanent version-pin exception (option 1), taking on
unverified tool-replacement risk (option 2), or adding invocation-scoped
isolation (option 3). SLICE-1's ADR must record which was chosen and why the
other two were rejected before SLICE-2/SLICE-3 proceed, since both later
slices assume a single resolved answer to "does the merged repo carry one
typescript version or two."
