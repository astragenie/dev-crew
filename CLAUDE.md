# Repo Instructions — loop

Claude Code plugin: the Wiggin-Loop methodology layer that sits on top
of the `crew` plugin. Provides HARD RULE blocks, slice scaffold,
phase-gate runner, and the autonomous-development loop primitives.

## Memory binding (astramem)

This repo's memory project id is **`runner-plugin`**. Memory is served by the
**astramem** MCP server (`mcp__plugin_crew_astramem__*`) — there is no separate
"cortex" server, and the old `MemorySave` / `MemorySearch` / `projectId: loop`
convention is **retired** (those tool names do not resolve in this environment;
writes under project `loop` land nowhere — verified 2026-07-14, `search --project
loop` → 0 hits). When recalling or recording memory:

- Pass `project` = **`runner-plugin`** to `recall_memory` / `search_memory` /
  `remember`. The astramem `project` filter is native (a top-level field), NOT
  a `metadata.project` entry — nesting it there is silently dropped by the wire
  client (`daemon-client.js`), so the loop's own code path
  (`memory-sink.mts` → `astramem-client`) must set it top-level too.
- The loop's runtime `productName` (`.claude/loop.json`) is the project id the
  in-process transport sends. Keep it (or a `memory.project` override) equal to
  **`runner-plugin`** so slice-start recall and slice-close capture share one
  project namespace.
- Follow the `astramem:using-memory` skill loop: recall (`agent_profile` +
  `recall_memory`) → work → `submit_feedback` / `mark_memory_used` on the ids you
  actually relied on (this is what lifts useful memory up the ranking — ADR-010) →
  optional `remember` at the end. Write SHORT: one crisp, standalone fact per
  memory (long blobs dilute the embedding and become unrecallable).
- `scope`: use `team` for anything meant to help other agents/sessions on this
  project; astramem's `remember` defaults to `private` (invisible to shared
  recall) if scope is omitted.

## Read first

<!-- clause: read-first -->

1. `README.md` — what this plugin is, install instructions, pinned release.
2. `ADOPTION.md` — preconditions, backup advice, and a manual install walk-through.
3. `docs/code-conventions.md` — ESM / Node conventions for this repo.
4. `docs/sop/specialist-pause-handling.md` — SOP when builder/reviewer/validator subagents pause without writing artifact (recurring 2026-06-06 pattern).
5. `docs/upstream-requests/` — open requests against hero-crew or other upstream plugins; check status before reopening dependent FEATs.
6. `docs/halt-badges.md` — registry of every halt-badge field loop emits in `snapshot.*` (cross-plugin contract per SPEC-003). MUST update when adding a new halt-badge in a future FEAT.
7. `.claude/artifacts/loop/backlog/product-backlog.md` — current roadmap (Phase 3 loop safety + telemetry).
8. `CHANGELOG.md` — recent releases.

## Engineering standards

<!-- clause: engineering-standards -->

For language-agnostic patterns and design guidance, consult
[`Astragenie.Standards`](https://github.com/astragenie/standards)
if it is installed at a sibling path. The ESM conventions are mirrored
at `Astragenie.Standards/docs/javascript/coding-conventions.md`. The
local `docs/code-conventions.md` is self-contained and authoritative
for this repo.

## Hard dependency

<!-- clause: hard-dependency -->

This plugin requires the [`crew`](https://github.com/astragenie/dev-team)
plugin at the version pinned in `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`.
`/runner:install` refuses to run against an older crew.

## Local commands

<!-- clause: local-commands -->

Runtime is **Bun** — source `.mts` files run directly, no build/emit step.

- `bun test src/tests/ --parallel --timeout 60000` — full test suite
  (also `bun run test`).
- `bun run lint` — Biome (`biome lint src/`; config in `biome.json`).
- `bun run format` / `bun run format:check` — Biome formatter.
- `bun ./src/scripts/validate-manifests.mts` — manifest sanity check.
- `bun ./src/scripts/validate-content-length.mts` — owned-agent line cap
  (300) + SKILL.md line cap (200). `agents/3rdparty/` exempt.

## CI gates

<!-- clause: ci-gates -->

GitHub Actions runs on every push and PR (all under Bun, no `npm ci`/build):

1. `bun install --frozen-lockfile`
2. `bun ./src/scripts/validate-manifests.mts`
3. `bun ./src/scripts/validate-content-length.mts`
4. `bun ./src/scripts/validate-decline-citations.mts --repo .`
5. `bun ./src/scripts/validate-agent-refs.mts` — blocks a `crew:<name>` /
   `runner:<name>` dispatch instruction whose `<name>` doesn't resolve to a
   real agent, command, or skill (astragenie/runner-plugin#371 — a phantom
   `crew:builder` shipped in installed loop rules and broke consumer
   orchestrators).
6. `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json`
7. `bunx biome lint src/`
8. `bunx biome format src/` (check mode — unformatted files fail)
9. `bun ./src/scripts/validate-imports.mts` — enforces the slice-linker
   sub-module import boundary (files outside `slice-linker/` must go
   through the barrel, not reach into sub-modules directly).
10. `bun ./src/scripts/validate-backlog-writes.mts` — explicit-allowlist
   guard (SLICE-153 / FEAT-250, COND-D): fails when a file outside
   `backlog-store.mts` (the sole sanctioned BacklogStore writer, DEC-076)
   raw-writes a backlog-shaped FEAT/SLICE path. `doctor.mts` (cross-tree
   reconciliation) and `pm-apply.mts` (body-section content edits) are
   named allowlist exceptions with an inline rationale each.
11. `bun ./src/scripts/validate-slice-touches-files.mts` — validates every
   pending/in-progress/needs-review slice's `touches_files` (declared or
   inferred from body prose). Errors on absolute paths, `..` traversal, or a
   path whose grandparent directory doesn't exist (a typo'd or fabricated
   path). A missing immediate parent dir is allowed — slices routinely plan
   ONE new subdirectory level under an existing area (e.g.
   `docs/architecture/foo.md` when `docs/architecture` doesn't exist yet but
   `docs` does) — but deeper fabricated nesting under a real top-level dir
   still errors. Warns (does not fail) when `touches_files` is absent
   altogether on a slice created on/after `--warn-cutoff` (default
   2026-06-15).
12. `bun test src/tests/ --parallel --timeout 60000`
13. `bun ./src/scripts/validate-snapshot-freshness.mts` — blocks a stale
   `.claude/artifacts/loop/loop-snapshot.md` from merging (FEAT-208).
   Regenerates the snapshot content in-memory and diffs it against the
   on-disk file; any drift (backlog/grade counts, "next to slice" list,
   decisions, telemetry) fails CI. The pre-push hook still runs this
   check in warn-only mode (`--check-generated`) — CI is the hard gate.
14. `bun ./src/scripts/validate-org-refs.mts` — stale-owner sweep (#474
   follow-up): fails when the pre-transfer GitHub owner `sergeymilashico`
   appears in AUTHORED surfaces (README, ADOPTION, `src/`, `docs/`,
   `commands/`, `skills/`, `agents/` excl `3rdparty/`, `.claude-plugin/`).
   The owner is now `astragenie` (repo paths) / `astra` (skill `owner:`
   field); GitHub redirects the old path so stale refs still work, which is
   why they rot undetected. Frozen history (CHANGELOG past entries,
   `.claude/artifacts/**`, `.claude/logs/**`) is out of scope. The guard's
   own source + test are named allowlist exceptions (they must name the
   banned token).
15. `bun ./src/scripts/validate-marketplace-sync.mts` — registry drift guard:
   fetches `astragenie/astra-marketplace`'s `marketplace.json` and fails when
   its `runner` entry version ≠ this repo's `plugin.json` (the registry sat
   at 0.67.0 while 0.68/0.69/0.70 shipped — consumers got a stale version). An
   UNREACHABLE registry degrades to a warning (exit 0) so a network blip never
   blocks CI; a reachable-and-mismatched registry is a hard fail.
16. `bun ./src/scripts/validate-dispatch-markers.mts` — checks that the
   `<task-scoped>` order-block marker (FEAT-263 T1/T5, dispatch.mts +
   start-slice.mts) is balanced, non-nested, and that every FORBIDDEN/GATES/
   RETURN/ECHO order-block keyword stays confined inside a marked region.
17. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config
   drift guard (improvement plan 2026-07-18, W0.2): fails when
   `.claude/loop.json` has memory enabled but the feedback shape lags the
   current contract (e.g. `memory.feedback.creditLoop` absent — the exact
   gap behind the 1.6% usefulness finding in runner-plugin#525). Memory
   disabled/absent passes; an explicit `enabled: false` on a key passes
   (choice, not drift).

Pre-push hook (`src/scripts/pre-push-validate.mts`, run via Bun) runs
manifest + content-length + format-check locally before any `git push`.

## Repo conventions

<!-- clause: repo-conventions -->

- ESM only. No CommonJS. Source is `src/scripts/*.mts`, run directly
  under Bun — there is **no emitted `scripts/*.mjs` tree** (the Bun
  migration dropped it). Relative imports keep the `.mjs` specifier
  extension (e.g. `./lib/foo.mjs`); Bun/tsc resolve it to the `.mts`
  source. `tsc --noEmit` is typecheck-only.
- One responsibility per module; split at ~400 lines.
- Owned `agents/*.md` capped at 300 lines; `skills/**/SKILL.md` capped
  at 200 (enforced by `validate-content-length`). `agents/3rdparty/`
  exempt — vendored, kept as-is to avoid fork-and-trim chores.
- Tests colocated in `src/tests/*.mts`, run directly under Bun.
  Behavior-descriptive file names (no release-version prefixes).
- Lint output must be clean in touched files (repo carries a legacy
  warning baseline being burned down). Biome cognitive complexity capped
  at 15 (`noExcessiveCognitiveComplexity`) — reduce by extracting
  helpers, not by suppressing the rule.
- No `process.exit(N)` from library functions — set
  `process.exitCode` from entry points only.
- Runtime-only modules without `.mts` source (e.g. `github-sync/`)
  need ambient `.d.mts` shims under `src/scripts/lib/` so callers
  can drop `@ts-ignore`. Tests for these modules SHOULD still live
  under `src/tests/*.mts` (with `// @ts-nocheck` if they need to
  import the runtime `.mjs` directly) — the `ban-ts-comment` rule is
  disabled for `src/tests/**`.
- Entry-point scripts that ship as hand-authored `.mjs` (no `.mts`
  source) — currently `scripts/setup-github-sync.mjs`,
  `scripts/setup-task-store.mjs`,
  `scripts/setup-watch-scheduler.mjs`,
  `scripts/competitor-audit/aggregate.mjs`, and
  the two `hooks/*.mjs` files. These are intentional exceptions, not
  drift. Anything else under `scripts/` without an `src/scripts/...mts`
  counterpart is drift and should be ported.

## Marathon session checkpoint

<!-- clause: marathon-checkpoint -->

Long autonomous backlog walks accumulate drift if the loop never pauses
to reflect. `checkMarathonCheckpoint` counts grade files written after
the newest retrospective. Configured via `loop.marathonCheckpointEvery`
in `.claude/loop.json` (default **4** per the AgentOps coherent-arc rule):

- At `>= every` closes → **advisory** suggestion `marathon_checkpoint_due`.
  Loop continues; operator should run `/runner:retrospective` soon.
- At `>= 2 * every` closes → **hard** stop with reason
  `marathon_checkpoint_required` + `marathon-checkpoint` blocker. Loop
  refuses the next slice until a retrospective lands under
  `.claude/artifacts/loop/retrospectives/`.

Snapshot exposes `marathonCheckpoint: { level, closesSinceCheckpoint,
every, hardThreshold, lastRetroPath }` so dashboards can surface
checkpoint pressure before it becomes a hard stop. Set
`marathonCheckpointEvery: 0` or a negative value to opt out — the
parser falls back to the default rather than disabling, so a true
opt-out requires removing the snapshot consumer or running
`/runner:retrospective` continuously.

## Backlog discipline

<!-- clause: backlog-discipline -->

Active backlog under `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Each FEAT has frontmatter declaring priority, status, and an
`autonomous_safe` flag. The loop only picks
`autonomous_safe: true` items without per-slice human review; creative
items still require a human in the loop on review.

**Recommended default for fresh intake**: `/runner:intake` runs both
phases in one invocation — PM scoring (Phase 1) then architect
classification (Phase 2), with a halt-on-PM-error gate and a P4-decline
filter on Phase 2. This replaced the two-step `/runner:triage` +
`/runner:backlog-enrich` sequence; `backlog-enrich` was removed as a
standalone command in v0.53 (hard-break stub redirects to
`/runner:intake` — see `src/tests/deleted-skills-stub.test.mts`).
Phase 2's architect-classification contract is inlined in
`commands/intake.md` itself, not delegated to a separate command file.
Only-score (no classification) remains available standalone via
`/runner:triage`; only-classify-already-triaged has no standalone
entry point anymore.

**Higher-quality opt-in for vague-AC batches**: pass `--deep` to
`/runner:triage` or `/runner:intake` (or rely on the automatic trigger
for `P0`/`P1` priority). PM drafts Given-When-Then ACs inline in the
SAME response that produces the scores (FEAT-277) — there is no
separate `runner:spec-writer` fanout call and no standalone
`/runner:retriage` command; both were removed in v0.53
(`src/tests/deleted-skills-stub.test.mts` maps the old `retriage`
skill name to `runner:triage --ids`). See `agents/pm.md` § "Inline AC
+ SPEC drafting (FEAT-277)" for the full contract.

`/runner:intake` Phase 2 writes three routing fields into FEAT
frontmatter: `tags`, `needs_contract`, `needs_ux`. Project-level
stack identity (language, framework, contract type, deployment) lives
in each repo's own `.claude/loop.json`, read at builder-dispatch time via
`bun src/scripts/loop.mts resolve-skills --preset <path> --variant <fe|be|single>`.
See `docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md`
for the original design.

**FEAT-218 Phase 2 (DEC-069, 2026-07-06)**: `scripts/presets/*.json` are now
install-time templates only — `/runner:install --preset X` inlines a
template's full content into `.claude/loop.json` once, and `resolveConfig`
no longer reads or merges preset files at runtime (no more hardcoded
`dotnet-python` default; an unconfigured repo errors clearly instead). The
`resolve-skills` CLI is unchanged in shape (still `--preset <path>
--variant ...`), but the path it's pointed at should now be a repo's own
`.claude/loop.json`, not a `scripts/presets/<name>.json` file — dev-team's
`orchestrate-slice.md` Step 2.5 still greps the old path as of this writing;
see `docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md`
for the pending cross-plugin repoint.

Prior `surface` / `stack` per-FEAT classification was dropped on
feat/preset-skill-activation — preset is sole source. The earlier
upstream-request `docs/upstream-requests/archive/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md`
is superseded by the resolver CLI (no FEAT-level reader required).

PM declines that set `composite_priority: P4` MUST cite a clause id
from this file in `declined_per: [<clause-id>]` frontmatter — the
clause-id annotations (`<!-- clause: <id> -->`) on every H2 above are
the citation surface. See `agents/pm.md` § "Decline contract" for the
full contract, and `src/scripts/validate-decline-citations.mts` for the CI
gate that enforces it.

### ARCHITECT GATE frontmatter (`arch_*` fields, additive, DEC-075)

The pre-slice-1 ARCHITECT GATE (`src/scripts/lib/arch-gate.mts`; see
`.claude/artifacts/loop/decisions/DEC-075.md` for the full design
record) adds five `arch_*` fields to FEAT frontmatter. This is a
**schema v2, additive-only** change — no existing frontmatter field was
renamed or removed; a FEAT that never entered the gate simply has none
of these fields set.

- **`arch_status`** (string enum) — `gate_in_progress` | `approved` |
  `deferred_design`. Written and transitioned solely by
  `applyArchGateVerdict`; read by `shouldRunArchGate` (re-entry
  decision) and `isArchGateActive` (pm-apply read-guard, below).
- **`arch_attempt`** (integer) — persisted rejection counter, starts
  unset/`0`, increments on each `rejected`/`needs_revision` verdict.
  Compared against `MAX_ARCH_GATE_ATTEMPTS = 2` to decide retry vs
  defer. Survives process restarts and re-triage passes because it is
  read straight off the FEAT file on every call, never held in memory.
- **`arch_defer_reason`** (string) — set only when a FEAT transitions to
  `arch_status: deferred_design`. Joined architect-reviewer objections,
  or a fallback string when none were supplied. Absent on FEATs that
  never deferred.
- **`arch_review`** (string enum) — the *normalized* architect-reviewer
  verdict, `approved` | `rejected` (`normalizeVerdict()` collapses
  `approved_with_notes` → `approved` and `needs_revision` → `rejected`).
  Written by `applyArchGateVerdict` on every non-no-op verdict call —
  including a `gate_in_progress` round, not only the terminal
  `approved`/`deferred_design` transitions — so a mid-cycle FEAT still
  shows what the reviewer actually said last.
- **`arch_risk`** (string array, or omitted) — the reviewer's risk flags.
  `applyArchGateVerdict(..., { riskFlags })` writes `riskFlags` verbatim
  when supplied; when omitted it falls back to `objections` (on a
  rejected verdict the objections themselves ARE the risk flags — no
  need to thread the same list through twice). Omitted entirely (no
  `arch_risk` key written) when there is neither an explicit `riskFlags`
  nor a non-empty `objections` list — e.g. a clean `approved` verdict
  with no reviewer notes. `backlog arch-gate-apply` exposes this as the
  optional `--risk-flags <file.json>` flag, a sibling of `--objections`
  with the same JSON-array-of-strings file shape. A numeric `arch_risk`
  *threshold* (as an alternative/supplement to the categorical verdict
  string the gate's approve/reject decision itself is driven by) remains
  explicitly deferred future work — `arch_risk` today is a recorded list,
  not a scored gate input.

**`--include-triaged` interaction.** `pm-apply`'s `--include-triaged`
flag (mutually exclusive with `--ids`) lets a PM re-triage pass reach
FEATs already in `triaged/`, which includes any FEAT the gate has
touched. `isArchGateActive()` (`src/scripts/lib/pm-apply.mts`) checks
`arch_status` against `{"deferred_design", "gate_in_progress"}` **before**
`applyPmResults` commits a priority/promotion write for that FEAT; a
match skips the write for that FEAT entirely (reported back as `gated`,
not a failure) regardless of whether the pass was scoped by `--ids` or
`--include-triaged`. This preserves pm-apply's sole-writer invariant for
`arch_*` fields (`arch-gate.mts` is the only writer) and guarantees a
routine re-triage — triggered by `--include-triaged` or otherwise — can
never clobber `arch_*` fields or silently re-promote/re-prioritize a
FEAT the gate has deferred or is mid-cycle on. The guard does **not**
apply to `applyPmRescope` — a rescope write during `gate_in_progress` is
the write the gate itself requested, so gating that path would deadlock
the reject loop.

## Orchestrator mode

<!-- clause: orchestrator-mode -->

`/runner:start` emits a slice-build tag-routed dispatch by default.
Controlled by `config.loop.orchestratorMode` in `.claude/loop.json`:

- `"slice-build"` (default) — emit `Dispatch crew:<variant>-dev subagent...`
  where `<variant>` is `frontend` / `backend` / `fullstack` based on the
  slice's `tags`. `fe` AND `be` produces a `PARALLEL DISPATCH` block
  with both subagents in one Agent message. When the slice declares
  `needs_contract: true` AND no contract artifact exists yet, prepends
  an `ARCHITECT PRE-FLIGHT` step.
- `"orchestrate-slice"` — emit `/crew:orchestrate-slice --id ...`
  (specialists run sequentially from main thread; no subagent dispatch).

Legacy modes `"lead"` and `"direct-builder"` were removed in v0.43 /
FEAT-191. Operators with stale config silently fall back to `slice-build`.

Reasons for the removal:

- `lead` mode suffered persistent specialist-pause across SLICE-97/98/99/101/102/103/104.
- `direct-builder` was a strict subset of `slice-build` with `tags: []`.

If the upstream lead-pause issue gets fixed in hero-crew, `lead` can be
revived as a separate FEAT.

### Wave mode (opt-in)

Set `loop.marathonRunner: "wave"` in `.claude/loop.json` to flip `/runner:auto`
and `/runner:start` into wave mode: per-wave parallel worktree dispatch
instead of single-slice sequential. See `commands/wave.md` and
`docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md`.

Wave mode counts each wave as one `loop.maxIterations` increment (a
wave-size-3 config with `maxIterations: 25` allows up to 75 slice closes
per run). Tighten `maxIterations` or pass `--max-waves` to cap cost
proportionally.

Slices must declare `touches_files` in frontmatter; the PM's inline spec
drafting (FEAT-277) populates
this automatically and `bun ./src/scripts/validate-slice-touches-files.mts`
gates CI.

## Reviewer ladder presets

<!-- clause: reviewer-ladder-presets -->

`.claude/loop.json` declares `reviewers.ladder` (plus `strictParallel`
and `serialTimingThresholdMs`). The ladder is **config-driven**:
`src/scripts/lib/post-builder-fanout.mts` reads
`config.reviewers.ladder` (an ordered subset of `["A", "B"]`) and emits
one parallel-dispatch payload with the configured reviewer(s) — **no
validator** (see below). `src/scripts/lib/reviewer-timing.mts` (consumed
by `src/scripts/lib/grade-telemetry.mts` /
`src/scripts/lib/slice-linker/complete-slice.mts`) detects
serial-vs-parallel execution against `serialTimingThresholdMs`
(default 90s) for telemetry.

- **`["A", "B"]`** — two reviewers. Reviewer A covers correctness + AC
  coverage; Reviewer B covers production-readiness, observability,
  security.
- **`["A"]`** (this repo's current setting) — a single reviewer
  (Reviewer A) for a lighter post-builder gate.
- **`["B"]`** — Reviewer B only.
- An absent / empty / all-invalid ladder falls back to the two-reviewer
  default so the review gate is never silently dropped.

**No post-builder validator.** Behavior/test validation is delegated to
the CI test gate. The close-time validation gate is satisfied by the
reviewer's approval badge when `loop.validation.satisfiedByReview: true`
(this repo's setting) — see `deriveValidationGate` in
`src/scripts/lib/validation-gate.mts`. Off by default; other repos keep
independent validation (artifact / workflow-state badge / explicit
`requires_validation: false` waiver).

A `multidim` three-dimension preset (FEAT-079 / SLICE-82: correctness /
test-coverage / conventions) was built for that one slice but left no
surviving code under `src/scripts/` — `grep -rn multidim src/scripts`
returns zero matches. It is not a general opt-in preset; there is no
`commands/slice-review-ladder.md` (removed in v0.53 — see
`src/tests/deleted-skills-stub.test.mts`) or config toggle that
activates it. Re-enabling a multidim ladder requires re-implementing
it, not flipping a switch.

## Owned agents

<!-- clause: owned-agents -->

Dispatch via `Agent(subagent_type: ...)`. The plugin runtime namespaces
owned agents with the `runner:` prefix — use the namespaced ID, not the
bare frontmatter `name:` field:

- `runner:pm` — backlog scoring across 5 dimensions; `compositePriority:
"needs-review"` escape valve when scope exceeds PM ability.
- `runner:architect` — read-only Node ESM design + ADR drafter for
  structural change. Use before SLICE-A of any new contract / provider
  / cross-module refactor.
- `runner:researcher` — read-only citation-backed code archaeology + fact
  gathering. Use when a question needs evidence from the repo before a
  change is proposed.
- `runner:market-researcher` — outward-facing market investigator:
  competitor analysis (conforms to the `scripts/competitor-audit/`
  brief schema), verified multi-source web research (credibility tiers
  T1–T4, consensus levels), feature-gap evidence, trend detection.
  Writes only under `docs/research/**`. Sibling of `runner:researcher`;
  repo questions go there, market questions come here.
- `runner:document-writer` — Markdown-only docs (README, CHANGELOG, ADR,
  retros, release notes, agent / skill prompts). Will NOT edit source.
- `runner:swarm` (formerly `runner:hierarchical-dispatcher`, renamed v0.77) —
  spawns N parallel child subagents in isolated git worktrees, `awaitAll`
  with blocking semantics, then merges DONE children to the parent branch in
  priority order. Depth-capped via `.claude/loop.json`
  (`dispatchLimits.maxDepth`, default 3). Use for one slice needing N
  parallel children (e.g. FE+BE+tests), recursive FEAT decomposition, or
  fan-out review across dimensions. See `README.md` § "Hierarchical
  dispatch" for the config/CLI contract.
- `runner:spec-writer` — **retired in v0.53**; there is no dispatchable
  `runner:spec-writer` agent anymore (no `agents/spec-writer.md` on disk).
  Its two-level spec drafting — formal SPEC documents (10-section,
  REQ/SEC/CON ids, Given-When-Then AC) and executable slice-level SDD specs
  (exact contracts, ≥3 test cases, verify commands) — was absorbed into
  `runner:pm`, drafted inline via `--deep` / `--spec` (FEAT-277; see
  `agents/pm.md` § "Inline AC + SPEC drafting"). It formerly superseded the
  vendored `3rdparty/sdd-spec-writer` and `3rdparty/specification` agents
  (merged + removed 2026-06-10). The agent-ref validator
  (astragenie/runner-plugin#371) now flags the retired name as a phantom.

## Auto-dispatch primitives

<!-- clause: auto-dispatch-primitives -->

`src/scripts/lib/auto-dispatch.mts` exposes `dispatchAgent`,
`parseSkipFlag`, `appendAuditLog` as opt-in audit infrastructure.
CLI subcommands do NOT auto-dispatch role agents — slash flows are
the contract. See DEC-011 (supersedes DEC-004).

Slash flows that orchestrate role agents:

- `/runner:intake` (Phase 2) — architect classifies triaged FEATs
  (tags, needs_contract, needs_ux). **Wired to resolver since
  v0.28.0**: skill block from `preset.roles.architect` is prepended to
  the dispatch prompt. (Formerly a standalone `/runner:backlog-enrich`
  command; removed in v0.53 — see "Backlog discipline" above.)
- `/runner:triage` (via `skills/triage/SKILL.md`) — PM scores pending FEATs.
  **Wired to resolver since v0.28.1**: skill block from `preset.roles.pm`
  is prepended to the dispatch prompt.
- `/runner:intake` (free-text mode) — subsumed the former
  `/runner:backlog-add` (removed v0.53; stub redirects). Researcher
  enrichment of new FEAT bodies happens via separate user invocation,
  not inline (DEC-011).
- `/runner:intake --spec` — subsumed the former `/runner:spec-decompose`
  (removed v0.53; stub redirects). Agent reads SPEC and identifies
  features; no inline role-agent dispatch from the flow itself.
- `/runner:close` — subsumed the former `/runner:slice-complete`
  (removed v0.53). Document-writer CHANGELOG / ADR / release-notes
  drafting is invoked by the orchestrating agent, not by the CLI
  subcommand.
- `/runner:start FEAT-NNN` — subsumed the former
  `/runner:slice-from-feature` (removed v0.53; stub redirects).
  Contract pre-flights dispatch `crew:architect` (not
  `runner:architect`); cross-plugin, wired on the hero-crew side.

`dispatchAgent` remains exported for callers that want marker-write
semantics. The marker queue at
`.claude/artifacts/loop/pending-dispatch/` is deprecated for
production use — no consumer is planned (see DEC-011).

Every dispatch (via the function, when used) still appends one JSON
line to `.claude/artifacts/loop/auto-dispatch.jsonl` — audit trail
for cost attribution.

## Safety

<!-- clause: safety -->

Never commit secrets. Never disable hooks (`--no-verify`) without
explicit user request. Never force-push to `main`.

<!-- runner:start -->
<!-- Installed by /runner:install. Edit .claude/loop.json to change stack-specific commands; re-run /runner:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

<!-- clause: autonomous-loop-hard-rules -->

This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Auto mode (default — `loop.marathonMode: true`).** Loop walks entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts.
- **Slice start/close ceremony.** Every slice MUST use `/runner:start` and `/runner:close`.
- **Dispatch discipline.** Hand `dispatchInstruction` to a crew builder subagent — `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` (implementation only; there is no agent literally named `crew:builder`); parent loop dispatches `crew:reviewer` then `crew:validator` after; never implement inline except trivial single-line fixups.
- **Auto-continue.** After ceremony, promote next item without asking.
- **Ad-hoc dispatch marker (FEAT-263 T6).** When composing an ad-hoc `Agent()`
  dispatch prompt (outside the templated ceremony), wrap task-scoped orders
  (forbidden items, gates, return format) in a `<task-scoped>`…`</task-scoped>`
  block and never quote that block's content back in reports — measured
  evidence shows ad-hoc prompts, not templates, produce ~all instruction-echo
  memory chaff (see astramem-local#374 E3).

First action when starting the runner: read `.claude/loop/rules.md` → `docs/ai-loop/00-entry/MASTER_PROMPT.md` → `docs/ai-loop/backlog/approved-slices.md`.

<!-- runner:end -->

## Project state (auto-generated)

@.claude/artifacts/loop/loop-snapshot.md
