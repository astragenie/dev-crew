---
slice: SLICE-156
feature: FEAT-252
commit: 19d7e292
branch: wave3-SLICE-156
reviewer: crew:reviewer (independent, main-thread dispatch)
decision: approved
---

# Review result — SLICE-156 (LinearProvider GraphQL write methods + stateMap + config seeding)

## Verdict: PASS

## Scope reviewed

`git diff origin/main...HEAD` on `wave3-SLICE-156` @ `19d7e292`, source + tests only
(ceremony/artifact files under `.claude/artifacts/**` excluded per instructions).

## AC coverage

All five slice ACs have dedicated, passing test coverage in
`src/tests/linear-provider-config.test.mts`:

- **AC-1** (`publishFeature` → `issueCreate` scoped to `teamId`, returns identifier) —
  `describe("LinearProvider.publishFeature — AC-1")`. Verified: mutation payload and
  parsed return value asserted against a mock transport.
- **AC-2** (`publishSlice` → `issueCreate` with `parentId`) —
  `describe("LinearProvider.publishSlice — AC-2")`, including the
  `parentExternalId: null` omission case.
- **AC-3** (soft-fail: missing key / HTTP error / GraphQL error payload) —
  `describe("LinearProvider soft-fail contract — AC-3")`, three tests, each
  asserting no throw and the correct "not configured" vs "call failed" warn text.
- **AC-4** (default + override stateMap) —
  `describe("LinearProvider.updateStatus — AC-4 default stateMap")`, all four
  default mappings plus a stateMap-override test.
- **AC-5** (COND-C descope: `syncPull`/`bootstrap` warning-stubs, zero transport
  calls) — `describe("LinearProvider.syncPull / bootstrap — AC-5 COND-C descope")`.

Ran the claimed test files directly (63 pass / 0 fail) and the full suite
(`bun test src/tests/ --parallel --timeout 60000`): **2635 pass / 0 fail / 1 skip**,
matching the builder's reported evidence exactly. `tsc --noEmit` clean on both
`tsconfig.json` and `tsconfig.test.json`; `biome lint`/`biome format` clean on all
touched files; `validate-manifests`, `validate-agent-refs`, `validate-imports` all OK.

## DEC-078 conformance

Confirmed by full read of `linear-provider.mts`: no `mergeFrontmatter` import, no
`fs.writeFile` call, no frontmatter mutation anywhere in the provider.
`publishFeature`/`publishSlice` return a bare `Promise<number | string | null>`
(the parsed Linear `identifier`), matching Option B exactly — stamping is left
entirely to a future `CompositeProvider` (FEAT-253), as decided.

## Soft-fail contract

Every method resolves without throwing, including the paths the review request
called out specifically:

- Transport-level rejection: `defaultLinearTransport` wraps `fetch` in try/catch
  and returns `{ ok: false, status: 0, ... }` rather than propagating
  (`linear-graphql.mts:33-38`).
- Malformed GraphQL response shape (`data.issueCreate` missing): both
  `publishFeature`/`publishSlice` use `result.data?.issueCreate?.issue?.identifier ?? null`
  — optional-chained all the way, falls back to `null`.
- `updateStatus` with zero workflow states returned: `linear-provider.mts:160-164`
  checks `stateId == null` and warns + returns early rather than passing `null`
  into `updateIssueState`. **Not directly unit-tested** (no test scripts a
  `workflowStates.nodes: []` response) — see Minor finding below.

## Security

`LINEAR_API_KEY` / resolved key value never appears in any `console.warn` call
(verified by direct read of every warn call site in `linear-config.mts` and
`linear-provider.mts`, corroborated by the test suite's two dedicated
"never logs key material" tests). `setup-writer.mts`'s `mergeLinearConfig`
unconditionally `delete merged.apiKey`s before merge, and
`writeTaskStoreConfig never persists an apiKey field into loop.json even if passed`
exercises that directly.

## Clobber fix

`setup-writer.mts:61` changed `cfg.taskStore = { provider }` →
`cfg.taskStore = { ...cfg.taskStore, provider }`. Confirmed this is the fix for
the sibling-key-wipe bug, and it's covered by three new idempotent-seeding tests
in `task-store-setup-writer.test.mts`, including one that explicitly re-runs
`writeTaskStoreConfig` with a partial payload and asserts prior fields survive.

## Findings

- **[MINOR]** `src/scripts/lib/task-store/providers/linear-provider.mts:160-164`
  — the zero-workflow-states-found branch of `updateStatus` (distinct from the
  HTTP/GraphQL-error branch) has no dedicated test asserting the warn text or
  the early return when `workflowStates.nodes` comes back empty. Code path is
  simple and clearly correct on inspection; recommend a follow-up test, not a
  blocker.
- **[MINOR]** `src/scripts/lib/task-store/providers/linear-provider.mts:87-118`
  (`postSliceComment`, `closeSlice`) — builder self-flagged this: only
  disabled-state coverage exists, no success-path test asserting the
  `createComment` mutation payload or that `closeSlice` correctly delegates to
  `updateStatus(id, "done")`. None of AC-1..AC-5 require this coverage, and both
  methods are thin, already-reviewed wrappers around tested primitives
  (`createComment`, `updateStatus`). Acceptable as follow-up, does not block
  this slice.
- No correctness, DEC-078, soft-fail, or security issues found.

## Conclusion

Implementation matches the slice's AC contract and DEC-078's Option B decision
precisely, soft-fail discipline is upheld everywhere it matters, and the two
self-flagged/discovered test gaps are both non-blocking per-AC scope. Evidence
(test counts, tsc, biome, validators) independently reproduced and matches the
builder's claims exactly.

**PASS.**
