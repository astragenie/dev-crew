---
id: PM-REVIEW-FEAT-245
feature: FEAT-245
reviewed_at: 2026-07-09
pm_customer_impact: 0.55
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.4
pm_dependency_depth: 0.3
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-245

## Demand Assessment

- **Evidence:** Plan quote (2026-07-07-watcher-implementation-plan.md:176-195, C1 section): 'Separate port in watcher subsystem — NOT TaskStoreProvider.createIssue (arch review: ISP violation; task-store is repo-bound lifecycle sync, target repos may have no loop config at all).' This is a direct architect-reviewer design mandate, not a hypothetical want. Idempotency contract is explicitly cited as 'arch review risk #3' (line 187-188). Verified in repo: TaskStoreProvider exists (src/scripts/lib/task-store/provider-interface.mts, github-provider.mts, linear-provider.mts) confirming the plan's claim that a repo-bound provider already exists and the ISP concern (using it for a target repo with no loop.json) is real, not fabricated. Stakeholder: the same fleet operator persona as FEAT-242/246, specifically for the C-track cross-repo root-cause-filing capability.

## Scope Challenge

- **Scope notes:** Smallest deliverable: fileIssue() + idempotency check (AC-1/AC-3) without the full concurrency test — AC-4 is already scoped by the plan itself as documentation-only ('a concurrency test asserting both calls complete without error and documenting (not necessarily preventing) the possible duplicate,' per COND-6), so this FEAT's minimum viable scope is already close to its full scope; the LinearProvider composition slot (mentioned as 'later') is correctly out of scope and deferred to C2, which is explicitly not filed as a FEAT yet ('C2 explicitly deferred with no FEAT filed yet,' ACs artifact line 317). Overlap check: confirmed IssueBroker is a genuinely new port, not a rename of TaskStoreProvider.createIssue (grepped task-store/ modules — createIssue exists on TaskStoreProvider today but is explicitly NOT to be reused per the ISP argument) — no duplicate-capability risk. AC clarity: strong — AC-1 through AC-5 are Given-When-Then, each with named test evidence (success/failure-path unit tests, a test with no loop.json present, an exactly-once gh issue create assertion, a concurrency test that documents rather than prevents the COND-6 residual risk, and a GithubProvider-only coverage note for the LinearProvider slot). Effort calibration: no cost analog (see FEAT-242 note); effort_estimate 0.35 (2 slices, 1-1.5 days per the plan's ETA table) maps to 3 Fibonacci points via pm-effort-mapper.mts — below the FEAT-168 decomposition threshold.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.35
- strategic_alignment: 0.70
- technical_risk: 0.40
- dependency_depth: 0.30

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: P2: enables cross-repo watcher value (Track C) with a clear architect-mandated design (ISP-driven port separation), moderate effort (3 points), moderate technical_risk (0.4, one new module, no contract change) — solidly useful but secondary to shipping FEAT-242 first, consistent with the plan's own sequencing (B1 -> B1.5 gate -> C1 -> C3).

## Risks

- Technical-risk band rationale (0.4, new-pattern-in-repo band 0.3-0.5): IssueBroker is a new port composing an existing GithubProvider implementation — one new module, no contract change to TaskStoreProvider (deliberately not touched), clean git-revert rollback since it's additive.
- Accepted residual risk (COND-6, explicit in the plan, not invented here): 'two DIFFERENT source repos detect the same root cause in target repo B within the search-before-create race window... Worst case is a duplicate ticket (not corrupted state); acceptable at this scale.' This is a plan-level accepted risk, not a gap in this FEAT's scope — AC-4 documents rather than prevents it, matching the plan's explicit framing.
- Dependency risk: this FEAT depends on FEAT-242's registry shape (ghSlug keying) existing — per the plan, 'no dependency on B1.5's outcome,' so it can be built in parallel with the pilot soak once FEAT-242 merges, but a registry schema change mid-FEAT-242-slicing (unlikely but possible given FEAT-242's own decomposition) would require a rebase of this FEAT's fileIssue() keying logic.
- Cascade risk (Framework 3, retry/dispatch path): the idempotency contract (title-hash + loop-filed label + search-before-create) is a retry-suppression mechanism — a bug here (e.g. a hash collision or a label-write failure that doesn't roll back) could cause the exact failure mode C1 exists to prevent: 'a persisting root cause must NOT be re-filed every 5 minutes,' spamming the target repo's issue tracker on every tick.
