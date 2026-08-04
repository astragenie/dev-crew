---
id: FEAT-280
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

Harden touches_files path validation (UNC gap) + file the crew:architect-feature upstream request. Two non-blocking follow-ups raised by the SLICE-181 review (FEAT-276 AC-4, artifact 20260803T203000Z-review-result-slice-181). (1) UNC path gap at the fast-fail layer: resolveTouchesFiles in src/scripts/lib/proposed-slices.mts (~line 198) uses hand-rolled regexes that reject POSIX absolute paths and C:/ or C:\ drive-letter paths and .. traversal, but do NOT match a Windows UNC path such as \server\share\file.mts. The same gap exists in normalizeFeatureTouchesFiles (src/scripts/lib/slice-linker/feature-lifecycle.mts ~line 63), which performs no path-safety check at all beyond non-empty-string filtering. This is NOT a live correctness hole: CI gate 11 (validate-slice-touches-files.mts ~line 39) uses Node's platform-aware path.isAbsolute(), which does catch UNC on win32, and it runs against every materialized slice regardless of which writer produced it. So nothing unsafe reaches the wave planner. The defect is that the fast layer's own comment claims it fails fast at pm-apply time, which overstates its coverage for this edge case. Fix: replace the hand-rolled absolute-path regex with path.isAbsolute() in both functions so the fast layer matches the CI gate's semantics, and add test coverage for a C:\foo path and a \server\share path in proposed-slices.test.mts -- notable gap given this repo runs on win32. (2) crew:architect-feature does not populate proposed_slices[].touches_files. It is one of the slice-authoring writers but lives in the crew/dev-team plugin, outside this repo's edit scope (confirmed: grepping agents/ and commands/ for touches_files hits only pm.md, start.md, wave.md). It already performs a contracts pass with file-level knowledge, so it is well positioned to declare touched paths. Needs a docs/upstream-requests/ entry against dev-team asking it to populate the field under the same conservative bar documented in agents/pm.md (declare only paths it actually read this session; never guess). Until then, FEAT-level touches_files provenance from that writer stays unavailable and those slices fall through to the inferred/missing tiers.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.