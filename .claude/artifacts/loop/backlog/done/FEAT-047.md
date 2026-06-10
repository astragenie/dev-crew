---
id: FEAT-047
status: done
priority: P0
category: workflow
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
autonomous_safe: false
triage_notes: "autonomous_safe: false — touches dispatch critical path; human review required per FEAT notes"
completed_at: 2026-06-05
github_issue: 102
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/102"
---
# FEAT-047: Wire /crew:orchestrate-slice as default dispatchInstruction in slice-start

When the autonomous loop starts a slice via /loop:slice start --id SLICE-NN, it currently emits a generic dispatchInstruction telling the lead to run /crew:build. Now that hero-crew ships /crew:orchestrate-slice, the loop should emit that command instead — so the full tag-driven specialist ladder (architect → uxdesigner → builder → reviewer → validator → copywriter → doc-writer) fires automatically without manual lead assembly. Acceptance criteria: AC-1: slice-start output dispatchInstruction reads /crew:orchestrate-slice --id SLICE-NN instead of /crew:build. AC-2: MIN_CREW_VERSION guard bumped to the hero-crew release that ships /crew:orchestrate-slice (>=0.10.x). AC-3: if installed crew version is below MIN_CREW_VERSION, falls back gracefully to /crew:build dispatch with a warning. AC-4: existing slice-start tests updated/extended to cover new dispatch shape. AC-5: dispatch.mts updated to route through orchestrate-slice when version guard passes.