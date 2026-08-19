# Task Handoff: SLICE-14: command map application (structural half)

- Created: 2026-08-19T03:24:04.428Z
- From: fullstack-dev
- To: lead
- Objective: SLICE-14 structural half complete: command map applied per unification-plan.md sec.2. Scope was structural file moves/merges only -- dispatch-token rewrite sweep (crew:X/runner:X -> devcrew:X across body content) deliberately NOT done here; that is the parent loop's separate follow-up workflow (also covered by SLICE-14's shared AC-2, out of this handoff's scope).

DISPOSITION LEDGER -- all 58 parent command files accounted:

Crew-side (38 total: 34 in crew/commands/ + 4 in crew/commands/3rdparty/):
- Carried, git mv to commands/ + retrofitted frontmatter (20): adopt.md, architect-feature.md, audit-repo.md, build.md, design.md, fix.md, gepa-eval.md, gepa-history.md, gepa-invalidate.md, incident.md, init.md, orchestrate-slice.md, parallel-review.md, parallel.md, prune-artifacts.md, quickwin.md, review.md, ship.md, validate.md, wake-up-brief.md
- Dropped, git rm (11): claim-files.md, release-files.md, show-claims.md, show-conflicts.md, request-approval.md, resolve-approval.md, show-approvals.md, gepa-optimize.md, gepa-resume.md, gepa-revert.md, gepa-thaw.md
- Collision, merged then git rm (3): install.md -> folded into commands/install.md Step 1; cost-setup.md -> folded into commands/cost-setup.md Step 2; brief-me.md -> folded into commands/brief.md
- 3rdparty carried, git mv (1): refactor-code.md -> commands/3rdparty/refactor-code.md
- 3rdparty dropped, git rm (3): architecture-review.md, create-architecture-documentation.md, create-prd.md

Runner-side (20 total, pre-existing in root commands/ before this slice):
- Carried unchanged (16): auto.md, close.md, decisions.md, intake.md, learn.md, lessons-recent.md, list-presets.md, memory-setup.md, phase-gate.md, pr-fix.md, retrospective.md, spec-status.md, start.md, triage.md, watch.md, wave.md
- Collision-side, content merged in place (3): install.md, cost-setup.md, brief.md (all 3 kept their filenames, crew-side content folded in)
- Folded into brief.md then git rm (1): status.md

End state: 39 first-party command files in commands/ + 1 vendored in commands/3rdparty/ = 40 total. crew/commands/ and crew/commands/3rdparty/ no longer exist (emptied then auto-pruned by git).

MERGED-FILE SUMMARIES:
- commands/install.md: two-step workflow, Step 1 = former crew install-global (writes ~/.claude/crew/{constitution,workflow,metadata}.json via `node crew.ts install-global`), Step 2 = former runner repo-level install (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json via `bun loop.mts install`). Both original behaviors preserved verbatim; cross-references to /runner:status and /crew:brief-me rewritten to /devcrew:brief and /devcrew:install (new prose only, per task-scoped instruction to use devcrew: inside hand-merged files).
- commands/cost-setup.md: two-step workflow, Step 1 = former runner loop.json loop.cost.* seed/migrate (via `bun loop.mts cost-setup`), Step 2 = former crew .claude/crew.json features block seed (via `node crew.ts cost-setup`). Both scripts, defaults tables, and output-JSON shapes preserved verbatim.
- commands/brief.md: three-way merge of crew brief-me (workflow-state briefing) + runner brief (backlog/specs/grades/decisions/alerts) + runner status (install health: preset, paths, marker presence, crewCli). Runs all three underlying scripts, folds into one fixed-order briefing; Install Health section only renders when unhealthy (marker missing / crewCli null / scaffold path missing), recommending /devcrew:install. Pattern-alerts table and full cost-table rendering rules preserved from the runner brief source.

SELF-VERIFY GATES:
- validate-manifests.mts: FAILED on first pass (20 moved crew commands missing required "name"/"auto_execute_steps" frontmatter fields -- crew's command schema never had them, runner's does). Fixed by adding name:<stem> + auto_execute_steps:<bool> to all 20 (true only for the 3 mechanical no-judgment gepa-* wrappers; false for every dispatcher/judgment-gate command, matching the existing runner-side pattern where only memory-setup/cost-setup are true). Re-run: PASS.
- validate-content-length.mts: PASS (does not check commands/ at all in this repo -- only agents/**/*.md and skills/**/SKILL.md are capped; command files carry no line cap here despite the task brief's assumption).
- validate-agent-refs.mts: PASS (checks CLAUDE.md only for phantom crew:/runner: tokens; unaffected by this slice's scope).
- validate-imports.mts: PASS (no source touched).
- tsc --project tsconfig.json --noEmit: PASS
- tsc --project tsconfig.test.json --noEmit: PASS
- bun test src/tests/ --parallel --timeout 60000: 3316 pass, 7 skip, 2 FAIL, 1557 expect() calls, 3325 tests across 327 files.
  - The 2 failures are PRE-EXISTING and OUT OF THIS SLICE'S SCOPE: "DEC-070 contract record exists for FEAT-229" (learning-cycle.test.mts) and "DEC-068 contract record exists for FEAT-222" (eval-generator.test.mts) both assert .claude/artifacts/loop/decisions/DEC-070.md and DEC-068.md exist with status:accepted -- neither file exists on disk. Confirmed via git log these were committed historically (b17b8376, 8f7f7fd5) then removed by an earlier commit (at/before f2110e99, SLICE-13) that predates this slice; I never touched .claude/artifacts/loop/decisions/. Not fixed -- outside the structural command-map scope I was given; flagging for the backlog rather than silently patching decision-registry state.
- biome lint src/: baseline warnings only (61 warnings / 253 infos, pre-existing e.g. cli-args.mts complexity 16>15), nothing in commands/ or touched by this slice, not a regression.

COUNT GATES:
- ls commands/*.md | wc -l => 39
- ls commands/3rdparty/*.md | wc -l => 1
- crew/commands/ and crew/commands/3rdparty/ => both gone (git auto-pruned after last file left each dir)
- Allowed Scope:
  - Structural command-file moves/merges/deletes + frontmatter fixes only (no dispatch-token body rewrite -- that's the parent loop's follow-up workflow).
- Forbidden Scope: -
- Deliverable: Command map applied per unification-plan.md sec.2: 58 parent command files (34+4 crew, 20 runner) reconciled into 39 first-party + 1 vendored file under commands/. crew/commands/ removed.
- Changed Files:
  - commands/install.md
  - commands/cost-setup.md
  - commands/brief.md
  - commands/3rdparty/refactor-code.md
  - commands/adopt.md
  - commands/architect-feature.md
  - commands/audit-repo.md
  - commands/build.md
  - commands/design.md
  - commands/fix.md
  - commands/gepa-eval.md
  - commands/gepa-history.md
  - commands/gepa-invalidate.md
  - commands/incident.md
  - commands/init.md
  - commands/orchestrate-slice.md
  - commands/parallel-review.md
  - commands/parallel.md
  - commands/prune-artifacts.md
  - commands/quickwin.md
  - commands/review.md
  - commands/ship.md
  - commands/validate.md
  - commands/wake-up-brief.md
- Confidence: high
- Risks: 2 pre-existing unrelated test failures (DEC-070/DEC-068 contract-record assertions, decisions/ files missing since before this slice) left unfixed -- flagged, not silently patched. Dispatch-token rewrite sweep across all commands/agents/skills bodies still pending (separate workflow, tracked by SLICE-14's shared AC-2).
- Suggested Next Handoff: Run the dispatch-token rewrite sweep (crew:X/runner:X -> devcrew:X) across commands/, agents/, skills/, CLAUDE.md, AGENTS.md; then re-run validate-agent-refs.mts across the full merged tree; consider filing a FEAT for the 2 missing DEC files if they're expected to exist.

