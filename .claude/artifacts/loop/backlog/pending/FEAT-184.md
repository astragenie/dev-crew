---
id: FEAT-184
status: pending
priority: P2
category: quality
target_release: null
created: 2026-06-11
updated: 2026-06-11
depends_on: []
slices: []
derived_from: docs/superpowers/plans/2026-06-11-lead-dispatch-discipline-diagnostic.md
tags: [discipline, lead-orchestration, slice-frontmatter]
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
