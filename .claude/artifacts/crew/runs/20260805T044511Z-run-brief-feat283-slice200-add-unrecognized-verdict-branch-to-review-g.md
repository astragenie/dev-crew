---
feature: FEAT-283
status: active
---
# Run Brief: FEAT283 SLICE200: Add unrecognized-verdict branch to review-gate.mts; reconcile vocab with failure-classifier

- Created: 2026-08-05T04:45:11.763Z
- Tier: full
- Goal: Fix defect (1) of the three in FEAT-283: `review-gate.mts` reports an **unrecognized** verdict as a **rejection**.  `review-gate.mts:119` tests `REVIEW_SATISFIED.has(verdict.decision)` against `{approved, approved_with_notes}`; anything else falls through to the branch at `:126` whose message reads *"a rejected review cannot close"*. A reviewer that wrote `decision: PASS` produced the self-contradicting line:  ``` review artifact decision: PASS — a rejected review cannot close ```  Unrecognized 
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/review-gate.mts` — add a third
  - distinct branch for verdicts
  that are neither in `REVIEW_SATISFIED` nor a recognized rejection. Message must
  name the offending value AND list the accepted vocabulary.
- Reconcile the accepted-verdict vocabulary between `review-gate.mts` and
  `failure-classifier.mts` — either share one exported constant
  - or document the
  divergence as intentional in a comment at both sites.
- Case-insensitive matching for verdict values (`PASS` / `pass` / `Approved`).
- Tests covering: unrecognized verdict
  - recognized rejection
  - and each accepted
  verdict spelling — asserting the unrecognized and rejected paths produce
  DIFFERENT `reason` strings.
- Out Of Scope:
  - - **Artifact sort order / `artifact-verdict.mts`** — that is SLICE-201.
- **Grandfather-clause cutoff** (`review-gate.mts:109-118`) — that is SLICE-202.
  Do not bound
  - date-gate
  - or otherwise alter the `decision === null` branch.
- Absence-tolerated behavior at `:142-150` (P2 join-key work
  - unchanged).
- Rewriting existing off-schema review artifacts.
- Planned Files: -
- Next Step: Begin implementation

