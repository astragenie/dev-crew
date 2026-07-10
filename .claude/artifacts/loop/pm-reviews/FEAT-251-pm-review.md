---
id: PM-REVIEW-FEAT-251
feature: FEAT-251
reviewed_at: 2026-07-09
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

- **Evidence:** Plan Phase 2 (.claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md:142-145): 'After this FEAT, taskStore.provider is the single switch for ALL mirror traffic' -- the core 'flip provider, zero code edits' whole-program AC (plan line 219-220) is unrealized until this FEAT routes the bypass call sites through getProvider(). Review finding 8 independently confirms the getProvider call-site citation itself has already drifted (1923 -> 1920), underscoring the re-grep-before-code instruction in the plan's own header note.

## Scope Challenge

- **Scope notes:** Smallest deliverable: route the 3 loop.mts auto-publish call sites (plan-cited ~1002/1343/1459, explicitly flagged as drifted -- must re-grep, not trust) plus the four github setup|publish|feat-publish|status subcommands through getProvider(). Explicitly independent of FEAT-250 per plan text: 'Independent of the BacklogStore refactor (publish path does not touch backlog-writer).' No weak grade dimensions to target. Cost analog: SLICE-14 cost report ($7.3878, 15.0 min, 3 sessions, 99% cache hit) built the getProvider resolver + NoopProvider + LinearProvider stub itself -- a related but larger greenfield task. This FEAT only consumes the already-existing resolver at new call sites, so actual cost should undershoot SLICE-14's $7.39, supporting effort 0.35 (3 pts) rather than higher.

## Scores

- customer_impact: 0.45
- effort_estimate: 0.35
- strategic_alignment: 0.70
- technical_risk: 0.35
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Contained, one-module (loop.mts) call-site swap onto an already-existing getProvider() resolver in task-store/index.mts; technical_risk 0.35 (top of 0.3-0.5 band: one module, no schema change, explicit behavior-parity test required by the plan itself, clean rollback); realizes the program's headline 'flip provider, zero code edits' AC -> P2.

## Risks

- Line-number anchors in the plan for loop.mts auto-publish sites (~1002/1343/1459) are stated as drifted by the plan itself (review finding 8) -- builder must re-grep, not trust the cited numbers.
- github.enabled back-compat regression: if the getProvider() reroute changes resolution order for repos that set github.enabled: true without an explicit taskStore.provider, existing installs could silently stop publishing -- needs an explicit back-compat test, not just a behavioral read-through of the diff.
