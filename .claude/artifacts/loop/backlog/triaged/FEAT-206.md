---
id: FEAT-206
status: triaged
priority: P1
category: docs
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [docs, safety, workflow]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.55
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.65
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.0-0.2: docs-only edit to a single procedure file, no code path, trivially reverted. P1: cheap, high-confidence fix (H/Strong) for a false-positive in the loop's own safety procedure covering its historically worst failure mode, even though the underlying pause rate is now near-zero -- the SOP still needs to be correct for future regressions."
---
# FEAT-206: SOP scaffold-status pause detection

## Problem

`docs/sop/specialist-pause-handling.md:37-41` detects specialist pause by
raw artifact-file existence. Since FEAT-161 (dev-team) shipped the
scaffold-first output contract, a paused run leaves a
`status: in-progress` scaffold — which the SOP misreads as "artifact
landed". Active false-positive in the safety procedure for the system's
historically worst failure mode (~31% of slices in the SLICE-51..98
window had a pause).

## Acceptance hints

- SOP checks the artifact `status` field (in-progress scaffold vs
  completed) and cites FEAT-161 as the primary defense.
- Walking the SOP against a scaffold-only fixture classifies it as a
  pause, not success.

## Evidence

- Retrospective §0.3, F-04; `dev-team/agents/inspector.md:41-52,295`.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a crew:inspector run that wrote a scaffold artifact via write-review-result --scaffold --status in-progress (per dev-team/agents/inspector.md:41-52) and then paused before the --update ... --status completed call, When the SOP's pause-detection step (Section 1 'Detect the pause') is applied, Then it reads the artifact's status field, finds in-progress, and classifies the run as a pause -- not as a landed artifact.
- AC-2: Given a crew:inspector run that completed normally (write-review-result --update <path> --status completed --decision approved), When the SOP's detection step runs against that artifact, Then it classifies the run as completed, not a pause -- no false positive on the happy path.
- AC-3: Given the SOP's pre-fix behavior (raw artifact-file existence per :37-41), When walked against a scaffold-only fixture (file exists, status: in-progress), Then the pre-fix procedure would classify it 'artifact landed' (false negative on pause) -- the fixture test asserts the fixed procedure produces the opposite, correct classification.
- AC-4: Given the SOP text is updated, When a reader looks for why file-existence alone was insufficient, Then the doc explicitly cites FEAT-161 (dev-team's scaffold-first output contract, 2026-06-13) as the reason the old check false-positives.
