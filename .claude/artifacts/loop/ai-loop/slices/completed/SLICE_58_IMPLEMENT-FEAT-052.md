---
id: SLICE-58
status: completed
feature: FEAT-052
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-58: Implement FEAT-052

Implements FEAT-052. See [feature file](../../../backlog/in-progress/FEAT-052.md) for product context.

## Objective

During SLICE-51 ceremony, the crew:reviewer agent was dispatched twice. Both dispatches paused mid-investigation (returning interim chat text about contracts-architect-prompt.md auto-registration) without writing a review-result artifact to .claude/artifacts/crew/reviews/. Workflow-state badge had to be marked review_skipped with an explicit reason.

## In scope

- New `docs/sop/specialist-pause-handling.md` — operational SOP for builder / reviewer / validator pauses without artifact
- Document the observed reproduction (6 slices today: SLICE-51/52/53/54/56/57 all saw at least one specialist pause)
- Reference DEC-019/020/021/022 (today's lead-attested skip pattern)

## Out of scope

- Modifying the upstream crew:reviewer / crew:builder / crew:validator agent prompts (lives in hero-crew plugin; cross-plugin)
- Changing dispatch-budget config (crew-side)
- Phase-splitting reviewer into correctness+scope+test sub-agents (crew-side architecture change)
- Per-agent retry logic in loop CLI (separate FEAT if pattern persists)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint clean (`npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `docs/sop/specialist-pause-handling.md` exists, captures the observed reproduction (slice IDs + dates), and documents the SOP: detect pause via missing artifact path → lead attests skip badge with explicit reason → next gate runs as independent check
- [ ] AC-3: SOP names which badge to mark (`review_skipped`, `validation_skipped`) and the required `--note` content (citation of test count + lead-attestation rationale)
- [ ] AC-4: SOP references the cross-plugin upstream-request FEAT (FEAT-058 already logged for hero-crew check-redundant-read; this SOP also flags that upstream prompt changes to crew:reviewer / crew:builder are a separate FEAT to log against hero-crew)
- [ ] AC-5: Update `agents/3rdparty/` README or top-level CLAUDE.md note (whichever fits the repo pattern) pointing to the SOP doc for operators

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-052 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- (none — doc-only slice; lead-attest skip per emerging pattern)
