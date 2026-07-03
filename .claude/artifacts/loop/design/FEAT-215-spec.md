# Spec: FEAT-215 — Direct-sink per-repo ingest config via loop.json

## Metadata
- developer_type: agent
- estimated_complexity: medium
- languages: [typescript]
- derived_from: .claude/artifacts/loop/backlog/pending/FEAT-215.md
- design_source: .claude/artifacts/loop/design/FEAT-215-design.md (authoritative — all DECISION markers ratified there; this spec transcribes, does not re-decide)
- adr_stub: DEC-062 (see design doc "ADR stub" section — document-writer finalizes after this slice closes)

---

## Objective

Give the Path-2 direct sink (`src/scripts/lib/slice-linker/astrarunner-ingest.mts`) a `repoPath`-aware `.claude/loop.json` `loop.ingest` block so a user running the loop across many repos can commit per-repo app identity (`appId`) and resolve a live bearer from the user-level token store, without regressing the existing env-only fail-silent contract. Precedence, schema, and inheritance are fully ratified in the design doc — this spec is the executable transcription: exact contracts, exact precedence pseudocode, ≥8 test cases mapped 1:1 to AC-1..AC-8, and exact verify commands.

**Out of scope:** shared `resolveIngestConfig` module (declined — YAGNI/rule of three), `tokensFile` field on the ingest block (dropped — DECISION-3), `url`/`env` inheritance from `webhook.{url,tenantId}` (declined — DECISION-2, appId only), any change to `event-notifier.mts` / `token-store.mts` / `env-profiles.mts` (consumed as-is), reconciling the pre-existing FEAT-203 v1.1-envelope-enrichment fields on this branch against the PR #299 baseline (see **Build sequencing** — a separate, FEAT-215-unrelated merge concern).

---

## Context

`astrarunner-ingest.mts` currently resolves URL/token from `LOOP_INGEST_*` env vars, then `CLAUDE_PLUGIN_OPTION_*` (via `../plugin-options.mjs`, PR #299), then an `ASTRARUNNER_ENV` → `~/.astrarunner/profiles.json[env]` profile lookup — all env-only, no repo identity. The sole production caller, `writeAgentReport(repoPath, opts)` in `agent-report-writer.mts` (line ~599, `postAgentCompletions({...})`), already has `repoPath` in scope and already reads `.claude/loop.json` for `costRates` a few lines above — threading `repoPath` through is additive at that one call site.

The webhook path (`event-notifier.mts::applyEnvOverrides` + `readNotifyConfig`) already has an analogous committed block (`loop.notifications.webhook`) with `resolveBearer(appId, env, tokensFile)` from `token-store.mts`, but its precedence puts the committed `url` **below** the `ASTRARUNNER_ENV` profile tier. FEAT-215's new `loop.ingest` block is **ratified to sit above** that profile tier — an intentional, documented divergence (DEC-062), not a bug to reconcile.

---

## Section 1 — Contracts

### 1.1 `IngestBlock` (new, exported)

```typescript
// src/scripts/lib/slice-linker/astrarunner-ingest.mts

/**
 * .claude/loop.json -> loop.ingest. Per-repo committed identity for the
 * direct sink (Path 2). Bearer is NEVER stored here — always resolved live
 * via token-store.mts::resolveBearer(appId, env, tokensFile). Any `bearer`
 * or `token` literal present in the raw JSON is ignored (AC-8): this type
 * intentionally has no such field, and readIngestBlock() does not read one.
 */
export interface IngestBlock {
  /** Falls back to loop.notifications.webhook.appId when absent (DECISION-2). */
  appId?: string;
  /** Committed base URL. Overrides the ASTRARUNNER_ENV profile lookup but is
   * itself overridden by LOOP_INGEST_URL / CLAUDE_PLUGIN_OPTION_INGEST_URL.
   * Never inherited from webhook.url — different endpoint contract. */
  url?: string;
  /** Overrides ASTRARUNNER_ENV for THIS repo's ingest resolution only — both
   * the profile URL fallback and the token-store lookup use this value when
   * present (DECISION-1 refinement). */
  env?: string;
}
```

### 1.2 `PostOpts` (changed — additive field)

```typescript
interface PostOpts {
  sliceId: string;
  featureId?: string | null;
  agents: AgentRow[];
  /** New (FEAT-215). Optional so a caller without repo context still
   * degrades to the existing env-only behavior rather than throwing. Sole
   * production caller: agent-report-writer.mts::writeAgentReport. */
  repoPath?: string;
}
```

`AgentRow` is unchanged by this FEAT (see **Build sequencing** for the pre-existing, orthogonal branch-state note on this interface).

### 1.3 New private functions (non-exported, local to `astrarunner-ingest.mts`)

```typescript
/**
 * Read .claude/loop.json and extract both loop.ingest and
 * loop.notifications.webhook.appId from a SINGLE fs.readFile + JSON.parse
 * (avoids a second file read for the DECISION-2 inheritance lookup).
 * Fail-silent: any error (missing file, malformed JSON, ingest not an
 * object) returns {} — mirrors event-notifier.mts::readNotifyConfig's
 * catch { return {} } shape exactly. Malformed `ingest` (e.g. a string)
 * yields `ingest: undefined`, not a thrown error.
 */
async function readIngestBlock(
  repoPath: string
): Promise<{ ingest?: IngestBlock; webhookAppId?: string }>;

/**
 * appId-inherit-with-override (DECISION-2). Private — only one call site
 * today (this module); do NOT extract to a shared module (rule of three).
 * Empty-string ingest.appId is falsy and correctly falls through to
 * webhookAppId (AC-5d: "appId present but empty" == "absent").
 */
function resolveEffectiveAppId(
  ingest: IngestBlock | undefined,
  webhookAppId: string | undefined
): string | undefined; // ingest?.appId || webhookAppId || undefined

/**
 * Effective env for both the URL profile fallback and the token-store tier
 * (DECISION-1 refinement). ingest.env, when present, overrides
 * ASTRARUNNER_ENV for ingest resolution only.
 */
function resolveEffectiveEnv(ingest: IngestBlock | undefined): string | undefined;
// ingest?.env ?? resolveAstrarunnerEnvOption()
```

### 1.4 Changed function signatures

```typescript
// was: async function resolveIngestUrl(): Promise<string>
async function resolveIngestUrl(repoPath?: string): Promise<string>;

// new
async function resolveIngestToken(repoPath?: string): Promise<string | null>;

// unchanged signature, changed body (see §2 pseudocode)
export async function postAgentCompletions(
  opts: PostOpts
): Promise<{ posted: number; skipped: number; failed: number }>;
```

### 1.5 Header comment (lines 1-23) — replace stale "no repoPath context … by design" framing

The current header (both on `origin/main` at commit `369e21d` and on this branch's staged working-tree copy) reads:

```
// This is Path 2 (legacy direct-POST). It has no repoPath context, so it
// cannot use the Pattern-B webhook config from loop.json. It resolves config
// from env vars only.
```

Replace with (exact text the builder should use, adjust only if line-wrap style drifts):

```
// This is Path 2 (direct-POST). Since FEAT-215 it is repoPath-aware: when a
// repoPath is supplied it also reads .claude/loop.json's `loop.ingest` block
// for per-repo committed identity (appId -> live bearer via token-store.mts).
//
// URL resolution precedence (highest to lowest):
//   1. LOOP_INGEST_URL / CLAUDE_PLUGIN_OPTION_INGEST_URL — explicit, wins always
//   2. loop.json loop.ingest.url                          — per-repo committed (NEW)
//   3. ASTRARUNNER_ENV / plugin option -> profiles.json[env].ingestUrl
//   4. (none) — no-op when URL absent
//
// Token resolution precedence:
//   1. LOOP_INGEST_TOKEN / CLAUDE_PLUGIN_OPTION_INGEST_TOKEN — explicit, wins always
//   2. resolveBearer(effectiveAppId, effectiveEnv, profile.tokensFile) where
//      effectiveAppId is loop.ingest.appId, inheriting
//      loop.notifications.webhook.appId when absent (DECISION-2)
//   3. (none) — no-op when no token resolves
//
// IMPORTANT — intentional divergence from the webhook path (event-notifier.mts):
// the loop.ingest block outranks the ASTRARUNNER_ENV profile tier here, while
// the committed webhook.url is the FLOOR default there (profile wins). This is
// deliberate, not a bug — see DEC-062. Do not "fix" this asymmetry by editing
// tier order in either module without re-reading DEC-062 first.
//
// See ../plugin-options.mts for the explicit-tier env/plugin-option folding.
```

---

## Section 2 — Precedence pseudocode

### 2.1 Final precedence table (from design doc, authoritative)

| Tier | URL | Token | Effective env |
|---|---|---|---|
| 1 (explicit) | `resolveIngestUrlOption()` | `resolveIngestTokenOption()` | n/a |
| 2 (ingest block, NEW) | `ingest.url` literal | `resolveBearer(effectiveAppId, effectiveEnv, profile.tokensFile)` when `effectiveAppId` resolves | `ingest.env`, if present |
| 3 (profile) | `readProfile(effectiveEnv).ingestUrl` | n/a (consumed by tier 2's `resolveBearer` call) | `resolveAstrarunnerEnvOption()`, used only when `ingest.env` absent |
| 4 (no-op) | `""` | `null` → skip | n/a |

### 2.2 `resolveIngestUrl(repoPath?)`

```
async function resolveIngestUrl(repoPath?: string): Promise<string> {
  // Tier 1 — explicit. Short-circuits BEFORE touching the ingest block, so
  // AC-2/AC-3 ("block never drives URL") holds by construction, not by
  // convention.
  const explicit = resolveIngestUrlOption();
  if (explicit) return explicit;

  // Tier 1.5 — ingest.url literal.
  const block = repoPath ? await readIngestBlock(repoPath) : {};
  if (block.ingest?.url) return block.ingest.url;

  // Tier 2 — profile, using the EFFECTIVE env (ingest.env overrides
  // ASTRARUNNER_ENV for this repo's resolution only — DECISION-1 refinement).
  const effectiveEnv = resolveEffectiveEnv(block.ingest);
  if (effectiveEnv) {
    try {
      const profile = await readProfile(effectiveEnv);
      if (profile?.ingestUrl) return profile.ingestUrl;
    } catch {
      // fail-silent
    }
  }

  // Tier 3 — no URL available.
  return "";
}
```

### 2.3 `resolveIngestToken(repoPath?)` (new)

```
async function resolveIngestToken(repoPath?: string): Promise<string | null> {
  // Tier 1 — explicit.
  const explicit = resolveIngestTokenOption();
  if (explicit) return explicit;

  // Tier 2 — ingest-block-driven token-store lookup.
  const block = repoPath ? await readIngestBlock(repoPath) : {};
  const effectiveAppId = resolveEffectiveAppId(block.ingest, block.webhookAppId);
  if (effectiveAppId) {
    const effectiveEnv = resolveEffectiveEnv(block.ingest);
    let profileTokensFile: string | undefined;
    if (effectiveEnv) {
      try {
        const profile = await readProfile(effectiveEnv);
        profileTokensFile = profile?.tokensFile;
      } catch {
        // fail-silent — profileTokensFile stays undefined; resolveBearer
        // falls back to its own default `tokens.<env>.json` naming.
      }
    }
    const token = await resolveBearer(effectiveAppId, effectiveEnv, profileTokensFile);
    if (token) return token;
  }

  // Tier 3/4 — nothing resolved.
  return null;
}
```

**Implementation note for the builder:** `resolveIngestUrl` and `resolveIngestToken` each call `readIngestBlock(repoPath)` independently (2 reads of `.claude/loop.json` total per `postAgentCompletions` call when tier 1 misses on both). This is intentional — `readIngestBlock`'s own "single read" guarantee (§1.3) is about not re-reading the file twice *within itself* to get `ingest` + `webhookAppId`, not about deduping across the two resolver functions. Do not add a cross-function cache; it is not required by the design and adds state for no ratified benefit.

### 2.4 `postAgentCompletions(opts)` (body change only — signature unchanged)

```
export async function postAgentCompletions(opts: PostOpts) {
  const url = await resolveIngestUrl(opts.repoPath);
  const token = await resolveIngestToken(opts.repoPath);
  if (!url || !token) return { posted: 0, skipped: opts.agents.length, failed: 0 };
  // ...existing per-row loop unchanged (postOne(url, token, envelope))...
}
```

---

## Section 3 — Test cases (≥8, mapped 1:1 to AC-1..AC-8)

All new cases live in **`src/tests/astrarunner-ingest.test.mts`** (the sole test file touched — see **Build sequencing**), as additional `describe`/`test` blocks below the existing `describe("postAgentCompletions: Path 2 env resolution", ...)`. Match the file's existing idiom exactly:
- `profilesInternals` = `import { _internals as profilesInternals } from "../scripts/lib/env-profiles.mjs"` (already imported).
- **New import needed:** `import { _internals as tokenStoreInternals } from "../scripts/lib/token-store.mjs";` — mirrors `token-store.test.mts` / `event-notifier-webhook.test.mts`.
- Fetch mock via `globalThis.fetch = (async (url, init) => { fetchCalls.push(...); return new Response(...) })` — this file does NOT use `_internals.fetch` injection (that pattern is `event-notifier.mts`-only); keep consistent with the existing `astrarunner-ingest.test.mts` style.
- A `withTempLoopJson(dir, loopJson)` local helper (new, add near the top of the file) writing `<dir>/.claude/loop.json` — mirrors `withTempRepo` in `event-notifier-webhook.test.mts`.
- `beforeEach`/`afterEach` extended to also save/restore `tokenStoreInternals.storePath` and `tokenStoreInternals.profilesDir`, and to `delete` the new plugin-option env vars (`CLAUDE_PLUGIN_OPTION_INGEST_URL`, `CLAUDE_PLUGIN_OPTION_INGEST_TOKEN`, `CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV`) alongside the existing three — the current file's `beforeEach` only clears `ASTRARUNNER_ENV`/`LOOP_INGEST_URL`/`LOOP_INGEST_TOKEN`; extend it (this also brings the file into parity with `origin/main`'s already-extended version, which the builder should confirm after the rebase in **Build sequencing**).
- `resolveBearer`'s env-tier lookup reads `_internals.profilesDir()` + `<tokensFile>` (NOT `_internals.storePath()`); the no-env path reads `_internals.storePath()`. Point both at the same `tmpDir` used for `profiles.json` so files coexist, and be precise per test about which one you set (noted per case below).

### AC-1 — happy path

```
describe("postAgentCompletions: loop.ingest block (FEAT-215)")
test("AC-1: ingest block resolves URL + appId-driven bearer with no env/plugin overrides")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: { ingest: { appId: "app-1", url: "https://ingest.example.com" } } }
  tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json")
  write tmpDir/tokens.json:
    { version: 1, tokens: { "app-1": { bearer: "lrt_resolved" } } }
  no LOOP_INGEST_*, no CLAUDE_PLUGIN_OPTION_*, no ASTRARUNNER_ENV (already cleared in beforeEach)
  fetch mock returns 202

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-1", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].url === "https://ingest.example.com/api/v2/ingest/loop-events"
  fetchCalls[0].init.headers.authorization === "Bearer lrt_resolved"
  result.posted === 1
  result === { posted: 1, skipped: 0, failed: 0 }
```

### AC-2 — explicit env wins over block

```
test("AC-2: LOOP_INGEST_URL + LOOP_INGEST_TOKEN win over ingest block; block never consulted")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: { ingest: { appId: "app-1", url: "https://from-block.example.com" } } }
  process.env.LOOP_INGEST_URL = "http://explicit.example.com"
  process.env.LOOP_INGEST_TOKEN = "lrt_explicit"
  (do NOT create tokens.json — if resolveBearer were ever called it would return
   null; if the block's URL leaked in, fetchCalls[0].url would show it)

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-2", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].url === "http://explicit.example.com/api/v2/ingest/loop-events"
  fetchCalls[0].init.headers.authorization === "Bearer lrt_explicit"
  result.posted === 1
```

### AC-3 — plugin-manager option wins over block

```
test("AC-3: CLAUDE_PLUGIN_OPTION_INGEST_URL/_TOKEN win over ingest block when LOOP_INGEST_* unset")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: { ingest: { appId: "app-1", url: "https://from-block.example.com" } } }
  process.env.CLAUDE_PLUGIN_OPTION_INGEST_URL = "http://plugin-opt.example.com"
  process.env.CLAUDE_PLUGIN_OPTION_INGEST_TOKEN = "lrt_plugin_opt"
  (LOOP_INGEST_* left unset by beforeEach)

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-3", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].url === "http://plugin-opt.example.com/api/v2/ingest/loop-events"
  fetchCalls[0].init.headers.authorization === "Bearer lrt_plugin_opt"
```

### AC-4 — block wins over ASTRARUNNER_ENV profile (the regression this FEAT hinges on)

```
test("AC-4: ingest block outranks a shell-global ASTRARUNNER_ENV profile")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: { ingest: { appId: "app-1", url: "https://from-block.example.com" } } }
  profilesInternals.profilesDir = () => tmpDir
  write tmpDir/profiles.json:
    { version: 1, envs: { prod: { ingestUrl: "https://from-profile.example.com",
                                    tokensFile: "tokens.prod.json", label: "PROD" } } }
  tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json")
  write tmpDir/tokens.json: { version: 1, tokens: { "app-1": { bearer: "lrt_resolved" } } }
  process.env.ASTRARUNNER_ENV = "prod"
  (no LOOP_INGEST_*, no CLAUDE_PLUGIN_OPTION_*; ingest.env NOT set, so effectiveEnv
   falls through to resolveAstrarunnerEnvOption() = "prod" — this exercises the
   "ingest.env absent, ASTRARUNNER_ENV present" branch specifically)

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-4", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].url === "https://from-block.example.com/api/v2/ingest/loop-events"
    // NOT "https://from-profile.example.com" — proves the committed block wins
    // over the shell-global profile tier.
  result.posted === 1
```

### AC-5a — loop.json missing entirely

```
test("AC-5a: missing loop.json -> url \"\", token null, fail-silent no-op")

Setup:
  repo = tmp dir, NO .claude directory created at all
  no env/plugin token/url set

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-5a", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 0
  result === { posted: 0, skipped: 1, failed: 0 }
  // no throw — the test itself completing without an uncaught rejection is
  // part of the assertion.
```

### AC-5b — loop.json present, no ingest key

```
test("AC-5b: loop.json present but no ingest key -> same fail-silent shape as 5a")

Setup:
  repo = tmp dir with .claude/loop.json: { loop: { notifications: { enabled: false } } }

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-5b", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 0
  result === { posted: 0, skipped: 1, failed: 0 }
```

### AC-5c — ingest malformed (not an object)

```
test("AC-5c: ingest is a string, not an object -> treated as absent")

Setup:
  repo = tmp dir with .claude/loop.json: { loop: { ingest: "not-an-object" } }

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-5c", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 0
  result === { posted: 0, skipped: 1, failed: 0 }
```

### AC-5d — ingest.appId present but empty string

```
test("AC-5d: empty-string ingest.appId is treated as absent (no webhook.appId to inherit)")

Setup:
  repo = tmp dir with .claude/loop.json: { loop: { ingest: { appId: "" } } }
  (no url in the block, so URL also falls through to tier 3/4 -> "")

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-5d", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 0
  result === { posted: 0, skipped: 1, failed: 0 }
```

### AC-6 — resolveBearer miss on a well-formed appId (distinct from AC-5)

```
test("AC-6: well-formed appId with no matching token-store entry -> skip, not a malformed-input case")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: { ingest: { appId: "app-unminted", url: "https://from-block.example.com" } } }
  tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json")
  write tmpDir/tokens.json: { version: 1, tokens: { "some-other-app": { bearer: "lrt_x" } } }
  // "app-unminted" deliberately absent from the store.

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-6", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 0
  result === { posted: 0, skipped: 1, failed: 0 }
  // Distinguishing note (assert via a second call in the same test, or a
  // sibling test): resolveIngestUrl for this SAME repo/env would have
  // returned "https://from-block.example.com" (non-empty) — the no-op here
  // is caused SOLELY by the token miss, not a URL failure. Verify by adding
  // a matching tokens.json entry in a follow-up assertion within the same
  // test (second postAgentCompletions call, same repo, tokens.json rewritten
  // to include "app-unminted") and confirming THAT call posts successfully.
```

### AC-7a — appId inherits from webhook.appId when ingest.appId absent

```
test("AC-7a: ingest inherits notifications.webhook.appId when ingest.appId is absent")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: {
        notifications: { webhook: { url: "https://wh.example.com", tenantId: "T", appId: "app-webhook" } },
        ingest: { url: "https://from-block.example.com" }  // no appId
      } }
  tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json")
  write tmpDir/tokens.json: { version: 1, tokens: { "app-webhook": { bearer: "lrt_inherited" } } }

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-7a", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].init.headers.authorization === "Bearer lrt_inherited"
  result.posted === 1
```

### AC-7b — explicit ingest.appId wins over webhook.appId on divergence

```
test("AC-7b: explicit ingest.appId overrides a divergent webhook.appId")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: {
        notifications: { webhook: { url: "https://wh.example.com", tenantId: "T", appId: "app-webhook" } },
        ingest: { appId: "app-ingest-own", url: "https://from-block.example.com" }
      } }
  tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json")
  write tmpDir/tokens.json:
    { version: 1, tokens: {
        "app-webhook": { bearer: "lrt_webhook_should_not_be_used" },
        "app-ingest-own": { bearer: "lrt_ingest_own" }
      } }

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-7b", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].init.headers.authorization === "Bearer lrt_ingest_own"
  result.posted === 1
```

### AC-8a — committed bearer/token literal is ignored

```
test("AC-8a: a bearer/token literal in the committed ingest block is ignored")

Setup:
  repo = tmp dir with .claude/loop.json:
    // Note: IngestBlock has no `bearer`/`token` field — this raw JSON includes
    // one anyway to prove readIngestBlock() does not surface it.
    { loop: { ingest: { appId: "app-1", url: "https://from-block.example.com",
                         bearer: "lrt_COMMITTED_SHOULD_NEVER_BE_USED" } } }
  tokenStoreInternals.storePath = () => path.join(tmpDir, "tokens.json")
  write tmpDir/tokens.json: { version: 1, tokens: { "app-1": { bearer: "lrt_from_store" } } }

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-8a", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].init.headers.authorization === "Bearer lrt_from_store"
    // NOT "Bearer lrt_COMMITTED_SHOULD_NEVER_BE_USED"
  result.posted === 1
```

### AC-8b — `repoPath` is honored by `postAgentCompletions` (PostOpts threading)

```
test("AC-8b: postAgentCompletions resolves ingest config from opts.repoPath")

Setup:
  repoA = tmp dir A with .claude/loop.json: { loop: { ingest: { appId: "app-a", url: "https://a.example.com" } } }
  repoB = tmp dir B with .claude/loop.json: { loop: { ingest: { appId: "app-b", url: "https://b.example.com" } } }
  tokenStoreInternals.storePath is called per postAgentCompletions invocation — set it
  to a shared tmp tokens.json containing both app-a and app-b entries with distinct
  bearers ("lrt_a", "lrt_b").

Action:
  const resultA = await postAgentCompletions({ sliceId: "SLICE-8b-a", agents: [BASE_ROW], repoPath: repoA });
  const resultB = await postAgentCompletions({ sliceId: "SLICE-8b-b", agents: [BASE_ROW], repoPath: repoB });

Assert:
  fetchCalls.length === 2
  fetchCalls[0].url === "https://a.example.com/api/v2/ingest/loop-events"
  fetchCalls[0].init.headers.authorization === "Bearer lrt_a"
  fetchCalls[1].url === "https://b.example.com/api/v2/ingest/loop-events"
  fetchCalls[1].init.headers.authorization === "Bearer lrt_b"
  // Proves opts.repoPath (not a module-level global) drives resolution —
  // the actual agent-report-writer.mts call-site edit (passing its own
  // repoPath into postAgentCompletions) is a one-line additive change
  // exercised implicitly by existing src/tests/agent-report-writer.test.mts
  // coverage; no new test file is added there for this slice (see
  // Build sequencing).
```

### Env-scoping cross-check (bonus — 15th case, not required by AC-1..AC-8 but strongly recommended; proves the DECISION-1 refinement is real, not just a URL override)

```
test("ingest.env overrides a shell-global ASTRARUNNER_ENV for BOTH the profile URL fallback and the token-store tier")

Setup:
  repo = tmp dir with .claude/loop.json:
    { loop: { ingest: { appId: "app-1", env: "staging" } } }  // no url literal — forces tier 3 profile lookup
  profilesInternals.profilesDir = () => tmpDir
  tokenStoreInternals.profilesDir = () => tmpDir  // resolveBearer(appId, env, tokensFile) reads profilesDir, not storePath, when env is supplied
  write tmpDir/profiles.json:
    { version: 1, envs: {
        staging: { ingestUrl: "https://staging.example.com", tokensFile: "tokens.staging.json", label: "Stage" },
        prod:    { ingestUrl: "https://prod.example.com",    tokensFile: "tokens.prod.json",    label: "Prod" }
      } }
  write tmpDir/tokens.staging.json: { version: 1, tokens: { "app-1": { bearer: "lrt_staging" } } }
  write tmpDir/tokens.prod.json:    { version: 1, tokens: { "app-1": { bearer: "lrt_prod" } } }
  process.env.ASTRARUNNER_ENV = "prod"  // shell-global, must be overridden by ingest.env

Action:
  const result = await postAgentCompletions({ sliceId: "SLICE-ENV", agents: [BASE_ROW], repoPath: repo });

Assert:
  fetchCalls.length === 1
  fetchCalls[0].url === "https://staging.example.com/api/v2/ingest/loop-events"  // NOT prod
  fetchCalls[0].init.headers.authorization === "Bearer lrt_staging"              // NOT lrt_prod
  result.posted === 1
```

---

## Section 4 — Verify commands

Run in this exact order (matches `.github/workflows/ci.yml`'s `reusable-plugin-ci.yml` job verbatim — confirmed against the live workflow file, not `CLAUDE.md`'s eslint/prettier text, which is stale relative to the repo's actual Biome tooling):

```bash
bun ./src/scripts/validate-manifests.mts
bun ./src/scripts/validate-content-length.mts
bun ./src/scripts/validate-event-schemas.mts
bun ./src/scripts/validate-decline-citations.mts --repo .
bunx tsc --project tsconfig.json --noEmit
bunx tsc --project tsconfig.test.json --noEmit
bunx biome lint src/
bunx biome format src/
bun test src/tests/ --parallel --timeout 60000
```

Targeted pre-flight (run before the full suite while iterating):

```bash
bun test src/tests/astrarunner-ingest.test.mts --timeout 60000
bun test src/tests/agent-report-writer.test.mts --timeout 60000
```

Expected: every command exits 0. `bunx biome format src/` is a check-only invocation here (no `--write`) — it must report no diffs; if it does, run `bun run format` (`biome format --write src/`) locally, re-diff, then re-run the check command.

---

## Section 5 — Build sequencing

### 5.1 MUST branch/rebase from `origin/main` first — read this before writing any code

This repo's current branch (`feat/envelope-v1.1-enrichment`) has a confirmed, pre-existing state conflict unrelated to FEAT-215 that WILL break a naive edit if skipped:

1. **`src/scripts/lib/plugin-options.mts` does not exist in this branch's committed history (HEAD = `f410072`).** It landed on `main` via PR #299 (commit `369e21d`, "feat(plugin): configure ingest token + environment URL from the plugin manager"). Confirmed via `git show origin/main:src/scripts/lib/plugin-options.mts` (exists, 3 exported resolvers) vs `git log --oneline -- src/scripts/lib/plugin-options.mts` on this branch (no history) and `ls src/scripts/lib/plugin-options.mts` (file absent on disk).
2. **The working tree currently has an uncommitted, staged modification** to `src/scripts/lib/slice-linker/astrarunner-ingest.mts` (`git status --short` shows `M `) that already imports from `../plugin-options.mjs` — a module that does not exist on disk in this branch. This is a **broken import right now**; do not build on top of it as-is.
3. **HEAD's committed version of `astrarunner-ingest.mts`** (pre-this-staged-change) carries FEAT-203 "v1.1 envelope enrichment" fields not present in `origin/main`'s PR #299 version: `AgentRow.agentId`, `.cacheReadInputTokens`, `.cacheCreationInputTokens`, `.costUsd`, `.dispatchKind`, `.iterationIndex`, `schemaVersion: "v1.1"` (vs `"v1"` on main), and `export interface AgentRow` (exported — `agent-report-writer.mts` on this branch types against it via `import("./astrarunner-ingest.mjs").AgentRow`). The currently-staged working-tree edit **drops all of these fields** to match `origin/main` exactly, including un-exporting `AgentRow`.
4. **`src/tests/envelope-enrichment.test.mts`** on this branch tests the FEAT-203 fields directly (`agentId`, `costUsd`, `cacheReadInputTokens`, etc., `schemaVersion: "v1.1"`) — it will fail against the lean `origin/main` shape.

**Reconciling #3/#4 (FEAT-203 v1.1 enrichment vs. PR #299 plugin-options integration) is a separate, FEAT-215-unrelated merge decision — this spec does not resolve it and the builder must not silently pick one side.** Before starting FEAT-215 implementation:

- Confirm with the operator (or check for a newer commit / open PR) whether the FEAT-203 enrichment fields are meant to survive the `main` rebase. If yes, the merged `astrarunner-ingest.mts` baseline for FEAT-215 work is `origin/main`'s PR #299 shape **plus** the FEAT-203 fields re-applied (both `AgentRow` extensions), not either file in isolation.
- Do NOT delete `src/tests/envelope-enrichment.test.mts` or its assertions to make CI pass — that erases FEAT-203 coverage. If the fields are confirmed dropped, that decision needs its own commit message / DEC entry, separate from FEAT-215's.
- **FEAT-215's own contracts in §1 above (`IngestBlock`, `PostOpts.repoPath`, `readIngestBlock`, `resolveEffectiveAppId`, `resolveEffectiveEnv`, `resolveIngestUrl`, `resolveIngestToken`) are additive and orthogonal to whichever `AgentRow` shape survives this reconciliation** — apply them on top of whatever the merged baseline turns out to be. `buildEnvelope()`, `postOne()`, and `AgentRow` itself are untouched by FEAT-215.

Once the branch has a consistent baseline with a real, importable `../plugin-options.mjs`:

```bash
git fetch origin main
git rebase origin/main   # or branch fresh from origin/main if history divergence makes rebase noisy
bunx tsc --project tsconfig.json --noEmit   # confirm plugin-options.mjs import resolves before writing any FEAT-215 code
```

### 5.2 Files touched by this slice (exactly 2 source + 1 test — after the pre-flight above)

**Source:**
- `src/scripts/lib/slice-linker/astrarunner-ingest.mts` — add `IngestBlock` export, `readIngestBlock`, `resolveEffectiveAppId`, `resolveEffectiveEnv`, extend `resolveIngestUrl` to `(repoPath?: string)`, add `resolveIngestToken(repoPath?: string)`, add `PostOpts.repoPath?: string`, change `postAgentCompletions` body per §2.4, replace header comment per §1.5.
- `src/scripts/lib/slice-linker/agent-report-writer.mts` — line ~599, add `repoPath` to the existing `postAgentCompletions({ ... })` call literal (`repoPath` is already in local scope from `writeAgentReport(repoPath, ...)`'s own first parameter). No other change to this file.

**Test:**
- `src/tests/astrarunner-ingest.test.mts` — add `describe("postAgentCompletions: loop.ingest block (FEAT-215)", ...)` containing the cases in §3 (AC-1 through AC-8b, plus the recommended env-scoping cross-check), extend `beforeEach`/`afterEach` per the idiom notes at the top of §3, add the `tokenStoreInternals` import and a `withTempLoopJson` helper.

No other files are touched by this slice. `src/tests/envelope-enrichment.test.mts` and `src/tests/agent-report-writer.test.mts` are **not edited** by FEAT-215 itself — only re-verify they still pass after the rebase in §5.1 (their FEAT-203-vs-main reconciliation status is a pre-condition this slice depends on, not a deliverable of this slice).

---

## Risks (carried from design doc, restated for the builder)

- **Fail-silent misordering is invisible.** Nothing errors if a future edit swaps the ingest-block/profile tier order back to webhook-symmetric. AC-4's test (§3) is the regression guard; the header-comment cross-reference to DEC-062 (§1.5) is the second guard. Do not remove either without re-reading DEC-062.
- **Confused-deputy surface doubles** (not new, shared with the webhook path): a malicious/careless `loop.json` `ingest.url` + `appId` can redirect a locally-resolved bearer to an attacker-chosen host. AC-2/AC-8a constrain this at the resolver level; no additional mitigation is in scope for this slice.
- **`readIngestBlock` double-duty read.** If a future edit changes `loop.json`'s shape independently in `event-notifier.mts`'s reader, the two readers can drift on error handling. Both MUST keep the identical `try/catch { return {} }` shape — do not diverge them in this slice or a later one without updating both.
