# Task-store providers

The loop's backlog (FEATs/SLICEs under `.claude/artifacts/loop/backlog/`) is
always the local source of truth — files on disk. A **task-store provider**
is an optional mirror that publishes/updates the same lifecycle events
(feature created, slice created, slice closed, status change) against an
external tracker. `src/scripts/lib/task-store/provider-interface.mts` is the
canonical contract every provider implements; see that file's doc comment
for the full method table.

## Provider selection

Resolved by `getProvider(config, repoPath)` in
`src/scripts/lib/task-store/index.mts`, in this order:

1. `taskStore.enabled === false` — force `NoopProvider` regardless of
   `taskStore.provider`.
2. `taskStore.provider` — explicit provider name: `"github"` | `"linear"` |
   `"noop"`.
3. `github.enabled === true` — back-compat: treated as `provider: "github"`
   when `taskStore.provider` is unset (see `setup-writer.mts`'s comment on
   removing this once all callers read `taskStore.provider` directly).
4. Default: `NoopProvider` — no external tracker; the backlog stays
   file-only. This is the implicit default for a repo with no `taskStore`
   config at all.

An unrecognised `taskStore.provider` value falls back to `NoopProvider` and
logs a warning (`[task-store] Unknown provider "...\"`).

## `taskStore.linear` config schema

```json
{
  "taskStore": {
    "provider": "linear",
    "linear": {
      "teamKey": "AST",
      "teamId": "81cea472-33a9-4fbe-a797-147e17c6ca05",
      "workspace": "Astragenie",
      "stateMap": {
        "done": "Shipped"
      }
    }
  }
}
```

- **`teamKey`** / **`teamId`** — required. `resolveLinearConfig` (in
  `linear-config.mts`) returns `enabled: false, reason: "missing_config"`
  when either is absent, with a warning naming both fields — there is no
  hardcoded fallback to Astragenie's own team.
- **`workspace`** — optional, informational only (not sent in any GraphQL
  call today).
- **`stateMap`** — optional. Per-key override merged onto
  `DEFAULT_LINEAR_STATE_MAP`; any key you omit keeps its default.
- **`apiKey`** — if present in config it is ignored (never read) and a
  warning is logged. Key material must never live in a committed file; see
  Auth below.

### Default state map

`DEFAULT_LINEAR_STATE_MAP` (`linear-config.mts`) maps loop backlog status to
a Linear workflow-state **name** looked up per-team at call time:

| Backlog status | Linear workflow state |
|-----------------|------------------------|
| `pending`       | `Backlog`              |
| `triaged`       | `Todo`                 |
| `in-progress`   | `In Progress`          |
| `done`          | `Done`                 |

`LinearProvider.updateStatus(externalId, status)` resolves `stateMap[status]
?? status`, looks up that name's workflow-state id for the configured team
(`fetchWorkflowStateByName`), then issues an `issueUpdate` mutation with the
resolved id. If the lookup returns zero matching states, `updateStatus` logs
a warning and returns without calling `issueUpdate`. `closeSlice(externalId,
reason)` is a thin wrapper that calls `updateStatus(externalId, "done")` —
the `reason` argument is accepted for interface parity but not otherwise
used by `LinearProvider`.

## Auth resolution order

`resolveLinearConfig` never reads or accepts an API key from config. It
resolves the key in this order:

1. `LINEAR_API_KEY` environment variable, if set and non-empty.
2. `token-store.mts`'s file-backed bearer store
   (`~/.astrarunner/tokens.json`, entry keyed `"linear"`), via
   `resolveBearer("linear")`.
3. Neither present → `enabled: false, reason: "missing_api_key"`, with a
   warning naming both fallback locations.

Key material is never written to `.claude/loop.json` by
`setup-task-store.mjs`/`setup-writer.mts`, and any `apiKey` field found in
config is stripped/ignored (see above). No warning message ever contains
the resolved key's value.

## Soft-fail contract

Every `TaskStoreProvider` method must resolve without throwing, per
`provider-interface.mts`. `LinearProvider` follows this for all seven
methods:

- **Not configured** (missing `teamKey`/`teamId`, or missing API key) — logs
  `[LinearProvider] <method>: not configured — <reason>; skipping.` and
  returns `null` (or the empty shape for `syncPull`/`bootstrap`) without
  making a transport call.
- **Call failed** (non-2xx HTTP response, or a GraphQL error payload) —
  logs `[LinearProvider] <method>: call failed — <describeGraphQLFailure
  output>` and returns `null` / void, again never throwing.

Tests exercise this via an injectable mock transport
(`config.linearTransport`) — no live network call happens in CI. See
`src/tests/linear-provider-config.test.mts` (config/auth resolution,
publishFeature/publishSlice, soft-fail matrix, default stateMap) and
`src/tests/linear-provider.test.mts` (postSliceComment happy path,
closeSlice's delegation to updateStatus, and the zero-workflow-states-found
branch).

## COND-C v1 descope: `syncPull` / `bootstrap`

Unlike GitHub (`github-sync.mjs`), Linear has no existing sync engine in
this repo. A real `syncPull`/`bootstrap` implementation needs cursor
pagination, team/project filtering, and rate-limit handling (Linear's API
is limited to roughly 1500 requests/hour) — out of scope for this pass per
review COND-C. `LinearProvider.syncPull` and `LinearProvider.bootstrap` are
documented warning-stubs in v1: each logs a warning naming the COND-C
descope, returns an empty-but-well-shaped result (`{ features: [], slices:
[] }` / `{ features: [] }`), and makes zero transport calls. A follow-up
FEAT tracks the full sync engine; see `src/tests/linear-provider-stubs.test.mts`
for the assertions covering this behavior.

## Setup CLI

`scripts/setup-task-store.mjs` idempotently seeds `taskStore.provider` (and,
for `linear`, `taskStore.linear.{teamKey,teamId,workspace}`) into
`.claude/loop.json`. It never reads or writes `LINEAR_API_KEY` — set that in
your shell environment or the token-store file directly.

```sh
node scripts/setup-task-store.mjs <repoPath> --provider linear \
  --team-key AST --team-id 81cea472-33a9-4fbe-a797-147e17c6ca05 \
  --workspace Astragenie
```

Valid `--provider` values: `github`, `noop`, `linear`
(`VALID_PROVIDERS` in `setup-writer.mts`). Re-running with the same flags is
a no-op; a field you don't pass is left untouched on subsequent runs.

## Multi-tracker (composite) stamping — DEC-078

A single `TaskStoreProvider.publishFeature()`/`publishSlice()` call returns
one external id and never writes frontmatter itself — both `GithubProvider`
and `LinearProvider` are pure create-and-return by design. A future
`CompositeProvider` (FEAT-253) that publishes to more than one tracker at
once (e.g. GitHub *and* Linear) is responsible for fanning out to each
child provider, collecting their ids, and performing the single frontmatter
stamp write (`github_issue`/`github_url` alongside `linear_issue`/
`linear_url`). See `.claude/artifacts/loop/decisions/DEC-078.md` for the
full contract and rationale — this repo does not implement
`CompositeProvider` yet, and `LinearProvider` does not implement solo
self-stamping (`...ById`-style methods) until a production call site for it
exists (DEC-078 §4).
