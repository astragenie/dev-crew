# dev-crew unification plan

Date: 2026-08-18. Author: main-session synthesis (planner agent stalled twice; work
completed inline). Inputs: `merge-plan-prompt-v2.md`, `demolition-synthesis.md`,
fresh Step-0 discovery (Appendix A), live bun-parallel experiment, ADR-002,
plugins-common inspection. Status: **APPROVED 2026-08-18 (operator GO; ultracode authorized for mechanical slices; FEAT-006 marketplace swap stays human-gated).**

---

## 1. Decision record

**Decision:** merge `crew` (dev-team) and `runner` (runner-plugin) into a single
plugin **`devcrew`** developed in this repo, single namespace `/devcrew:*`, hard
cutover, no compat shims.

**Rejected alternatives, stated fairly:**

- **(a) Versioned shared-contract package (finish plugins-common).** Strongest
  alternative. plugins-common already ships `plugin-registry`, `plugin-std`,
  `gepa-core`, `memory-provider`, `astramem-client` packages — the registry
  package targets exactly the rename-phantom failure class, and a semver'd
  contract would retire the MIN_CREW_VERSION bump treadmill and the
  marketplace-sync gate at roughly slice cost per repo. It keeps independent
  release trains and the version-pin de-risking lever. Its weaknesses: consumer
  wiring already stalled once (~6 weeks post-DEC, 2026-07-08); coordination tax
  persists forever (every crew artifact-schema change = package bump + two
  consumer updates); two plugin surfaces and two CI systems remain.
- **(c) Runner as subdirectory of dev-team, two manifests.** Captures one-repo
  benefits (atomic cross-layer changes, one CI) with zero namespace risk. Weak-
  nesses: still two plugins to install/version/sync; the seam code
  (crew-bridge, findCrewCli) survives; half the dedupe is blocked by the
  manifest boundary.

**Why the operator chose full merge anyway:** sole operator, no external installs
— the adopter-blast-radius argument that made (a) dominate collapses. Preference
for one release train, one surface, one test suite, one agent registry;
willingness to pay a one-time scripted cutover across ~10 local repos. The
coordination tax of (a) is permanent; the cutover cost of the merge is one-time.
A reader who weighs permanent tax higher than one-time risk reaches the same
conclusion; a reader who distrusts big migrations reaches (a) — the trade is
recorded, not hidden.

## 2. Target architecture

### Repo layout (monorepo, runner conventions win)

```
dev-crew/
  .claude-plugin/plugin.json      name: "devcrew"  (single manifest)
  .claude-plugin/hooks/hooks.json (merged registrations)
  commands/            48 commands (54 parents − 6 collision merges), flat .md
  agents/              26 owned + 3rdparty/ 14 vendored
  skills/              4 tiers (universal/workflow/domain/meta), deduped
  hooks/               merged hook scripts (.mts, Bun)
  templates/           runner templates, Wiggin-scrubbed
  schemas/             loop-events + crew artifact schemas
  src/scripts/         all runtime TS (.mts), lib/ merged
  src/tests/           merged suite (~542 files), bun --parallel
  evals/               GEPA harness (from dev-team, paths updated)
  docs/                merged docs tree; planning/ (this dir)
```

### Command map (rule: keep leaf name, prefix `/devcrew:`; collisions merged)

| Parent | Commands | Disposition |
|---|---|---|
| crew carried (20) | adopt, architect-feature, audit-repo, build, design, fix, gepa-eval, gepa-history, gepa-invalidate, incident, init, orchestrate-slice, parallel, parallel-review, prune-artifacts, quickwin, review, ship, validate, wake-up-brief | carry as `/devcrew:<name>` |
| crew dropped (11) | claim-files, release-files, show-claims, show-conflicts, request-approval, resolve-approval, show-approvals (claims/approvals machinery cut — §5); gepa-optimize, gepa-resume, gepa-revert, gepa-thaw (auto-promotion machinery cut — §5) | dropped, rationale in §5 |
| runner (16) | auto, close, decisions, intake, learn, lessons-recent, list-presets, memory-setup, phase-gate, pr-fix, retrospective, spec-status, start, triage, watch, wave | carry as `/devcrew:<name>` |
| **collisions (7→3)** | crew `install` + runner `install` → one `/devcrew:install` (both layers, one pass); crew `cost-setup` + runner `cost-setup` → one `/devcrew:cost-setup`; crew `brief-me` + runner `brief` + runner `status` → one `/devcrew:brief` (situational report + install state) | merged |
| 3rdparty (4→1) | refactor-code kept (live refs); architecture-review, create-architecture-documentation, create-prd dropped (zero dispatch refs, cleanup-verified) | `commands/3rdparty/` |

Result: **39 first-party + 1 vendored** (20 crew + 16 runner + 3 merged). No
TBD cells; every parent command dispositioned above.

### Agent map (rule: `devcrew:` prefix; duplicate roles merged, crew variant is base)

| Old | New | Note |
|---|---|---|
| crew:fullstack-dev / backend-dev / frontend-dev / aiplugin-dev / dev-lite | devcrew:* same leaf | unchanged |
| crew:reviewer / reviewer-lite / csharp-reviewer / typescript-reviewer / architect-reviewer | devcrew:* same leaf | unchanged |
| crew:verifier / integrator / qa-expert / test-automator / refactor / release-engineer / performance-engineer / uxdesigner / cloud-architect / investigator | devcrew:* same leaf | unchanged |
| crew:architect + runner:architect | **devcrew:architect** | one agent; runner's read-only-design mode becomes a prompt mode, not a second agent |
| crew:researcher + runner:researcher | **devcrew:researcher** | merged read-only investigator |
| crew:document-writer + runner:document-writer | **devcrew:document-writer** | crew's (has slice-close CLI sequence) is base; runner deltas folded in |
| runner:pm / market-researcher / swarm | devcrew:pm / market-researcher / swarm | unchanged leaf |
| 3rdparty: crew 9 + runner 5 | `agents/3rdparty/` | 14 vendored, no overlap found |

Result: 27 owned (23 + 6 − 2 merged dupes... = 23 crew + 6 runner − 3 merges = 26;
plus zero new) — **26 owned**, 14 vendored. Dispatch-token rewrite table
(`crew:X`→`devcrew:X`, `runner:X`→`devcrew:X`) is mechanical from this map.

### Skills/hooks

Skills: crew 71 + runner 18 − **7 verified duplicate pairs** (cleanup review
corrected the earlier "8 shared names" guess: `critical-thinking` is
agent-vs-skill, `systematic-debugging` doesn't exist in dev-team; `workflow/
commit` is a 7th real pair the guess missed). Dev-team's variant is the
superset in every verified pair — keep dev-team's, fold runner-unique deltas
(e.g. `review-gates` keeps dev-team's "Silent-failure hunt" section) ≈ **82**.
runner's `workflow/using-crew` is deleted (the seam it documents no longer
exists — absorbed into dispatcher-routing). Hooks: crew 26 + runner 12
registrations merged into one hooks.json; dev-team currently fires 2
unconditional PostToolUse hooks plus 3 PreToolUse spawns per Bash call
(~540ms overhead/call) — P3 consolidates to matcher-scoped hooks with a
measured ≤150ms/Bash-call exit gate; hook scripts move to `.mts` under Bun.

## 3. Runtime unification (before any seam work)

**Corrected history (optimize-review finding, verified against git):** ADR-002
adopted `bun test --parallel` on 2026-06-10, but commit `a20f9dd9` (2026-07-01)
**removed it** — bun#5090 causes false-positive `NotImplementedError: test()
inside another test()` in Bun's `node:test` compat shim under parallel workers.
Current dev-team state: no `--parallel`, 3-way file-sharded CI matrix.

**Root cause locus is the test API, not parallelism itself:** dev-team's
failures live in Bun's `node:test` compat shim; runner's 330 files use native
`bun:test` and run `--parallel` clean daily. Caveat from the demolition
review: bun#5090's headline mechanism (nested subtests) appears in **zero** of
dev-team's 31 `node:test`-importing files (grep-verified, flat test()/assert
style throughout) — so the exact shim defect biting dev-team is not
conclusively identified. The migration decision stands on the stronger ground:
removing the shim from the execution path entirely (bun:test native) removes
the whole defect class, whatever the specific trigger. P1 move: **migrate
dev-team tests from `node:test` to `bun:test` imports during the `.mts`
conversion** — mostly mechanical (describe/it/expect surface). The N≥20
green-run gate is what actually proves it worked; the mechanism story is
supporting narrative, not the evidence. Sharding remains the fallback for any
file that resists migration.

**Live experiment (this session):** `bun test --timeout 60000 --parallel tests/`
on dev-team: 2111 tests across 212 files, 1991 pass / 118 skip / **2 fail**,
14.30s. Given bun#5090, the 2 failures are presumed shim false-positives until
proven otherwise. P1 evidence gate: after bun:test migration, run the merged
suite N≥20 times under `--parallel`; required flake rate 0 before the CI design
locks. No global serialization.

**ADR-002 concerns, disposed by name:**
- *"Consumer machines may lack Bun"* → obsolete: sole operator, Bun 1.3.14 on
  this machine, runner already requires Bun (`MIN_BUN_VERSION`). devcrew is
  Bun-only end to end.
- *"node:test subtest NotImplementedError in single-process mode"* → avoided:
  `--parallel` is the only supported mode; CI pins it.
- *"`--experimental-strip-types` until Node stabilizes"* → moot under Bun-only.
- *Escape hatch `test:node`* → dropped; git history keeps it recoverable.

**Source policy:** all runtime TS is `.mts` with `.mjs` import specifiers
(runner convention). dev-team's `.ts` files are renamed at import; hooks
rewritten to `.mts`. One `tsconfig` + `tsconfig.test`, one biome config
(runner's, cognitive-complexity 15).

## 4. Seam elimination (after §3)

**crew-bridge.mts execFile inventory** (grep-verified this session) — the bridge
invokes exactly: `write-run-brief`, `cost-slice`, `cost-advise`, `mark-badge`;
`phase-gate.mts` additionally invokes `write-validation-result`; slice ceremony
files (`start-slice.mts`, `complete-slice.mts`, `arch-gate.mts`,
`loop-installer.mts`, `phase-gate/parallel-orchestrator.mts`) resolve the CLI via
`plugin-identity.mts`. 89 files in `src/scripts` reference crew (fresh count,
`grep -rlw crew src/scripts`).

Per-call disposition:
| Call | Replacement | Error contract |
|---|---|---|
| `write-run-brief` | direct import of crew's workflow-state writer | keep fail-soft: wrap in try, log, continue (parity with today) |
| `cost-slice` / `cost-advise` | direct import of `scripts/lib/cost/` + `cost-advisor.ts` (as .mts) | fail-soft, cursor advances only on success (preserve FEAT-204 sweep) |
| `mark-badge` | direct import of badge writer | fail-soft |
| `write-validation-result` (phase-gate) | direct import of validation-artifact writer | **fail-hard** — a phase-gate that can't record its verdict must not pass silently |
| `findCrewCli` / `crewCliRuntime` / `MIN_CREW_VERSION` / `CREW_MARKETPLACE_NAME` | deleted | n/a — same-repo imports |

The bridge's process isolation currently absorbs bun/node skew; §3 removes that
skew first, so isolation loses its purpose. Fail-soft semantics are preserved
per call (table above), answering the review's crash-conversion objection.

**Config merge:** `.claude/loop.json` + crew's config into one
`.claude/devcrew.json` schema (superset, versioned `schemaVersion: 2`); the
installer migrates existing `loop.json`/crew config in adopter repos in place
(reads old, writes new, leaves `.bak`).

## 5. Content import + dedupe

**History:** `git subtree add` per parent (dev-team → `/`, runner-plugin merged
on top; conflicts resolved by the layout in §2). Subtree re-commits change
hashes — acceptable: full parent history remains in the parent repos, which are
kept archived read-only.

**GEPA state:** `prior_prompt_hash` is a prompt-content hash (survives import),
but champion-provenance references promotion *commits* on dev-team main —
those break under new hashes. Disposition upgraded per rewrite-today review
and corrected by the demolition review: `scripts/lib/gepa/` is **27 files /
6,286 lines** (not 19 files as improve-rewrite-today.md claimed), and the
original cut list named only 9 — leaving the three largest files
(candidate-generator-aiplugin.ts 715, gepa-optimize-cmd.ts 583,
optimize-runner.ts 480) and the self-diagnosed-broken
champion-provenance-writer.ts undispositioned. Corrected rule, applied at P4:
**default DELETE for all of `scripts/lib/gepa/`**, with the keep-list derived
mechanically as the import closure of the three surviving commands
(`gepa-eval`, `gepa-history`, `gepa-invalidate`) plus the `evals/` harness
(judge/meter/model-profile). `champion-provenance-writer.ts` is explicitly on
the delete list (the plan's own prose diagnoses its git-SHA provenance as
broken by the import). P4 entry task: produce the full 27-file disposition
table via import trace before deleting anything. Trial artifacts + `.gepa/`
state archived verbatim, marked `imported-from: dev-team@<sha>`. Promotion,
if wanted later, becomes "operator reads eval diff, edits prompt" — no
machinery.

**Wiggin scrub:** 27 files in runner-plugin (fresh grep, `-li wiggin`,
excluding artifacts/node_modules) mention the name — templates
(`templates/wiggin-loop.md`), docs, kb pointers. **Timing corrected by the
demolition review: the scrub executes in P1 at import time** (CLAUDE.md's
decided constraint says "scrub during content import" — the earlier P4
scheduling contradicted it). Rename `wiggin-loop.md` → `dev-crew-method.md`,
rewrite references as part of the import slices; the `wiggin`-term CI sweep
gate lands in P4 with the merged CI workflow and must be green over the whole
tree there.

**Validator dedupe:** both parents ship `validate-org-refs`,
`validate-agent-refs`, `validate-manifests` — keep runner's (`.mts`), extend
scan targets to the merged tree. Two worktree-managers → keep runner's (1,040
LOC, wave-hardened). **Conflict resolved:** cleanup review said port dev-team's
claim/approval integration (`worktree-manager.ts:12-13`); rewrite-today review
showed claims.ts/approvals.ts (775 LOC) hand-roll file-ownership locking that
worktree isolation already provides natively. Resolution: **claims/approvals
are cut, no port** — sole operator + isolated worktrees make file-claim
ceremony dead weight; the seven claim/approval
commands are dropped from the §2 command map (final count there: 39
first-party).

**Further cuts (rewrite-today, grep-verified by cleanup):**
- runner `auto-dispatch.mts` + ~275 LOC of downstream dispatch-metrics/
  aggregate/trace/tree-snapshot readers — the dispatch consumer was abandoned
  (DEC-011); native task tracking supersedes the audit log.
- Artifact-as-IPC template writers under crew-bridge (renderSynthesisBody et
  al.) go with the bridge in P2 — direct function calls don't need markdown
  round-trips.
- `config-resolver.mts` preset-retrofit path — solves staggered-adopter
  installs that a single migrate-adopter pass obsoletes.
- verifier.md's stale hash-stamped "pre-loaded-universals" block (unreconciled
  GEPA candidate output; found in no other agent) — removed at import.
- Dead paths deleted at import, never ported: runner `docs/ai-loop/` (9 files),
  `docs/backlog/` (10), `.claude/artifacts/loop/pending-dispatch/` (11 JSON,
  zero readers). dev-crew's CLAUDE.md must not inherit runner's stale
  entry-point pointer to `docs/ai-loop/` (live tree is
  `.claude/artifacts/loop/`).
- 3 of 4 vendored 3rdparty commands have zero dispatch refs → dropped; all 14
  vendored agents have live references → kept.
- `models.yaml` vs runner `model-router.mts` carry an explicit "keep in sync"
  comment — real design merge (single model-tier source) scheduled in P3, not
  mechanical dedupe.
- Upstream requests: 12 of 13 open files target dev-team → closed as moot at
  merge; the astramem abortsignal request stays live and moves to dev-crew's
  `docs/upstream-requests/`.

Cleanup totals (grep-verified): ~38 files / ~2,700–3,500 LOC direct-deletable,
~1,500–2,000 LOC more folded via merges, 3 seam test files (428 LOC) deleted,
6–7 rewritten. Full evidence: `improve-cleanup.md`, `improve-rewrite-today.md`,
`improve-optimize.md` (this dir).

## 6. Identity migrations

- **astramem:** this repo already binds `memory.project: dev-crew`. Historical
  records under project `runner-plugin` are NOT re-tagged: `recall_memory`
  accepts a project **list**, so dev-crew sessions recall with
  `project: ["dev-crew", "runner-plugin"]` during a transition window (config
  flag in devcrew.json); new writes go to `dev-crew` only. Zero-loss, zero
  migration risk. Revisit closing the window after 90 days.
- **Marketplace:** final phase only, operator-approved: `astra-marketplace`
  gets one `devcrew` entry (github `astragenie/dev-crew`); `crew` + `runner`
  entries marked deprecated then removed. Not touched before Phase 5.
- **Local repo migration script** (`src/scripts/migrate-adopter.mts`): for each
  of the ~10 adopter repos (enumeration command in Appendix A): (1) re-run the
  devcrew installer to regenerate marker blocks — the `<!-- runner:start -->`
  and `<!-- crew:start -->` blocks are replaced by one `<!-- devcrew:start -->`
  block via the installer's own template path, never regex-on-prose; (2) rewrite
  `crew:X`/`runner:X` dispatch tokens per the §2 agent map in CLAUDE.md/AGENTS.md
  outside marker blocks; (3) migrate config per §4; (4) idempotent — second run
  is a no-op; (5) `--dry-run` prints the diff first.

## 6b. Parent estate settlement (new phase P0) and plugins-common policy

**P0 — settle runner-plugin's in-flight work before any import.** Live state
(verified this session): 7 in-flight FEATs, 28 triaged, wave-1 worktrees
SLICE-205/206/208 (branches `main-SLICE-205/206/208`) built + reviewed + green
but **unmerged**, plus 6 stale fix/chore worktree branches of unknown value.

Disposition rule: **finish nothing new in runner-plugin; merge only what is
already built and reviewed; carry the rest as backlog imports.**

| Item | State | Disposition |
|---|---|---|
| SLICE-205/206/208 (FEAT-295/297/296) | built+reviewed+green, unmerged | **merge to runner main in P0** — cheapest value capture; subtree then imports it. Close FEATs via ceremony |
| FEAT-299 (SLICE-207) | in-flight, no worktree found | P0 check: if built+reviewed, merge; else carry to dev-crew backlog |
| FEAT-259 (builder pause signal, 3/5) | partially landed; watchdog unwired by design | remaining slices **carry to dev-crew** — the upstream-request half becomes an in-repo change there (cheaper than finishing across the seam) |
| FEAT-284 | core fixed+pushed | close if remaining slices are seam-dependent; else carry |
| FEAT-230 | in-flight, 5 slices | P0 triage: carry or close-with-reason; no new build in runner |
| 28 triaged FEATs | scored, unstarted | P0 sweep, three buckets: **moot** (seam/cross-plugin — die with merge), **carry** (translate into dev-crew backlog with fresh ids, keep scores), **defer** (re-triage post-merge). Every file gets a bucket; no silent drops |
| 6 stale worktree branches (backfill, feat-reconcile, fix-427, fix-481, fix-format, release-073) | unknown freshness | P0: salvage-or-delete pass; anything salvaged merges before import |
| Pre-merge baseline | — | tag runner-plugin + dev-team final states (`pre-devcrew-baseline`) so "what did the parent do" has a fixed ref forever |

P0 is serialized, runs in the parent repos (the one exception to "parents
receive zero writes" — scoped to merges of already-reviewed work, backlog
file moves, and tags; no new feature code), estimated **3–5 slices**.

**plugins-common policy — consume yes, export no.** Verified: both parents
already depend on plugins-common packages as ordinary npm deps —
`@astragenie/astramem-client` 0.3.0 + `@astragenie/plugin-std` 0.5.0 (both
repos), plus `gepa-core` 0.10.1 and `memory-provider` 0.2.1 (dev-team); 52
source files import them. The merge changes none of that:

- **Keep consuming** all four packages in devcrew. Never hand-roll astramem
  resolution (standing lesson).
- **The planned crew↔runner shared-registry/contract package is moot** — that
  seam becomes in-repo function calls. This retires the stalled
  plugins-common consumer-wiring DEC (2026-07-08) as superseded, not failed.
- **Move no devcrew-internal logic out**: a shared package needs a second
  consumer; post-merge there is one. Revisit only when another repo
  (astramem-plugin, hr-team, sales) actually needs a piece — then extract.
- **GEPA bonus**: dev-team already consumes `gepa-core` 0.10.1 — the §5
  27-file local `scripts/lib/gepa/` cut gets easier, since core logic lives
  in the package; the import-closure keep-list may shrink further.

## 7. CI harmonization

Fresh counts: crew 19 `validate-*.ts` + runner 15 `validate-*.mts` + runner's
numbered CLAUDE.md gate list (19 entries incl. metrics-band). Disposition by
name: **dedupe** org-refs, agent-refs, manifests (keep runner's, widen scope);
**carry from runner** content-length, decline-citations, imports,
backlog-writes, slice-touches-files, snapshot-freshness, marketplace-sync
(→ retargeted to the single devcrew entry), dispatch-markers, memory-config,
metrics-band; **carry from crew** contracts, routing-table, slices, bundles,
badges, configs, dispatch-graph, loop-state, syntheses, ux-spec, workflows,
adr-template, backlog-drift, skills, agents; **retire** none silently — any
gate dropped must be named in the phase PR. Machine contracts: clause-registry
and the numbered CI-gate list port into dev-crew's CLAUDE.md from day one
(clause ids preserved so `declined_per` citations keep resolving);
metrics-band regenerates against the merged repo. New gate: wiggin-term sweep
(§5). Target: one numbered list ≈ 30 gates, all Bun.

## 8. Risk register (every row has a tripwire)

| Risk | Recurrence condition | Tripwire (checkable) |
|---|---|---|
| Rename-phantom (FEAT-240 class) | agent renamed without map update | `validate-agent-refs` extended to scan ALL owned .md + templates, not just CLAUDE.md; CI-red on unresolved token |
| Version-floor class | n/a inside one repo | gate deleted with seam; tripwire = any surviving `MIN_CREW_VERSION` grep hit post-Phase 3 (CI sweep) |
| Marketplace drift | manifest vs marketplace mismatch | `validate-marketplace-sync` retargeted to devcrew entry, kept in CI |
| Specialist-pause (lead-mode class) | dispatcher waits on subagent that stalls | port runner's `specialist-pause-detector` + SOP unchanged; tripwire = pause-rate metric in loop telemetry (already emitted) |
| Bun `--parallel` regressions (bun#5090) | node:test-shim tests survive the bun:test migration and hit the shim under workers | Phase-1 exit gate: zero `node:test` imports in merged suite (grep gate) + N≥20 consecutive green `--parallel` runs; fallback = shard matrix for resistant files |
| Hook overhead per tool call | dev-team registers 2 unconditional PostToolUse hooks + 3 PreToolUse spawns per Bash call (~90-135ms cold-start each, ~540ms/Bash call) | P3 hook-merge exit gate: measured per-Bash-call hook overhead ≤ 150ms; unconditional hooks consolidated or made matcher-scoped |
| Agent-cap CI red on day one | 4 dev-team agents exceed runner's 300-line cap (architect 346, verifier 343, backend-dev 335, release-engineer 326) | P3 task: trim before content-length gate activates; tripwire = validate-content-length green on merged tree |
| Merged CLAUDE.md context tax | no line budget set; ~203k tok/msg static-context burn precedent (builder-burn analysis, needs remeasure) | P4: set explicit CLAUDE.md byte budget (≤ 12KB before includes); tripwire = measured session static-context delta vs parents |
| GEPA state corruption | provenance commits dangling after import | `bun test tests/gepa/` green post-import + `gepa-history` runs clean on archived trials |
| astramem orphaning | recall misses old lessons | weekly `recall_memory(project:["dev-crew","runner-plugin"])` spot query returns pre-merge memories; config flag present in devcrew.json schema test |
| Release-train coupling | crew hotfix forced through runner surface | mitigation: tag-scoped release notes + `dev-lite` path for hotfix slices; tripwire = release checklist item "changed surfaces enumerated" |
| Context bloat | 39 commands / 26 agents / ~82 skills in one surface | measure: token count of loaded plugin surface before/after (session `/context` or harness metrics); if merged surface > sum of parents by >10%, tier skills (defer-load domain tier) |
| SPEC-003 halt-badge contract | consumer (AstraRunner) reads badge fields | `docs/halt-badges.md` ported verbatim; schema tests in `schemas/loop-events` stay green |
| Machine-contract breakage | clause ids / marker blocks drift | clause ids preserved (§7); installer round-trip test: install → validate → reinstall idempotent |

## 9. Phases + effort (entry/exit gates measurable from repo state)

| Phase | Content | Mode | Slices | Exit gate |
|---|---|---|---|---|
| **P0 Parent estate settlement** | merge wave-1 (SLICE-205/206/208) + any other built+reviewed branches to runner main; FEAT-299 check; in-flight FEAT dispositions; 28-triaged three-bucket sweep; stale-worktree salvage-or-delete; `pre-devcrew-baseline` tags (§6b) | serialized, runs in parent repos | 3–5 | runner main contains all reviewed work; every in-flight + triaged FEAT has a recorded bucket; both parents tagged; zero unmerged reviewed branches |
| **P1 Runtime baseline** | subtree-import both parents; `.ts`→`.mts` rename sweep (**391 dev-team files** need rename + import-specifier fixes, demolition-verified — drives the resize); node:test→bun:test migration of dev-team suite (31 importing files); Wiggin scrub at import (§5); one tsconfig/biome; merged suite green under `bun test --parallel` | serialized (import), then wave (rename + test-API sweeps) | **7–10** | zero `node:test` imports (grep gate); zero `wiggin` hits outside archives (grep gate); N≥20 consecutive green `--parallel` runs; `bun run typecheck` clean |
| **P2 Seam elimination** | crew-bridge → direct imports per §4 table; delete plugin-identity crew resolution; devcrew.json schema + migrator | serialized (bridge), wave (call sites) | 3–4 | zero `execFile.*crew` hits; zero `MIN_CREW_VERSION` hits; ceremony e2e-smoke green |
| **P3 Surface merge** | §2 command/agent/skill maps applied; dispatch-token rewrite; hooks merged + consolidated; 4 over-cap agents trimmed (architect/verifier/backend-dev/release-engineer); models.yaml/model-router design merge; manifest `devcrew` | wave (per-surface batches) | 5–7 | `validate-agent-refs` green on merged tree; every old token resolves per map; **measured hook overhead ≤150ms per Bash call**; **validate-content-length green (agent 300-line cap)**; smoke: one full slice ceremony under `/devcrew:*` |
| **P4 Content + CI** | dedupe validators; merged CI workflow (~30 gates incl. wiggin-term sweep); GEPA 27-file disposition table + cut + trial archive (§5); auto-dispatch + claims/approvals + preset-retrofit deletions; dead-path purge (ai-loop/backlog/pending-dispatch); docs merge | wave | 5–6 | CI green end-to-end; wiggin sweep gate green tree-wide; clause citations resolve; **merged CLAUDE.md ≤12KB pre-include (measured)**; GEPA disposition table covers all 27 files; deletion inventory from improve-cleanup.md fully dispositioned (each item DELETE/ARCHIVE/MERGE executed or explicitly deferred with reason) |
| **P5 Cutover** | migrate-adopter.mts over ~10 local repos (dry-run first); marketplace swap; parents archived read-only | serialized, operator-gated | 2–3 | each adopter: installer idempotence check green; one ceremony run in one adopter repo; **explicit operator approval before marketplace edit** |

Total ≈ **25–35 slices** (P1 resized after the demolition review's 391-file
rename count; P0 added for parent estate settlement). P0 entry gate: operator
approves this plan. P1+ land as PRs in dev-crew; parents receive zero writes
after P0 completes (P0's writes are scoped in §6b: merges of already-reviewed
work, backlog moves, tags — no new feature code). Adopter count:
the §6 "~10" is a snapshot — the Appendix A enumeration command re-run at P5
time is authoritative (demolition review observed 9-vs-10 drift between
counts taken hours apart; worktree copies come and go).

## 10. Improvement-review digest (2026-08-18, three Opus agents)

Full detail lives in this directory — the plan above already folds in every
accepted item; this table is the index:

| Doc | Verdict folded into plan | Notable |
|---|---|---|
| `improve-rewrite-today.md` (9 findings) | GEPA auto-promotion cut (§5); auto-dispatch + readers cut (§5); artifact-as-IPC writers die with bridge (§4/§5); claims/approvals cut + 7 commands dropped (§2/§5); preset-retrofit cut (§5); verifier.md stale block (§5) | explicit non-finding: reviewer ladder already solo-sized — do not "fix" during port |
| `improve-cleanup.md` (grep-verified) | dead paths purged at import (§5); 7 real skill-dupe pairs, dev-team superset wins (§2); 3 vendored commands dropped (§2); worktree-manager keep-side + conflict resolution (§5); upstream-requests 12/13 moot (§5); models.yaml/model-router design merge → P3 | corrected two false dupe claims and the "8 shared names" count from earlier planning docs |
| `improve-optimize.md` (7 findings) | bun#5090 history correction → §3 rewrite + P1 bun:test migration; hook overhead ~540ms/Bash call → P3 gate ≤150ms; 4 over-cap agents → P3 trim + risk row; CLAUDE.md byte budget → P4 + risk row | flake-rate N≥20 gate adopted as P1 exit criterion |

Open conflicts: none — the single reviewer conflict (claims port vs cut) is
resolved in §5 in favor of the cut.

**Demolition review round 2** (`review-plan-demolition.md`, verdict
approve-with-changes): 4 CRITICALs fixed in place — agent-count 27→26 tree
drift (§2), collision label 6→7 (§2), the three numeric tripwires now live in
§9 exit-gate cells (hook ≤150ms + agent cap → P3; CLAUDE.md ≤12KB → P4), GEPA
disposition corrected to the full 27-file inventory with import-closure
keep-rule (§5). 2 MAJORs folded: P1 resized 5–7→7–10 slices (391-file rename
footprint); bun#5090 mechanism claim softened to evidence-honest framing (§3).
MEDIUM folded: Wiggin scrub moved P4→P1 per CLAUDE.md constraint.

**Greenfield adjustments accepted as P-phase candidates (not yet slices):**
- (A) Prompt-based hooks: evaluate replacing spawn-per-event hook scripts with
  prompt-based hooks where the platform supports it — potentially a larger
  latency win than spawn consolidation alone; P3 spike slice.
- (B) Artifact taxonomy: collapse `.claude/artifacts/{crew,loop}/` into one
  `.claude/artifacts/devcrew/` tree at P4 (installer + validators updated
  together); adopter config migration handles the path move.
- (C) Backlog store: do NOT extend the native-task-tracking cut to the backlog
  store (files are the durable contract) — but DO replace the
  directory-move-as-state-transition mechanic (pending/→done/ moves), which
  the memory log documents stranding FEATs repeatedly; frontmatter status
  field + single directory is the P4 candidate design.
- (D) Blank-page command audit: the 39-command surface was deduped
  cross-repo but never zero-based; P3 slice reviews each command against
  "would we add this today" with usage evidence from session logs.

## Stop conditions honored

None fired. Near-miss noted: the bun-parallel experiment's 2 failures are
unclassified (log tail truncation) — below the >10% halt threshold (2/2111 ≈
0.09%), handled as a P1 exit-gate item instead.

---

## Appendix A — Step-0 fresh discovery (run 2026-08-18, this session)

```
dev-team:   commands 34 (+4 3p) · agents 23 (+9 3p) · skills 71 · hook regs 26
            tests 212 files · validate scripts 19 · version 0.66.0
runner:     commands 20 · agents 6 (+5 3p) · skills 18 · hook regs 12
            tests 330 files · validate scripts 15 · version 0.78.0
coupling:   MIN_CREW_VERSION "0.57.0" (plugin-identity.mts:81)
            crew-ref files: grep -rlw crew src/scripts | wc -l → 89
upstream:   13 open + 4 archived (docs/upstream-requests/)
marketplace (astra): crew 0.67.0 · runner 0.77.0 · astramem 0.7.0
            (local checkouts ahead/behind: dev-team 0.66.0, runner 0.78.0)
plugin cache layout: ~/.claude/plugins/cache/astra/{astramem,crew,runner}
            → namespace binds 1:1 to plugin name (static evidence; no
            multi-prefix mechanism found; confidence high — live-install
            confirmation deferred to P3 smoke)
adopters:   10 distinct repos with <!-- runner:start --> under C:/work/mega
            (excl. worktree/slice copies)
wiggin:     27 files reference the name in runner-plugin (md+mts, excl. artifacts)
bun exp:    dev-team `bun test --timeout 60000 --parallel tests/`
            → 2111 tests / 212 files: 1991 pass, 118 skip, 2 fail, 14.30s
```
