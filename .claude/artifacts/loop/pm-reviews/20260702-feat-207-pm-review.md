# PM review: FEAT-207 (2026-07-02)

```json
{
  "featureId": "FEAT-207",
  "scores": {
    "customer_impact": 0.7,
    "effort_estimate": 0.2,
    "strategic_alignment": 0.6,
    "technical_risk": 0.1,
    "dependency_depth": 0.1
  },
  "compositePriority": "P1",
  "autonomousSafe": true,
  "demandEvidence": "Firsthand verified in this dispatch: grep -rln multidim src/scripts returned zero matches (confirms claim 2), and ls commands/ shows only intake.md among the intake-family docs -- slice-review-ladder.md, backlog-enrich.md, retriage.md do not exist (confirms claims 1 and 3). This same drift is visible in the CLAUDE.md text injected into my own session context right now -- I am the stakeholder experiencing the wasted-search cost the FEAT body describes, first-hand, in this dispatch.",
  "scopeNotes": "Smallest deliverable: fix the 4 named false pointers (delete/correct 2 file-reference lines, delete the multidim section or leave a TODO stub, close the stale upstream-request with a FEAT-191 pointer). What I'd cut: nothing -- this is already minimal, doc-only. Overlap: none. Effort calibration: docs-only, few files (CLAUDE.md + 1 upstream-request status flip) -- smaller than SLICE-83's cross-repo scope, no exact analog needed.",
  "risks": [
    "It is two weeks later and this slice failed review: the purge fixes the 4 known pointers but a fifth undiscovered stale reference elsewhere in CLAUDE.md (cross-referenced by .claude/loop/rules.md and docs/ai-loop/*) survives because the AC only checks paths explicitly named in the FEAT body, not an exhaustive resolve of every path token in the file.",
    "Rollback: revert-only -- markdown-only diff, trivially git-revertable, no state implication.",
    "Coverage gap: no existing CI check greps CLAUDE.md for commands/*.md/docs/** references and asserts they resolve -- this FEAT should add that check (AC-4) precisely because nothing today would catch a re-introduced dangling pointer in a future edit."
  ],
  "reasoning": "Technical risk band 0.0-0.2: pure markdown edits across 1-2 files, trivially reverted. P1: verified-real (not just cited) drift in an always-injected file that every session pays a search-cost tax on, cheap fix, top-10 #4.",
  "acs": [
    "AC-1: Given every file path referenced in CLAUDE.md (e.g. commands/slice-review-ladder.md, commands/backlog-enrich.md, a retriage command doc -- verified absent via ls commands/ and grep -rln multidim src/scripts returning zero matches), When each path is resolved against the actual repo tree, Then every remaining reference in CLAUDE.md either resolves to a real file or is corrected to point at the real implementation (src/scripts/lib/post-builder-fanout.mts + reviewer-timing.mts for the reviewer-ladder logic).",
    "AC-2: Given the multidim reviewer-preset section under CLAUDE.md's 'Reviewer ladder presets' H2, When the drift purge runs, Then the section is either deleted or backed by real code under src/scripts/ -- not left describing a non-existent config path.",
    "AC-3: Given docs/upstream-requests/2026-06-10-hero-crew-lead-orchestrator-restoration.md currently has status: open and asks to restore lead mode, When the drift purge runs, Then that file's status is changed to closed/superseded with an explicit pointer to FEAT-191 (the change that removed lead mode for documented cause), so a future reader does not re-open a known-bad path.",
    "AC-4: Given a check that greps CLAUDE.md for commands/*.md references, When run after this FEAT lands, Then it exits 0 (no dangling reference), turning the AC into a regression-preventable check rather than a one-time manual sweep."
  ]
}
```
