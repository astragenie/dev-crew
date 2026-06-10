---
id: FEAT-053
status: done
priority: P2
category: feature
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: [SLICE-53]
derived_from: null
pm_customer_impact: 0.75
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.6
pm_technical_risk: 0.25
pm_dependency_depth: 0.1
autonomous_safe: true
triage_notes: "Confirmed friction on SLICE-50+51; contained to /loop:slice from-feature scaffold; clear testable ACs"
composite_score: 0.7025
started_at: 2026-06-06
slices_complete: [SLICE-53]
completed_at: 2026-06-06
github_issue: 111
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/111"
---
## Context

Currently /loop:slice from-feature produces a slice scaffold with placeholder ACs:

```
- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)
- [ ] AC-2: \<replace with a concrete, testable acceptance criterion\>
```

The AC linter rejects the placeholder, forcing the operator to manually fill ACs before /loop:slice start can proceed. Both SLICE-50 and SLICE-51 needed manual fill — the lead extracted ACs from the parent FEAT body verbatim or condensed.

## Goal

When the parent FEAT has an Acceptance criteria section, /loop:slice from-feature should auto-derive the slice's first-pass ACs from it. The operator can refine before slice-start, but the initial scaffold should not require a manual rewrite.

## Acceptance criteria

- [ ] /loop:slice from-feature reads the parent FEAT body for an ## Acceptance criteria section
- [ ] When found, the slice scaffold's ## Acceptance criteria block is populated with the FEAT's ACs verbatim (preserving checkbox state — all unchecked)
- [ ] When the FEAT has multiple ACs, slice scoping logic picks the subset relevant to this slice (heuristic: first slice gets all ACs; later slices need slice frontmatter scoping markers, design TBD)
- [ ] When no AC section is found in the FEAT, fall back to the current placeholder (no regression)
- [ ] AC linter still passes — the derived ACs must be testable strings, not placeholder text
- [ ] Tests cover: FEAT with ACs → slice gets them; FEAT without ACs → placeholder fallback; FEAT with malformed ACs → safe degrade

## Notes

GRADE-SLICE-51 lessons: 'Slice scaffold had placeholder ACs; required manual fill on both SLICE-50 and SLICE-51.' Same for GRADE-SLICE-50.