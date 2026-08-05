---
id: FEAT-292
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-05
updated: 2026-08-05
depends_on: []
slices: []
derived_from: null
---
## Description

Wave-mode conflict packing has no data source: touches_files is never produced, so parallel dispatch degrades to solo for every slice.

Measured 2026-08-05: 0 of 28 pending slices carry a touches_files frontmatter key, and 0 FEATs declare touches_files inside a proposed_slices entry. SLICE-187 (completed) is the only file in the repo that has one. packWave treats confidence: missing as unpackable and defers such candidates to solo dispatch, so wave mode has never had conflict data for essentially any slice.

This is a producer gap, not a parser gap. FEAT-288 fixed a real defect where the reader could not parse the writer's inline-array output, but that fix is preventive: it changes no on-disk slice today because no slice declares the field in the first place. The two were conflated during FEAT-288's triage; see the correction appended to FEAT-288.

Root cause is agents/pm.md:45, which documents proposedSlices[].touches_files as schema-optional and conservative-only: set it ONLY when you already know, from files you actually read this session, the specific repo-relative path(s) that slice will touch. Never guess a plausible-sounding path from the title alone. When unsure, omit the field entirely; it is never required.

That guidance is individually correct — a wrong path is worse than none, because the wave planner uses it to detect or miss real file conflicts between parallel slices, and a fabricated path produces a fabricated conflict verdict. But the aggregate effect is that the field is omitted every time, so the capability it feeds has never functioned. The PM is being asked to declare implementation paths at triage time, before any file has been read for most FEATs, which is structurally the wrong moment to know them.

Defect class: same producer/consumer shape as FEAT-290 (per-slice acceptance_criteria implemented on the consumer side, never populated by the producer) and FEAT-281 (tested-but-never-wired). The consumer is built and tested; nothing feeds it.

Acceptance direction, in preference order. (a) Move the declaration to a moment when the paths are actually known: have the builder or the slice-start step record touches_files after the implementation surface is understood, rather than asking the PM to predict it at triage. A slice that has already been planned knows its files. (b) Alternatively, derive touches_files from the slice body's In scope section, which by convention already names concrete paths, and treat that as an inferred rather than declared confidence tier — note readTouchesFiles already has an inference path and a three-tier confidence model, so the plumbing exists. (c) If neither is viable, accept that wave packing cannot use declared paths and make that explicit, rather than leaving a documented field that is never populated and a planner that silently degrades.

Whichever path is chosen, add a check that reports how many slices in the current backlog carry a usable touches_files value, so this cannot silently return to zero unnoticed.

Related: FEAT-288 (the parser fix and its corrected scoring premise), FEAT-290 (same producer-gap shape), FEAT-281 (defect class), FEAT-276 (which introduced the writer).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.