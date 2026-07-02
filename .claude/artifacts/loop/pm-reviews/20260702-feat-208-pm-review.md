# PM review: FEAT-208 (2026-07-02)

```json
{
  "featureId": "FEAT-208",
  "scores": {
    "customer_impact": 0.75,
    "effort_estimate": 0.3,
    "strategic_alignment": 0.65,
    "technical_risk": 0.45,
    "dependency_depth": 0.1
  },
  "compositePriority": "P1",
  "autonomousSafe": true,
  "demandEvidence": "Firsthand verified, not just cited: I counted backlog/done/ at 125 files vs the injected loop-snapshot.md's stated \"Done: 121\" (4-item drift), backlog/grades/ at 117 vs stated \"Total grades: 112\" (5-item drift), and confirmed FEAT-090 and FEAT-094 are physically present in backlog/done/ while the snapshot lists both under 'Top triaged (next to slice).' I also confirmed src/scripts/pre-push-validate.mts:11 comment states --check-generated runs \"in warn-only mode.\" This is an active bug I am directly exposed to in this very session's injected context.",
  "scopeNotes": "Smallest deliverable: flip --check-generated to non-zero exit (or auto-regen) when the snapshot predates the newest grade/backlog change, wired into the CI gate list. What I'd cut: auto-regeneration is the more forgiving option vs a bare hard-fail -- recommend that path to avoid blocking unrelated PRs (see risk #1). Overlap: none. Effort calibration: touches pre-push-validate.mts (behavior flip) + CI gate wiring + fixture test -- comparable to FEAT-204/205's '4-8h' bracket, scored slightly lower (0.3) since the underlying diff logic already exists (--check-generated's in-memory diff), only the exit-code behavior changes.",
  "risks": [
    "It is two weeks later and this slice failed review: flipping to blocking trips on a legitimate in-flight PR that hasn't run /loop:snapshot-memory yet, causing an unrelated CI failure storm rather than catching genuine drift -- needs a grace/auto-regen path, not a bare hard-fail.",
    "Rollback: revert-only for the gate-behavior change itself (removing blocking restores warn-only); if auto-regeneration is chosen instead, a bad auto-regen commit needs a follow-up revert of the generated snapshot file -- still git-revert-only, no external state.",
    "Coverage gap: no existing test asserts --check-generated's exit code under a genuinely stale snapshot fixture (today's tests, if any, only cover the fresh case) -- this FEAT's AC-3 fixture, which reproduces the exact drift I measured directly above, is the missing negative case."
  ],
  "reasoning": "Technical risk band 0.3-0.5 (behavior change to a shared quality gate -- pre-push hook + CI -- cross-module reach between validate script and CI workflow config, no data-shape change, clean rollback). P1 (upgraded from the retrospective stub's P2): I directly verified this is an active, currently-live routing bug (FEAT-090/094 mis-listed right now), not just a stale-metric nuisance, which raises customer_impact above what a purely cosmetic staleness fix would warrant.",
  "acs": [
    "AC-1: Given .claude/artifacts/loop/loop-snapshot.md's generation timestamp is older than the newest file under .claude/artifacts/loop/grades/ or the newest backlog state change, When pre-push-validate.mts --check-generated runs, Then it exits non-zero (or triggers auto-regeneration before exiting 0) instead of the current always-exit-0 warn-only behavior (src/scripts/pre-push-validate.mts:11,20-43).",
    "AC-2: Given the snapshot is fresh (regenerated at or after the newest grade/backlog change), When the same check runs, Then it exits 0 -- the gate does not false-positive on an up-to-date snapshot.",
    "AC-3: Given a fixture reproducing the exact drift observed live this session (125 actual done vs snapshot's stated 121, 117 actual grades vs stated 112, FEAT-090/FEAT-094 physically in done/ while listed as 'next to slice'), When fed to the staleness check, Then the check fails (red), proving the gate catches the precise failure mode this session hit.",
    "AC-4: Given the staleness gate now blocks, When it is wired into the CI gate list (CLAUDE.md Section 'CI gates'), Then the gate command is documented there alongside the other 8 numbered CI steps, closing the 'warn-only, not in the CI gate list' gap the FEAT body cites."
  ]
}
```
