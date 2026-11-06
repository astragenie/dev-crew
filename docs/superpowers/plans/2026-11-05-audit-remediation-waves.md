# Audit remediation — wave execution plan (2026-11-05, rev 2)

**Source plan:** `docs/superpowers/plans/2026-11-05-devcrew-audit-remediation.md`
(12 tasks, copied from the archived dev-team repo). Spec inputs under
`docs/audits/2026-11-05/`.

**Rev 2 (same day):** rev 1 was rejected by three adversarial reviews on
Fable — architect-reviewer (`.claude/artifacts/crew/reviews/20261105T222800Z-architect-review-audit-remediation-wave-plan.md`),
reviewer (`…20261105T223300Z-review-result-audit-remediation-feat-set.md`),
critical-thinking (`…20261105T223000Z-assumption-attack-audit-remediation-wave-plan.md`).
All findings are applied in the FEAT bodies and in this revision. Synthesis:
`.claude/artifacts/crew/reviews/20261105T224500Z-review-synthesis-audit-remediation.md`.

## What changed the picture

1. **No devcrew hook runs for any consumer today.** Live two-plugin marker
   test on claude 2.1.270 (`.claude/artifacts/crew/validations/20261105T223500Z-validation-plugin-hooks-json-discovery.md`):
   only `hooks/hooks.json` is discovered; devcrew ships everything under
   `.claude-plugin/hooks/hooks.json`. The node_modules crash the audit found
   is real but second-order. → **FEAT-033 (new, P0, runs first).**
2. **The wave planner cannot gate these FEATs.** It reads `pm_risk_level` /
   `pm_strategic_fit` / `composite_score`; pm-apply writes
   `pm_technical_risk` / `pm_strategic_alignment` / `pm_composite_priority`.
   The autonomous_safe pre-flight never fires; ranking is flat; FEAT-level
   `proposed_slices` are packed in parallel. → **FEAT-034 (new, wave 1).**
3. **Auto-install exists but devcrew is ineligible** (root `bun.lock`
   workspaces + crew/ git dependency + @astragenie registry auth). Bundling
   stays the fix (verified live by the architect-reviewer: dist/crew.js and
   the five crashing hooks exit 0 from a node_modules-free consumer).
   Decision and rejected alternative recorded in FEAT-026 / docs/memory.md.
4. **`onFailure: "block"`** is honoured only on PreToolUse-class events and
   only on CLI ≥ 2.1.295 (host: 2.1.270). Exit 2 must carry enforcement.
5. **Five FEATs could not pass their own ACs** (STATUS block vs line-start
   `DONE:` regex; marker-block hand-edits; 12,288 B budget = CLAUDE.md's own
   size; smoke test vs deferred path rewrite; nonexistent `plugin install
   --from`). All rewritten.
6. **Three cited paths did not exist**: `docs/routing-table.md`
   (→ `crew/docs/routing-table.md`), `crew/scripts/validate-agent-refs.mts`
   (→ `src/scripts/validate-agent-refs.mts`), `crew/tests/gepa/capture-perf.test.mts`
   (does not exist; benches are hook-cold-start + log-event-async).

**Correction to the source handoff still stands:** this repo
(`C:\work\mega\devcrew`, main @ 084747c2) is the `astragenie/dev-crew`
checkout; no clone. The audit's "installed cache 1.1.0" does not exist on
this host (local marketplace clone is stale; remote registry pins devcrew
1.1.0 → astragenie/dev-crew, no ref).

## Constraints

- Local commits only on lane branches / worktrees. No push, tag, release,
  or `marketplace.json` edit until operator sign-off after wave 5. Any push
  to main ships to every new adopter install (registry has no ref) — 20
  adopters are on 1.1.0 (CHANGELOG.md:49-51).
- Every shipped bun entry runs with `node_modules` absent at any depth.
- `docs/` stays shipped. `pre-tool-use-model-enforce` behaviour kept.
- Marker blocks in CLAUDE.md are never hand-edited: FEAT-030 edits installer
  templates and re-runs `/devcrew:install`.
- No local plugin marketplace, ever: FEAT-032 uses `claude --plugin-dir`.
- `bun run test:all`, `typecheck`, `lint`, `validate:manifests` green before
  each commit; FEAT-022's smoke test is deliberately red on main through
  wave 1 (gate 41 red; fast-gate, the merge gate, unaffected).

## Task → FEAT map and file-conflict analysis

| FEAT | Task | Touch surface | Conflicts with |
|---|---|---|---|
| FEAT-033 | T0b hooks discovery (new) | `hooks/hooks.json` (moved), `src/scripts/validate-repo-boundary.mts`, `docs/planning/hooksjson-crew-path-inventory.json`, `docs/ci-gates.md`, `docs/memory.md`, `src/tests/validate-repo-boundary.test.mts`, `src/tests/wave/touches-files.test.mts`, README, CHANGELOG | 023 (ci-gates.md), 034 (touches-files test) → runs alone first |
| FEAT-022 | T1 smoke red | `src/tests/install/**`, `src/scripts/lib/install/` | none |
| FEAT-023 | T3 CI gate | `ci.yml` changes/gate, `src/scripts/ci/`, `src/tests/ci/`, `docs/ci-gates.md` | 026 (ci.yml, ci-gates.md) — different waves |
| FEAT-024 | T4 verdicts | `crew/scripts/crew.mts`, `crew/scripts/lib/workflow-state*.mts`, `crew/scripts/lib/artifacts/write.mts`, run-brief writer, `crew/tests/` | 027, 029 (crew.mts) — later waves |
| FEAT-025 | T9 telemetry | `crew/scripts/lib/{cost-hygiene,session-cost.mts,pricing.json,cost-advise}`, `src/scripts/lib/grade-writer.mts`, tests | none |
| FEAT-034 | planner fields (new) | `src/scripts/lib/wave/{planner,touches-files}.mts`, `src/scripts/lib/slice-linker/feature-lifecycle.mts`, `commands/wave.md`, `src/tests/wave/` | 033 (touches-files test) — 033 runs first |
| FEAT-026 | T2 dist | `src/scripts/build-dist.mts`, `dist/`, `.gitignore`, `.bun-version`, `hooks/hooks.json`, inventory json, `package.json`, `ci.yml` (one list line), `docs/ci-gates.md`, CLAUDE.md gate list, README band, `docs/memory.md` | 027/028 none; 030 (package.json) later wave |
| FEAT-027 | T5 validation-skip | `commands/{orchestrate-slice,fix}.md`, `crew/docs/routing-table.md`, `skills/workflow/{dispatcher-routing,validator-gate}/SKILL.md`, `crew/scripts/crew.mts`, `crew/scripts/lib/ci/`, `src/scripts/lib/validation-gate.mts`, tests | 029 (fix.md, orchestrate-slice.md) — later wave |
| FEAT-028 | T6 builder report | `agents/{fullstack,backend,frontend,aiplugin}-dev.md`, `agents/{architect,reviewer,verifier}.md` (path lines), `commands/build.md`, `skills/workflow/builder-ceremony/SKILL.md`, `crew/scripts/validate-agents.mts`, `src/scripts/validate-agent-refs.mts`, `hooks/report-gate.mjs` (doc), DEC-040, tests | 029 (build.md, reviewer.md, validate-agent-refs) — later wave |
| W2.5 | path rewrite (serial, main) | `commands/*.md`, `agents/*.md` string replace (91 + 42) | everything in waves 2 and 3 → serial between them |
| FEAT-029 | T7 refs + validators + light path (3 sequential slices) | `commands/{parallel,fix,orchestrate-slice,build}.md`, `agents/reviewer.md`, 6 `.py` deletes + 4 SKILL.md, `src/scripts/validate-agent-refs.mts`, `crew/scripts/validate-skills.mts`, `src/scripts/lib/path-ref-allowlist.json`, `crew/scripts/crew.mts`, `crew/scripts/lib/light-path.mts`, tests | 030 none |
| FEAT-030 | T10 context diet | `crew/scripts/lib/installer/{templates,repo-guides}.mts`, `templates/claude-md-hard-rules.md`, `skills/loop-discipline/SKILL.md`, CLAUDE.md (regenerated + line 227), `.claude/crew/constitution.md`, `src/scripts/lib/memory-snapshot.mts`, `package.json`, `crew/bench/`, crew installer tests, `src/tests/context/`, `docs/ci-gates.md`, CHANGELOG | 029 none |
| FEAT-031 | T8 dispatcher (5 slices, sequential) | `crew/hooks/{registry,dispatch,otel-flush}.mts`, `src/scripts/render-hooks-json.mts`, `hooks/hooks.json`, `build-dist.mts`, `dist/`, inventory, deletes, `src/tests/perf/hook-spawn-bench.mts`, `docs/audits/2026-11-05/README.md` | alone |
| FEAT-032 | T11 e2e sign-off | `docs/audits/2026-11-05/smoke-after.md`, CHANGELOG draft, review artifact | alone |
| FEAT-035 | residuals (skills key, cache size, stale ids) | `.claude-plugin/plugin.json`, `crew/docs/routing-table.yaml`, validators, `agents/*.md` text | deferred past wave 5 |

## Waves

Spine: enforcement before architecture (Codex #24). Discovery (033) before
anything that renders hooks.json. Planner fix (034) before the first wave
that relies on `wave plan` gating. T4 before T8. T1 red before T2 green.
Path rewrite as its own serial step so slash commands go green after wave 2,
not wave 4.

### Wave 0 — prep (main, serial) — DONE this session

Spec copied; 11 FEATs intaked + triaged; three reviews run and applied;
FEAT-033/034/035 filed; FEAT bodies rewritten; PM re-score; `depends_on`
stamped; snapshot regenerated; validators green. Commit is operator-triggered.

PM re-score after rev 2 (`.claude/artifacts/loop/pm-reviews/20261105T225000Z-triage-results.json`
+ `…224000Z…` for 033/034):

| FEAT | Priority | Pts | autonomous_safe | Slices |
|---|---|---|---|---|
| FEAT-033 hooks discovery | **P0** | 3 | true | — |
| FEAT-034 planner fields | **P0** | 5 | true | — |
| FEAT-024 verdicts | **P0** | 5 | true | — |
| FEAT-026 dist | **P0** | 8 | true | — |
| FEAT-022 smoke red | P1 | 3 | true | — |
| FEAT-023 CI gate | P1 | 2 | true | — |
| FEAT-027 validation-skip | P1 | 3 | true | — |
| FEAT-028 report block | P1 | 5 | true | — |
| FEAT-029 refs/validators/light | P1 | 8 | true | 4 × 2 (refs / rules / allowlist / light path) |
| FEAT-030 context diet | P1 | 3 | **false** (product-surface templates) | — |
| FEAT-031 dispatcher | P1 | 13 | false | 7 (six 2-pt + one 1-pt; SLICE-2 split core / failure-modes) |
| FEAT-025 telemetry | P2 | 5 | true | — |
| FEAT-032 e2e sign-off | P2 | 5 | false | — |
| FEAT-035 residuals | P3 | 5 | true | deferred |

Operator attendance needed for waves 3B (030), 4, 5.

### Wave 0.5 — FEAT-033 alone (main, serial)

Move `hooks/hooks.json`, update inventory + validators + docs, discovery test.
Smallest change with the largest consumer effect; everything after it
reads the new path. Operator commit.

### Wave 1 — 5 lanes, zero overlap

| Lane | FEAT | Task |
|---|---|---|
| A | FEAT-022 | T1 consumer-install smoke test (red; command-derived CLI list; depth-aware copy) |
| B | FEAT-023 | T3 CI docs-only + gate fail-closed (backlog = code) |
| C | FEAT-024 | T4 verdicts (scaffold exempt; ladder snapshot; no --required-reviewers) |
| D | FEAT-025 | T9 telemetry (inlined pricing; verified model ids; grade-writer in src/) |
| E | FEAT-034 | wave planner PM fields + sequential slices + wider inference |

Merge A–E, `bun run test:all` (smoke red expected). Close FEATs to `done/`
(planner checks `depends_on` against done/ only).

### Wave 2 — 3 lanes

| Lane | FEAT | Task | Depends on |
|---|---|---|---|
| A | FEAT-026 | T2 dist bundles (hooks green; .gitignore; inventory; Bun pin; import.meta audit; gate 21) | 022, 033, 034 |
| B | FEAT-027 | T5 validation-skip (5 docs; deriveValidationGate; has-consumer-ci on stack.test) | 024, 034 |
| C | FEAT-028 | T6 marker-first report block; DEC-040; validator rules incl. peer-dispatch | 034 |

### Wave 2.5 — path rewrite (main, serial, no logic)

`crew/scripts/crew.mts` → `dist/crew.js`, `src/scripts/loop.mts` →
`dist/loop.js` across `commands/*.md` + `agents/*.md`; run FEAT-022's smoke:
EXPECTED_FAIL must be empty. Operator commit. From here consumers' slash
commands work.

### Wave 3 — 2 lanes

| Lane | FEAT | Task | Depends on |
|---|---|---|---|
| A | FEAT-029 | T7 as 3 sequential slices: refs (+jq removal, loop-cache path) → validators (+allowlist) → light path (task-text paths) | 027, 028, W2.5 |
| B | FEAT-030 | T10 templates + install re-run; 24,576 B repo-rooted ratchet; benches to crew/bench/ | 026 |

### Wave 4 — FEAT-031 alone (`autonomous_safe: false`)

Slices in order 1 registry → 2 dispatcher (4 pts) → 4 telemetry port → 3
renderer (one bun entry per event, matcher union) → 5 shape test + before/
after p50 bench. Depends on 024, 026, 028, 029, 033, W2.5.

### Wave 5 — FEAT-032 alone (`autonomous_safe: false`)

`claude --plugin-dir <pluginCopy>` smokes in the scratch consumer;
smoke-after.md; whole-branch review with explicit NOT-closed set (#30, #38,
skills, cache → FEAT-035); go/no-go. Post-push step: re-smoke against a real
`claude plugin install devcrew@astra` cache.

### Deferred — FEAT-035

Skills key, cache size decision, routing-table.yaml stale ids, FEAT-id
literals in agents. After sign-off unless PM scores it into wave 3.

## Execution

```bash
# after FEAT-034 lands, per wave:
bun src/scripts/loop.mts start --id FEAT-0NN --repo "$PWD"   # per lane: creates slices + touches_files
bun src/scripts/loop.mts wave plan --repo "$PWD" --size 5 --json
# then the slash flow — the CLI cannot dispatch headless (wave/real-deps.mts:3-6):
/devcrew:wave run --size 5
```

Before FEAT-034 lands (wave 0.5 and wave 1), dispatch lanes directly via
`/devcrew:build` per worktree; the planner's ranking and pre-flight are not
trustworthy yet. `touches_files` must be declared explicitly on every slice
(the inference regex misses crew/, .github/, .claude-plugin/, root files
until FEAT-034).

## Residual risk after all ACs pass (from the reviewer)

`.sh` hook entries only tested where bash exists; OTel-enabled installs rely
on FEAT-026 AC-6; SubagentStop is never runtime-fail-closed (CLI limit);
skills/cache (FEAT-035); runner "First action" drift fixed only in templates
(adopters must re-install).

## Out of scope (recorded)

Horizon 2 (roster collapse, skills cut, Workflow re-platform) — waits for
usage data (Codex #24/#27/#28). Licence mismatch (MPL-2.0 vs MIT) —
operator decision. Push / tag / release — operator-triggered after wave 5.
