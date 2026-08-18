---
id: FEAT-280
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.25
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.4
pm_technical_risk: 0.1
pm_dependency_depth: 0.2
pm_composite_priority: P3
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "P3: honestly scored as low-severity hygiene, per the FEAT's own framing -- confirmed via source read that CI gate 11 already uses platform-aware path.isAbsolute() and catches UNC on win32 regardless of which writer produced the slice, so nothing unsafe reaches the wave planner today. The defect is a doc-comment/coverage mismatch at the fast fail-fast layer, not a live hole. Effort and risk are both minimal -- a mechanical regex-to-path.isAbsolute() swap in two known locations plus two new test cases, matching a function CI already relies on. pm_dependency_depth stays low despite the second half naming an external plugin (crew:architect-feature) because that half is a docs-only upstream-request write, not a blocking code dependency -- this repo's own two ACs for that half (file the request; the request itself cites the conservative bar) are fully achievable without crew's cooperation."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Harden touches_files validation: path.isAbsolute() replaces UNC-blind regex"
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-2
    title: "File upstream request: crew:architect-feature touches_files population"
    points: 1
    estimated_tokens: 60000
p0_bucket: carry
p0_bucket_reason: "touches_files UNC hardening carries directly; the crew:architect-feature upstream-request slice becomes a direct in-repo edit post-merge, not moot"
---
## Description

Harden touches_files path validation (UNC gap) + file the crew:architect-feature upstream request. Two non-blocking follow-ups raised by the SLICE-181 review (FEAT-276 AC-4, artifact 20260803T203000Z-review-result-slice-181). (1) UNC path gap at the fast-fail layer: resolveTouchesFiles in src/scripts/lib/proposed-slices.mts (~line 198) uses hand-rolled regexes that reject POSIX absolute paths and C:/ or C:\ drive-letter paths and .. traversal, but do NOT match a Windows UNC path such as \server\share\file.mts. The same gap exists in normalizeFeatureTouchesFiles (src/scripts/lib/slice-linker/feature-lifecycle.mts ~line 63), which performs no path-safety check at all beyond non-empty-string filtering. This is NOT a live correctness hole: CI gate 11 (validate-slice-touches-files.mts ~line 39) uses Node's platform-aware path.isAbsolute(), which does catch UNC on win32, and it runs against every materialized slice regardless of which writer produced it. So nothing unsafe reaches the wave planner. The defect is that the fast layer's own comment claims it fails fast at pm-apply time, which overstates its coverage for this edge case. Fix: replace the hand-rolled absolute-path regex with path.isAbsolute() in both functions so the fast layer matches the CI gate's semantics, and add test coverage for a C:\foo path and a \server\share path in proposed-slices.test.mts -- notable gap given this repo runs on win32. (2) crew:architect-feature does not populate proposed_slices[].touches_files. It is one of the slice-authoring writers but lives in the crew/dev-team plugin, outside this repo's edit scope (confirmed: grepping agents/ and commands/ for touches_files hits only pm.md, start.md, wave.md). It already performs a contracts pass with file-level knowledge, so it is well positioned to declare touched paths. Needs a docs/upstream-requests/ entry against dev-team asking it to populate the field under the same conservative bar documented in agents/pm.md (declare only paths it actually read this session; never guess). Until then, FEAT-level touches_files provenance from that writer stays unavailable and those slices fall through to the inferred/missing tiers.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a touches_files entry of \\server\share\file.mts (UNC path), When resolveTouchesFiles in proposed-slices.mts validates it, Then it is rejected with the same 'must be repo-relative paths' error class as an absolute POSIX or drive-letter path (today it passes through undetected).
- AC-2: Given the same UNC-path input at the FEAT level, When normalizeFeatureTouchesFiles in feature-lifecycle.mts processes a FEAT's raw touches_files frontmatter, Then it performs an equivalent path-safety check (today it does none beyond non-empty-string filtering).
- AC-3: Given the fix, When both functions are re-implemented using node:path's isAbsolute() instead of the hand-rolled regex, Then their rejection semantics match validate-slice-touches-files.mts's existing checkPath behavior (CI gate 11), so the fast layer's own doc comment claim of failing fast is now actually true for UNC paths too.
- AC-4: Given proposed-slices.test.mts, When new test cases assert a C:\foo path and a \\server\share path, Then both are rejected by resolveTouchesFiles with a clear, distinguishing error message (closes the win32-relevant test gap the FEAT calls out).
- AC-5: Given crew:architect-feature does not populate proposed_slices[].touches_files today (confirmed absent from agents/ and commands/ grep), When a new docs/upstream-requests/ entry is filed against dev-team, Then it documents the gap, cites the conservative-declaration bar already documented in agents/pm.md ('declare only paths it actually read this session; never guess'), and requests the writer populate the field under that same bar.

## Proposed slices (PM decomposition)

- SLICE-1: Harden touches_files validation: path.isAbsolute() replaces UNC-blind regex (1 pts)
- SLICE-2: File upstream request: crew:architect-feature touches_files population (1 pts)
