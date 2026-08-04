---
id: PM-REVIEW-FEAT-287
feature: FEAT-287
reviewed_at: 2026-08-04
pm_customer_impact: 0.65
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.8
pm_technical_risk: 0.5
pm_dependency_depth: 0.25
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-287

## Demand Assessment

- **Evidence:** Live-confirmed, not theoretical: this exact blind spot is the traced root cause of FEAT-285's six-duplicate-parent-issue bug on 2026-08-04. Verified directly against code: validate-backlog-writes.mts:77 hardcodes SCAN_ROOT = 'src/scripts', so it never walks the sibling scripts/ tree; scripts/lib/github-sync.mjs has raw fs.writeFile calls against feat.filePath at lines 82, 92, 184 and sliceFile at 115, 121 (grep-confirmed at those exact lines); src/scripts/lib/github-sync-loader.mts's importGithubSync resolves scripts/lib/<rel> via a computed pathToFileURL() and is invoked on every 'github publish' path, confirming the unscanned tree is a live hot path, not dead legacy code, and invisible to static resolution as well as to this scanner.

## Scope Challenge

- **Scope notes:** Extend validate-backlog-writes.mts to scan scripts/ alongside src/scripts/, and .mjs alongside .mts, rather than a single hardcoded root. Then triage each newly-surfaced writer individually: github-sync.mjs's FEAT/SLICE writes should be ported to BacklogStore's updateFeatureFrontmatter/updateSliceFrontmatter (not allowlisted), since routing them through the shared write-primitive is what actually fixes FEAT-285's cache-staleness at the root rather than just detecting the bypass; scripts/setup-github-sync.mjs and scripts/competitor-audit/aggregate.mjs need individual port-or-allowlist decisions in the existing DEC-076 written-justification style. Add a regression test asserting the scanner actually visits a file under scripts/, so this blind spot can't silently return. Worth coordinating with FEAT-281's design, since importGithubSync's computed-URL call edge would defeat a naive static call-graph resolver the same way it defeated this scanner's hardcoded root.

## Scores

- customer_impact: 0.65
- effort_estimate: 0.55
- strategic_alignment: 0.80
- technical_risk: 0.50
- dependency_depth: 0.25

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: This is the same defect class as FEAT-281 (P1: tested/gated-but-not-actually-covered) one level up, and arguably worse in one respect: FEAT-281's gap was passive (a function nobody called), while this gate actively prints 'OK — no raw backlog-state writers outside BacklogStore/allowlist' on every run while a live writer bypasses it and has already produced a confirmed external-facing bug (FEAT-285's six duplicate GitHub issues). That combination — false assurance plus a demonstrated live consequence — puts customer_impact and strategic_alignment above FEAT-285 (P2, the symptom) and FEAT-282 (P2, an orphan validator nobody currently relies on and that blocks nothing), but effort and risk are real and multi-file (porting a live external-side-effecting write path, not just widening a scan glob), which is why this sits at P1 alongside FEAT-281 rather than climbing to P0: like FEAT-283, this touches gate-adjacent/live-external-effect code, so autonomous_safe is false pending human sign-off on the port-vs-allowlist calls for the two secondary writers.

## Risks

- Porting github-sync.mjs's writes touches a live hot path exercised on every GitHub publish call — an error here breaks real issue/slice sync, not just a test fixture
- Two other unscanned writers (setup-github-sync.mjs, competitor-audit/aggregate.mjs) still need their own DEC-076-style written justification before allowlisting; treating them as a rubber-stamp batch risks under-scoping the rationale
- Fixing only the scan root (without porting github-sync.mjs's writes) would surface the finding in CI but leave FEAT-285's actual cache-staleness bug unfixed at the root
