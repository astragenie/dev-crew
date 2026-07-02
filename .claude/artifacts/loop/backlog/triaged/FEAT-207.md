---
id: FEAT-207
status: triaged
priority: P1
category: docs
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [docs]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.6
pm_technical_risk: 0.1
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.0-0.2: pure markdown edits across 1-2 files, trivially reverted. P1: verified-real (not just cited) drift in an always-injected file that every session pays a search-cost tax on, cheap fix, top-10 #4."
---
# FEAT-207: CLAUDE.md drift purge (verified false pointers)

## Problem

Four verified false pointers in always-injected docs:

1. CLAUDE.md cites `commands/slice-review-ladder.md` — file does not
   exist (real impl: `src/scripts/lib/post-builder-fanout.mts` +
   `reviewer-timing.mts`).
2. CLAUDE.md documents the `multidim` reviewer preset — no backing code
   (`grep -rn multidim src/scripts` returns nothing).
3. `commands/intake.md:53,75-76` and CLAUDE.md reference
   `commands/backlog-enrich.md` / retriage — files absent.
4. `docs/upstream-requests/2026-06-10-hero-crew-lead-orchestrator-restoration.md`
   is `status: open` but asks to restore `lead` mode that FEAT-191
   killed for documented cause.

## Acceptance hints

- Every file path referenced in CLAUDE.md resolves.
- multidim section deleted or implemented (delete is the quick win).
- Stale upstream-request closed/superseded with a pointer to FEAT-191.

## Evidence

- Retrospective top-10 #4; F-01 (WP1), WP2 QW4/QW5, WP5 §3 — confirmed
  independently by two researchers.

## Acceptance criteria (Given-When-Then)

- AC-1: Given every file path referenced in CLAUDE.md (e.g. commands/slice-review-ladder.md, commands/backlog-enrich.md, a retriage command doc -- verified absent via ls commands/ and grep -rln multidim src/scripts returning zero matches), When each path is resolved against the actual repo tree, Then every remaining reference in CLAUDE.md either resolves to a real file or is corrected to point at the real implementation (src/scripts/lib/post-builder-fanout.mts + reviewer-timing.mts for the reviewer-ladder logic).
- AC-2: Given the multidim reviewer-preset section under CLAUDE.md's 'Reviewer ladder presets' H2, When the drift purge runs, Then the section is either deleted or backed by real code under src/scripts/ -- not left describing a non-existent config path.
- AC-3: Given docs/upstream-requests/2026-06-10-hero-crew-lead-orchestrator-restoration.md currently has status: open and asks to restore lead mode, When the drift purge runs, Then that file's status is changed to closed/superseded with an explicit pointer to FEAT-191 (the change that removed lead mode for documented cause), so a future reader does not re-open a known-bad path.
- AC-4: Given a check that greps CLAUDE.md for commands/*.md references, When run after this FEAT lands, Then it exits 0 (no dangling reference), turning the AC into a regression-preventable check rather than a one-time manual sweep.
