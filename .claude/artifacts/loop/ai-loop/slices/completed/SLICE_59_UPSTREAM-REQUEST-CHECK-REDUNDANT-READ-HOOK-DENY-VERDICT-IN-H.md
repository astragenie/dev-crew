---
id: SLICE-59
status: completed
feature: FEAT-058
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-06
updated: 2026-06-06
completed_at: 2026-06-06
---
# SLICE-59: Upstream-request check-redundant-read hook deny verdict in hero-crew

Implements FEAT-058. See [feature file](../../../backlog/in-progress/FEAT-058.md) for product context.

## Objective

Upstream-request against hero-crew: hooks/check-redundant-read.mjs currently emits decision: approve with a warning systemMessage. Should emit decision: block (deny verdict) at configurable threshold so the assistant cannot continue re-reading the same path.

## In scope

- New `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md` — full upstream-request artifact for hero-crew maintainers
- Document the scope conflict resolution from SLICE-54 (hook lives upstream; loop cannot ship the fix)
- Cite the cost-advisor 30-redundant-reads observation that motivated the request
- Cross-link from CLAUDE.md so the next session sees the upstream-request as a pending external dependency

## Out of scope

- Modifying the hero-crew hook source (`hooks/check-redundant-read.mjs`) — lives in the crew plugin cache, not loop
- Loop-side surrogate halt mechanism (separate FEAT to log if upstream stalls)
- Filing the actual GitHub issue / PR against hero-crew (operator action, not loop-side)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint clean (`npm run lint`, `npm run format:check`, `npm run typecheck`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`)
- [ ] AC-2: `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md` exists with: problem statement, current behavior (decision: approve + warning systemMessage), requested behavior (decision: block at configurable cap), full AC suggestions for hero-crew implementation, evidence citations (cost-advisor 30-reread alert from today's session)
- [ ] AC-3: Doc includes a tracking section: status = "filed-upstream" | "pending-upstream-fix" | "shipped-upstream" | "rejected-upstream" so the next session can see where the request stands
- [ ] AC-4: CLAUDE.md updated to reference the upstream-requests directory (alongside the SOP pointer from SLICE-58)
- [ ] AC-5: FEAT-058 backlog body updated with the path to the upstream-request doc so cross-referencing is one click

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-058 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- (none — doc-only slice; lead-attest skip)
