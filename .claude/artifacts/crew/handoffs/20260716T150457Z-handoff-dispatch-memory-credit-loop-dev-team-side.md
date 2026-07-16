# Task Handoff: dispatch-memory-credit-loop — dev-team side (3c) shipped

- Created: 2026-07-16T15:04:57Z
- From: dev-team-credit-loop agent (cross-repo task, dev-team worktree)
- To: dispatcher / runner-plugin session

## Objective

Implement the dev-team (crew plugin) half of the cross-plugin dispatch-time
memory credit loop, per the upstream request doc
`docs/upstream-requests/2026-07-16-crew-dispatch-memory-credit-loop.md` and
its design record
`.claude/artifacts/crew/runs/20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md`
(both in this repo, runner-plugin). This closes workstream 3c.

## Owner

dev-team-credit-loop agent, isolated worktree
`C:\work\mega\dev-team-wt-creditloop` on branch
`feat/dispatch-memory-credit-loop`.

## Result

- **Branch:** `feat/dispatch-memory-credit-loop`
- **PR:** https://github.com/astragenie/dev-team/pull/241
- **Commit:** `3db840fb` — "feat(memory): dispatch-time recall digest + memories_used credit loop"

## Which existing seam this extends

The **agent-profile-load-feedback** seam (dev-team #235 / v0.64.0–v0.66.0):
the `SubagentStart` hook (`hooks/subagent-start-profile.ts` →
`hooks/lib/subagent-profile-core.ts`) that deterministically injects each
agent's astramem profile (`buildProfileBlock`) at every dispatch — not a new
`v0.74.0` seam as the task brief guessed (dev-team's actual shipped version
at task start was v0.66.0; the profile-load-feedback work landed at v0.64.0
and v0.66.0). Extended, not paralleled:

- The hook's default loader now resolves `buildHandoffDigest`
  (`scripts/lib/memory/handoff-digest.ts`) instead of `buildProfileBlock`
  directly — same `{block, injectedIds}` shape, byte-identical output when
  the new feature is off. This is the highest-leverage seam available: it
  fires on **every** subagent dispatch, including ad-hoc `Agent()` calls
  that never pass through a `commands/*.md` flow (the exact gap the design
  doc calls out — most real dispatches see no runner ceremony).
- The `crew profile-block` CLI fallback (`memory.profile.injectVia:
  "command"`, for clients without the hook) got the same extension.
- The recall-injection seam (`inject-recall.ts`) gained one new additive
  export, `recallEntries()`, factored out of `buildRecallBlock`'s existing
  body — `buildRecallBlock`'s own signature/behavior/format is completely
  unchanged (still FROZEN per `recall-injection-v1.md`).

## Deliverables (per the ask)

1. **Dispatch-time digest** — `buildHandoffDigest`: agent_profile
   (corrections first, delegated verbatim to `buildProfileBlock`) + a new
   sibling `## Recall (memory credit loop)` block, k≤5, project+agent
   scoped, each hit carrying a `<!--atom:id-->` marker (same convention the
   profile block already uses). Goes through the shared
   `@astragenie/memory-provider` seam dev-team already resolves through —
   no hand-rolled HTTP, no per-call CLI spawns.
2. **`memories_used` handoff convention** — optional
   `--memories-used <csv>` on both `write-handoff` (architect,
   document-writer, researcher, etc. — agents that call `write-handoff`
   directly) and `report-to-pr.ts` (fullstack-dev/backend-dev/frontend-dev,
   which report via the PR-comment contract instead). Never validated,
   never gated; absent field credits nothing.
3. **Credit on receipt** — `creditMemoriesUsed`
   (`scripts/lib/memory/handoff-credit.ts`): bounded (`MAX_CREDIT_BATCH =
   20`, deduplicated, malformed/non-string ids dropped silently), per-id
   and whole-call fail-silent. Wired into `writeArtifact` as a **detached**
   fire-and-forget call (mirrors the existing
   `fireCaptureTeeSilent`/`fireFailureCaptureSilent` pattern — never
   inline-awaited, guarded by `fireGuarded`'s bounded ceiling). In the
   one-shot `report-to-pr.ts` CLI (no long-running process to detach into),
   the call IS awaited but still bounded by `fireGuarded` (~1.5s ceiling) so
   it adds latency but can never hang the CLI.
4. **Tests** — 3 new files + edits to 2 existing ones, 30 new/changed test
   cases total, covering: digest byte-identical when off, digest carries
   ids when on, k≤5 hard cap, global `memory.enabled:"never"` kill-switch,
   fail-silent on a recall-side config error, credit happy path, credit
   kill-switches (dedicated + global), malformed/absent ids ignored, the
   `MAX_CREDIT_BATCH` bound, a throwing `feedback()` for one id not blocking
   the rest, `writeArtifact`'s detached-and-bounded credit hook (fires only
   for `kind:"handoff"` + non-empty `memoriesUsed`, never blocks the write),
   `memoriesUsed` round-tripping through `report-to-pr`'s comment body, and
   the SubagentStart hook's default loader resolving cleanly with no test
   override and no live daemon.
5. **Doc** — new `docs/contracts/dispatch-memory-credit-loop-v1.md`,
   sibling of `recall-injection-v1.md` and `agent-profile-feedback-v1.md`.
   Also updated the three dispatch-assembly command files
   (`commands/build.md`, `commands/fix.md`, `commands/orchestrate-slice.md`)
   with short notes on the digest extension and the optional
   `--memories-used` flag at their existing profile-injection and
   write-handoff steps.

## A real bug caught before landing (config schema strictness)

Initially modeled the new config as a bare top-level `memory.creditLoop`
key. `@astragenie/memory-provider`'s `MemoryConfigSchema` is `.strict()` at
the top level — only `profile` and `feedback` are declared
`z.object({}).passthrough()` consumer-extension namespaces. A bare new
top-level key throws inside `parseMemoryConfig`; because every caller
(`recallEntries`, `resolveProvider`) already swallows that error per its own
fail-silent contract, the bug was **silent** (digest permanently empty, no
error surfaced) rather than loud — caught only by writing a debug repro
script and observing the recall digest never populate in the "enabled: true"
test case. Fixed by nesting under the existing `feedback` passthrough
namespace instead: `memory.feedback.creditLoop.{enabled,k}`. Documented as a
load-bearing design note in the contract doc and the module header comments
so a future edit doesn't reintroduce a bare top-level key.

## Changed/added files

Modified:
- `commands/build.md`, `commands/fix.md`, `commands/orchestrate-slice.md`
- `hooks/lib/subagent-profile-core.ts`
- `scripts/crew.ts` (FLAG_SPEC + defaults + `write-handoff`/`profile-block` handlers)
- `scripts/lib/artifacts/types.ts`, `scripts/lib/artifacts/write.ts`
- `scripts/lib/memory/index.ts`, `scripts/lib/memory/inject-recall.ts`
- `scripts/lib/report-to-pr.ts`, `scripts/report-to-pr.ts`
- `tests/report-to-pr.test.ts`, `tests/subagent-profile-hook.test.ts`

Added:
- `scripts/lib/memory/handoff-digest.ts`
- `scripts/lib/memory/handoff-credit.ts`
- `tests/memory-handoff-digest.test.ts`
- `tests/memory-handoff-credit.test.ts`
- `tests/memory-write-handoff-credit.test.ts`
- `docs/contracts/dispatch-memory-credit-loop-v1.md`

## Gate evidence

- `bunx tsc --noEmit` — clean (one type error found and fixed: `Flags`
  interface needed `memoriesUsed` in its defaults object).
- `bun run lint` (Biome, `scripts/ hooks/`) — clean, 212 files checked.
- `bun run format:check` (Biome, `scripts/ tests/`) — clean after one
  `bun run format` auto-fix pass (3 files, purely whitespace/wrapping).
- `node ./scripts/validate-manifests.ts` / `validate-skills.ts` /
  `validate-agents.ts` / `validate-slices.ts` — all pass (pre-existing
  advisory skill warnings unrelated to this change).
- Targeted test runs (avoids the documented bun#5090 node:test/bun:test
  interleaving issue that affects the full `bun test tests/` invocation
  repo-wide, confirmed pre-existing against an unmodified `main` checkout —
  114 fail/113 errors there too):
  - 12 directly-relevant memory/profile/recall/report files: **82 pass, 0
    fail**.
  - 11 files importing the modified `write.ts`: **49 pass, 0 fail**.
  - `cli-smoke.test.ts` / `cli-artifacts.test.ts` /
    `artifact-stub-and-update.test.ts` / `agent-prompt-content.test.ts`: **88
    pass, 1 pre-existing unrelated fail** (a Node deprecation-warning
    assertion on the `init` command, reproduced identically on unmodified
    `main`).

## Invariant-compliance notes

- Memory was never made a gate anywhere — every new touchpoint is
  fail-silent + bounded (per-id and whole-call try/catch, `fireGuarded`
  ceilings, `MAX_CREDIT_BATCH` cap).
- `dispatchInstruction`'s shape is unchanged; the digest is prepended prompt
  text exactly like the existing recall/profile blocks.
- The FROZEN `## Prior context (from astramem)` recall-block format
  (`recall-injection-v1.md`, cross-repo-consumed by runner-plugin S3b) is
  untouched — verified by re-running `memory-inject-recall.test.ts`'s full
  suite (11 tests covering byte-identical-when-off, project scoping, wire
  bypass, token budget) unchanged and green.
- `memory.enabled: "never"` still wins over every new sub-flag — verified
  with a dedicated kill-switch test in both new test files that exercises
  the REAL `resolveProvider()` gate (no test-double provider), not just the
  local `creditLoop.enabled` check.
- `memories_used` is optional everywhere it was added — no CI validator or
  ceremony gate reads or requires it.

## Risks / open questions

- Config default is `enabled: false` everywhere (matches every other memory
  sub-feature's opt-in-by-default convention in this repo). dev-team's own
  `.claude/loop.json` was NOT flipped to dogfood this — that's a natural,
  separate fast-follow once the daemon-side usefulness metric is watched for
  a cycle, not bundled into this PR to keep the diff reviewable.
- The recall-digest half's project scoping reuses `inject-recall.ts`'s
  existing astramem wire-bypass path; if that path's behavior changes
  upstream, `handoff-digest.ts`'s `recallEntries()` call inherits it
  automatically (single seam, not duplicated).
- PR #241 is unreviewed as of this handoff — dev-team's own CI (GitHub
  Actions) has not yet reported; local gates above are the evidence
  available at handoff time.

## Deliverable

PR https://github.com/astragenie/dev-team/pull/241 on
`feat/dispatch-memory-credit-loop`, ready for review. Runner-plugin's own
Phase 3b (slice-close batch credit, outcome-weighted) remains a separate,
independent workstream — the only cross-plugin coupling is the optional
`memories_used` field's existence and shape, which this PR now provides.

## Suggested next handoff

Runner-plugin session picks up Phase 3b (slice-close batch credit,
outcome-weighted, per the design record's "Layer 2" section) — no
dependency on this PR merging first, since the contract is additive and
already documented.
