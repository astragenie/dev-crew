---
id: FEAT-175
status: done
priority: P3
category: competitor-gap
target_release: null
created: 2026-06-10
updated: 2026-06-13
depends_on: []
slices: [SLICE-125]
derived_from: null
github_issue: 92
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/92"
pm_customer_impact: 0.45
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.65
pm_technical_risk: 0.5
pm_dependency_depth: 0.3
composite_score: 0.5375
autonomous_safe: false
triage_notes: "via=pm | Debt not feature; no weak-dim address. Generic AC, needs test fixtures + gate-severity thresholding. P3; consider manual subcommand vs blocking CI gate."
started_at: 2026-06-13
slices_complete: [SLICE-125]
completed_at: 2026-06-13
---
# FEAT-175: Artifact link-integrity checker and graph emitter for FEAT/SPEC/DEC/slice cross-links

Competitor gap (Maestro v0.15.3). Maestro ships a Document Graph: interactive visualization of markdown wiki-link relationships with orphan detection. Loop's artifact corpus (FEAT <-> SPEC <-> DEC <-> slice <-> grade linkage in frontmatter and bodies) has no validation - broken or orphaned links rot silently as files move between state directories. Proposal: a loop CLI subcommand that walks all artifacts, validates every cross-reference (frontmatter linkage arrays, declined_per clause ids, supersedes chains, spec derivation), reports broken/orphaned links, and emits a Mermaid graph of the artifact topology. Candidate CI gate alongside validate-manifests. Scoring: impact 2 / effort 1 / fit 3 (composite 6).