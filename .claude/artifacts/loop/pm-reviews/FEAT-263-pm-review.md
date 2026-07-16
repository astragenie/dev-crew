---
id: PM-REVIEW-FEAT-263
feature: FEAT-263
reviewed_at: 2026-07-15
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.55
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-263

## Demand Assessment

- **Evidence:** Filed as a concrete GitHub issue (runner-plugin issue #514, cited in the FEAT body) rather than 'users would like'. Live corroboration during THIS PM dispatch: the mcp__plugin_crew_astramem__recall_memory call I issued for this very review timed out after 300s with no response/progress before erroring — the exact 'opaque failure instead of a fast, actionable message' pattern the FEAT describes, reproduced in real time rather than hypothesized.

## Scope Challenge

- **Scope notes:** Smallest deliverable: one small test-infra helper (e.g. under src/tests/lib/ or a shared e2e setup file) that does a raw `fetch('http://127.0.0.1:7777/health', { signal: AbortSignal.timeout(N) })`, maps the response into fail-fast vs proceed, plus the ASTRAMEM_E2E env-toggle branch and a docs paragraph. If forced to halve scope: keep the health GET + timeout + actionable message, drop the ASTRAMEM_E2E skip/require toggle to a follow-up — but the FEAT explicitly asks for both together and they are cheap to co-deliver, so no need to cut here. Overlap check: src/scripts/lib/memory-doctor.mts already exports probeMemory(), a CLI-based health diagnostic (spawns `astramem doctor --json`, 3s AbortController timeout) used by the runner's own dispatch/close ceremony (src/tests/memory-doctor.test.mts pins its cases). It is NOT a duplicate of this FEAT's ask: its own header comment states the doctor --json payload 'never reports whether the local/saas probe actually succeeded' and mapDoctorOutput() 'never returns ok' by design — it cannot answer 'is the daemon actually up' the way a direct GET /health can. FEAT-263 targets a different seam (MCP-tool e2e test preflight, HTTP-direct) and is complementary, not redundant; the builder should reference memory-doctor.mts's AbortController-timeout pattern for consistency but must not conflate the two health signals. AC clarity: original FEAT body prose was scope-clear but not testable Given-When-Then; ACs rewritten inline below per the AC quality checklist (concrete timeout/status/env values, explicit edge/error coverage). Weak-dimension check (Framework 4): loop-snapshot.md's last-5 grade averages are all >= 0.80 (architecture_quality 0.846, reliability 0.86, observability 0.82, production_readiness 0.872, security 0.88, test_confidence 0.914, product_completeness 0.844) — no weak dimension currently active, so no mandatory weak-dimension AC was required; AC-7 (docs) and the timeout-bound AC were added anyway on general test-reliability grounds. Effort analog (Framework 5): closest comparable is FEAT-244/SLICE-148 (single-repo, non-aggregate, $10.30 / 43 min, small single-purpose module) — a similarly-scoped single-helper-plus-docs slice; effort_estimate 0.2 is consistent with that analog. FEAT-257/SLICE-159 ($140/52min) was also reviewed but rejected as an analog — it's a 4-source aggregate cross-repo provider-migration slice, an order of magnitude larger scope than a single health-check helper.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.20
- strategic_alignment: 0.55
- technical_risk: 0.30
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: P2, autonomous-safe test-infra quick win: technical_risk lands in the 0.3-0.5 band (new pattern — raw HTTP fetch-with-timeout — confined to one test-infra module, no contract/schema change, trivially git-revertible), effort_estimate 0.2 confirmed against the FEAT-244/SLICE-148 cost analog (single small module), dependency_depth 0.1 (no depends_on, no blocking FEATs found via grep). customer_impact/strategic_alignment scored moderate (0.55 each) rather than low because there's a real filed issue plus a live-reproduced failure mode during this very dispatch, but impact is scoped to developers/agents running the memory e2e suite, not end-product users, which caps it below P0/P1 territory. Effort well under the 8-point decomposition-gate threshold, so no proposedSlices emitted.

## Risks

- The exact GET /health response contract (status field name, the {ok,starting,degraded} enum, path) is taken from FEAT-263's prose, not verified against astramem-local's actual server source (that package lives outside this repo's tree — no /health route was found under src/ or docs/ here). If the real daemon's health payload shape differs, the builder's parsing logic will silently produce false negatives/positives; the builder should confirm the contract against the astramem-local source or a live daemon response before finalizing, and AC-1/AC-3 should be treated as provisional on that confirmation.
- Default-to-skip semantics for an unset/falsy ASTRAMEM_E2E could mask a genuinely broken daemon in CI if no CI lane ever sets ASTRAMEM_E2E=require — the memory e2e suite would report all-green while silently never having exercised the daemon path. Recommend at least one CI lane (or a documented local pre-push step) runs with ASTRAMEM_E2E=require so regressions in this preflight itself get caught.
- Coverage gap: none of the existing tests (memory-doctor.test.mts covers the CLI-based probeMemory() path only) would catch a regression in a new direct-HTTP health check — this is a genuinely new code path with zero existing test coverage, so the slice's own AC (and resulting tests) are the only backstop; no pre-mortem template was mandatory here (technical_risk 0.3, priority P2) but this gap is worth naming since it's a net-new external-call code path.
