---
kind: review-result
reviewer: crew:architect-reviewer (model: fable)
subject: docs/superpowers/plans/2026-11-05-audit-remediation-waves.md + FEAT-022..032
decision: rejected
created_at: 2026-11-05T22:28:00Z
confidence: high
---

# Architect review — audit remediation wave plan

**Verdict: rejected** as an executable sequence. Wave packing and dependency
spine are sound. Five of eleven FEATs cannot reach their own ACs against this
tree, and the plan's execution commands do not do what the plan says. All
fixable in a wave-0 patch to the FEAT texts; then `approved_with_notes`.

Evidence from the live checkout at 084747c2. The reviewer built the T2
bundles and ran them from a node_modules-free consumer directory.

## BLOCKERS

- **OBJ-1 (FEAT-026) `dist/` is gitignored.** `.gitignore:13` has `dist/`.
  Second miss: `src/scripts/validate-repo-boundary.mts:40-45` runs a
  hooks.json inventory drift check against
  `docs/planning/hooksjson-crew-path-inventory.json`; the moment hooks.json
  points at `dist/hooks/*.js`, gate 9 fails until `--write-inventory`
  regenerates it. Fix: add `.gitignore` + inventory regen to FEAT-026 scope.
  AC-4's other worries are non-issues: boundary/import validators scan only
  `.mts` under `src/` and `hooks/`; `biome.json:4` excludes `**/dist/**`;
  both tsconfigs exclude `dist`; branding-scrub skips `dist` (line 44);
  org-refs scans a fixed root list.
- **OBJ-2 (FEAT-022 + FEAT-026) Smoke test and bundle FEAT contradict.**
  FEAT-022's CLI list is fixed to `crew/scripts/crew.mts brief-me` etc.;
  FEAT-026 does not rewrite paths, so after FEAT-026 the CLI entries still
  run unbundled source and still crash. FEAT-026 AC-1 cannot be green.
  Commands carry 136 `crew/scripts/crew.mts` + 44 `src/scripts/loop.mts`
  invocations (16 in `commands/build.md` alone). Fix: `listShippedEntrypoints`
  derives CLI entries by parsing `${CLAUDE_PLUGIN_ROOT}/<path>` out of
  `commands/*.md` plus hooks.json. Restrict FEAT-026 AC-1 to hook entries.
  Add a serial path-rewrite step on main between waves 2 and 3.
- **OBJ-3 (FEAT-030) Budget unreachable; edits wrong-targeted.** `CLAUDE.md`
  alone is 12,288 bytes (= the AC ceiling) before `@AGENTS.md` (8,438) which
  the FEAT keeps. Chain today 33,559 B; removing both includes → ~25.5 KB.
  The constitution include sits inside `<!-- crew:start -->` at
  `CLAUDE.md:199-202`, generated from `CLAUDE_IMPORT_BLOCK` at
  `crew/scripts/lib/installer/templates.mts:12-17` (10 test files assert
  it). `.claude/crew/constitution.md` is rendered from `CONSTITUTION_TEMPLATE`
  via `crew/scripts/lib/installer/repo-guides.mts:13`. The "First action when
  starting the runner" line is inside the runner block from
  `templates/claude-md-hard-rules.md`. Only `CLAUDE.md:227` (loop-snapshot)
  is hand-editable; nothing in `validate-snapshot-freshness.mts` requires it.
  Phantom deliverables: no e2e step exists in `ci.yml` (line 49: Linux-only,
  not run); the retry that exists is `max_attempts=2` on slow-tests with a
  documented bun#5090 cause at `ci.yml:204-212`;
  `crew/tests/gepa/capture-perf.test.mts` does not exist. Fix: re-scope to
  the two templates + install re-run, drop line 227 by hand, measured ratchet
  26 KB, delete e2e-retry + capture-perf deliverables.
- **OBJ-4 (FEAT-028) `STATUS: DONE` breaks two live enforcement hooks.**
  `crew/scripts/lib/subagent-return/incomplete-detector.mts:19` is
  `/^(DONE|BLOCKED|HELP|HELP-REQUEST|IN-PROGRESS)\s*:/im`;
  `crew/hooks/lib/subagent-gate-guard.mts:51` is `/^DONE\s*:/im`. A final
  message starting `STATUS: DONE` matches neither: check-builder-terminal-state
  blocks every builder exit (lib:165), gate-guard's red-gate block never
  fires. Both files outside FEAT-028 scope. DEC-038: `hooks/report-gate.mjs:
  299-330` finds the receipt by scanning for a SendMessage tool_use; removing
  SendMessage orphans FEAT-008 (currently off; no `report-gate` key in
  `.claude/loop.json`). Fix: keep line-start `DONE: <summary>` as line 1
  (builders already specify STATUS ∈ {DONE,...}, e.g. `fullstack-dev.md:231`),
  append FILES / TESTS / NEXT lines; record a DEC superseding DEC-038's
  SendMessage lane. `no-relative-script-path` hits 12 lines across 6 files
  incl. `agents/architect.md:158,196` and `agents/reviewer.md:180` — AC-4
  fails on the real tree unless those join scope.
- **OBJ-5 (FEAT-024) Scaffold writes are fail-open today and the FEAT breaks
  them.** `crew/scripts/lib/artifacts/write.mts:931-933` registers every
  non-cost artifact incl. `--scaffold --status in-progress`;
  `workflow-state.mts:428-431` applies review_passed with no verdict.
  `agents/architect-reviewer.md:30` scaffolds before reviewing → gate green
  before the review starts (worse than Codex #20). Unconditional `--decision`
  breaks DEC-019 scaffold/update idempotency. Fix: scaffold writes record the
  artifact path and apply no badge; `--decision` required whenever status is
  not in-progress; test "scaffold does not turn the gate green".
  `--required-reviewers` duplicates `.claude/loop.json:67`
  `reviewers.ladder ["A","B"]` (read by `src/scripts/lib/post-builder-fanout.mts:5`);
  `--reviewer` values are role names, not letters. Fix: snapshot the ladder
  into `gates.review.required[]` at run-brief time, key aggregation by role.

## MAJOR

- **OBJ-6 (wave plan) `wave plan` cannot pack these FEATs.**
  `src/scripts/lib/wave/planner.mts:233-262` loads candidates from slice
  files under slices/pending joined to triaged FEATs; 10 of 11 FEATs have
  `slices: []`. Inference regex `touches-files.mts:5-6` matches only
  `(src|docs|scripts|commands|agents|skills)/...`; `crew/scripts/crew.mts`,
  `.github/workflows/ci.yml`, `.claude-plugin/hooks/hooks.json`,
  `package.json`, `CLAUDE.md`, `dist/` are invisible. Fix: declare
  `touches_files` explicitly per FEAT (feature-lifecycle.mts:64 supports it),
  `/devcrew:start` per lane before `wave plan`, widen regex.
- **OBJ-7 (FEAT-025 vs FEAT-026) Bundling breaks sibling-file reads.**
  `crew/scripts/lib/session-cost.mts:21-23` resolves pricing.json beside the
  module via import.meta.url; under `dist/crew.js` there is no sibling. 65
  modules use import.meta.url incl. 14 `crew/scripts/*.mts` computing
  REPO_ROOT from their own location, and the installer templates. Fix:
  FEAT-025 imports pricing.json as a JSON module (bundler inlines);
  FEAT-026 audits every import.meta reachable from bundled entries →
  CLAUDE_PLUGIN_ROOT or inlined imports; smoke test adds init/install-style
  subcommands.
- **OBJ-8 (FEAT-029) Scope creep and wrong paths.** `repo-path-exists`: 146
  distinct backticked repo paths in agents/commands/skills, 29 missing today
  incl. placeholders (`docs/decisions/DEC-NNN.md`, `src/api/feat-NNN.ts`) and
  consumer-repo examples. `docs/routing-table.md` cited 15 times, does not
  exist at root (it is `crew/docs/routing-table.md`); FEAT-027 names the root
  path. `crew/scripts/validate-agent-refs.mts` does not exist — file is
  `src/scripts/validate-agent-refs.mts`, already resolves `devcrew:<x>`;
  misses `devcrew:build` only because the resolver accepts commands → new
  rule is "in subagent_type context, agents only". `skill-script-exists`
  belongs in `crew/scripts/validate-skills.mts`. `commands/parallel.md:26-28`
  still resolves the retired loop plugin cache path. Fix: three sequential
  slices in one lane (refs batch, validators with placeholder exemption,
  light path).
- **OBJ-9 (FEAT-029 light path) Classifier can never return eligible.**
  Requires non-empty `files`, but /devcrew:build has no `--files` flag.
  dev-lite/reviewer-lite become dead code. Today's heuristic
  (`build.md:13-22`, `fix.md:17-22`) confirmed fail-open on a clean tree.
  Fix: extract path-like tokens from task text, or delete the light path and
  its routing rows.
- **OBJ-10 (FEAT-031) "One spawn" unreachable under the plan's constraints.**
  hooks.json: 38 entries (21 bun, 11 node, 6 shell). PreToolUse Bash = 3 bun
  spawns across two matchers (`Bash|PowerShell`, `Bash`); per-(event,matcher)
  dispatcher still yields 2 unless matchers unified. Agent = 1 bun + 1 node;
  SubagentStop = 1 bun + 3 node + shell. The five node hooks import only
  `./feature-flag-lite.mjs` and are trivially bundleable. Registry needs a
  merge rule for `updatedInput` across checks. SLICE-2 is 4 pts, not 2.
- **OBJ-11 (FEAT-026) Byte-compare `--check` flakes across Bun versions.**
  Output starts with `// @bun` + version-specific helpers; CI prints
  `bun --version` but pins nothing (`ci.yml:128`). Fix: pin Bun
  (`.bun-version` + CI) or rebuild-and-smoke instead of byte-compare.
- **OBJ-12 (FEAT-022) Red test is not red unless the copy filter is
  depth-aware.** `crew/node_modules` exists (272 MB; has plugin-std, zod,
  yaml). Root-only exclusion copies it → crew entries pass. Also 6
  `log_event.sh` entries have no runtime word; parser must handle/skip.
- **OBJ-13 (coverage) Work claimed closed with no FEAT behind it.** Codex P1
  #13 (silent jq dependency, `build.md:51-62`, `fix.md:53`) in no FEAT, yet
  FEAT-032 lists #13 as closed. Audit #30 (`crew/docs/routing-table.yaml:
  185,306,309` microsoft-docs:*, context7.get-library-docs) and #38 (12
  distinct FEAT ids + 4 backlog paths in agents/) in no FEAT. Six prompts
  cite `.github/workflows/test.yml` (ci.yml here: `orchestrate-slice.md:
  509,537,548`, `skills/workflow/validator-gate/SKILL.md:20`). FEAT-027 misses
  `validator-gate/SKILL.md` (same contradictory policy, lines 20, 30, 37-38).

## MINOR

- **OBJ-14 (FEAT-027)** cites `stack.build[].cmd`; test commands live under
  `stack.test` (`.claude/loop.json:38-55`). "Present" should also require
  push/PR trigger.
- **OBJ-15 (FEAT-025)** "no src/ changes" but `<fill title>` is produced at
  `src/scripts/lib/grade-writer.mts:203`. Verify Claude 5 model ids before
  hardcoding; prefix keys `claude-opus-5`/`claude-sonnet-5`; add
  `claude-opus-4-5` so `claude-opus-4` stops catching 4.5+.
- **OBJ-16 (FEAT-023)** keeps `.*/backlog/` docs-only; backlog FEAT files feed
  validate-effort-points / decline-citations / loop-state / backlog-drift.
  Decide and record in docs/ci-gates.md.
- **OBJ-17 (FEAT-031)** OTel externalized + enabled → missing-deps warning
  (`otel-bridge.mts:32-40`) once per tool call. Warn once per session.
- **OBJ-18** This repo's `.claude/settings.json` wires 12 hook commands incl.
  its own log_event.sh (audit #40); dogfood double-fires. FEAT-032's "zero
  hook_error" smoke must run in the scratch consumer, not here.

## T2 design verified

From a fresh `git init` consumer with no node_modules, `bun --no-install
dist/crew.js brief-me` and `show-workflow-state` exit 0; the five
baseline-crashing hooks (gate-guard, pre-push-gate, pre-tool-use-agent,
otel-post-tool-use, otel-stop) all exit 0. Sizes: crew.js 0.80 MB, loop.js
1.47 MB, hooks 8 KB–364 KB; 21 bun hooks ≈ 5–8 MB. Codex #25's "under 2 MB"
false and irrelevant (cache is 44 MB today). Externalized OTel dynamic imports
are try/catch guarded (`otel-bridge.mts:78-92`). plugin-std is MIT.
Alternatives worse: `bun install` at SessionStart needs network + writable
cache; vendored node_modules subset recreates the problem per new dep.

## Estimates

FEAT-026 5→8; FEAT-029 5→8 (three slices); FEAT-031 8→13; FEAT-024 3→5;
FEAT-028 3→5; FEAT-025 3→5; FEAT-030 stays 3 after re-scope; 022/023/027/032
hold.

## Re-sequenced waves

- W0 serial/main: patch FEAT texts per OBJ-1..17; declare touches_files on
  every FEAT incl. crew/, .github/, .claude-plugin/, root files;
  `/devcrew:start` per lane so wave plan has slices.
- W1: A 022 (depth-aware filter, command-derived CLI list); B 023; C 024
  (scaffold exemption, ladder snapshot, no --required-reviewers); D 025
  (inline pricing.json, grade-writer in src/).
- W2: A 026 (hooks green only; .gitignore; inventory regen; import.meta audit;
  Bun pin); B 027 (+validator-gate skill, +test.yml sweep); C 028 (DONE: line
  kept; architect.md + reviewer.md:180 in scope; DEC superseding DEC-038).
- W2.5 serial/main: path-rewrite sed (136 + 44 strings, no logic); FEAT-022
  smoke must be green; operator commit.
- W3: A 029 as three sequential slices (refs incl. #13 and parallel.md loop
  path; validators with placeholder exemption; light path); B 030
  (templates.mts, claude-md-hard-rules.md, CLAUDE.md:227, one perf-test
  move, measured budget). No file overlap A/B.
- W4: 031 serial; SLICE-3 renderer only; AC-5 "one bun spawn per event";
  decide node-hook fold; specify updatedInput merge.
- W5: 032, closure list corrected for #13/#30/#38.

## Delete outright

1. FEAT-030's e2e-retry diagnosis and capture-perf move: neither target
   exists; the retry that exists is already diagnosed at ci.yml:204-212.
2. FEAT-024's `--required-reviewers` flag: second source of truth beside
   reviewers.ladder, keyed on letters no caller passes.
3. FEAT-031 SLICE-3's command/agent path rewrite: 180 string replacements,
   zero logic; holding it to wave 4 keeps every consumer slash command broken
   two waves after the fix exists. Move to the serial step after wave 2.

## Lead's own verification (same session)

- `.gitignore:13` `dist/` — confirmed. CLAUDE.md = 12,288 B, AGENTS.md
  8,438 B, constitution 3,692 B, snapshot 2,162 B — confirmed. Constitution
  include at CLAUDE.md:201 inside crew markers — confirmed.
- `write-review-result --scaffold`/`--update` callers without `--decision`:
  agents/architect-reviewer.md:30,136,150; agents/csharp-reviewer.md:44,56,66
  — OBJ-5 confirmed.
- **Plugin cache reality:** `~/.claude/plugins/cache/astra/` holds only
  `crew/0.67.0`, `runner/0.78.0`, `astramem/0.7.0` — no devcrew. The old crew
  0.67.0 cache HAS `node_modules` incl. zod, yaml, @astragenie/plugin-std,
  plus bun.lock, package-lock.json, .npmrc → Claude Code runs a full install
  from the plugin-root `package.json` on marketplace install (docs:
  loading.md "moves the resulting node_modules into the plugin"). devcrew's
  `crew/package.json` is a subdirectory package → its deps (zod, yaml, OTel,
  aws-sdk; plugin-std also at root) never install. Remote registry
  (astragenie/astra-marketplace) lists devcrew 1.1.0; local marketplace clone
  last updated 2026-08-03. The audit's "installed cache 1.1.0 without
  node_modules" is not reproducible on this host. Consequence: the cheapest
  consumer fix may be hoisting crew/ runtime deps into root `dependencies`
  (requires registry auth for @astragenie/* at install time); bundling
  (FEAT-026) remains the no-network, no-auth path. FEAT-026 must state which
  failure it fixes and FEAT-022's staged copy must mimic the real cache
  (root install only, no crew/node_modules).
- Host CLI is 2.1.270 < 2.1.295: `onFailure` is ignored here (docs). FEAT-031
  "fail closed = onFailure block" is version-gated; the exit-2 path must carry
  enforcement on its own.
