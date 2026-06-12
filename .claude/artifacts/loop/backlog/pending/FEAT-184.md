---
id: FEAT-184
status: pending
priority: P2
category: quality
target_release: null
created: 2026-06-11
updated: 2026-06-12
depends_on: []
slices: []
derived_from: docs/superpowers/plans/2026-06-11-lead-dispatch-discipline-diagnostic.md
tags: [discipline, lead-orchestration, slice-frontmatter]
pm_customer_impact: 0.55
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.8
pm_technical_risk: 0.55
pm_dependency_depth: 0.6
composite_priority: needs-review
autonomous_safe: false
acClarity:
  rewrite: true
  rewriteDispatchOk: false
scopeNotes: |
  AC clarity gate FAILED. AC are presented as "Acceptance hints" with explicit
  hedging ("final ordering to be confirmed in slice plan"). Edge cases not
  covered: missing PM scores, conflicting tags (e.g. concern:security +
  docs-only), invalid frontmatter shape, paired hero-crew PR not merged.
  Not in Given-When-Then form. Per agents/pm.md gate step 4, dispatched
  loop:spec-writer to rewrite — DISPATCH FAILED because the Agent tool
  schema was not surfaced in this PM dispatch's tool environment (ToolSearch
  query "select:Agent" returned no match; only Task* deferred tools were
  loaded). Per gate step 6 this escalates to needs-review. Operator must
  re-run /loop:retriage with PM granted the Agent tool, or manually dispatch
  loop:spec-writer to rewrite the AC before this FEAT can be scored
  authoritatively. ID COLLISION: done/FEAT-184.md (telemetry writer,
  shipped via SLICE-92, GitHub issue 204) already uses this ID — this
  pending FEAT-184 should likely be renumbered to FEAT-200+ before
  triage. Cost analog: FEAT-025 SLICE-B (auto-walker risk gate +
  preflight) ran $11.17 / 25 min — pure-logic gate work supports
  effort_estimate ~0.4 if scope holds. Weak dimensions: observability
  averages 0.82 over last 5 grades but this is expected-low for
  plugin-dev stack per project memory; no weak-dim AC required.
  All other dimensions ≥ 0.84.
risks:
  - AC rewrite blocked because Agent tool unavailable in this PM dispatch surface
  - ID collision with done/FEAT-184 (telemetry writer SLICE-92 / GH-204) — backlog hygiene risk
  - Cross-repo coordination — paired hero-crew agents/lead.md PR not tracked in depends_on
  - Rule-table ordering TBD — conflict resolution between HIGH and LOW triggers undefined (e.g. concern:security + docs-only)
  - Frontmatter parser limitation noted in SLICE-98 lessons (feature-lifecycle.mts:282-290) may affect reading PM score fields for the classifier
---
# FEAT-184: Pre-compute slice risk at `slice from-feature` time — remove manual classification from lead

## Description

Crew:lead's Golden Path step 2 ("Classify risk") asks lead to read FEAT tags + heuristics and assign `risk: low | medium | high`. That risk tier drives dispatch budget, artifact set, and gate ladder.

The classification is a judgment call. Every judgment call lead makes is a rationalization surface — a place where lead can decide to "verify the risk myself" by running Bash, reading source, or otherwise self-implementing instead of dispatching. Two recent recurring discipline failures (learnings ID 3 `lead-refuses-dispatch` + ID 4 `lead-post-builder-bash-validation`) both started with lead "just checking" before dispatching.

The classification inputs already exist in FEAT frontmatter:
- `tags` (e.g. `surface:schema`, `surface:api`, `concern:security`, `concern:governance`)
- PM scores (`pm_technical_risk`, `pm_customer_impact`, `pm_strategic_alignment`)
- `category` (security, perf, quality, etc.)
- `priority` (P0–P3)

Compute the risk tier deterministically from these at `loop slice from-feature` time, write it into the slice file's frontmatter as a top-level `risk:` field, and update lead's prompt to **read** the risk instead of classifying it.

## Acceptance hints

- `src/scripts/lib/risk-classifier.ts` exports `classifyRisk(feat: FeatFrontmatter): "low" | "medium" | "high"`. Pure function, no I/O.
- Rule sketch (final ordering to be confirmed in slice plan):
  - HIGH if any of: `concern:security` · `concern:governance` · `surface:schema` · `surface:api` · `pm_technical_risk >= 0.7` · `category == security` · `priority == P0` · `pm_customer_impact >= 0.85`.
  - LOW if any of: `category == docs` · `tags` contains `docs-only` · diff is comment/CHANGELOG-only · `pm_technical_risk < 0.3` AND `pm_customer_impact < 0.4`.
  - MEDIUM otherwise.
- `loop slice from-feature` writes the computed value as `risk:` in the new slice file's frontmatter. Existing slice file template gains a `risk: medium` placeholder for slices created without a parent FEAT.
- Tests cover the rule table — every HIGH trigger, every LOW trigger, MEDIUM default.
- `crew:lead`'s `agents/lead.md` (in the hero-crew repo) drops the "Classify risk" step from the Golden Path. Risk-based tier table stays as a lookup table; new instruction is "read `risk:` from slice frontmatter, look up budget + artifacts + ladder in the table". The hero-crew change is a paired PR; this FEAT tracks the loop-side work.
- Document the rule table in `docs/specs/` (or equivalent) so the deterministic mapping is auditable.

## Why this matters

Removes one of lead's two judgment-call steps in Frame → Classify → Pick → Dispatch. Combined with future moves to pre-compute fanout dispatches and absorb closure into the loop CLI, the path to "lead is a thin router with no rationalization surface" gets shorter.

Linked to the dispatch-discipline diagnostic plan (hero-crew) — counted as intervention N7 in that doc once it's amended.

## Notes

autonomous_safe: tbd at PM triage — risk classifier is pure logic + slice-writer extension (no agent prompt edits on the loop side). The paired hero-crew edit IS an agent prompt edit, so the cross-repo bundle is human-in-loop on review.

Source instruction: hero-crew session 2026-06-11, after dispatch-discipline diagnostic plan author flagged risk classification as a judgment surface.
