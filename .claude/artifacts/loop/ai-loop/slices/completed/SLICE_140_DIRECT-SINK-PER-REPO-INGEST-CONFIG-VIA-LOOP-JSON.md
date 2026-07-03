---
id: SLICE-140
title: Direct-sink per-repo ingest config via loop.json
status: completed
feature: FEAT-215
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-07-03
updated: 2026-07-03
completed_at: 2026-07-03
---
# SLICE-140: Direct-sink per-repo ingest config via loop.json

Implements FEAT-215. See [feature file](../../../backlog/in-progress/FEAT-215.md) for product context, and the ratified design at `.claude/artifacts/loop/design/FEAT-215-design.md` (DEC-062) + executable spec `.claude/artifacts/loop/design/FEAT-215-spec.md`.

## Objective

Give the Path-2 direct sink (`astrarunner-ingest.mts`) a per-repo `loop.json` `ingest` block so each repo/app binds its own AstraRunner token + app identity via a keychain/token-store **pointer** (never a committed secret) — removing the per-repo `LOOP_INGEST_TOKEN` env-var chore for a 20-app fleet, and reaching parity with the webhook path.

## In scope

- Thread `repoPath` into `postAgentCompletions` (`PostOpts`, additive-optional).
- Read a `loop.json` `loop.ingest` block `{ appId, url?, env? }` (fail-silent, mirroring `readNotifyConfig`).
- Resolve URL/token/env with the ratified 4-tier precedence: `LOOP_INGEST_*` env > `CLAUDE_PLUGIN_OPTION_INGEST_*` > **loop.json ingest block** > `ASTRARUNNER_ENV`→profile.
- `ingest.env` (when present) is the effective env for BOTH profile URL fallback AND `resolveBearer(appId, env, tokensFile)`.
- `appId` inherits `loop.notifications.webhook.appId` when absent; explicit ingest value wins on divergence.
- Update the stale `astrarunner-ingest.mts` header comment ("no repoPath context … by design").

## Out of scope

- `url` inheritance from the webhook block (different endpoint contract — design DECISION-2).
- A shared `resolveIngestConfig` helper across both consumers (design: declined, rule-of-three).
- Any change to the webhook (Pattern-B) path.

## Acceptance criteria

- [ ] AC-1: Given a `loop.json` `ingest: { appId, url }`, no `LOOP_INGEST_*`/`CLAUDE_PLUGIN_OPTION_INGEST_*`/`ASTRARUNNER_ENV`, and `resolveBearer(appId)` resolves a bearer from `~/.astrarunner/tokens.json`, When `postAgentCompletions` runs with `repoPath`, Then it POSTs to `ingest.url` with that bearer and returns `posted: agents.length`.
- [ ] AC-2: Given an `ingest` block, When `LOOP_INGEST_TOKEN` + `LOOP_INGEST_URL` are set, Then env values are used and the block is never consulted.
- [ ] AC-3: Given an `ingest` block and no `LOOP_INGEST_*`, When `CLAUDE_PLUGIN_OPTION_INGEST_TOKEN`/`_URL` are set, Then plugin-option values win over the block.
- [ ] AC-4: Given an `ingest` block AND `ASTRARUNNER_ENV=prod` with a `profiles.json[prod]` entry (no `LOOP_INGEST_*`, no plugin option), Then the `ingest` block's url/appId are used, NOT the profile (load-bearing regression).
- [ ] AC-5: Given `loop.json` missing / no `ingest` key / malformed block (`ingest` a string, or `appId` empty), no env/plugin token/url, Then url→`""`, token→`null`, return `{ posted: 0, skipped: agents.length, failed: 0 }`, nothing throws.
- [ ] AC-6: Given a well-formed `ingest.appId` with NO matching `tokens.json` entry, Then the sink skips (no POST, no throw, no retry) — distinct from AC-5.
- [ ] AC-7: Given `notifications.webhook.appId` set and `ingest` block without `appId`, Then ingest inherits it; given both set differently, Then the ingest value wins.
- [ ] AC-8: Given a committed `ingest` block, When parsed, Then only `{ appId, url?, env? }` accepted; any `bearer`/`token` literal ignored; bearer always resolved live from the token store outside the repo.
- [ ] AC-9: All tests pass (`bun test src/tests/ --parallel --timeout 60000`), tsc (both projects) clean, `biome lint`/`format` clean.

## Files

- src/scripts/lib/slice-linker/astrarunner-ingest.mts
- src/scripts/lib/agent-report-writer.mts
- src/tests/astrarunner-ingest.test.mts

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-215 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (`crew:inspector`): correctness, precedence ordering, AC coverage, edge cases.
- Reviewer B (`crew:inspector`): production-readiness, security (pointer-only / no plaintext token, cross-tier bleed), observability.
