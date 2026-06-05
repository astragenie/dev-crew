---
id: FEAT-048
status: triaged
priority: P1
category: workflow
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
autonomous_safe: false
triage_notes: "P1 workflow — orchestrate-slice ladder routes incorrectly for all features lacking tags; affects all repos on v0.7.7+. autonomous_safe: false — touches sliceFromFeature dispatch path, human review required"
---
# FEAT-048: Architect classification tags for features and slices

Acceptance criteria: AC-1: sliceFromFeature auto-dispatches loop:architect to classify the new slice and writes tags, needs_contract, needs_ux to slice frontmatter before returning. AC-2: /loop:backlog-enrich command iterates all triaged features missing tags and runs architect classification pass, writing results to FEAT frontmatter. AC-3: classification is skipped (not an error) when feature/slice already has explicit tags or needs_contract/needs_ux set. AC-4: enrich command prints a summary of how many features were enriched vs already tagged. AC-5: sliceFromFeature enrichment can be skipped via --no-classify flag for speed.