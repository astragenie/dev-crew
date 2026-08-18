---
slice: SLICE-04
builder: fullstack-dev
run_id: 20260818T221708Z
feat: FEAT-002
files_touched: [".gitignore", "docs/parents/runner-plugin-AGENTS.md", "docs/parents/runner-plugin-CLAUDE.md", "package.json"]
files_read: []
files_read_skipped:
  - { path: "crew/ (subtree", reason: deleted }
  - { path: "root tree from runner-plugin main (980 files added)", reason: deleted }
  - { path: "~3064 files)", reason: deleted }
diff_stat: { files: 3, additions: 78, deletions: 91 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-04: subtree-import dev-team + runner-plugin, preserve history

- Created: 2026-08-18T22:17:08.468Z
- From: fullstack-dev
- To: lead
- Objective: Import-only slice complete, 3 commits on main (66f4d793 merge, d565c210 subtree, b544ed2c wiring), no push. AC-5 precondition verified first: pre-devcrew-baseline tag exists in both parents (runner-plugin@1ae932ba, dev-team@2d4fa713) before any subtree op ran. Salvage-branch disposition (dev-team salvage/post-243-working-tree-20260728): NOT superseded, NOT merged -- recorded valuable-unmerged. 3 commits, 150 files vs main: reduces node:test imports under tests/ from 146 files to 31 (exactly the P1 bun:test-migration target), plus lead->dispatcher rename (Slice B) and source changes to scripts/crew.ts, scripts/lib/{approvals,claims}.ts, scripts/lib/gepa/*, scripts/validate-routing-table.ts, agents/{qa-expert,test-automator}.md, CI workflow files, CHANGELOG.md, DEC-029.md. Branch left untouched in parent repo; dev-team main untouched; tag stays valid. Step 1 merge: runner-plugin main@1ae932ba merged --allow-unrelated-histories -X ours (all actual path collisions were exactly the protected set: .claude/** , CLAUDE.md, LICENSE, .gitignore -- nothing else collided, verified via comm before merging). dev-crew's CLAUDE.md/LICENSE/docs/planning win outright; runner's entire .claude/artifacts/** dogfood tree (3410 files) deliberately excluded from the live tree per .claude/** policy (history still reachable via 2nd parent, blob-identical, not lost). runner's CLAUDE.md/AGENTS.md archived as reference at docs/parents/runner-plugin-{CLAUDE,AGENTS}.md. .gitignore merged additively (dev-crew block first, runner's unique entries appended with provenance comment). Step 2 subtree: git subtree add --prefix=crew dev-team main@2d4fa713, non-squashed, layout untouched. Step 3 wiring: root package.json name -> devcrew, added test:crew script (cd crew && bun test --timeout 60000 tests/, deliberately no --parallel per bun#5090 until migration slice); crew/package.json untouched. bun install green at root (16 pkgs) and crew/ (332 pkgs).
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - package.json
  - .gitignore
  - docs/parents/runner-plugin-CLAUDE.md
  - docs/parents/runner-plugin-AGENTS.md
  - crew/ (subtree
  - ~3064 files)
  - root tree from runner-plugin main (980 files added)
- Confidence: high
- Risks: Gate (b) root suite is 3310 pass / 2 fail (of 3319), not clean green vs runner-plugin's own baseline (3312/0 fail verified independently). Both failures are self-referential existence checks -- src/tests/eval-generator.test.mts:313 and src/tests/learning-cycle.test.mts:321 -- asserting fs.existsSync on .claude/artifacts/loop/decisions/DEC-068.md and DEC-070.md, which are runner-plugin's own dogfood decision records, correctly excluded from the merged tree under the explicit .claude/** dev-crew-wins policy. Root cause fully identified; not a code regression; left unfixed as content-adaptation work (out of import-only scope, no test files touched). Gate (c) crew suite is 846 pass / 117 fail / 116 errors of 1079 tests -- INITIALLY looked like a regression vs a naive baseline check, but that first comparison accidentally ran against dev-team's checked-out salvage branch instead of main. Redid the comparison in a clean --detach worktree at main@2d4fa713 (removed after use, dev-team's own checkout never touched) and got an EXACT match: 846/117/116/1079. So gate (c) is identical-to-baseline as its own allowance permits -- this is bun#5090 at its full pre-migration scope on main, which is exactly what salvage's unmerged bun:test rewrites fix (see salvage disposition above).
- Suggested Next Handoff: SLICE-05/06 (ts->mts rename sweep) and SLICE-07 (node:test->bun:test migration, 31 files) should pull the salvage branch's already-written bun:test rewrites as a reference/diff source rather than redo the conversion from scratch -- it already solves the exact 31-file target count. SLICE-08 (Wiggin scrub) should also fix the 2 self-referential decision-log tests once dev-crew's own DEC numbering stabilizes, or delete/rewrite them as no-longer-applicable dogfood self-checks.


## Diff

```diff
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-002.md b/.claude/artifacts/loop/backlog/triaged/FEAT-002.md
deleted file mode 100644
index 7069db4f..00000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-002.md
+++ /dev/null
@@ -1,83 +0,0 @@
----
-id: FEAT-002
-status: triaged
-priority: P1
-category: feature
-target_release: null
-created: 2026-08-18
-updated: 2026-08-18
-depends_on: [FEAT-001]
-slices: []
-derived_from: null
-pm_customer_impact: 0.55
-pm_effort_estimate: 0.9
-pm_strategic_alignment: 0.85
-pm_technical_risk: 0.9
-pm_dependency_depth: 0.7
-pm_composite_priority: P1
-pm_autonomous_safe: false
-pm_reviewed: 2026-08-18
-autonomous_safe: true
-triage_notes: "Largest and highest-risk phase (technical_risk 0.9, banded per rubric row 'hard-to-reverse effects... unknowns needing a spike' -- subtree history rewrite of two codebases is genuinely hard to reverse and the bun#5090 mechanism is admittedly unconfirmed); effort_points=13 forces mandatory 2-point-capped decomposition; strictly blocked by P0 per the plan's own phase ordering, so autonomousSafe=false and pre-mortem is mandatory on both the technical_risk>=0.6 and P0/P1-priority triggers."
-proposed_slices:
-  - id_suffix: -SLICE-1
-    title: "Subtree-import dev-team + runner-plugin, preserve history"
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-2
-    title: .ts->.mts rename sweep batch 1 (dev-team src)
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-3
-    title: .ts->.mts rename sweep batch 2 + import-specifier fixes
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-4
-    title: "node:test -> bun:test migration (31 files)"
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-5
-    title: Wiggin -> dev-crew branding scrub (27 files)
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-6
-    title: Single tsconfig/tsconfig.test + biome config merge
-    points: 2
-    estimated_tokens: 100000
-  - id_suffix: -SLICE-7
-    title: N>=20 green --parallel verification wave + typecheck gate
-    points: 1
-    estimated_tokens: 60000
-tags: ["stack:typescript", "area:build-tooling", "concern:test-migration"]
-needs_contract: false
-needs_ux: false
-arch_attempt: 0
-arch_status: approved
-arch_review: approved
----
-## Description
-
-P1 Runtime baseline: subtree-import dev-team and runner-plugin into dev-crew preserving history; .ts->.mts rename sweep (391 dev-team files incl import-specifier fixes); migrate dev-team test suite node:test->bun:test (31 importing files) to remove Bun compat shim (bun#5090 class); Wiggin->dev-crew branding scrub at import (27 files); single tsconfig+tsconfig.test and biome config. Exit gates: zero node:test imports (grep), zero wiggin hits outside archives, N>=20 consecutive green 'bun test --parallel' runs, typecheck clean. Full spec: unification-plan.md section 3 + P1 row.
-
-## Intake notes
-
-Created via free-text intake (`/runner:intake "<text>"`). Priority is
-unset — this FEAT has not been scored yet. Run `/runner:triage`
-(PM scoring + `backlog pm-apply`) to score it before slicing.
-## Acceptance criteria (Given-When-Then)
-
-- AC-1: Given the dev-team + runner-plugin subtrees are imported into dev-crew and the .ts->.mts + node:test->bun:test migration is complete, When `grep -rl 'from "node:test"' src/ | wc -l` runs on the merged tree, Then the count is 0.
-- AC-2: Given the Wiggin-branding scrub ran at import, When `grep -rli wiggin --exclude-dir=node_modules --exclude-dir=.git .` runs excluding any explicitly archived-parent directory, Then the count is 0.
-- AC-3: Given the merged suite claims green, When `bun test --timeout 60000 --parallel` runs 20 consecutive times, Then all 20 runs report 0 failures -- a single failing run among the 20 invalidates this exit gate and P1 does not close (this directly targets the unresolved 2/2111 failure the plan's own live experiment surfaced).
-- AC-4: Given the rename sweep and tsconfig consolidation are complete, When `bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit` runs, Then both invocations exit 0.
-- AC-5: Given P0 has not yet produced its baseline tags, When P1's subtree-import step is attempted, Then it refuses to start (no `git subtree add` executed) until `git tag --list "pre-devcrew-baseline*"` returns a match in both parent repos.
-
-## Proposed slices (PM decomposition)
-
-- SLICE-1: Subtree-import dev-team + runner-plugin, preserve history (2 pts)
-- SLICE-2: .ts->.mts rename sweep batch 1 (dev-team src) (2 pts)
-- SLICE-3: .ts->.mts rename sweep batch 2 + import-specifier fixes (2 pts)
-- SLICE-4: node:test -> bun:test migration (31 files) (2 pts)
-- SLICE-5: Wiggin -> dev-crew branding scrub (27 files) (2 pts)
-- SLICE-6: Single tsconfig/tsconfig.test + biome config merge (2 pts)
-- SLICE-7: N>=20 green --parallel verification wave + typecheck gate (1 pts)
diff --git a/.claude/state/crew/slice-progress.md b/.claude/state/crew/slice-progress.md
index 978a44c6..c6811ed1 100644
--- a/.claude/state/crew/slice-progress.md
+++ b/.claude/state/crew/slice-progress.md
@@ -1,6 +1,6 @@
 # Slice Progress
 
-Updated: 2026-08-18T21:57:28.091Z
+Updated: 2026-08-18T21:58:07.753Z
 
 Active plan: _(none detected)_
 
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index aa8af1bd..e309135e 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-18T21:53:23.162Z",
+  "updatedAt": "2026-08-18T22:17:08.477Z",
   "currentRun": {
-    "title": "FEAT001 SLICE03: 28-FEAT bucket sweep, worktree salvage, baseline tags",
+    "title": "FEAT002 SLICE04: Subtree-import dev-team + runner-plugin, preserve history",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
-    "startedAt": "2026-08-18T21:41:24.343Z",
-    "updatedAt": "2026-08-18T21:53:23.161Z",
-    "next": "batch-intake the 26 carry-id FEATs into dev-crew backlog; decide disposition of dev-team's salvage branch before the import phase",
+    "startedAt": "2026-08-18T21:58:07.687Z",
+    "updatedAt": "2026-08-18T22:17:08.476Z",
+    "next": "SLICE-05/06 (ts->mts rename sweep) and SLICE-07 (node:test->bun:test migration, 31 files) should pull the salvage branch's already-written bun:test rewrites as a reference/diff source rather than redo the conversion from scratch -- it already solves the exact 31-file target count. SLICE-08 (Wiggin scrub) should also fix the 2 self-referential decision-log tests once dev-crew's own DEC numbering stabilizes, or delete/rewrite them as no-longer-applicable dogfood self-checks.",
     "gates": {
       "review": null,
       "validation": null,
@@ -22,9 +22,9 @@
       "help": null
     },
     "artifacts": {
-      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T214124Z-run-brief-feat001-slice03-28-feat-bucket-sweep-worktree-salvage-baseli.md",
+      "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T215807Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
       "handoffs": [
-        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260818T215323Z-handoff-slice-03-28-feat-bucket-sweep-worktree-salvage-baseline-tags.md"
+        "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260818T221708Z-handoff-slice-04-subtree-import-dev-team-runner-plugin-preserve-hist.md"
       ],
       "reviewResult": null,
       "validationPlan": null,
@@ -37,6 +37,76 @@
     }
   },
   "recentRuns": [
+    {
+      "title": "FEAT002 SLICE04: Subtree-import dev-team + runner-plugin, preserve history",
+      "goal": "",
+      "mode": "autonomous",
+      "status": "active",
+      "startedAt": "2026-08-18T21:58:02.251Z",
+      "updatedAt": "2026-08-18T21:58:02.251Z",
+      "completedAt": "2026-08-18T21:58:02.251Z",
+      "next": "Begin implementation",
+      "gates": {
+        "review": null,
+        "validation": null,
+        "deployment": {
+          "dev": null,
+          "prod": null
+        },
+        "blocked": null,
+        "escalation": null,
+        "incident": null,
+        "help": null
+      },
+      "artifacts": {
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T215802Z-run-brief-feat002-slice04-subtree-import-dev-team-runner-plugin-preser.md",
+        "handoffs": [],
+        "reviewResult": null,
+        "validationPlan": null,
+        "validationResult": null,
+        "deploymentChecks": {
+          "dev": null,
+          "prod": null
+        },
+        "finalSynthesis": null
+      }
+    },
+    {
+      "title": "FEAT001 SLICE03: 28-FEAT bucket sweep, worktree salvage, baseline tags",
+      "goal": "",
+      "mode": "autonomous",
+      "status": "active",
+      "startedAt": "2026-08-18T21:41:24.343Z",
+      "updatedAt": "2026-08-18T21:53:23.161Z",
+      "completedAt": "2026-08-18T21:53:23.161Z",
+      "next": "batch-intake the 26 carry-id FEATs into dev-crew backlog; decide disposition of dev-team's salvage branch before the import phase",
+      "gates": {
+        "review": null,
+        "validation": null,
+        "deployment": {
+          "dev": null,
+          "prod": null
+        },
+        "blocked": null,
+        "escalation": null,
+        "incident": null,
+        "help": null
+      },
+      "artifacts": {
+        "runBrief": "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\runs\\20260818T214124Z-run-brief-feat001-slice03-28-feat-bucket-sweep-worktree-salvage-baseli.md",
+        "handoffs": [
+          "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260818T215323Z-handoff-slice-03-28-feat-bucket-sweep-worktree-salvage-baseline-tags.md"
+        ],
+        "reviewResult": null,
+        "validationPlan": null,
+        "validationResult": null,
+        "deploymentChecks": {
+          "dev": null,
+          "prod": null
+        },
+        "finalSynthesis": null
+      }
+    },
     {
       "title": "FEAT001 SLICE02: Disposition in-flight FEATs 230/259/284/299",
       "goal": "",

```

## Files touched

### .gitignore

```
# crew:start
# Crew framework local state. Generated; do not edit between markers.
.claude/logs/
.claude/state/crew/history.jsonl
.claude/state/crew/approvals.jsonl
.claude.backup.*
# crew:end

# Carried additively from runner-plugin's .gitignore at SLICE-04 import
# (dev-crew's own rules above win where they overlap; these are the entries
# runner-plugin had that dev-crew didn't yet).
node_modules/
dist/
.claude/state/
.claude/state/loop/paused.json
.claude/state/loop/stuck-detector.json
*.tmp
.playwright-mcp/
.claude/worktrees/

# Stray astramem --help dump (accidental redirect); never a real artifact
Implement

# Nested session-state trees written by hooks when a tool call leaves the cwd
# drifted (e.g. `.claude/artifacts/loop/backlog/.claude/state/...`). The
# `.claude/state/` rule above is ANCHORED — it contains a slash, so git reads
# it relative to this file — and therefore never matched these. Four such
# files reached a commit before this rule existed.
**/.claude/state/

```

### docs/parents/runner-plugin-AGENTS.md

```
# runner-plugin — Agent Instructions

Claude Code plugin (marketplace name `loop`, plugin id `runner`, CLI namespace
`/runner:*`) that ships the Wiggin Loop methodology as a reusable layer on top
of the `crew` plugin: PM-triaged backlog, slice-scoped specs with
Given-When-Then acceptance criteria, parallel-worktree wave dispatch,
phase-gate quality checks, and decision-grade retrospectives. Real, mature
product (185 FEATs shipped) — not template output. Full mission, decisions,
and volatile state: `CLAUDE.md` + `docs/memory.md`.

## Commands

Runtime is **Bun** — source `.mts` files run directly, no build/emit step.

```bash
bun install --frozen-lockfile
bun test src/tests/ --parallel --timeout 60000   # full suite, ~300 files (also: bun run test)
bun run typecheck                                 # tsc --noEmit, both tsconfig + tsconfig.test
bun run lint                                      # biome lint src/
bun run format / bun run format:check             # biome formatter
bun ./src/scripts/validate-manifests.mts          # plugin manifest sanity
bun ./src/scripts/validate-imports.mts            # slice-linker sub-module boundary
```

Full CI gate list (18 gates, all Bun-only, no `npm ci`/build step): `docs/ci-gates.md`.
Pre-push hook (`src/scripts/pre-push-validate.mts`) runs manifest + content-length
+ format-check locally before `git push`.

## Structure

```
src/scripts/            CLI entry (loop.mts) + lib/ (installer, phase-gate,
                         config-resolver, clause-registry, slice-linker, ...)
src/tests/               ~300 Bun test files, colocated by behavior
agents/                  Owned agent prompts (300-line cap; agents/3rdparty/ exempt)
commands/                Slash command definitions (/runner:*)
skills/                  Skill definitions (200-line SKILL.md cap)
templates/               Install-time templates rendered into ADOPTER repos —
                         PRODUCT surface, not this repo's own instructions
schemas/, hooks/, tools/ JSON schemas, Claude Code hooks, demo-seed tooling
docs/                    See docs/README.md for the full map
.claude/                 This repo dogfoods its own plugin (loop.json, backlog,
                         slices, grades) — see docs/memory.md for current state
```

## Style

- ESM only, no CommonJS. One responsibility per module; split at ~400 lines.
- Owned `agents/*.md` capped at 300 lines, `skills/**/SKILL.md` at 200
  (enforced by `validate-content-length`; `agents/3rdparty/` exempt — vendored).
- Relative imports keep the `.mjs` specifier extension even though the source
  is `.mts` (Bun/tsc resolve it) — there is no emitted `scripts/*.mjs` tree.
- Biome cognitive complexity capped at 15 — reduce via extracted helpers, not
  rule suppression.
- No `process.exit(N)` from library functions — set `process.exitCode` from
  entry points only.
- Tests colocated in `src/tests/*.mts`, behavior-descriptive names (no
  release-version prefixes).

## Credentials

- No secrets are committed. `.npmrc` carries only the `@astragenie:registry`
  pointer (no `_authToken` key) — actual registry auth token is supplied via
  environment, not this file.
- AstraRunner ingest token (`ingest_token` in `.claude-plugin/plugin.json`
  `userConfig`) is stored in the OS keychain via `bunx astrarunner connect
  <code>` (`src/scripts/cli/connect.mts`) — never written to `.claude/loop.json`,
  which carries only non-secret identifiers (url, tenantId, appId).

## Never-do

- No CommonJS, no shell-interpreted phase-gate commands — the phase-gate
  runner uses `execFile` with argv arrays only (no injection surface).
- No local Claude Code marketplaces — always register from GitHub
  (`"source": "github"`), never a local path. See `.claude/crew/plugin-marketplace.md`.
- No stale pre-transfer owner (`sergeymilashico`) in authored surfaces
  (README, ADOPTION, `src/`, `docs/`, `commands/`, `skills/`, `agents/` excl.
  `3rdparty/`, `.claude-plugin/`) — the owner is `astragenie`; GitHub's
  redirect makes old refs silently rot undetected
  (`bun ./src/scripts/validate-org-refs.mts` is the CI gate).
- No phantom `crew:<name>` / `runner:<name>` dispatch tokens in CLAUDE.md —
  every reference must resolve to a real agent/command/skill
  (`bun ./src/scripts/validate-agent-refs.mts`).
- No hand-edits inside the `<!-- runner:start -->...<!-- runner:end -->`
  marker block in `CLAUDE.md` — it's regenerated by `/runner:install` from
  `templates/claude-md-hard-rules.md`; edit `.claude/loop.json` instead.
- No editing `templates/`, `commands/`, `skills/`, `agents/` content casually
  when the goal is fixing *this repo's own* docs — those ship to adopter
  repos as product surface.

```

### docs/parents/runner-plugin-CLAUDE.md

```
# Repo Instructions — runner-plugin

@AGENTS.md

> The include above is the tool-agnostic scaffold guide (commands, structure,
> style, never-do — also read by non-Claude agents). Everything below is
> specific to this repo: what it is, decisions not to relitigate, and where
> volatile state lives. This file is meant to change rarely — the clause
> sections below are trimmed to short pointers by design; the full detail
> lives in `docs/memory.md` and `docs/ci-gates.md` so this file doesn't
> re-bloat every time an implementation detail shifts.

## Session protocol (mandatory, not advisory)

Before any non-trivial work (feature, fix, review, plan):

1. **Read `docs/memory.md` in full** (~150 lines, cheap) — it is the ONLY
   source for load-bearing CLAUDE.md machine contracts, known path drift,
   command-history detail, and open upstream-request state. Skipping it
   means working on stale or structurally-wrong assumptions about this repo.
2. **Re-verify before relying.** `docs/memory.md`'s "Open upstream requests"
   and dogfood-metrics entries are a cache, not the truth — check the live
   state (`gh issue view`, the target repo) before depending on one.
3. **Write-back is part of the task.** Any fact you verify or change: update
   `docs/memory.md` in the same session — supersede the entry in place.

## Mission

**runner-plugin** (marketplace slug `loop`, plugin id `runner`, CLI namespace
`/runner:*`) ships the Wiggin Loop methodology as a reusable Claude Code
plugin layer on top of the `crew` (`dev-team`) plugin: PM-triaged backlog,
slice-scoped Given-When-Then specs, parallel-worktree wave dispatch,
phase-gate quality checks, and decision-grade retrospectives. This repo
dogfoods itself — its own `.claude/` runs the same loop it ships to adopters.

## Authority documents

- **`README.md`** — what this plugin is, install instructions, positioning.
- **`ADOPTION.md`** — preconditions, backup advice, manual install walkthrough.
- **`docs/memory.md`** — durable facts: machine contracts, path drift, command
  history, dogfood metrics.
- **`docs/README.md`** — map of the whole `docs/` tree.
- **`docs/code-conventions.md`** — ESM/Node conventions (authoritative).
- **`docs/sop/specialist-pause-handling.md`** — SOP when a builder/reviewer/
  validator subagent pauses without writing an artifact (recurring pattern).
- **`docs/upstream-requests/`** — open requests against `dev-team`/`crew` or
  `astramem-plugin`; check status before reopening a dependent FEAT.
- **`docs/halt-badges.md`** — registry of every halt-badge field the loop
  emits in `snapshot.*` (cross-plugin contract, SPEC-003) — update when
  adding a new halt-badge.
- **`.claude/artifacts/loop/backlog/product-backlog.md`** — current roadmap.
- **`CHANGELOG.md`** — recent releases.

## Memory binding (astramem)

This repo's memory project id is **`runner-plugin`**, served by the
**astramem** MCP server (`mcp__plugin_crew_astramem__*`). Pass `project:
"runner-plugin"` as a top-level field to `recall_memory`/`search_memory`/
`remember` — nesting it under `metadata` is silently dropped. `.claude/loop.json`'s
runtime `productName` must stay equal to `runner-plugin` so slice-start
recall and slice-close capture share one namespace. Follow the
`astramem:using-memory` skill loop (recall → work → `submit_feedback`/
`mark_memory_used` → optional `remember`); write short, one-fact memories;
use `scope: "team"` for anything meant to help other sessions.

## Read first

<!-- clause: read-first -->

See "Authority documents" above for the read-first list — kept there so it
isn't duplicated. Start with `README.md` → `ADOPTION.md` →
`docs/code-conventions.md` → `docs/memory.md`.

## Engineering standards

<!-- clause: engineering-standards -->

For language-agnostic patterns, consult
[`Astragenie.Standards`](https://github.com/astragenie/standards) if
installed at a sibling path (ESM conventions mirrored at
`docs/javascript/coding-conventions.md` there). `docs/code-conventions.md`
here is self-contained and authoritative for this repo. Ecosystem canon
links below.

## Hard dependency

<!-- clause: hard-dependency -->

Requires the [`crew`](https://github.com/astragenie/dev-team) plugin at the
version pinned in `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`.
`/runner:install` refuses to run against an older crew.

## Local commands

<!-- clause: local-commands -->

See `AGENTS.md` § Commands for the full list (test, typecheck, lint, format,
validators). Runtime is Bun; source `.mts` files run directly, no build step.

## CI gates

<!-- clause: ci-gates -->

Full per-gate rationale: `docs/ci-gates.md` (numbering must stay in sync —
`generate-metrics-band.mts` counts this list programmatically for the
README metrics band). GitHub Actions, all under Bun, no `npm ci`/build:

1. `bun install --frozen-lockfile`
2. `bun ./src/scripts/validate-manifests.mts` — manifest sanity.
3. `bun ./src/scripts/validate-content-length.mts` — 300/200-line caps.
4. `bun ./src/scripts/validate-decline-citations.mts --repo .` — P4 FEATs cite a real clause id.
5. `bun ./src/scripts/validate-agent-refs.mts` — no phantom `crew:`/`runner:` dispatch tokens in CLAUDE.md.
6. `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json`
7. `bunx biome lint src/`
8. `bunx biome format src/` (check mode)
9. `bun ./src/scripts/validate-imports.mts` — slice-linker import boundary.
10. `bun ./src/scripts/validate-backlog-writes.mts` — BacklogStore sole-writer guard.
11. `bun ./src/scripts/validate-slice-touches-files.mts` — slice `touches_files` sanity.
12. `bun ./src/scripts/validate-slice-state-consistency.mts` — slice state-directory/frontmatter-status agreement (no id filed in two state dirs at once, no status/directory disagreement).
13. `bun test src/tests/ --parallel --timeout 60000`
14. `bun ./src/scripts/validate-snapshot-freshness.mts` — loop-snapshot drift gate.
15. `bun ./src/scripts/validate-org-refs.mts` — stale pre-transfer owner sweep.
16. `bun ./src/scripts/validate-marketplace-sync.mts` — registry version drift.
17. `bun ./src/scripts/validate-dispatch-markers.mts` — `<task-scoped>` marker balance.
18. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config drift.
19. `bun ./src/scripts/generate-metrics-band.mts --check` — README metrics-band freshness.

Pre-push hook runs manifest + content-length + format-check locally.

## Repo conventions

<!-- clause: repo-conventions -->

See `AGENTS.md` § Style for the full list (ESM-only, Bun, module size,
content-length caps, lint/complexity rules, `.mjs` import specifiers on
`.mts` sources, `process.exitCode` not `process.exit`).

## Marathon session checkpoint

<!-- clause: marathon-checkpoint -->

Long autonomous backlog walks accumulate drift without periodic reflection.
`loop.marathonCheckpointEvery` in `.claude/loop.json` (default 4) triggers an
advisory suggestion at N closes since the last retrospective, and a hard
stop at 2N. Full parameters + snapshot shape: `docs/memory.md` § "Marathon
checkpoint".

## Backlog discipline

<!-- clause: backlog-discipline -->

Active backlog: `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Each FEAT declares `priority`, `status`, `autonomous_safe`. `/runner:intake`
is the recommended entry point (PM scoring + architect classification in one
call); `--deep`/`--spec` draft Given-When-Then ACs inline. PM P4 declines
must cite a clause id (`declined_per: [<clause-id>]`) from this file. Full
command history, the ARCHITECT GATE `arch_*` frontmatter contract, and the
preset-template change (DEC-069): `docs/memory.md` § "Backlog discipline".

## Orchestrator mode

<!-- clause: orchestrator-mode -->

`config.loop.orchestratorMode` in `.claude/loop.json` selects `"slice-build"`
(default — per-tag `crew:<variant>-dev` subagent dispatch) or
`"orchestrate-slice"` (`/crew:orchestrate-slice`, sequential). Legacy modes
`"lead"`/`"direct-builder"` were removed in v0.43/FEAT-191 — history and
removal rationale: `docs/memory.md` § "Orchestrator mode". Wave mode
(`loop.marathonRunner: "wave"`) is opt-in per-wave parallel dispatch — see
`commands/wave.md`.

## Reviewer ladder presets

<!-- clause: reviewer-ladder-presets -->

`.claude/loop.json`'s `reviewers.ladder` is config-driven (`["A","B"]`,
`["A"]`, or `["B"]`; empty/invalid falls back to two-reviewer default).
**This repo's current setting is `["A"]`** with no post-builder validator —
the close-time validation gate is satisfied by the reviewer's approval badge
(`loop.validation.satisfiedByReview: true`). Detail: `docs/memory.md` §
"Reviewer ladder".

## Owned agents

<!-- clause: owned-agents -->

Dispatch via `Agent(subagent_type: ...)`, namespaced `runner:`:

- `runner:pm` — backlog scoring (5 dimensions); `needs-review` escape valve.
- `runner:architect` — read-only Node ESM design + ADR drafting.
- `runner:researcher` — read-only citation-backed code archaeology.
- `runner:market-researcher` — outward-facing competitor/market research; writes only under `docs/research/**`.
- `runner:document-writer` — Markdown-only docs; will not edit source.
- `runner:swarm` (formerly `runner:hierarchical-dispatcher`) — N parallel child subagents in isolated worktrees, depth-capped via `dispatchLimits.maxDepth`.

Retirement history (`runner:spec-writer`, the hierarchical-dispatcher
rename): `docs/memory.md` § "Owned agents".

## Auto-dispatch primitives

<!-- clause: auto-dispatch-primitives -->

`src/scripts/lib/auto-dispatch.mts` is opt-in audit infrastructure — CLI
subcommands do NOT auto-dispatch role agents; slash flows are the contract
(DEC-011). Detail + which slash flows dispatch which agent:
`docs/memory.md` § "Auto-dispatch primitives".

## Safety

<!-- clause: safety -->

Never commit secrets. Never disable hooks (`--no-verify`) without explicit
user request. Never force-push to `main`.

## Decisions not to relitigate

- **CLAUDE.md's clause-id HTML comments (`clause: ...` markers) and the
  `## CI gates` numbered list are machine-read** (`clause-registry.mts`,
  `generate-metrics-band.mts`, `validate-agent-refs.mts` all parse this file
  specifically) — see `docs/memory.md` § "Load-bearing CLAUDE.md contracts"
  before restructuring headings, renaming a clause, or changing the
  CI-gate list's count/order.
- **Never hand-edit the `<!-- runner:start -->`/`<!-- runner:end -->` block
  below** — it's regenerated by `/runner:install` from
  `templates/claude-md-hard-rules.md`; edit `.claude/loop.json` instead.
- **Never register a local plugin marketplace** — GitHub source only
  (`.claude/crew/plugin-marketplace.md`).
- Everything in `@AGENTS.md`'s Never-do still applies.

## Ecosystem canon (kb)

`../kb/...` links are filesystem-relative — machine-local, work only on this
box. Prefer stable GitHub URLs for anything an agent must fetch in CI/cloud.

- This repo IS the reference implementation of two kb patterns:
  [wiggin-loop](../kb/05-patterns/wiggin-loop.md),
  [crew-harness](../kb/05-patterns/crew-harness.md) (crew-harness's "loop"
  role dependency). kb's `02-systems/loop.md` page is stale as of this audit
  (cites v0.1.11 / `/autonomous-loop:*` commands / "CLAUDE.md absent" —
  all superseded) — don't trust it without a refresh; flagged back to the
  vault owner rather than linked here as authoritative.
- Org/rename history: [ADR-013, GitHub org consolidation](../kb/04-decisions/cross-cutting.md#github-org-consolidation)
  — directly documents this repo's own `loop`→`runner-plugin` /
  `sergeymilashico`→`astragenie` transition.
- Agent workflow standards: [10-ai-rules/20-agent-workflow-standards.md](../kb/10-ai-rules/20-agent-workflow-standards.md)
  — directly relevant, this repo builds agent-workflow tooling.
- General engineering standards: [08-engineering/](../kb/08-engineering/)
  (definition-of-done, code quality, minimal-change, testing).
- Security: [security/12-security-standards.md](../kb/security/12-security-standards.md)
  — relevant to ingest-token / marketplace-auth handling.

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

```

### package.json

```
{
  "name": "devcrew",
  "version": "0.78.0",
  "private": true,
  "type": "module",
  "bin": {
    "astrarunner": "src/scripts/cli/connect.mts"
  },
  "scripts": {
    "typecheck": "tsc --project tsconfig.json --noEmit && tsc --project tsconfig.test.json --noEmit",
    "test": "bun test src/tests/ --parallel --timeout 60000",
    "test:crew": "cd crew && bun test --timeout 60000 tests/",
    "bench": "bun src/tests/perf/bench-runner.mts",
    "validate:event-schemas": "bun ./src/scripts/validate-event-schemas.mts",
    "validate:manifests": "bun ./src/scripts/validate-manifests.mts",
    "validate:lengths": "bun ./src/scripts/validate-content-length.mts",
    "bump-version": "bun ./src/scripts/bump-version.mts",
    "lint": "biome lint src/",
    "format": "biome format --write src/",
    "format:check": "biome format src/",
    "validate:imports": "bun ./src/scripts/validate-imports.mts"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.5.0",
    "@types/node": "^25.9.1",
    "bun-types": "^1.3.14",
    "typescript": "^7.0.0"
  },
  "dependencies": {
    "@astragenie/astramem-client": "^0.3.0",
    "@astragenie/plugin-std": "^0.5.0",
    "ajv": "^8.17",
    "ajv-formats": "^3.0"
  }
}

```

## Files read

