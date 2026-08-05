---
completed_at: 2026-08-05
status: done
updated: 2026-08-05
---
## Correction — 2026-08-05, scoring premise was wrong

The demand evidence above, and the P1 score resting on it, overstated this
FEAT's urgency. Corrected after builder-203 challenged the premise and I
verified independently.

**Claimed:** all 10 (later 28) currently-pending slices declare `touches_files`
but degrade to `confidence: "missing"` because the reader cannot parse the
writer's inline-array output, so this FEAT gates parallel wave dispatch for the
whole open-slice program.

**Measured:** 0 of 28 pending slices carry a `touches_files:` frontmatter key at
all. 0 FEATs declare `touches_files` inside a `proposed_slices` entry. SLICE-187
(completed) is the only file in the repo that has one — and it is the single
case the original repro was run against.

**Where the error came from:** a slice that declares nothing and a slice that
declares something unparseable both report `confidence: "missing"`. I observed
the symptom across the pending set and attributed all of it to the parser
without checking whether the key was present. Inference from symptom, not
verification — the same failure this FEAT's own body criticizes.

**What remains true:** the parser defect is real and was proven by builder-203's
pre-fix failure (3 tests, `Expected "declared" / Received "missing"`, green
after). A slice that DOES declare `touches_files` is silently downgraded today.
The fix is preventive rather than remedial: it changes the confidence tier of no
on-disk slice right now, and takes effect for slices materialized going forward.

**What actually gates wave parallelism** is a producer gap, not this parser —
see FEAT-292. `agents/pm.md:45` instructs the PM that `touches_files` is
"conservative-only ... When unsure, omit the field entirely; it is never
required." The PM therefore always omits it, so the wave planner never receives
data regardless of whether the reader works. Same producer/consumer shape as
FEAT-290.

Re-scoring is warranted: customer_impact 0.75 was justified by a gating claim
that does not hold. The defect-class value (silent writer/reader mismatch on a
hot path) still supports keeping this fixed, at lower urgency.
