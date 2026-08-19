---
id: PM-REVIEW-FEAT-007
feature: FEAT-007
reviewed_at: 2026-08-19
pm_customer_impact: 0.55
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.65
pm_technical_risk: 0.4
pm_dependency_depth: 0.15
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-007

## Demand Assessment

- **Evidence:** FEAT body cites a concrete, previously-observed defect: dotnet-only.json/dotnet-react.json/dotnet-typescript-vue.json referenced skill ids (csharp-pro, react-engineering, frontend-advisory, a11y-advisory, vue-engineering) that were removed when crew reorganized into skills/domain/ -- those presets silently no-op today instead of failing loudly. SLICE-195 (live catalog enumerator) already shipped in runner-plugin; the remaining matcher/CLI/validation-gate/DEC work is now cheaper post-merge since the crew<->runner cross-plugin seam this FEAT bridged no longer exists.

## Scope Challenge

- **Scope notes:** Smallest deliverable: task-signal (stack:*/concern:*/surface:*) to skill mapping table plus a resolve-time validation gate that fails loudly on a resolved-but-absent skill id -- that alone fixes the dead-ID defect. CLI --slice/--tags wiring and the DEC to decommission preset.roles.*.skills can follow in the same slice since they share the same matcher. The old cross-plugin docs/upstream-request amendment scope (former SLICE-198) is explicitly dropped as moot post-merge. Carry forward the corrected-drift-measurement lesson from runner-plugin FEAT-230: catalog enumeration must recurse and key on SKILL.md basename, not a flat top-level listing, or the validation gate will itself false-positive on live nested skills.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.50
- strategic_alignment: 0.65
- technical_risk: 0.40
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Real, evidenced correctness defect (dead skill ids silently no-op) with meaningfully reduced scope now that the cross-plugin seam is gone; bounded to one module area with a known-pattern matcher/CLI/validator shape, so P2/autonomous-safe with no cost analog beyond the general SLICE-24 validator-hardening pattern ($26, avg 0.924).

## Risks

- A flat (non-recursive) catalog scan in the new validation gate would reproduce the exact false-negative 'missing skill' bug this FEAT exists to fix -- guard with a fixture test asserting a nested skills/domain/* entry resolves.
- Decommissioning preset.roles.*.skills as the skill source without a DEC and a compat window could silently change resolution behavior for any adopter repo still on preset-driven resolve-skills.
