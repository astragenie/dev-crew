# CI gates — full detail

Full rationale for every gate in the single merged workflow,
`.github/workflows/ci.yml` (SLICE-24, FEAT-005). Both former parents'
CI (runner-plugin's root `ci.yml`, crew's `.github/workflows/*`) were
merged here; `crew/.github/workflows/` was deleted — crew-subtree gates now
run FROM ROOT as part of this one workflow.

This numbered list is the source of truth for gate *names* and order.
SLICE-25 ports the same numbered list verbatim into `CLAUDE.md`'s
"## CI gates" section — `src/scripts/generate-metrics-band.mts` will count
that list programmatically for the README metrics-band's "CI gates
enforced" figure, so once SLICE-25 wires it, this file's numbering and
CLAUDE.md's must stay in sync. If a gate is added, removed, reordered, or
its blocking/advisory status changes, update both files in the same change.

GitHub Actions runs on every push and PR (self-hosted runner, Bun 1.3.14+
baked into the runner image — no `setup-bun` step, no `npm ci`/build step
anywhere). The `fast-gate` job below is the **required status check**;
`slow-tests`, `crew-tests`, and `worktree-quarantine` run on every push/PR
too but do not gate merges (see "Job structure and gating" at the end of
this file).

1. `bun install --frozen-lockfile` (repo root) + `bun install --frozen-lockfile`
   (`crew/`) — two separate lockfiles, two separate installs; `crew/` is a
   git-subtree import with its own `package.json`/`bun.lock`, not a
   workspace member of the root one.
2. `bun ./src/scripts/validate-manifests.mts` — manifest sanity check
   (root's `.claude-plugin/plugin.json` + `package.json`).
3. `bun ./src/scripts/validate-content-length.mts` — owned-agent line cap
   (300) + SKILL.md line cap (200). `agents/3rdparty/` exempt.
4. `bun ./src/scripts/validate-event-schemas.mts` — AJV-validates emitted
   event payloads against `schemas/loop-events`.
5. `bun ./src/scripts/validate-decline-citations.mts --repo .` — every P4
   FEAT in `triaged/`/`done/` must carry `declined_per: [<clause-id>, ...]`
   citing a real `<!-- clause: X -->` marker from `CLAUDE.md`.
6. `bun ./src/scripts/validate-agent-refs.mts` — blocks a `crew:<name>` /
   `runner:<name>` / `devcrew:<name>` dispatch instruction whose `<name>`
   doesn't resolve to a real agent, command, or skill (astragenie/
   runner-plugin#371 — a phantom dispatch token shipped in installed loop
   rules and broke consumer orchestrators). Scans `.claude/loop/**`,
   `commands/**`, `skills/**`, `agents/**` (3rdparty excluded),
   `templates/**`, `docs/integrations/**`, `CLAUDE.md`, and `crew/CLAUDE.md`
   (still live-read pending the Phase-5 docs cutover). This is also the
   `devcrew:verifier`-not-`devcrew:validator` phantom guard (crew's rename
   of that role from validator to verifier) — confirmed already covered,
   no `SCAN_FILES`/`SCAN_TARGETS` extension was needed.
7. `bun ./src/scripts/validate-dispatch-markers.mts` — checks the
   `<task-scoped>` order-block marker (FEAT-263) is balanced, non-nested,
   and confines FORBIDDEN/GATES/RETURN/ECHO keywords inside a marked region.
8. `bun ./src/scripts/validate-imports.mts` — enforces the slice-linker
   sub-module import boundary.
9. `bun ./src/scripts/validate-repo-boundary.mts` — **new gate** (SLICE-34,
   FEAT-013). Enforces the root<->`crew/` import direction boundary — a
   different concern from gate 8 (that one guards sub-module barrels
   *inside* `src/scripts/`; this one guards the root/`crew/` split). Forbids
   any `src/**`/`hooks/**` file from importing a `crew/`-internal module
   except a hardcoded allowlist (10 entries across 3 files as of
   2026-08-19: 4 in `hooks/pre-push-gate.mts`, 5 in
   `src/scripts/lib/slice-linker/crew-bridge.mts`, 1 in
   `src/scripts/lib/phase-gate.mts` — the contract doc that scoped this
   slice only evidenced the first file's 4; the other 6 were found by this
   slice's own repo-wide grep and kept, not removed). Forbids the reverse
   direction (`crew/**` importing outside `crew/`) entirely — zero-entry
   allowlist, confirmed empty by the same grep. Also fails on drift between
   `.claude-plugin/hooks/hooks.json`'s `crew/` path census and the
   generated `docs/planning/hooksjson-crew-path-inventory.json` (prerequisite
   map for the later hooks-relocation FEAT).
10. `bun ./src/scripts/validate-backlog-writes.mts` — explicit-allowlist
    guard: fails when a file outside `backlog-store.mts` raw-writes a
    backlog-shaped FEAT/SLICE path.
11. `bun ./src/scripts/validate-slice-touches-files.mts` — validates every
    pending/in-progress/needs-review slice's `touches_files`.
12. `bun ./src/scripts/validate-slice-state-consistency.mts` — slice
    state-directory vs frontmatter-status agreement (one slice id filed
    across more than one state directory, or `status:` disagreeing with
    its containing directory).
13. `bun ./src/scripts/validate-snapshot-freshness.mts` — blocks a stale
    `.claude/artifacts/loop/loop-snapshot.md` from merging; regenerates the
    snapshot in-memory and diffs it against the on-disk file.
14. `bun ./src/scripts/validate-org-refs.mts` — stale pre-transfer-GitHub-owner
    sweep (see the script's `BANNED_OWNER` constant for the literal token; the
    current owner is `astragenie`) over authored surfaces including the
    widened `crew/` scope (SLICE-20).
15. `bun ./src/scripts/validate-marketplace-sync.mts` — registry-drift
    guard against `astragenie/astra-marketplace`'s `marketplace.json`.
    Degrades to a warning on an unreachable registry.
16. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config
    drift guard (`.claude/loop.json`'s `memory.feedback.creditLoop` shape).
17. `bun ./src/scripts/validate-learnings-schema.mts --repo .` — schema
    check on `.claude/artifacts/loop/learnings.jsonl`'s FEAT-220 enum
    fields. SLICE-24 fixed 4 pre-existing malformed root entries that
    predated this gate ever being wired in — see "learnings.jsonl fix
    ledger" below.
18. `bun ./src/scripts/validate-effort-points.mts` — FEAT frontmatter
    `effort_points` must be a Fibonacci value; `expected_usd` non-negative.
19. `bun ./src/scripts/validate-branding-scrub.mts` — **new gate** (SLICE-24,
    FEAT-005 AC-2). Continuous sweep for the retired product name SLICE-08
    scrubbed (see the script's `BANNED_RE` for the literal token) across the
    full merged tree, replacing SLICE-08's one-time scrub with a standing
    check. Fails on any case-insensitive hit on that token outside 3
    documented exclusion buckets: (A) `.claude/artifacts/**` and
    `crew/.claude/artifacts/**` (frozen ceremony history + live backlog/
    slice state that legitimately narrates the rename), (B)
    `crew/.claude/loop/**`, `crew/CLAUDE.md`, `crew/CHANGELOG.md` (crew's
    pre-Phase-5 legacy live docs), (C) `docs/parents/**` and
    `docs/planning/**` (frozen parent snapshots + the migration planning
    archive). See the script's header comment for full rationale; unit
    tests at `src/tests/validate-branding-scrub.test.mts`.
20. `bun ./src/scripts/generate-metrics-band.mts --check` — README
    metrics-band freshness gate; regenerates in-memory and diffs against
    the committed README.
21. `bun ./crew/scripts/validate-manifests.mts` — crew's own manifest check
    (`crew/.claude-plugin/plugin.json` + `crew/package.json`). **Not**
    deduped with gate 2 despite `unification-plan.md` §7's general
    "dedupe manifests" text — `src/scripts/validate-manifests.mts`'s own
    header comment (written during SLICE-20) already establishes the
    manifest/marketplace merge is explicitly deferred to Phase 5; that
    more-recent, more-specific decision in the code overrides the plan's
    earlier general text. Both stay as two separate gates until Phase 5.
22. `bun ./crew/scripts/validate-dispatch-graph.mts` — cycle detector over
    the `## Peer dispatch` allowlist graph (must be a DAG).
23. `bun ./crew/scripts/validate-workflows.mts` — `.claude/workflows.yaml`
    schema + phase-order + parallelism-cap + agent-existence checks.
24. `bun ./crew/scripts/validate-slices.mts` — AC-placeholder + workflow-
    field linter over pending slice files.
25. `bun ./crew/scripts/validate-badges.mts` — cross-checks `BADGE_TABLE`
    against the `mark-badge` CLI help text and the badge catalog doc.
26. `bun ./crew/scripts/validate-loop-state.mts` — exactly one populated
    backlog tree, unique FEAT ids.
27. `bun ./crew/scripts/validate-bundles.mts` — build-bundle schema/version
    checks.
28. `bun ./crew/scripts/validate-configs.mts` — `docs/routing-table.yaml`
    schema + drift-vs-rendered-`.md` + every `crew:<token>` reference
    resolves against the live merged surface.
29. `bun ./crew/scripts/validate-routing-table.mts --coverage-only` —
    routing-table skill-id resolution (blocking, coverage-only mode; the
    full-coverage mode runs advisory below).
30. `bun ./crew/scripts/validate-agents.mts` — agent prompt quality bar
    (required frontmatter, "## Report contract" section, no duplicate
    names, universal-skill drift markers, evals-spec pointers). **Promoted
    to blocking** (FEAT-015/SLICE-33): the pre-existing content debt SLICE-24
    surfaced (missing `prompt_id`/`version`, missing "## Report contract",
    dangling `evals:` pointers) is backfilled — `market-researcher.md`,
    `pm.md`, and `swarm.md` gained `prompt_id`/`version`/"## Report
    contract"; `release-engineer.md` and `verifier.md` gained their missing
    context-efficiency rules and (verifier) its universal-skill drift
    marker; the nine dangling `evals:` pointers were repointed from
    `evals/agents/crew-*.yaml` to the real on-disk location
    `crew/evals/agents/crew-*.yaml` (the P3 surface merge moved `agents/`
    to the monorepo root but never moved `evals/`, which still lives
    under `crew/`).
31. `bun ./crew/scripts/validate-skills.mts` — skill quality bar. **Promoted
    to blocking** (FEAT-015/SLICE-33), same backfill treatment as gate 30.
    The open question SLICE-24 flagged — several skill directories carried
    a `devcrew:`-namespace-prefixed `name:` in frontmatter while their
    directory name stayed bare (e.g. `skills/pm-decompose/SKILL.md` named
    itself `devcrew:pm-decompose`) — resolved as content debt, not a
    validator convention gap: every other skill in the merged tree (all
    `skills/domain/**`, `skills/meta/**`) already uses a bare `name:`
    matching its directory, and the plugin namespace prefix is derived at
    runtime from the plugin manifest, never stored in frontmatter. The five
    outlier skills (`loop-discipline`, `pm-decompose`, `pm-rescope`,
    `pm-review`, `triage`) had their frontmatter `name:` corrected to drop
    the `devcrew:` prefix, matching the rest of the tree; the validator's
    strict-equality directory-name check was left unchanged.

Gates 21/23/24/25/26/27/28 required a fix as part of this slice: their
`AGENTS_ROOT`/`SKILLS_ROOT` constants still pointed at `crew/agents/` and
`crew/skills/` — directories the P3 surface merge emptied out when it moved
the real trees to the monorepo root. Before the fix, `validate-agents.mts`
and `validate-skills.mts` silently passed with "0 checked" (a vacuous pass,
not a real check) and `validate-workflows.mts`/`validate-dispatch-graph.mts`
hard-failed on agents that do exist, just not where the script was looking.
`validate-workflows.mts`, `validate-agents.mts`, `validate-skills.mts`, and
`validate-dispatch-graph.mts` now resolve `agents/`/`skills/` one level up
from `crew/` (`SURFACE_ROOT`), matching the split `validate-configs.mts`
already documented. `validate-configs.mts` itself failed for a different,
real reason: two stale `crew:<token>` references in `crew/docs/
routing-table.yaml`'s prose notes (`` `/crew:brief-me` `` — the command was
renamed to `/brief` during the merge; `` `/crew:using-crew` `` — no such
command/skill ever existed post-merge, reference removed) plus a stale
generated `routing-table.md` (re-rendered via `crew/scripts/
render-routing-table.mts`).

**Advisory (non-blocking within `fast-gate`, still run and reported on
every push/PR):**

32. `bun ./crew/scripts/validate-syntheses.mts` — flags placeholder-rotted
    final-synthesis/grade artifacts. Advisory by design (documented in the
    script's own header) — `runner:close`'s `grade_incomplete` badge is the
    hard gate at close time.
33. `CREW_VALIDATE_ROUTING_TABLE=1 bun ./crew/scripts/validate-routing-table.mts`
    — full-coverage cross-check of every agent's "### Skills you consult"
    block against `docs/routing-table.md`. Opt-in via env var by design;
    advisory because coverage gaps here are additive documentation debt,
    not correctness bugs (the blocking gate 29 already guards resolution).
34. `bun ./crew/scripts/validate-adr-template.mts --strict` — ADR
    "Alternatives considered" section completeness.
35. `bun ./crew/scripts/validate-backlog-drift.mts` — flags a `triaged/`
    slice whose close ceremony already ran in git history but was never
    moved to `done/`. Advisory by the script's own design (flags for a
    human/loop to act on; never moves files itself).
36. `bunx tsc --project tsconfig.json --noEmit` + `--project
    tsconfig.test.json --noEmit` (root) + `--project crew/tsconfig.json
    --noEmit` (crew — its own, deliberately divergent `strict`/`types`
    config per SLICE-09; not merged into root's tsconfig, per that slice's
    design).
37. `bunx biome lint src/` (root scope — root's `biome.json` `files.includes`
    is `**/src/**`, so `crew/` paths are invisible to this invocation).
38. `bunx biome format src/` (root, check mode).
39. `cd crew && bunx biome lint scripts/ hooks/` — crew-scoped, invoked from
    within `crew/` so `crew/biome.json` (`root: false`, deliberately
    divergent rules per SLICE-09) resolves as the effective config rather
    than relying on ambiguous nested-config auto-discovery from root.
40. `cd crew && bunx biome format scripts/ tests/` (crew-scoped, check
    mode) — matches `crew/package.json`'s own `format:check` script.
41. `bun test src/tests/ --parallel --timeout 60000` (root suite, minus the
    six known git-worktree-hanging suites — see "Job structure" below).
42. `cd crew && bun test --timeout 60000 tests/ --parallel` (crew suite).
    SLICE-10 (FEAT-004 P1) already proved N≥20 consecutive green
    `--parallel` runs on this tree, so this runs unsharded and
    unquarantined, matching root `package.json`'s existing `test:crew`
    script (`bun run test:all` runs both root and crew suites locally).

## Job structure and gating

- **`fast-gate`** runs gates 1–40 (installs, all validators, tsc, biome).
  This is the required status check.
- **`slow-tests`** runs gate 41 (root suite, retried once on a 480s
  per-attempt timeout) — kept as its own job (not the reusable-workflow
  wrapper) because it needs a job-level timeout the reusable workflow's
  fixed 30-minute limit can't give it, mirroring runner-plugin's original
  design (astragenie/runner-plugin#355).
- **`crew-tests`** runs gate 42.
- **`worktree-quarantine`** runs the six suites gate 41 excludes
  (`auto-merge`, `synergy`, `integration`, `integrations`,
  `slice-complete`, `slice-start` — real `git worktree` operations known to
  hang the runner, PR #348), hard-killed via `timeout`, `continue-on-error:
  true`.
- **`gate`** (the final required-check summary) passes when the change is
  docs-only OR `fast-gate` succeeded. `slow-tests`/`crew-tests`/
  `worktree-quarantine` are intentionally NOT part of the required gate —
  this preserves the pre-existing runner-plugin policy this repo inherited
  (full-suite runs on a self-hosted runner can be flaky; the fast validator
  + typecheck + lint/format layer is the actual merge gate). All jobs still
  run and report on every push/PR.

## Named drops (retired, not silently — unification-plan.md §7)

- crew's `hooks/check-redundant-read.mts` self-test (a hook smoke test, not
  a repo-content gate; `crew/tests/` already carries broad hook coverage).
- crew's `e2e-smoke.mts` / `e2e:smoke:ux` (Linux-only live `claude` CLI
  integration smoke) — out of scope for this slice; needs a follow-up FEAT
  to decide whether it belongs in this workflow or a separate scheduled one
  (it never ran on every PR even in crew's own prior CI).
- crew's negative-fixture shell loops for `validate-contracts.mts` /
  `validate-ux-spec.mts` (asserting a broken fixture fails linting) — both
  scripts require an explicit file arg (no repo-wide sweep mode) and the
  same assertions already live in `crew/tests/validate-contracts.test.mts`
  and `crew/tests/validate-ux-spec.test.mts`, covered by gate 42.

## learnings.jsonl fix ledger (SLICE-24)

Root `.claude/artifacts/loop/learnings.jsonl` had 4 pre-existing entries
that predate the `validate-learnings-schema.mts` gate (17) ever being wired
into this merged CI, and would have failed it immediately on first run. All
4 came from the `validation_fail` capture path (a different write shape
than the FEAT-220 grade-lesson shape — `kind`/`ts`/`agent`/`severity`/
`tags`/`summary`/`source`, no `key`/`insight`), fixed by adding a `key` and
an `insight` (mirroring `summary`) to each rather than deleting the record:

| Line (pre-fix) | `ts` | `agent` | `summary` (truncated) |
|---|---|---|---|
| 22 | 2026-08-19T01:19:11.178Z | verifier | phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run |
| 29 | 2026-08-19T03:07:30.041Z | verifier | phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run |
| 40 | 2026-08-19T06:49:02.245Z | runner:validator | DEFECT 1 (CRITICAL...): systemic stale-path drift from the crew/ subdirectory merge... |
| 43 | 2026-08-19T07:11:04.612Z | verifier | phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run |

`crew/.claude/artifacts/loop/learnings.jsonl` (a sibling, crew-local file)
has many more entries in the same non-FEAT-220 shape, but is **not** in
scope for gate 17 as written (`validate-learnings-schema.mts` only checks
the repo-root file) — left untouched.

## Known-red side effects of this slice (documented, not silently hidden)

- `crew/tests/validate-all.test.mts`'s 2 assertions ("exits 0 on clean
  repo" / "check mark for each validator") were red immediately after the
  `AGENTS_ROOT`/`SKILLS_ROOT` fix above surfaced real pre-existing content
  debt (the same debt gates 34/35 are advisory for) — **fixed as of
  2026-08-19** (verified: `cd crew && bun test tests/validate-all.test.mts`
  → 2 pass, 0 fail). Left here as a dated note rather than deleted, so a
  future reader who sees this file referenced from an old handoff knows
  the red state was real, transient, and resolved — not silently dropped.
- Root suite: 2 pre-existing, already-documented failures unrelated to this
  slice — `DEC-070 contract record exists for FEAT-229` and `DEC-068
  contract record exists for FEAT-222` (`src/tests/learning-cycle.test.mts`,
  `src/tests/eval-generator.test.mts`). `.claude/artifacts/loop/decisions/
  DEC-004.md` already documents these as an accepted trade-off ("2
  self-referential runner tests fail (DEC-068/070 existsSync) until
  rewritten").

Pre-push hook (`src/scripts/pre-push-validate.mts`, run via Bun) runs
manifest + content-length + format-check locally before any `git push`.
