---
kind: handoff
slice: SLICE-83
feature: FEAT-078
role: builder
created: 2026-06-09
---
# SLICE-83 builder handoff — clause-citation discipline (FEAT-078)

## Summary

Implements all 7 ACs. Builder agent paused before writing this handoff but the code, tests, docs, and CI wiring all landed on disk. Self-verify gates run inline after builder pause: **all green**.

## Files changed

| File | Kind | Lines | Note |
|---|---|---|---|
| `CLAUDE.md` | edit | +13 | one `<!-- clause: <id> -->` HTML comment after each H2 (13 total); H1 + auto-generated section exempt |
| `src/scripts/lib/clause-registry.mts` | new | n/a | reads CLAUDE.md, extracts `<!-- clause: NAME -->` markers, returns `Set<string>` |
| `scripts/lib/clause-registry.mjs` | emit | n/a | tsc emit |
| `src/scripts/validate-decline-citations.mts` | new | n/a | entry-point validator; walks `.claude/artifacts/loop/backlog/{triaged,done}/FEAT-*.md`; checks P4 entries for `declined_per` field + clause-id validity against registry |
| `scripts/validate-decline-citations.mjs` | emit | n/a | tsc emit |
| `src/tests/validate-decline-citations.test.mts` | new | n/a | 5 unit tests covering cite-present, missing, unknown-clause, non-P4 ignored, registry-extraction |
| `tests/validate-decline-citations.test.mjs` | emit | n/a | tsc emit |
| `agents/pm.md` | edit | +20 | new "Decline contract" section: P4 OR decline → require `declined_per: [<clause-id>]` |
| `skills/triage/SKILL.md` | edit | +1 | reference to decline contract |
| `.github/workflows/ci.yml` | edit | +1 | new `Validate decline citations` step after content-length gate |

## Self-Verify Gates

| Gate | Status | Evidence |
|---|---|---|
| `npm test` | PASS | 1003/1004 pass, 1 skipped (legacy), 0 fail. +9 tests from SLICE-82 baseline. |
| `npm run lint` | PASS | exit 0, zero warnings |
| `npm run typecheck` | PASS | exit 0 (tsconfig.json + tsconfig.test.json both clean) |
| `node scripts/validate-content-length.mjs` | PASS | exit 0 |
| `node scripts/validate-manifests.mjs` | PASS | exit 0 |
| `node scripts/validate-decline-citations.mjs --repo .` | PASS | exit 0; scanned 159 FEAT files, 0 P4 violations |

## Acceptance criteria

- AC-1 ✓ tests pass + lint clean
- AC-2 ✓ all 13 H2 sections in CLAUDE.md have unique kebab-case clause IDs; H1 + auto-generated exempt
- AC-3 ✓ validator passes against current backlog (no P4 entries)
- AC-4 ✓ validator rejects unknown clause IDs (covered by test)
- AC-5 ✓ 5 new tests in `src/tests/validate-decline-citations.test.mts`
- AC-6 ✓ `agents/pm.md` "Decline contract" + `skills/triage/SKILL.md` reference
- AC-7 ✓ `.github/workflows/ci.yml` new step wired after `validate-content-length`

## Risks

- Validator currently treats non-P4 entries as exempt — backfill of historical P4 entries (if any appear later) deferred to followup slice per FEAT-078 implementation notes.
- Clause-id renames in CLAUDE.md will invalidate outstanding citations — intentional pressure point. No tooling to auto-rewrite citations on rename.

## Followups

- Backfill: if any historical P4 entries exist in `done/`, add citations or document exempt (separate slice).
- Stretch: `policy_revision: <git-sha>` companion field on declines (FEAT-078 stretch).
- Stretch: extend pattern to ADRs / `loop:architect` decline path.

## Status

Ready for reviewer dispatch. Handoff written by main thread after builder pause; all gate evidence verified live.
