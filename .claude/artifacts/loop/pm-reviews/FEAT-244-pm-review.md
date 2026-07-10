---
id: PM-REVIEW-FEAT-244
feature: FEAT-244
reviewed_at: 2026-07-09
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.65
pm_technical_risk: 0.3
pm_dependency_depth: 0.3
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-244

## Demand Assessment

- **Evidence:** Plan quote (2026-07-07-watcher-implementation-plan.md:166-174, B3 section): 'Fine-grained least-privilege PAT for watcher gh calls: per-org/repo allowlist, issues:write only where filing is needed, separate from operator's personal token... Always-on LLM-driven automation must not hold a broad-write token — this item gates fleet rollout same as B1.5.' Also plan line 48-50: 'Permissions: pre-configured allowlist for headless runs (settings permissions / --allowedTools). NEVER --dangerously-skip-permissions.' Stakeholder: opus architect-reviewer, whose approval was conditioned on this scoping existing before fleet rollout, and the repo's own Safety clause (CLAUDE.md 'Safety' section: 'Never disable hooks... without explicit user request') which this FEAT's AC-3 directly operationalizes for headless sessions. ACs artifact (line 179-184) recommends autonomous_safe:true for the code-side half only, explicitly splitting PAT provisioning (human) from allowlist wiring (loop-buildable) — I concur with this split and the recommendation.

## Scope Challenge

- **Scope notes:** Smallest deliverable: AC-3 alone (grep/lint check + unit test that constructed spawn args never include --dangerously-skip-permissions) is the safety-critical minimum; AC-2 (unreachable-repo 403/404 resilience) is cheap and prevents a full-tick crash, so I recommend keeping it rather than cutting it, but if forced to halve scope AC-2 is the piece to defer. No overlap: grepped for existing allowlist/permission-scoping modules under src/scripts/lib — none found; this is genuinely new but narrow surface area (spawn call sites created by FEAT-242, which do not exist yet — this FEAT is correctly scoped as depending on FEAT-242's spawn call sites, per its own body text 'Depends on FEAT-242 (B1) spawn call sites existing'). AC clarity: good — AC-2 and AC-3 (the two ACs actually in this FEAT's scope, per the ACs artifact's explicit FEAT-split note) are Given-When-Then with concrete evidence (403/404 simulation test, grep+unit-test combo for the flag ban). The PAT-provisioning AC-1/AC-4 from the B3 section belong to the human checklist half and are correctly NOT this FEAT's scope, per the FEAT body's own framing — this matches the ACs artifact's explicit note (line 363) that 'B3's PAT-provisioning half has no AC in the testable sense at all... noted in the FEAT split above.' Weak-dimension check: security averages 0.88 (last-5 grades) — above the 0.80 weak threshold, but given this FEAT is itself a security-hardening item, no divergence from the recommendation is warranted regardless. Effort calibration: no cost analog (see FEAT-242 note on aggregate-report limitations); effort_estimate 0.2 (1 slice, 0.5 day per the plan's own ETA table) maps to 2 Fibonacci points via pm-effort-mapper.mts — no decomposition gate concern.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.20
- strategic_alignment: 0.65
- technical_risk: 0.30
- dependency_depth: 0.30

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: P2: important security-gating item for fleet rollout but small, narrowly-scoped, and not on the B1.5 pilot's critical path (can build in parallel with B1 per the plan's own ETA table note). technical_risk 0.3 and priority P2 — pre-mortem not mandatory, but cascade risk named per Framework 3 given this touches the headless-dispatch permission surface directly.

## Risks

- Technical-risk band rationale (0.3, new-pattern-in-repo band 0.3-0.5, low end): the allowlist-enforcement pattern (grep over spawn call sites + unit test asserting no --dangerously-skip-permissions flag) is new to this repo but touches only the spawn call sites FEAT-242 creates — 1-2 files, no new external dependency, clean git-revert rollback.
- Dependency risk: this FEAT cannot be meaningfully built or tested until FEAT-242's spawn call sites exist — if FEAT-242's slice-1/slice-2 land with a different spawn-invocation shape than assumed here (e.g. spawn wrapped in a helper vs. inlined per call site), this FEAT's grep/lint check may need rescoping; sequencing them as FEAT-242 slice-1 or slice-2 lands before this FEAT starts is recommended.
- Cascade risk (Framework 3): this FEAT is explicitly a safety backstop against Layer 2's always-on headless `claude -p` reaction sessions escalating privilege — a gap here (e.g. a spawn call site added later that isn't covered by the grep check) would let a future watcher code path silently regain --dangerously-skip-permissions, defeating the entire point of B3; recommend the grep check be structured as a deny-list assertion over the whole spawn-call surface (not an allow-list of known-good call sites) so new call sites are caught by default rather than requiring an opt-in addition to the check.
