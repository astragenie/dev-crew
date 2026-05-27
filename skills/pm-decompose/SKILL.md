---
name: loop:pm-decompose
description: Enhanced spec decomposition with PM pre-scoring. Reads a SPEC, identifies natural feature boundaries using scope challenge, pre-scores each proposed feature, and creates FEAT files with priority and autonomous_safe already set. Use instead of /loop:spec-decompose when you want PM-quality features from the start.
---

# PM Decompose — Spec to Scored Features

Split a SPEC into FEAT files with PM scores pre-filled.

## Usage

`/loop:pm-decompose --id SPEC-NNN`

## Steps

1. Read the SPEC file body and frontmatter.
2. Apply Scope Challenge framework to identify natural feature boundaries:
   - What are the independent deliverables?
   - What is the dependency order?
   - Which features can be autonomous vs. need human review?
3. For each proposed feature:
   a. Draft the FEAT title and description.
   b. Pre-score all 5 PM dimensions based on the spec context.
   c. Compute composite priority and autonomous_safe.
   d. Identify dependencies between the proposed features.
4. Present the decomposition to the user (or log if autonomous):
   - Feature list with scores and priorities
   - Dependency graph
   - Which features are autonomous_safe
5. Create FEAT files via `/loop:backlog-add` with PM scores pre-filled.
6. Update the SPEC's `derived_features` list.
7. Write PM review artifacts for each new FEAT.

## Difference from /loop:spec-decompose

`/loop:spec-decompose` creates bare FEAT stubs with no scoring. This skill adds:
- PM scoring on creation (no separate triage step needed)
- Dependency analysis between proposed features
- autonomous_safe pre-computation
- PM review artifacts from day one
