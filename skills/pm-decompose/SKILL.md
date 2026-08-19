---
name: pm-decompose
prompt_id: pm-decompose
version: 1.0.0
tier: workflow
description: Enhanced spec decomposition with PM pre-scoring. Reads a SPEC, identifies natural feature boundaries using scope challenge, pre-scores each proposed feature, and creates FEAT files with priority and autonomous_safe already set. Use instead of /devcrew:spec-decompose when you want PM-quality features from the start.
---

# PM Decompose — Spec to Scored Features

Split a SPEC into FEAT files with PM scores pre-filled.

## Usage

`/devcrew:pm-decompose --id SPEC-NNN`

## Steps

1. Read the SPEC file body and frontmatter.
2. Apply Scope Challenge framework to identify natural feature boundaries:
   - What are the independent deliverables?
   - What is the dependency order?
   - Which features can be autonomous vs. need human review?
3. For each proposed feature:
   a. Draft the FEAT title and description.
   b. Run the INVEST check from `devcrew:authoring-slices` — a proposed
      feature failing Independent / Small / Testable gets re-cut before
      scoring, not patched with caveats.
   c. Draft acceptance criteria per the AC quality checklist in
      `devcrew:authoring-slices` (Given-When-Then, concrete values, edge +
      error coverage). If the spec context is too thin to write AC to
      that standard, draft them inline yourself per the "AC drafting
      rules" in `agents/pm.md` — the standalone `devcrew:spec-writer`
      agent was retired and absorbed into PM (FEAT-277); there is no
      separate agent to dispatch for this.
   d. Pre-score all 5 PM dimensions based on the spec context.
   e. Compute composite priority and autonomous_safe.
   f. Identify dependencies between the proposed features.
4. Present the decomposition to the user (or log if autonomous):
   - Feature list with scores and priorities
   - Dependency graph
   - Which features are autonomous_safe
5. Create FEAT files via `/devcrew:backlog-add` with PM scores pre-filled.
6. Update the SPEC's `derived_features` list.
7. Write PM review artifacts for each new FEAT.

## Difference from /devcrew:spec-decompose

`/devcrew:spec-decompose` creates bare FEAT stubs with no scoring. This skill adds:
- PM scoring on creation (no separate triage step needed)
- Dependency analysis between proposed features
- autonomous_safe pre-computation
- PM review artifacts from day one
