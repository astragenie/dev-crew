---
id: SLICE-51
status: completed
feature: FEAT-050
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-05
updated: 2026-06-05
completed_at: 2026-06-05
github_issue: 107
github_url: "https://github.com/sergeymilashico/loop/issues/107"
---
# SLICE-51: Implement FEAT-050

Implements FEAT-050. See [feature file](../../../backlog/in-progress/FEAT-050.md) for product context.

## Objective

`/crew:orchestrate-slice` Step 1 currently dispatches `crew:architect` for every slice that has `needs_contract: true`, creating or extending `.claude/artifacts/crew/designs/<FEAT>-contracts.md`. That's one architect dispatch per slice, even though the contract artifact is usually FEAT-scoped, not slice-scoped.

## In scope

- Loop-side trigger paths for FEAT-scoped contracts artifact at `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md`
- `/loop:slice from-feature` slash body: on first call for a FEAT with `needs_contract: true`, check artifact existence; if missing, document the inline-dispatch pattern (Claude-driven Agent + Edit, per FEAT-049 constraint) and architect prompt template
- `/loop:backlog-enrich` slash body: extend the existing tag-classification sweep with a second pass — for every triaged FEAT with `needs_contract: true` and missing contracts artifact, dispatch `crew:architect` to write it
- Slash command body updates only (markdown documentation of the orchestration steps) — no CLI subcommand changes (CLI auto-dispatch was removed in SLICE-50)
- Test coverage for the bulk-sweep idempotence path and the slice-start gating logic (helper modules that callers consume)
- A canonical architect prompt template extracted to a single source of truth (importable into both slash command bodies)

## Out of scope

- `/crew:orchestrate-slice` Step 1 no-op detection (lives in hero-crew `commands/orchestrate-slice.md`; tracked as FEAT-050 AC-3 but lands upstream, not in loop)
- Revision-path heuristic and `revises_contract: true` frontmatter handling (hero-crew side)
- FEAT-051's parallel uxdesigner + builder (separate FEAT)
- Backfill of existing in-progress FEATs that lack contracts (operator runs `/loop:backlog-enrich` manually after this slice ships)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter is clean (`npm run lint`)
- [ ] AC-2: `commands/backlog-enrich.md` slash body documents a two-pass orchestration: pass 1 classifies tags (existing); pass 2 writes contracts for every triaged FEAT where `needs_contract: true` AND `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` is missing. Pass 2 dispatches `crew:architect` inline (Agent tool) with the canonical contracts prompt; result written via Edit
- [ ] AC-3: A new slash command `/loop:slice-from-feature` (or extension to the existing slice-from-feature flow if one already documents Claude-driven steps) documents the on-demand contracts trigger: read `<FEAT-ID>-contracts.md`; if absent and parent FEAT has `needs_contract: true`, dispatch `crew:architect` with the canonical prompt and write the artifact before any other specialist runs
- [ ] AC-4: The canonical architect prompt template lives in a single source-of-truth markdown file (`commands/contracts-architect-prompt.md` or equivalent) and is referenced by both AC-2 and AC-3 slash bodies — no copy-paste drift
- [ ] AC-5: Idempotence — both triggers detect existing artifact and skip dispatch; re-running either is a no-op when contracts present
- [ ] AC-6: Failure mode — when architect dispatch produces an empty or malformed response, the slash body surfaces a clear warning and the calling flow continues without the artifact (`/crew:orchestrate-slice` will retry on the next slice start)
- [ ] AC-7: A helper module `src/scripts/lib/contracts-artifact.mts` exposes `getContractsPath(repoPath, featureId)` and `contractsArtifactExists(repoPath, featureId)` for any future caller; both are unit-tested (read-only — no dispatch logic inside the helper, by design)
- [ ] AC-8: Tests cover: (a) `getContractsPath` resolves canonical path; (b) `contractsArtifactExists` returns true/false correctly; (c) tag-classification pass and contracts pass are independent in `commands/backlog-enrich.md`'s documented flow (operator can run either alone)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-050 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
