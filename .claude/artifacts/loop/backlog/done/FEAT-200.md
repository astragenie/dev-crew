---
id: FEAT-200
status: done
priority: P2
category: quality
target_release: 0.50.1
created: 2026-06-11
updated: 2026-06-13
completed_at: 2026-06-13
depends_on: []
slices_complete: [SLICE-132]
derived_from: docs/superpowers/plans/2026-06-11-lead-dispatch-discipline-diagnostic.md
tags: [discipline, lead-orchestration, slice-frontmatter]
pm_customer_impact: 0.55
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.8
pm_technical_risk: 0.55
pm_dependency_depth: 0.6
composite_priority: P2
autonomous_safe: true
ac_clarity_status: passed
needs_ac_rewrite: false
acClarity:
  rewrite: false
  rewriteDispatchOk: true
scopeNotes: |
  AC rewritten to Given-When-Then form by loop:spec-writer 2026-06-13.
  Rule table conflict-resolution order is now explicit: HIGH wins over LOW
  when both sets of conditions are satisfied (e.g. concern:security + docs-only
  resolves to HIGH). Unknown/absent tags and missing PM score fields default
  gracefully — no throw, treat absent scores as 0. Frontmatter parser
  (frontmatter.mts line 55, SCALAR_NUMBER_RE) already converts pm_technical_risk
  and pm_customer_impact to numbers; no separate coercion needed.
  Paired hero-crew agents/lead.md edit remains out of scope.
risks:
  - Cross-repo coordination — paired hero-crew agents/lead.md PR not tracked in depends_on
  - Rule-table conflict now defined (HIGH wins), but needs a DEC entry at slice time
started_at: 2026-06-13
github_issue: 274
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/274"
---
# FEAT-200: Pre-compute slice risk at `slice from-feature` time — remove manual classification from lead

## Description

Crew:lead's Golden Path step 2 ("Classify risk") asks lead to read FEAT tags + heuristics and assign `risk: low | medium | high`. That risk tier drives dispatch budget, artifact set, and gate ladder.

The classification is a judgment call. Every judgment call lead makes is a rationalization surface — a place where lead can decide to "verify the risk myself" by running Bash, reading source, or otherwise self-implementing instead of dispatching. Two recent recurring discipline failures (learnings ID 3 `lead-refuses-dispatch` + ID 4 `lead-post-builder-bash-validation`) both started with lead "just checking" before dispatching.

The classification inputs already exist in FEAT frontmatter:
- `tags` (e.g. `surface:schema`, `surface:api`, `concern:security`, `concern:governance`)
- PM scores (`pm_technical_risk`, `pm_customer_impact`, `pm_strategic_alignment`)
- `category` (security, perf, quality, etc.)
- `priority` (P0–P3)

Compute the risk tier deterministically from these at `loop slice from-feature` time, write it into the slice file's frontmatter as a top-level `risk:` field, and update lead's prompt to **read** the risk instead of classifying it.

## Acceptance Criteria

**AC-1 — HIGH trigger via security tag**

Given a FEAT frontmatter where `tags` includes `concern:security` (e.g. `tags: [concern:security, workflow]`) and `pm_technical_risk` is `0.4` and `pm_customer_impact` is `0.5` and `category` is `quality` and `priority` is `P2`,
When `classifyRisk(feat)` is called,
Then it returns `"high"`.

**AC-2 — HIGH trigger via pm_technical_risk threshold**

Given a FEAT frontmatter where `tags` is `[]` and `pm_technical_risk` is `0.75` and `pm_customer_impact` is `0.3` and `category` is `quality` and `priority` is `P2`,
When `classifyRisk(feat)` is called,
Then it returns `"high"`.

**AC-3 — LOW trigger via docs category with low scores**

Given a FEAT frontmatter where `category` is `"docs"` and `pm_technical_risk` is `0.2` and `pm_customer_impact` is `0.3` and `tags` is `[]` and `priority` is `P2`,
When `classifyRisk(feat)` is called,
Then it returns `"low"`.

**AC-4 — MEDIUM default (no special tags or scores)**

Given a FEAT frontmatter where `tags` is `[]` and `pm_technical_risk` is `0.5` and `pm_customer_impact` is `0.5` and `category` is `quality` and `priority` is `P2`,
When `classifyRisk(feat)` is called,
Then it returns `"medium"`.

**AC-5 — `slice from-feature` writes `risk:` into the generated slice frontmatter**

Given a FEAT with `tags: [discipline]` and `pm_technical_risk: 0.55` in `.claude/artifacts/loop/backlog/triaged/FEAT-NNN.md`,
When `bun src/scripts/loop.mts slice from-feature --repo <path> --id FEAT-NNN` is run,
Then the generated slice file contains a `risk:` frontmatter field whose value is one of `low`, `medium`, or `high`.

**AC-6 — Missing or unknown tags and absent PM scores default gracefully**

Given a FEAT frontmatter where `tags` is absent, `pm_technical_risk` is absent, `pm_customer_impact` is absent, and `category` is absent,
When `classifyRisk(feat)` is called,
Then it returns `"medium"` without throwing.

**AC-7 — Test suite covers every HIGH trigger variant**

Given `src/tests/risk-classifier.test.mts` exists,
When `bun test src/tests/risk-classifier.test.mts --timeout 60000` is run,
Then all HIGH trigger cases have dedicated passing tests (concern:security, concern:governance, surface:schema, surface:api, pm_technical_risk >= 0.7, category=security, priority=P0, pm_customer_impact >= 0.85), plus LOW, MEDIUM default, and conflict-resolution (concern:security + docs-only → HIGH).

## Rule Table (normative)

Evaluated top-to-bottom. First matching tier wins.

**HIGH** — if ANY of: `tags` includes `concern:security`/`concern:governance`/`surface:schema`/`surface:api`; `pm_technical_risk >= 0.7`; `category === "security"`; `priority === "P0"`; `pm_customer_impact >= 0.85`

**LOW** — if NOT already HIGH, and ANY of: `category === "docs"`; `tags` includes `docs-only`; `pm_technical_risk < 0.3 AND pm_customer_impact < 0.4`

**MEDIUM** — all other cases. Conflict: HIGH wins over LOW unconditionally.

## Why this matters

Removes one of lead's two judgment-call steps in Frame → Classify → Pick → Dispatch. Combined with future moves to pre-compute fanout dispatches and absorb closure into the loop CLI, the path to "lead is a thin router with no rationalization surface" gets shorter.
