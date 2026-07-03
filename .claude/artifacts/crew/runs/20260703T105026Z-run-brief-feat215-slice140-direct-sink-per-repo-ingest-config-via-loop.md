---
feature: FEAT-215
status: active
---
# Run Brief: FEAT215 SLICE140: Direct-sink per-repo ingest config via loop.json

- Created: 2026-07-03T10:50:26.128Z
- Tier: full
- Goal: Give the Path-2 direct sink (`astrarunner-ingest.mts`) a per-repo `loop.json` `ingest` block so each repo/app binds its own AstraRunner token + app identity via a keychain/token-store **pointer** (never a committed secret) — removing the per-repo `LOOP_INGEST_TOKEN` env-var chore for a 20-app fleet, and reaching parity with the webhook path.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Thread `repoPath` into `postAgentCompletions` (`PostOpts`
  - additive-optional).
- Read a `loop.json` `loop.ingest` block `{ appId
  - url?
  - env? }` (fail-silent
  - mirroring `readNotifyConfig`).
- Resolve URL/token/env with the ratified 4-tier precedence: `LOOP_INGEST_*` env > `CLAUDE_PLUGIN_OPTION_INGEST_*` > **loop.json ingest block** > `ASTRARUNNER_ENV`→profile.
- `ingest.env` (when present) is the effective env for BOTH profile URL fallback AND `resolveBearer(appId
  - env
  - tokensFile)`.
- `appId` inherits `loop.notifications.webhook.appId` when absent; explicit ingest value wins on divergence.
- Update the stale `astrarunner-ingest.mts` header comment ("no repoPath context … by design").
- Out Of Scope:
  - - `url` inheritance from the webhook block (different endpoint contract — design DECISION-2).
- A shared `resolveIngestConfig` helper across both consumers (design: declined
  - rule-of-three).
- Any change to the webhook (Pattern-B) path.
- Planned Files: -
- Next Step: Begin implementation

