---
id: FEAT-278
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-03
depends_on: []
slices: []
derived_from: null
---
## Description

packWave silently drops candidates when the waveSize guard fires: no rejection reason, invisible in telemetry. Found during SLICE-179 review (FEAT-276) and confirmed pre-existing, NOT a regression from that slice. In src/scripts/lib/wave/planner.mts the top-of-loop guard 'if (picked.length >= opts.waveSize) break;' is untouched by the SLICE-179 fix (verified as pure context on both sides of the diff). When it fires mid-loop, every remaining candidate in the ranked list is discarded without landing in either items or rejected -- so an operator reading the wave plan cannot distinguish 'there were only N candidates' from 'there were N+10 candidates and 10 were dropped for lack of slots'. Second symptom of the same gap: a waveSize of 0 or negative breaks on iteration 1 before anything is examined, so missingQueue stays empty, the SLICE-179 solo-guard correctly never fires, and the entire candidate list vanishes silently with no diagnostic at all. This is the same rejection-completeness principle SLICE-179 established for missing-confidence candidates (every candidate must end up in exactly one of items or rejected, never nowhere) -- it just was not extended to the capacity path, which was out of that slice's scope. Fix: push a rejection with a distinct reason (e.g. wave_full or capacity_exhausted, kept distinct from missing_touches_files_solo_only and from conflict reasons so telemetry can tell capacity pressure apart from specification gaps) for every candidate not examined once the wave is full, and validate/guard waveSize <= 0 explicitly rather than letting it degenerate into a silent empty plan. Pairs naturally with FEAT-276 SLICE-182 (wave telemetry: packing width + per-rejection reason), which is the consumer that would surface these.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.