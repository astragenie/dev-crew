---
id: SLICE-54
status: completed
feature: FEAT-056
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
github_issue: 118
github_url: "https://github.com/sergeymilashico/loop/issues/118"
---
# SLICE-54: Session-pin walker

Implements FEAT-056. See [feature file](../../../backlog/in-progress/FEAT-056.md) for product context.

## Objective

Walker has no session affinity. Slice work spread across 6 Claude sessions fragments cache + hides cost in many-sources alerts. Walker should pin to the sessionId of the slice-start ceremony and refuse re-entry from a different session without --allow-cross-session.

## In scope

- Persist `sessionId` of slice-start ceremony into workflow-state (`.claude/state/crew/workflow-state.json` or equivalent under loop ownership)
- Walker reads stored sessionId on each iteration and compares to current `CLAUDE_SESSION_ID` env var
- Mismatch path: halt walker with `session_drift_stop` badge, surface in stop-check reasons + snapshot
- `--allow-cross-session` flag overrides + audit-logs override event to auto-dispatch.jsonl
- brief output exposes `sessionDrift` field (loop-side; crew brief-me rendering follow-up)
- Unit tests for same-session pass, different-session halt, override-flag passthrough, missing-env fail-open

## Out of scope

- Cross-plugin crew brief-me explicit rendering of session_drift_stop badge (upstream follow-up)
- Migrating existing slices' sessionId retroactively (only applies from slice-start forward)
- Session-affinity for crew artifacts (loop-only)
- Modifying CLAUDE_SESSION_ID env var emission (consumer of, not producer)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint clean (`npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: slice-start CLI writes `sessionId` (from `process.env.CLAUDE_SESSION_ID`) into the workflow-state currentRun entry
- [ ] AC-3: walker reads stored sessionId on each iteration; mismatch → halt with `session_drift_stop` badge in stop-check reasons
- [ ] AC-4: `--allow-cross-session` flag on `node scripts/loop.mjs auto` bypasses the halt + appends a structured override event to `.claude/artifacts/loop/auto-dispatch.jsonl`
- [ ] AC-5: brief output exposes `sessionDrift` field (mirroring FEAT-055's `costRegression` pattern; cross-plugin crew rendering is acknowledged follow-up, not a blocker for this slice)
- [ ] AC-6: missing `CLAUDE_SESSION_ID` env var → fail-open (no halt, walker continues)
- [ ] AC-7: unit tests cover same-session pass, different-session halt, override-flag passthrough, missing-env fail-open, stop-check integration

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-056 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: correctness — sessionId persistence path, comparison logic, fail-open on missing env, override-flag bypass semantics
- Reviewer B: scope discipline — no upstream crew modifications, no retroactive migration, no leakage into FEAT-055 (cost-regression) or FEAT-058 (upstream-request) territory
