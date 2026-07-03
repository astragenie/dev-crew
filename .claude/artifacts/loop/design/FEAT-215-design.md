# Design: FEAT-215 Direct-sink per-repo ingest config via loop.json

## Problem

The Path-2 direct sink (astrarunner-ingest.mts) is env-only, so a user
running the loop across ~20 repos on one machine gets a single shared
token/URL from the plugin-manager option, so the direct sink cannot
differentiate telemetry by app/repo. This FEAT adds a loop.json ingest
block so per-repo identity (appId) can be committed and the bearer
resolved live from the user-level token store, without regressing the
existing env-only fail-silent contract. A prior architect-review flagged
three ambiguous DECISION markers and a shared-resolver question that must
be ratified before this is sliced.

## Current shape

- src/scripts/lib/slice-linker/astrarunner-ingest.mts:117-135 -
  resolveIngestUrl(): 2-tier chain - (1) resolveIngestUrlOption()
  (already combines LOOP_INGEST_URL and CLAUDE_PLUGIN_OPTION_INGEST_URL
  into one explicit tier), (2) ASTRARUNNER_ENV/plugin-option to
  readProfile(env).ingestUrl.
- src/scripts/lib/slice-linker/astrarunner-ingest.mts:140-142 -
  postAgentCompletions(): token = resolveIngestTokenOption() ?? ""
  only - no appId/token-store tier exists on Path 2 today. PostOpts
  has no repoPath field.
- src/scripts/lib/plugin-options.mts (landed on main via PR #299,
  commit 369e21d; absent on this branch) -
  resolveIngestUrlOption/resolveIngestTokenOption/
  resolveAstrarunnerEnvOption, each already folding the raw env var and
  the CLAUDE_PLUGIN_OPTION_* plugin-manager mirror into a single
  explicit tier (firstNonEmpty(env, pluginOption)). This means the
  FEAT bodys "4-tier" framing (env, then plugin-option, as two separate
  tiers) does not match the real code shape - they are already one
  combined tier.
- src/scripts/lib/event-notifier.mts:69-88 (applyEnvOverrides) -
  Pattern-B precedence: (1) LOOP_INGEST_URL explicit, (2)
  ASTRARUNNER_ENV to profile (url + tokensFile), (3) committed
  webhook.url as the floor default. Bearer: literal on block wins,
  else resolveBearer(appId, activeEnv, profileTokensFile), else (since
  PR #299) resolveIngestTokenOption() single-token fallback.
- src/scripts/lib/token-store.mts:96-117 - resolveBearer(appId, env?,
  tokensFile?): tier-specific lookup with no cross-tier fallback
  when env is supplied (explicit env = explicit tier, by design).
- src/scripts/lib/env-profiles.mts:40-66 - readProfile(env) returns
  { ingestUrl, tokensFile, label }, fail-silent null on any error.
- src/scripts/lib/slice-linker/agent-report-writer.mts:517-519 -
  writeAgentReport(repoPath, opts): already receives repoPath and
  already reads .claude/loop.json for costRates at line 590-597.
- src/scripts/lib/slice-linker/agent-report-writer.mts:599-645 - the
  sole call site of postAgentCompletions(...), currently invoked
  without repoPath - confirmed via repo-wide grep, no other
  production caller exists (only test files reference the export).
- src/scripts/lib/webhook-sender.mts:1-38 - WebhookSenderConfig /
  Envelope shape carries tenantId + appId in the payload and POSTs
  the bare config.url with no path suffix. The direct sink instead POSTs
  to ${url}/api/v2/ingest/loop-events with only a bearer header - a
  structurally different endpoint contract, not a drop-in alternate
  target for the same URL.

## Proposed shape

- astrarunner-ingest.mts - add repoPath?: string to PostOpts; add a
  private (non-exported) readIngestBlock(repoPath) that reads
  .claude/loop.json loop.ingest with the same try/catch-return-{}
  fail-silent shape as readNotifyConfig; add a private
  resolveIngestAppId(block, repoPath) helper that also reads
  loop.notifications.webhook.appId for the DECISION-2 inheritance rule
  (single extra field off the same already-open file - fold into one
  parse, not two fs.readFile calls).
- astrarunner-ingest.mts - extend resolveIngestUrl() and add a new
  resolveIngestToken(repoPath?) so both URL and token walk the same
  3-tier shape: explicit, then ingest block (URL literal / appId-driven
  bearer lookup), then profile (using the effective env, see precedence
  table below).
- astrarunner-ingest.mts - update the stale header comment
  (lines 1-23) to reflect repoPath-awareness, per the FEAT own
  "Stale comment" risk note.
- agent-report-writer.mts:599 - thread repoPath into the
  postAgentCompletions({ repoPath, sliceId, ... }) call. This is the
  only call-site edit required outside astrarunner-ingest.mts.
- No new shared module (see Trade-offs / Recommendation on the
  shared-resolver question below) - the appId-inherit-with-override
  logic is a small private helper local to astrarunner-ingest.mts
  (single call site today; extract to a shared module only when a
  second consumer needs it - rule of three).

```
writeAgentReport(repoPath, opts)
  -> postAgentCompletions({ repoPath, sliceId, featureId, agents })
        - resolveIngestUrl(repoPath)
        - resolveIngestToken(repoPath)     both share readIngestBlock(repoPath)
        - resolveEffectiveEnv(repoPath)    (one fs.readFile, one parse)
```

## Trade-offs

| Option | Pro | Con |
|---|---|---|
| Ingest block above ASTRARUNNER_ENV profile tier (FEAT proposal) | Matches AC-4 explicit regression test; committed per-repo identity survives a shell-global ASTRARUNNER_ENV, which is the exact 20-repo scenario this FEAT exists to solve | Diverges from the webhook path precedence (loop.json url is the floor there); two consumers now resolve the same env vars in opposite relative order, a latent trap for a future editor who assumes symmetry |
| Ingest block below profile tier (webhook-symmetric) | One mental model across both consumers; matches "committed config = last-resort default" framing already documented for webhook | Fails AC-4 outright - a developer with ASTRARUNNER_ENV=prod set globally in their shell rc would have every repo committed appId silently defeated by the profile tier, reproducing exactly the cross-repo blur this FEAT is meant to fix |
| Shared resolveIngestConfig(repoPath, blockKey) consumed by both paths | Removes the reviewer-flagged "3 near-duplicate resolvers"; one place to reason about env/URL/token resolution | The two consumers now have a deliberately different precedence order (this decision) plus different envelope shapes (tenantId+appId payload vs Authorization: Bearer header) - a truly shared function needs a blockAboveProfile boolean branch to do the one thing that differs most, which is more indirection than the ~20-30 duplicated lines it removes |
| Narrow shared helper: appId-inherit-with-override only | Addresses the one genuinely identical piece of logic (inherit-then-override) without forcing precedence-order sharing | Only one call site exists today (webhook never inherits from ingest) - premature extraction with a single consumer |

## Recommendation

Ratify the FEAT proposed direction with two narrowings: (1) the
ingest-block-above-profile ordering is correct and should be adopted
exactly as AC-4 requires, but documented as an intentional, named
divergence (not an oversight) with a cross-reference comment added to
both astrarunner-ingest.mts and event-notifier.mts so a future edit
to either does not "fix" the asymmetry by accident; (2) do not build the
shared resolveIngestConfig - extract only the appId-inherit-with-override
helper as a private, non-exported function local to astrarunner-ingest.mts
until a second consumer exists (YAGNI / rule of three), because the
precedence-order divergence in (1) means a genuinely shared resolver would
need a branch parameter for the one thing that most needs to stay
consumer-owned and auditable.

## Ruling on each open decision

DECISION-1 (precedence position) - RATIFIED, with a refinement.
The ingest block sits above the ASTRARUNNER_ENV/plugin-option profile
tier, below the explicit LOOP_INGEST_*/CLAUDE_PLUGIN_OPTION_INGEST_*
tier - exactly as AC-4 requires (a fail-silent misordering here would
silently defeat the entire 20-repo fleet goal with no error signal, so
"block wins over shell-global profile" is the only order that makes the
feature do what it says). Refinement: ingest.env, when present, becomes
the effective env used for both the profile URL fallback and the
token-store tier lookup (resolveBearer(appId, effectiveEnv,
profile.tokensFile)) - this is a stronger, more precise version of
"block above profile" than a URL-only override, and it is what makes
token resolution (not just URL) correctly ignore a shell-global
ASTRARUNNER_ENV too. The divergence from the webhook path (where
committed webhook.url is the floor) is accepted and must be called out
in both modules docstrings - it is deliberate, not an inconsistency to
reconcile later. Cost of the webhook-symmetric alternative: it would ship
a FEAT whose own regression test (AC-4) fails by construction, so it is
not a real alternative, only a documented rejected option.

DECISION-2 (appId inheritance) - PARTIALLY RATIFIED: appId only, url
and env do NOT inherit. ingest.appId inherits from
loop.notifications.webhook.appId when ingest.appId is absent,
explicit ingest.appId wins on divergence - exactly what AC-7 tests, no
more. ingest.url must NOT inherit from webhook.url: they are
different endpoint contracts (webhook-sender.mts POSTs the bare
configured URL with a {tenantId, appId, kind, payload} envelope; the
direct sink POSTs ${url}/api/v2/ingest/loop-events with an
Authorization: Bearer header and no tenantId) - silently inheriting a
webhook receiver URL into the ingest sink would misroute POSTs to an
endpoint that likely does not implement the ingest route, and this would
not even fail loudly (network-level 404, swallowed by the existing
try/catch). env has no analogous stored field on NotifyWebhookConfig
today (webhook resolves env purely from ASTRARUNNER_ENV/profile at
runtime, never commits it) - there is nothing to inherit from, so this
is N/A rather than a design gap. The FEAT body broader "appId, url,
env default from webhook.{appId, tenantId, ...}" framing is narrower in
practice than its own AC set; ratify only what AC-7 actually specifies.

DECISION-3 (tokensFile field) - RATIFIED: drop. Matches Pattern-B
exactly (readProfile(env).tokensFile, no stored override). No
justification surfaced for divergence; adding it back later needs a
concrete need, per the FEAT own note.

Shared resolver - DECLINED for this FEAT. See Recommendation above.
Extract only a private appId-inherit helper; do not add a new shared
module or generic resolveIngestConfig. Revisit if/when a third
consumer needs the same inherit-with-override or block-vs-profile
precedence shape (rule of three).

repoPath threading - CONFIRMED, no caller regresses.
postAgentCompletions(opts: PostOpts) gains repoPath?: string on
PostOpts (optional so a hypothetical future test-only call without a
repo context still degrades to the current env-only behavior rather than
throwing). Repo-wide grep confirms exactly one production call site
(agent-report-writer.mts:599), which already has repoPath in scope
from its own signature (writeAgentReport(repoPath, ...)) - the edit is
additive at that call site only. Test files
(astrarunner-ingest.test.mts, envelope-enrichment.test.mts) call
postAgentCompletions directly and will need new cases, not a
call-site fix (see test list below).

## Final precedence table

| Tier | URL | Token | Effective env (for tiers below) |
|---|---|---|---|
| 1 (explicit, always wins) | LOOP_INGEST_URL ?? CLAUDE_PLUGIN_OPTION_INGEST_URL (resolveIngestUrlOption()) | LOOP_INGEST_TOKEN ?? CLAUDE_PLUGIN_OPTION_INGEST_TOKEN (resolveIngestTokenOption()) | n/a |
| 2 (ingest block - NEW) | ingest.url literal, if present | resolveBearer(effectiveAppId, effectiveEnv, profile.tokensFile) when effectiveAppId resolves (own ingest.appId or inherited webhook.appId) | ingest.env, if present |
| 3 (profile, using effective env) | readProfile(effectiveEnv).ingestUrl | n/a (token tier is 2, not profile-driven directly - the token-store lookup in tier 2 already consumes profile.tokensFile) | ASTRARUNNER_ENV / CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV (resolveAstrarunnerEnvOption()), used only when ingest.env absent |
| 4 (no-op) | "" | null -> skip, { posted: 0, skipped: N, failed: 0 } | n/a |

Effective env resolution order: ingest.env (tier 2) then
resolveAstrarunnerEnvOption() (tier 3) then undefined (no profile
lookup attempted). Effective appId resolution order: ingest.appId then
webhook.appId (DECISION-2) then undefined (token tier 2 skipped
entirely, falls through to no-op).

## Target loop.json ingest schema

```typescript
// .claude/loop.json -> loop.ingest
export interface IngestBlock {
  /** Per-repo app identity used to resolve a live bearer via token-store.
   * Falls back to loop.notifications.webhook.appId when absent (DECISION-2). */
  appId?: string;
  /** Committed ingest base URL. Overrides the ASTRARUNNER_ENV profile
   * lookup but is itself overridden by LOOP_INGEST_URL /
   * CLAUDE_PLUGIN_OPTION_INGEST_URL. Never inherited from webhook.url
   * (different endpoint contract - see DECISION-2 ruling). */
  url?: string;
  /** Overrides ASTRARUNNER_ENV for THIS repo ingest resolution only -
   * both the profile URL fallback and the token-store tier lookup use
   * this value when present (DECISION-1 refinement). */
  env?: string;
}
// NOTE: no bearer / token literal field - rejected/ignored if present
// (AC-8). No tokensFile field - dropped for parity (DECISION-3).
```

## Module / function boundaries

src/scripts/lib/slice-linker/astrarunner-ingest.mts:

- interface PostOpts - add repoPath?: string.
- New interface IngestBlock { appId?: string; url?: string; env?: string }
  (exported for test injection, mirrors NotifyWebhookConfig export
  pattern in event-notifier.mts).
- New async function readIngestBlock(repoPath: string): Promise<{ ingest?: IngestBlock; webhookAppId?: string }>
  - single fs.readFile(.claude/loop.json) + JSON.parse, returns {}
  on any error (mirrors readNotifyConfig catch shape exactly). Reads
  both loop.ingest and loop.notifications.webhook.appId from the one
  parse (avoids a second file read for DECISION-2 inheritance).
- New function resolveEffectiveAppId(ingest: IngestBlock | undefined, webhookAppId: string | undefined): string | undefined
  - private, non-exported. ingest?.appId || webhookAppId || undefined.
- New function resolveEffectiveEnv(ingest: IngestBlock | undefined): string | undefined
  - private. ingest?.env ?? resolveAstrarunnerEnvOption().
- resolveIngestUrl() -> resolveIngestUrl(repoPath?: string): tier 1
  unchanged; tier "1.5" reads ingest.url via readIngestBlock; tier 2
  (profile) now uses resolveEffectiveEnv() instead of calling
  resolveAstrarunnerEnvOption() directly.
- New async function resolveIngestToken(repoPath?: string): Promise<string | null>
  replacing the current inline resolveIngestTokenOption() ?? "" in
  postAgentCompletions: tier 1 explicit; tier 2 resolveBearer(appId,
  effectiveEnv, profile.tokensFile) when effectiveAppId resolves;
  else null.
- postAgentCompletions(opts: PostOpts) - resolve URL and token both
  passing opts.repoPath; unchanged fail-silent early return when either
  is empty/null.
- Update header comment block (lines 1-23) - drop "no repoPath context,
  by design" framing; document the new 4-tier chain and the intentional
  webhook-precedence divergence with a pointer to this design doc / the
  resulting ADR.

src/scripts/lib/slice-linker/agent-report-writer.mts:

- Line ~599: postAgentCompletions({ repoPath, sliceId, featureId: ...,
  agents: ... }) - add repoPath to the existing call (repoPath already
  in local scope from the function own first parameter).

No changes to event-notifier.mts, token-store.mts, env-profiles.mts,
or plugin-options.mts - all consumed as-is.

## Test cases for spec-writer (map to FEAT AC-1..AC-8)

1. AC-1 happy path - ingest: {appId, url}, no env/plugin overrides,
   resolveBearer mock returns a bearer -> sink POSTs, posted equals
   opts.agents.length.
2. AC-2 - LOOP_INGEST_TOKEN/LOOP_INGEST_URL set alongside an ingest
   block -> env values win, block never drives URL/token (assert via
   the POSTed URL/bearer matching env not block).
3. AC-3 - CLAUDE_PLUGIN_OPTION_INGEST_TOKEN/_URL set, no
   LOOP_INGEST_*, ingest block present -> plugin-option values win
   over block.
4. AC-4 (the regression the FEAT hinges on) - ingest block present AND
   ASTRARUNNER_ENV=prod with profiles.json.prod populated, no
   LOOP_INGEST_*/plugin option -> block url/appId-resolved bearer
   used, NOT profiles.json.prod.ingestUrl.
5. AC-5a - loop.json missing entirely -> url "", token null,
   {posted:0, skipped:N, failed:0}, no throw.
6. AC-5b - loop.json present, no ingest key -> same as 5a.
7. AC-5c - ingest malformed (ingest: "not-an-object") -> same as 5a.
8. AC-5d - ingest.appId present but empty string -> treated as absent,
   token tier 2 skipped, same fail-silent shape.
9. AC-6 - well-formed ingest.appId, resolveBearer returns null
   (appId not in tokens*.json) -> sink skips (no POST, no throw, no
   retry), distinct assertion from AC-5 (URL may still resolve; only
   token is null).
10. AC-7a - notifications.webhook.appId set, ingest present without
    appId -> resolveBearer called with the inherited webhook appId.
11. AC-7b - both ingest.appId and webhook.appId set to different
    values -> resolveBearer called with ingest.appId (explicit
    override wins).
12. AC-8a - ingest block includes a literal bearer/token field ->
    field ignored; bearer still resolved only via resolveBearer (assert
    no code path reads ingest.bearer/ingest.token).
13. AC-8b (repoPath threading) - writeAgentReport(repoPath, opts)
    integration/unit test asserting postAgentCompletions is invoked
    with repoPath set (spy or dependency injection on the sink module).
14. Env-scoping cross-check - ingest.env: "staging" present while
    shell ASTRARUNNER_ENV=prod is set -> both URL profile fallback AND
    token-store tier use "staging", not "prod" (proves the DECISION-1
    refinement, not just a URL-only override).

## ADR stub

id: DEC-062
title: Direct-sink ingest block outranks the ASTRARUNNER_ENV profile tier (intentional divergence from the webhook path)
status: proposed
introduced_by_slice: null
introduced_at: 2026-07-03
related_specs: [FEAT-215]
superseded_by: null

### Context

FEAT-215 adds a loop.json loop.ingest block so the Path-2 direct sink
(astrarunner-ingest.mts) can differentiate per-repo telemetry (appId to
live bearer) without a per-repo env var. The Pattern-B webhook path
(event-notifier.mts) already has an analogous committed block
(notifications.webhook), but its precedence puts the committed url
below the ASTRARUNNER_ENV profile tier (profile wins). A literal copy
of that ordering for the new ingest block would let any shell-global
ASTRARUNNER_ENV silently defeat every repo committed identity -
reproducing exactly the cross-repo blur this FEAT exists to fix, with no
error surfaced (fail-silent contract).

### Decision

The new loop.ingest block is resolved above the ASTRARUNNER_ENV /
plugin-option profile tier and below the explicit LOOP_INGEST_* /
CLAUDE_PLUGIN_OPTION_INGEST_* tier, for URL, token-store appId, and
effective env alike. This is a deliberate divergence from the webhook
path precedence, not an inconsistency to reconcile. Both
astrarunner-ingest.mts and event-notifier.mts should carry a docstring
cross-reference to this decision so a future edit does not "fix" the
asymmetry by mistake.

### Consequences

Positive:
- Committed per-repo appId differentiation survives a shell-global
  ASTRARUNNER_ENV, satisfying the FEAT core 20-repo-fleet goal.
- Fail-silent misordering (the HIGH-severity gap the original
  architect-review flagged) is closed with an explicit regression test
  (AC-4).

Negative:
- The two ingest-adjacent config paths (direct sink vs webhook) now
  resolve committed config vs shell-global env in opposite relative
  order. A contributor who only reads one module precedence comment
  and assumes symmetry with the other will be wrong.

Neutral:
- No shared resolver module introduced to unify the two paths (see
  FEAT-215 design doc, "Shared resolver - declined"); the two precedence
  chains remain independently owned and independently testable.

### Alternatives considered

- Webhook-symmetric ordering (block below profile) - rejected: fails
  the FEAT own AC-4 by construction; not a viable alternative, only a
  documented rejected option.
- Unify via a shared resolveIngestConfig(repoPath, blockKey)
  consumed by both paths - rejected for this FEAT: the precedence-order
  divergence above means a genuinely shared function would need a
  blockAboveProfile boolean branch for the one thing that most needs
  to stay consumer-owned and auditable; declined as premature
  abstraction over the ~20-30 duplicated lines it would remove (revisit
  under rule-of-three if a third consumer appears).

### References

- FEAT: .claude/artifacts/loop/backlog/pending/FEAT-215.md
- Design: .claude/artifacts/loop/design/FEAT-215-design.md

## Risks

- Fail-silent misordering is invisible. Nothing errors if a future
  edit swaps tier 1.5/tier 3 order back to webhook-symmetric - mitigation
  is the AC-4 regression test plus the paired docstring cross-references
  called for in the ADR.
- Confused-deputy surface doubles (already flagged in the FEAT, not
  new): a malicious/careless loop.json ingest.url + appId can
  redirect a locally-resolved bearer to an attacker-chosen host. AC-2/AC-8
  constrain this; no new mitigation proposed here beyond what the FEAT
  already specifies - call it out in the slice, do not silently accept it.
- readIngestBlock double-duty read (ingest block + webhook.appId in
  one parse) - if a future edit changes loop.json shape independently
  in event-notifier.mts reader, the two readers can drift on error
  handling. Mitigation: both must keep the identical
  try/catch-return-{} shape; call this out explicitly in the slice spec
  so the builder does not diverge them.
- Branch base. Per the FEAT own risk note, this repo current
  branch (feat/envelope-v1.1-enrichment) predates PR #299
  (plugin-options.mts). The slice must branch/rebase from main before
  implementation or tsc/tests fail on a dangling ../plugin-options.mjs
  import - confirmed during this design review (local
  astrarunner-ingest.mts still carries the pre-#299 header comment; the
  main version at commit 369e21d is authoritative).
