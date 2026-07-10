---
id: PM-REVIEW-FEAT-251
feature: FEAT-251
reviewed_at: 2026-07-10
pm_customer_impact: 0.45
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-251

## Demand Assessment

- **Evidence:** Source plan .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md 'Acceptance (whole program)': 'Flipping taskStore.provider/providers between noop|github|linear|composite changes all publish+sync behavior, zero code edits.' Currently false: getProvider() is called ONLY at loop.mts:1918-1920 (github sync|bootstrap); re-grepped and confirmed loop.mts:815, 1338, 1454, 1893 still call importGithubSync('github-sync.mjs') directly, bypassing the provider switch entirely for auto-publish + the setup|publish|feat-publish|status subcommands.

## Scope Challenge

- **Scope notes:** Smallest deliverable is exactly what's scoped: migrate the 4 confirmed call sites (loop.mts:815/1338/1454/1893) plus the github subcommand handlers onto getProvider(config, repoPath) from src/scripts/lib/task-store/index.mts. Splitting the subcommands out into a separate slice would fragment a single-module PR without reducing real risk, so not recommended. Cost analog: FEAT-242/SLICE-143 (.claude/artifacts/crew/cost/20260709T200437Z-cost-report-slice-feat242-slice143.md) — single-module, contained resolver-adjacent change, $9.85 / 51 min actual. Not a perfect analog (SLICE-143 was watcher tick/registry, this is call-site rewiring) but similar in shape and confirms effort_estimate 0.35 is not an underestimate for a mechanical 4-site swap in one file. Weak grade dimensions (last-5 avg per loop-snapshot.md): none below 0.80 (observability lowest at 0.82) — Framework 4 does not force an additional observability/reliability AC here.

## Scores

- customer_impact: 0.45
- effort_estimate: 0.35
- strategic_alignment: 0.70
- technical_risk: 0.35
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Contained getProvider call-site swap; re-grep reconfirmed all 4 anchors despite the plan's own noted line-number drift; technical_risk 0.35 sits at the top of the 0.3-0.5 band (one module, no schema change, explicit parity test required) — confirmed, not adjusted. Realizes the program's headline zero-code-edit provider-flip AC. P2 confirmed.

## Risks

- Line-number anchors in the source plan drift (review F8 note, explicitly called out in the plan itself: 'line-number anchors in this doc drift — re-grep... before Phase 1 code, do not trust cited numbers verbatim'). Re-grep confirmed actual call sites are loop.mts:815/1338/1454/1893, not the plan's approximate ~1002/1343/1459 — a builder trusting the stale numbers verbatim could patch the wrong block; AC-1/AC-4 require an explicit re-grep step before edit.
- Behavior-parity regression risk: if getProvider's GithubProvider wrapper (src/scripts/lib/task-store/providers/github-provider.mts) doesn't preserve identical error-handling/return shape to the direct importGithubSync('github-sync.mjs') call at all 4 sites, a github-enabled repo's mirror could silently diverge (e.g. different issue body formatting) with no existing test catching it — AC-1 and AC-4 exist specifically to close this gap with a parity test and a regression-guard grep test.
