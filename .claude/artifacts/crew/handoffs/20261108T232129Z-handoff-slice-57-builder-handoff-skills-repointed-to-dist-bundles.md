---
feature: FEAT-037
---
# Task Handoff: SLICE-57 builder handoff: skills repointed to dist/ bundles

- Created: 2026-11-08T23:21:29.157Z
- From: builder
- To: dispatcher
- Objective: Rewrote 15 of 16 crew.mts/loop.mts invocations across 7 skills/**/SKILL.md files to dist/crew.js and dist/loop.js; 1 prose hit at skills/triage/SKILL.md:181 left untouched (historical note).
- Allowed Scope:
  - skills/ only: pm-rescope
  - triage
  - universal/writing-task-handoffs
  - workflow/builder-ceremony
  - workflow/fullstack-cross-layer
  - workflow/review-gates
  - workflow/ux-validation
- Forbidden Scope:
  - agents/
  - commands/
  - templates/
  - CLAUDE.md
  - docs/
  - AGENTS.md
  - consumer-smoke EXPECTED_FAIL (SLICE-56)
  - no-source-script-path validator rule (SLICE-58)
  - docs/ci-gates.md wording (SLICE-60)
- Deliverable: Zero live source-path script invocations remain under skills/; all 7 touched SKILL.md files stay under the 200-line cap; validate-skills, validate-content-length, validate-agent-refs, validate-repo-boundary, validate-routing-table --coverage-only, build-dist --check all rc=0; root suite 3418 pass/7 skip/1 pre-existing fail (consumer-smoke ratchet, pending SLICE-56 merge); crew validate-skills tests 6 pass/0 fail.
- Changed Files:
  - skills/pm-rescope/SKILL.md
  - skills/triage/SKILL.md
  - skills/universal/writing-task-handoffs/SKILL.md
  - skills/workflow/builder-ceremony/SKILL.md
  - skills/workflow/fullstack-cross-layer/SKILL.md
  - skills/workflow/review-gates/SKILL.md
  - skills/workflow/ux-validation/SKILL.md
- Confidence: high
- Risks: consumer-smoke's one fail is the pre-existing SLICE-56 agents/ ratchet, not caused by this slice; re-verify once SLICE-56 merges to this branch
- Suggested Next Handoff: reviewer/validator dispatch per loop; SLICE-58 (validator rule) and SLICE-60 (docs/ci-gates.md) remain to close FEAT-037

