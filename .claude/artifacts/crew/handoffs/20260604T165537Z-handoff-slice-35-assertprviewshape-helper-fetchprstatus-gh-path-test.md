# Task Handoff: SLICE-35: assertPrViewShape helper + fetchPrStatus gh path tests

- Created: 2026-06-04T16:55:37.040Z
- From: builder
- To: lead
- Objective: Added assertPrViewShape exported helper to pr-fixer.mts, wired it into fetchPrStatus after JSON.parse, and added 9 new tests covering gh_unavailable, schema validation, and shape-assertion unit tests.
- Allowed Scope:
  - src/scripts/lib/pr-fixer.mts and src/tests/pr-fixer.test.mts only; FEAT-037 Issues #6 + #7
- Forbidden Scope: -
- Deliverable: assertPrViewShape(parsed) exported from pr-fixer.mts; fetchPrStatus split try/catch to propagate shape errors; 9 new tests in pr-fixer.test.mts
- Changed Files:
  - src/scripts/lib/pr-fixer.mts
  - src/tests/pr-fixer.test.mts
- Confidence: high
- Risks: none
- Suggested Next Handoff: loop:slice-complete SLICE-35; promote FEAT-037 to done

