---
feature: FEAT-180
status: active
---
# Run Brief: FEAT180 SLICE115: Review verdict schema: not_checked[] field + author/judge separation

- Created: 2026-06-13T08:52:48.865Z
- Tier: full
- Goal: Adopt two AgentOps verdict-schema ideas (schemas/verdict.v1.schema.json, claim-bind levels in C:/work/mega/agentops): (1) review artifacts carry an explicit not_checked[] list — what the reviewer deliberately did NOT cover — killing false confidence from silent scope gaps; (2) evidence/approval records carry separate author_id and judge_id so self-approval is structurally visible.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Update `commands/slice-review-ladder.md`: both Reviewer A and B prompts require a `## Not checked` section with ≥2 example items
- Create `docs/upstream-requests/2026-06-13-hero-crew-verdict-not-checked-author-judge.md` following existing upstream-request pattern
- Upstream request proposes: `--not-checked []` flag for write-review-result
  - `author_id` and `judge_id` fields
- Out Of Scope:
  - - hero-crew implementation (upstream-request only)
- Pattern alert for empty not_checked (optional stretch goal)
- Changes to artifact readers (backward-compatible by design)
- Planned Files: -
- Next Step: Begin implementation

