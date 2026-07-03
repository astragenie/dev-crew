---
id: FEAT-215
status: done
priority: P2
category: telemetry
target_release: null
created: 2026-07-03
updated: 2026-07-03
depends_on: []
slices: [SLICE-140]
derived_from: null
tags: [telemetry, ingest, competitor-gap, multi-repo-config]
needs_contract: true
needs_ux: false
github_issue: null
github_milestone: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.65
pm_technical_risk: 0.55
pm_dependency_depth: 0.2
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-07-03
autonomous_safe: false
triage_notes: "Low-risk parity fast-follow to PR #299, but architect-review (2026-07-03) found a HIGH precedence gap (new loop.json block never positioned vs the ASTRARUNNER_ENV profile tier — could silently defeat per-repo differentiation) plus appId-dedup + schema-asymmetry gaps. Downgraded autonomous_safe:false + needs_contract:true; route through runner:spec-writer to ratify the full precedence chain and appId-inheritance rule before slicing. Secret-adjacent surface + genuine spec ambiguity = human-in-loop on the slice."
started_at: 2026-07-03
slices_complete: [SLICE-140]
completed_at: 2026-07-03
---
# FEAT-215: Direct-sink per-repo ingest config via loop.json

> **Design gate:** architect-review 2026-07-03 = NEEDS-CHANGES (direction sound,
> spec ambiguities). Adjustments folded in below; open **DECISION** markers must
> be ratified by `runner:spec-writer`/architect before this is sliced.

## Problem

The Path-2 direct sink (`src/scripts/lib/slice-linker/astrarunner-ingest.mts`)
is **env-only today**. It resolves ingest URL + token from `LOOP_INGEST_*` env
vars, then plugin-manager options (`CLAUDE_PLUGIN_OPTION_*`, PR #299), then an
`ASTRARUNNER_ENV` profile lookup. No per-repo committed config.

PR #299 (merged 2026-07-03) added plugin-manager `userConfig` — but that is
**global to the plugin install**. A user running the loop across ~20 apps on one
machine gets a single shared token/URL, so the direct sink blurs all apps into
one telemetry stream (the envelope carries no app/repo dimension; identity comes
solely from the bearer token).

Chosen differentiation model is **per-app token** (option 2): each app has its
own `lrt_` token minted in the dashboard; backend maps token → app. Today that
forces a per-repo `LOOP_INGEST_TOKEN` env var (a direnv chore across 20 repos).
The webhook path (`event-notifier.mts`, Pattern-B) already reads per-repo
`loop.json` `notifications.webhook.appId`/`tenantId`.

## Proposal

Give the direct sink a `repoPath` → `loop.json` read path, and add a `loop.json`
`ingest` block that binds token + app identity **as a keychain/token-store
pointer, never a committed plaintext secret**:

```jsonc
// .claude/loop.json
{ "loop": { "ingest": { "appId": "<uuid>", "url": "https://ingest.astrarunner.dev", "env": "prod" } } }
```

Bearer resolves live via `token-store.mts::resolveBearer(appId, env, tokensFile)`
from `~/.astrarunner/tokens*.json` (outside the repo). Turns option 2 from an
env-var-per-repo chore into committed-config + keychain token.

> **Note (design boundary):** this intentionally ends the Path-1/Path-2
> "env-only vs repoPath-aware" split — the direct sink becomes repoPath-aware.
> Sole caller is `writeAgentReport(repoPath, ...)` in `agent-report-writer.mts`,
> which already has `repoPath` and already reads `.claude/loop.json` for
> `costRates` — so threading it in is clean and regresses no caller.

## Precedence (full chain — DECISION to ratify in spec)

The existing resolver already has **three** tiers, not two. The new block must
be positioned against **all** of them, for URL, token, and env — symmetrically.
Proposed ordering (highest → lowest):

1. `LOOP_INGEST_URL` / `LOOP_INGEST_TOKEN` — explicit session override, wins always.
2. `CLAUDE_PLUGIN_OPTION_INGEST_*` — global plugin-manager option.
3. **`loop.json` `ingest` block** — per-repo committed identity. ← NEW
4. `ASTRARUNNER_ENV` (env or plugin `astrarunner_env`) → `profiles.json[env]`.

> **DECISION-1:** the new block sits **above** the `ASTRARUNNER_ENV` profile tier
> (tier 3, not tier 5). Rationale: the block is self-contained per-repo intent;
> if placed below a shell-global `ASTRARUNNER_ENV`, the profile tier wins and the
> committed block becomes dead weight in exactly the 20-repo fleet scenario this
> FEAT solves — and fail-silent means that misordering throws no error. This
> **diverges** from the webhook path (where committed `loop.json` url is lowest);
> the divergence is deliberate because the ingest block is identity, not a URL
> default. Spec-writer/architect must ratify or overturn this before slicing.

Fail-silent contract unchanged (no url/token → no-op, never throws).

## appId inheritance (DECISION to ratify)

> **DECISION-2:** `ingest.appId` / `ingest.url` / `ingest.env` **default from
> `loop.notifications.webhook.{appId,tenantId,...}` when absent**, overridden only
> when they diverge. Avoids declaring the same app identity twice across 20 repos
> (the chore this FEAT fights) and drift between a rotated webhook appId and a
> stale ingest appId. Define one shared source; do not require dual declaration.

## Schema

`ingest` accepted **only** as `{ appId, url?, env? }`. Any `bearer`/`token`
literal on the committed block is ignored/rejected — bearer always resolved live.

> **DECISION-3:** the earlier draft included `tokensFile?`. **Dropped** for real
> parity — Pattern-B (`NotifyWebhookConfig`) has no such field; it derives
> `tokensFile` from `readProfile(env).tokensFile`. Do the same here. (Re-add only
> if a concrete need surfaces, with justification.)

## Acceptance criteria

- AC-1 (happy path): Given `.claude/loop.json` declares `ingest: { appId, url }`,
  no `LOOP_INGEST_*` env, no `CLAUDE_PLUGIN_OPTION_INGEST_*`, and no
  `ASTRARUNNER_ENV`, When `postAgentCompletions` runs with a `repoPath` and
  `resolveBearer(appId)` resolves a bearer from `~/.astrarunner/tokens.json`,
  Then the sink POSTs the envelope to `ingest.url` with that bearer and returns
  `posted: opts.agents.length`.
- AC-2 (env wins over block): Given an `ingest` block, When `LOOP_INGEST_TOKEN` +
  `LOOP_INGEST_URL` are set, Then env values are used and the block is never
  consulted.
- AC-3 (plugin option wins over block): Given an `ingest` block and no
  `LOOP_INGEST_*`, When `CLAUDE_PLUGIN_OPTION_INGEST_TOKEN`/`_URL` are set, Then
  the plugin-option values win over the block.
- AC-4 (block wins over ASTRARUNNER_ENV profile — DECISION-1): Given an `ingest`
  block AND `ASTRARUNNER_ENV=prod` with a `profiles.json[prod]` entry, no
  `LOOP_INGEST_*`, no plugin option, Then the `ingest` block's url/appId are used,
  NOT the profile — proving the committed block differentiates even under a
  shell-global env. (This is the regression the whole FEAT hinges on.)
- AC-5 (fail-silent — malformed/absent): Given `loop.json` missing, no `ingest`
  key, or malformed (`ingest` a string, or `appId` absent/empty), no env/plugin
  token/url, Then url → `""`, token → `null`, return
  `{ posted: 0, skipped: opts.agents.length, failed: 0 }`, nothing throws —
  mirroring `event-notifier.mts::readNotifyConfig`'s `catch { return {} }`.
- AC-6 (resolveBearer miss on valid appId): Given a well-formed `ingest.appId`
  with NO matching entry in `tokens.json` (token not yet minted), Then the sink
  skips (no POST, no throw, no retry storm) — distinct from AC-5's malformed case.
- AC-7 (appId inheritance — DECISION-2): Given `notifications.webhook.appId` set
  and `ingest` block present without `appId`, Then ingest inherits the webhook
  appId; Given both set to DIFFERENT values, Then the ingest block's own value
  wins (explicit override) — behavior defined and tested, not implicit.
- AC-8 (security — pointer only): Given an `ingest` block committed, When parsed,
  Then only `{ appId, url?, env? }` accepted; any `bearer`/`token` literal
  ignored; bearer always resolved live from `~/.astrarunner/tokens*.json` outside
  the repo. No code path reads a plaintext token from version control.

## Risks / notes

- **Branch from `main`.** `src/scripts/lib/plugin-options.mts` landed via PR #299
  on `main`; it does NOT exist on older feature branches. Rebase/branch from
  `main` first or tsc/tests fail on a dangling `../plugin-options.mjs` import.
- **Additive only.** New optional `ingest` key; no rename, no data migration.
  Revert-only rollback.
- **Confused-deputy (shared with Pattern-B, not new).** `url` + `appId` are both
  committed and PR-mutable; a malicious `loop.json` could redirect a
  locally-resolved bearer (for any appId already in the operator's token store)
  to an attacker-chosen URL. Symmetric with the existing webhook block, so not a
  new hole — but this FEAT doubles the surface (two committed blocks of this
  shape). AC-2/AC-8 constrain it; call it out, don't hide it.
- **Maintenance debt.** Post-FEAT, three near-duplicate precedence resolvers
  exist (`plugin-options.mts`, `event-notifier.mts::applyEnvOverrides`, new
  ingest-block path). Prefer a shared `resolveIngestConfig(repoPath, blockKey)`
  helper that both the direct sink and webhook path consume, removing a duplicate
  rather than adding a third.
- **Stale comment.** Update the `astrarunner-ingest.mts:6-8` header ("no repoPath
  context … by design") as part of the change — it becomes false.

## Refs

- PR #299 (merged) — plugin-manager `userConfig` + `plugin-options.mts`.
- `src/scripts/lib/slice-linker/astrarunner-ingest.mts` — Path-2 direct sink.
- `src/scripts/lib/agent-report-writer.mts` — sole caller (`writeAgentReport`, already repoPath-aware).
- `src/scripts/lib/event-notifier.mts` — Pattern-B parity reference (`applyEnvOverrides`, `readNotifyConfig`).
- `src/scripts/lib/token-store.mts` — `resolveBearer(appId, env, tokensFile)` + cross-tier guard.
- `src/scripts/lib/env-profiles.mts` — `readProfile`.
- Tests: `astrarunner-ingest.test.mts`, `event-notifier-webhook.test.mts`, `token-store.test.mts`.
