# Bun Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the loop plugin to Bun as its sole runtime — direct `.mts` execution, no transpile step — cutting test wall time, the 11.5s build prefix, and per-command spawn cost (~260ms → ~30–50ms).

**Architecture:** Three sequential, independently shippable phases per the approved spec (`docs/superpowers/specs/2026-06-10-bun-migration-performance-design.md`): (A) dev/CI lane runs tests under Bun with no user-facing change; (B) runtime cutover — commands/hooks invoke `bun src/scripts/loop.mts`, emitted `scripts/` tree and drift gate deleted, `MIN_BUN_VERSION` guard rails added; (C) ceremony batching — compound CLI flags collapse sequential spawns. Phase A green on Windows + Ubuntu is the go/no-go gate for Phase B.

**Tech Stack:** Bun ≥ 1.2 (runtime + test runner), TypeScript (`tsc --noEmit` type gate only), ESLint/Prettier unchanged. Zero runtime npm dependencies (stdlib-only) — this is what makes the migration tractable.

**Repo facts the executor must know:**
- Source: `src/scripts/**/*.mts`; today tsc emits `scripts/**/*.mjs` (CI checks `git diff --exit-code scripts/`). Hand-authored runtime-only `.mjs` (KEEP, never delete): `scripts/setup-github-sync.mjs`, `scripts/setup-task-store.mjs`, `scripts/competitor-audit/aggregate.mjs`, `eslint.config.mjs`, `hooks/*.mjs`, and the `scripts/lib/github-sync/` tree + `scripts/lib/github-sync.mjs` + `scripts/lib/task-store/` tree (no `.mts` sources — check for `src/scripts/lib/<name>.d.mts` shims to identify them).
- Tests: `src/tests/*.test.mts` (node:test + node:assert), built to `tests/*.test.mjs` today.
- Imports inside `.mts`/`.mjs` files use `.mjs` specifiers (tsc style). Under Bun, `./x.mjs` must resolve to `./x.mts` when only the source exists — **verify in Task 2 before anything else (V1)**.
- Baselines (2026-06-10, Node v24.15.0, Win11): `loop status` 259ms; tsc build 5.4s + build:tests 6.1s; suite ~157–227s.
- Bun is NOT installed on the dev machine yet.

---

## Phase A — dev/CI lane (no user-facing change)

### Task 1: Install Bun, record baselines

**Files:** none (environment + notes only)

- [ ] **Step 1: Install Bun (Windows)**

Run: `powershell -c "irm bun.sh/install.ps1 | iex"`
Then open a fresh shell (PATH update) and run: `bun --version`
Expected: a version ≥ 1.2.x prints. Record it — it becomes `MIN_BUN_VERSION` in Task 8.

- [ ] **Step 2: Record Node baselines for the evidence trail**

```powershell
$t = Measure-Command { node scripts/loop.mjs status --repo . *> $null }; "status: $([math]::Round($t.TotalMilliseconds))ms"
node tests/perf/bench-runner.mjs 2>&1 | Select-Object -Last 20
```
Save output to `docs/superpowers/plans/bun-migration-baseline.txt` (committed in Step 3).

- [ ] **Step 3: Commit baseline**

```bash
git add docs/superpowers/plans/bun-migration-baseline.txt
git commit -m "chore(bench): record pre-Bun baselines for migration evidence"
```

### Task 2: Compat probe — V1 (.mjs→.mts resolution) and V2 (node:test compat)

**Files:** none yet (probe; fixes land in Task 3)

- [ ] **Step 1: Probe V1 in isolation**

```powershell
bun -e "import('./src/scripts/lib/slice-title.mts').then(m => console.log('direct .mts OK:', typeof m.resolveSliceTitle))"
bun -e "import('./src/scripts/lib/frontmatter.mjs').then(m => console.log('.mjs->.mts mapping OK'), e => console.log('.mjs->.mts mapping FAILED:', e.message))"
```
(`src/scripts/lib/frontmatter.mjs` does not exist on disk; only `frontmatter.mts`. If Bun maps the specifier, V1 holds.)
Expected: both print OK. **If the second fails:** V1 fallback engages — Task 3 Step 2 rewrites specifiers instead of relying on mapping.

- [ ] **Step 2: Probe V2 — run the whole suite from sources**

Run: `bun test src/tests/ 2>&1 | tee bun-compat-probe.txt`
Expected outcomes, triaged from the tail summary:
- All pass → Task 3 is a no-op, skip to Task 4.
- Some files fail with `node:test`-compat errors (unsupported `mock`, `t.plan`, subtest semantics) → list the failing FILES (not tests) for Task 3 Step 3.
- Module-resolution errors referencing `.mjs` paths → V1 fallback confirmed needed (Task 3 Step 2).

- [ ] **Step 3: Record the verdict**

Append the triage (V1 holds yes/no; list of compat-failing files; suite wall time observed) to `docs/superpowers/plans/bun-migration-baseline.txt`. Do not commit yet — Task 3 commits the fixes with this note.

### Task 3: Fix compat fallout (only what Task 2 surfaced)

**Files:**
- Modify (only if V1 failed): every `src/scripts/**/*.mts` and `src/tests/*.test.mts` with `.mjs` relative-import specifiers
- Modify (only compat-failing files): individual `src/tests/*.test.mts`

- [ ] **Step 1: Skip check**

If Task 2 ended all-green, run `git status --short` (expect clean), mark this task complete, continue to Task 4.

- [ ] **Step 2 (V1 fallback only): specifier rewrite `.mjs` → `.mts` for relative imports**

```powershell
Get-ChildItem src -Recurse -Include *.mts | ForEach-Object {
  $c = Get-Content $_ -Raw
  $n = $c -replace '(from\s+"\.\.?/[^"]+)\.mjs"', '$1.mts"'
  if ($n -ne $c) { Set-Content $_ $n -NoNewline }
}
```
CAUTION: this targets RELATIVE specifiers only (`./` `../`) — `node:` builtins and the runtime-only `.mjs` modules that really exist on disk (`../github-sync.mjs`, `../auto-merge.mjs` style imports pointing at real files) must keep working. After the sweep run `bun test src/tests/` and `npm run typecheck`; tsc accepts `.mts` specifiers with `allowImportingTsExtensions` — if typecheck rejects, add `"allowImportingTsExtensions": true` to `tsconfig.json` and `tsconfig.test.json` compilerOptions (legal because both will be `noEmit` by end of Phase B; until then emit still uses the unchanged `.mjs`-specifier files — in that case STOP and prefer keeping `.mjs` specifiers + a `bunfig.toml` resolution; consult the team before churning 100+ files).

- [ ] **Step 3 (compat failures only): codemod failing test files to bun:test**

Per failing file, mechanical transform — imports only, assertions stay node:assert:

```ts
// before
import test from "node:test";
// after
import { test } from "bun:test";
```
(`describe`/`beforeEach`/`afterEach` map 1:1 by name; `t.mock.*` has no bun:test equivalent — if a file uses node:test mocks, rewrite that test with manual stubs as plain functions.)

- [ ] **Step 4: Verify suite green under Bun**

Run: `bun test src/tests/ 2>&1 | Select-Object -Last 6`
Expected: `0 fail`, record wall time.

- [ ] **Step 5: Verify nothing broke under Node (emit still authoritative until Phase B)**

Run: `npm test`
Expected: 1163+ pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add -A src docs/superpowers/plans/bun-migration-baseline.txt tsconfig.json tsconfig.test.json
git commit -m "test: suite runs green under bun (compat fixes from probe)"
```

### Task 4: Switch package.json test script to Bun

**Files:**
- Modify: `package.json` (scripts block, currently line ~10)

- [ ] **Step 1: Edit scripts**

```json
"test": "bun test src/tests/",
"test:node": "npm run build && npm run build:tests && node --test tests/*.test.mjs",
```
(`test:node` preserves the legacy path until Phase B deletes it; `build`/`build:tests`/`typecheck`/`lint`/`format*` unchanged.)

- [ ] **Step 2: Verify both paths**

Run: `npm test` → Bun suite, 0 fail. Run: `npm run test:node` → Node suite, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(scripts): npm test runs under bun; node path kept as test:node"
```

### Task 5: CI — setup-bun + windows matrix (Phase-A form)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace the workflow with the Phase-A form**

```yaml
name: test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '24'
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: npm ci
      - run: npm run build
      - run: git diff --exit-code scripts/
      - run: node ./scripts/validate-manifests.mjs
      - run: node ./scripts/validate-content-length.mjs
      - run: node ./scripts/validate-decline-citations.mjs --repo .
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: bun test src/tests/
```
(Note: drops the old `npm run build:tests` + `node --test dist/tests/...` steps — Bun runs sources. `setup-node` stays because emit + drift gate still exist.)

- [ ] **Step 2: Commit, push, watch**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: bun test on ubuntu+windows matrix (phase A)"
git push
gh run watch --exit-status
```
Expected: both matrix legs green. **This is the Phase-B go/no-go gate.** Windows failures here are V3 — fix before proceeding (likeliest: `execFile` quoting in tests that spawn git).

### Task 6: Pre-push validation under Bun

**Files:**
- Modify: whatever invokes `scripts/pre-push-validate.mjs` (discover in Step 1)

- [ ] **Step 1: Find the invocation**

Run: `Get-ChildItem .husky,.git\hooks,package.json,scripts -Recurse -ErrorAction SilentlyContinue | Select-String -Pattern "pre-push-validate" -List`

- [ ] **Step 2: Swap `node` → `bun` in that invocation line** (the validate script itself is hand-authored `.mjs`; Bun runs it as-is).

- [ ] **Step 3: Verify by pushing a trivial commit** (the Task 5 push already exercises it if Steps 1–2 were done first; otherwise amend order locally).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(hooks): pre-push validation runs under bun"
```

---

## Phase B — runtime cutover (breaking change; requires Phase A gate green)

### Task 7: MIN_BUN_VERSION + checkBunVersion in plugin-identity (TDD)

**Files:**
- Modify: `src/scripts/lib/plugin-identity.mts` (MIN_CREW_VERSION block is at ~line 90; mirror it)
- Test: `src/tests/plugin-identity.test.mts` (extend; create if absent — check first)

- [ ] **Step 1: Write failing tests**

```ts
import { checkBunVersion, MIN_BUN_VERSION } from "../scripts/lib/plugin-identity.mjs";

test("checkBunVersion ok when override meets minimum", async () => {
  const r = await checkBunVersion(MIN_BUN_VERSION);
  assert.equal(r.ok, true);
  assert.equal(r.required, MIN_BUN_VERSION);
});

test("checkBunVersion fails on older version", async () => {
  const r = await checkBunVersion("0.0.1");
  assert.equal(r.ok, false);
});

test("checkBunVersion fails when bun missing (null override)", async () => {
  const r = await checkBunVersion(null);
  assert.equal(r.ok, false);
  assert.equal(r.version, null);
});
```

- [ ] **Step 2: Run to verify failure** — `bun test src/tests/plugin-identity.test.mts` → FAIL (no export).

- [ ] **Step 3: Implement in plugin-identity.mts** (below the MIN_CREW_VERSION block; reuse the file's existing `compareSemver`)

```ts
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFileCb);

// Minimum Bun version the plugin runs under. Set to the version verified
// green in the Phase-A compat probe; bump only with a CHANGELOG note.
export const MIN_BUN_VERSION = "1.2.0"; // ← replace with Task 1 Step 1 verified version

export async function getBunVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("bun", ["--version"], { windowsHide: true });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function checkBunVersion(versionOverride?: string | null) {
  const version = versionOverride !== undefined ? versionOverride : await getBunVersion();
  return {
    ok: version !== null && compareSemver(version, MIN_BUN_VERSION) >= 0,
    version,
    required: MIN_BUN_VERSION
  };
}
```
(If plugin-identity.mts already imports child_process helpers, reuse them instead of re-importing.)

- [ ] **Step 4: Run tests** — `bun test src/tests/plugin-identity.test.mts` → PASS. Also `npm run typecheck` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/plugin-identity.mts src/tests/plugin-identity.test.mts
git commit -m "feat(identity): MIN_BUN_VERSION + checkBunVersion guard"
```

### Task 8: Wire the guard into installer, status, and version-check hook

**Files:**
- Modify: `src/scripts/lib/loop-installer.mts` (it already gates on MIN_CREW_VERSION — add the bun gate beside it)
- Modify: `src/scripts/lib/` status module (find with `Select-String -Path src\scripts\lib\*.mts -Pattern "export async function runStatus|loop install state" -List`)
- Modify: `hooks/version-check.mjs` (hand-authored — edit directly)
- Test: extend the existing installer/status test files (locate: `Get-ChildItem src/tests -Filter "*install*"`)

- [ ] **Step 1: Write failing test** — installer refuses when bun check fails:

```ts
test("install refuses when bun below minimum", async () => {
  await assert.rejects(
    () => installLoop(repo, { bunVersionOverride: "0.0.1" }),
    /bun >= /
  );
});
```
(Match the override-injection style the installer already uses for crew version — read its signature first and mirror it; if it takes an options bag, add `bunVersionOverride` the same way `_crewVersionOverride` works elsewhere.)

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — in loop-installer where MIN_CREW_VERSION is checked, add:

```ts
const bun = await checkBunVersion(opts.bunVersionOverride);
if (!bun.ok) {
  throw new Error(
    `loop requires bun >= ${bun.required} (found: ${bun.version ?? "not installed"}). ` +
      `Install: https://bun.sh — then re-run /loop:install.`
  );
}
```
In the status module, append a `bun: { version, ok, required }` field to the report object. In `hooks/version-check.mjs`, add the same check with a console.warn (hooks must not throw).

- [ ] **Step 4: Run** — `bun test src/tests/` → 0 fail; `npm run typecheck && npm run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A src hooks/version-check.mjs
git commit -m "feat(install): refuse without bun >= MIN_BUN_VERSION; surface in status + hook"
```

### Task 9: Call-site swap — every node invocation becomes bun

**Files:**
- Modify: all `commands/*.md`, `skills/**/*.md`, `agents/*.md`, `.claude-plugin/plugin.json` hooks config (wherever `loop.mjs` appears), `README.md`, `CLAUDE.md`

- [ ] **Step 1: Inventory**

Run: `Get-ChildItem commands,skills,agents,hooks,.claude-plugin,README.md,CLAUDE.md -Recurse -ErrorAction SilentlyContinue | Select-String -Pattern "scripts/loop\.mjs" | Group-Object Filename | Sort-Object Count -Descending | Format-Table Count,Name`
Expected: ~47+ hits across ~25 files.

- [ ] **Step 2: Mechanical swap**

```powershell
$files = Get-ChildItem commands,skills,agents,.claude-plugin,README.md,CLAUDE.md -Recurse -Include *.md,*.json -ErrorAction SilentlyContinue
foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw
  $n = $c -replace 'node\s+("?)([^"\s]*?)/scripts/loop\.mjs("?)', 'bun $1$2/src/scripts/loop.mts$3'
  if ($n -ne $c) { Set-Content $f.FullName $n -NoNewline }
}
```

- [ ] **Step 3: Zero-remaining check**

Run the Step 1 inventory again. Expected: 0 hits for `node .*scripts/loop\.mjs`. Then spot-run one swapped command's CLI line by hand:
`bun src/scripts/loop.mts status --repo .` → JSON report, exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat!: commands and hooks invoke bun src/scripts/loop.mts directly"
```

### Task 10: Runtime-only .mjs audit (V1 in runtime context)

**Files:**
- Possibly modify: `scripts/lib/github-sync/*.mjs`, `scripts/lib/github-sync.mjs`, `scripts/lib/task-store/**/*.mjs`, `scripts/setup-*.mjs`, `scripts/competitor-audit/aggregate.mjs`

- [ ] **Step 1: Find imports of soon-to-be-deleted emitted files**

```powershell
Select-String -Path scripts\lib\github-sync\*.mjs,scripts\lib\github-sync.mjs,scripts\lib\task-store\**\*.mjs,scripts\setup-*.mjs,scripts\competitor-audit\*.mjs -Pattern 'from "(\.\./)+(?!github-sync|task-store)[^"]+\.mjs"'
```
Every hit pointing at a file that exists only as emitted output (e.g. `../slice-title.mjs`, `../config-resolver.mjs`) breaks when the emitted tree dies.

- [ ] **Step 2: Fix the specifiers (lower-churn option — take this one)** — the runtime-only modules STAY in `scripts/lib/` (Task 11's deletion explicitly spares them; CLAUDE.md's exception list and the `.d.mts` shims keep working). Rewrite only the imports that pointed at emitted siblings, targeting the `src/` sources directly with a path that survives the deletion, e.g. in `scripts/lib/github-sync/subissue-sync.mjs`:

```js
// before — resolves to the emitted file that Task 11 deletes
import { displaySliceTitle } from "../slice-title.mjs";
// after — resolves to the source; Bun executes .mts directly
import { displaySliceTitle } from "../../../src/scripts/lib/slice-title.mts";
```
Apply the same `../../../src/scripts/lib/<name>.mts` pattern to every hit from Step 1. (Moving the modules under `src/` instead is NOT worth it — it churns shim paths and the CLAUDE.md exception list for zero behavior gain.)

- [ ] **Step 3: Smoke test each entry**

```powershell
bun scripts/setup-github-sync.mjs --help; bun -e "import('./scripts/lib/github-sync.mjs').then(()=>console.log('OK'))"
```
Expected: no resolution errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(runtime-mjs): imports resolve without the emitted tree"
```

### Task 11: Delete the emitted tree, build scripts, drift gate

**Files:**
- Delete: every `scripts/**/*.mjs` that HAS a `src/scripts/**/*.mts` counterpart (the hand-authored exceptions from the repo-facts list stay), plus built `tests/*.test.mjs`
- Modify: `package.json`, `.github/workflows/ci.yml`, `tsconfig.json`, `tsconfig.test.json`, `scripts/pre-push-validate.mjs` reference if it checks emit

- [ ] **Step 1: Scripted deletion (counterpart-driven, never wholesale)**

```powershell
Get-ChildItem scripts -Recurse -Filter *.mjs | ForEach-Object {
  $rel = [IO.Path]::ChangeExtension($_.FullName.Replace("\scripts\", "\src\scripts\"), ".mts")
  if (Test-Path $rel) { git rm $_.FullName }
}
git rm -r tests/  # built test output; sources live in src/tests
```

- [ ] **Step 2: package.json final scripts**

```json
"scripts": {
  "typecheck": "tsc --project tsconfig.json --noEmit && tsc --project tsconfig.test.json --noEmit",
  "test": "bun test src/tests/",
  "bench": "bun tests/perf/bench-runner.mjs",
  "validate:manifests": "bun ./scripts/validate-manifests.mjs",
  "validate:lengths": "bun ./scripts/validate-content-length.mjs",
  "bump-version": "bun ./scripts/bump-version.mjs",
  "lint": "eslint src eslint.config.mjs",
  "format": "prettier --write \"src/**/*.mts\"",
  "format:check": "prettier --check \"src/**/*.mts\""
}
```
(`build`, `build:tests`, `test:node` gone. CAUTION: `validate-manifests.mjs`, `validate-content-length.mjs`, `bump-version.mjs` — check each for a `src/.../*.mts` counterpart; if they were emitted, their counterpart deletion in Step 1 just broke these paths → point the scripts at `bun src/scripts/<name>.mts` instead. `tests/perf/*` are hand-authored — keep, or relocate under `src/tests/perf/` for tidiness; if relocated update the bench script.)

- [ ] **Step 3: tsconfig** — set `"noEmit": true` in both configs (typecheck-only).

- [ ] **Step 4: CI final form**

```yaml
name: test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun ./scripts/validate-manifests.mjs
      - run: bun ./scripts/validate-content-length.mjs
      - run: bun ./scripts/validate-decline-citations.mjs --repo .
      - run: bunx tsc --project tsconfig.json --noEmit
      - run: bunx tsc --project tsconfig.test.json --noEmit
      - run: bunx eslint src eslint.config.mjs
      - run: bunx prettier --check "src/**/*.mts"
      - run: bun test src/tests/
```
(`bun install` needs `bun.lock` — run `bun install` once locally and commit the lockfile; package-lock.json may be deleted in the same commit. Validate-script paths follow the Step 2 caution.)

- [ ] **Step 5: Full local verification**

Run: `npm run typecheck` (still works via node-installed tsc) or `bunx tsc ...`; `bun test src/tests/` → 0 fail; `bun src/scripts/loop.mts status --repo .` → clean JSON.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat!: delete emitted scripts tree + build chain; bun-only toolchain"
```

### Task 12: Docs + release

**Files:**
- Modify: `README.md` (install section), `ADOPTION.md` (preconditions), `docs/code-conventions.md` (emit rules → direct-run rules), `CLAUDE.md` (Repo conventions + CI gates sections), `CHANGELOG.md`, `plugin.json`/`package.json`/`marketplace.json` versions

- [ ] **Step 1: README/ADOPTION** — add under prerequisites:

> **Requires [Bun](https://bun.sh) ≥ <MIN_BUN_VERSION>.** As of v0.38.0 the plugin executes TypeScript sources directly under Bun; Node alone is no longer sufficient. `/loop:install` and the version-check hook will tell you if Bun is missing.

- [ ] **Step 2: code-conventions + CLAUDE.md** — replace the "tsc emits scripts/*.mjs, CI checks drift" convention text with: sources run directly (`bun src/scripts/loop.mts`), `tsc --noEmit` is the type gate, hand-authored `.mjs` list unchanged, new-module rule = create `.mts` under `src/scripts/`, no emit step exists.

- [ ] **Step 3: CHANGELOG** entry:

```markdown
## v0.38.0 — Bun migration (BREAKING)

- **BREAKING:** the plugin now requires Bun >= <MIN_BUN_VERSION> on the host
  machine. All commands and hooks execute `bun src/scripts/loop.mts` directly.
- Removed: tsc emit step, `scripts/` emitted tree, src↔scripts drift CI gate.
- npm test wall time: <before> → <after> (record from Task 13 bench).
- CLI spawn cost: ~259ms → <measured>ms per invocation.
```

- [ ] **Step 4: Version bump + commit** — follow the repo's existing release flow (`npm run bump-version` was rewired in Task 11 Step 2; verify it still syncs plugin.json/marketplace.json), commit `release: v0.38.0 — bun-only runtime`.

---

## Phase C — ceremony batching

**Spec deviation, justified:** the spec listed `auto` as 3 calls → 1, but the
Phase-0 inventory showed two of auto.md's three `loop.mjs` matches are example
strings inside emitted dispatch-plan text, not actual spawns — `auto` makes one
real CLI call and needs no batching. The two real batching targets are below.

### Task 13: `learnings log --digest <N>` (TDD)

**Files:**
- Modify: `src/scripts/lib/learnings.mts` (exports `logLearning`, `recentLearnings`), the `learnings` subcommand dispatcher in `src/scripts/loop.mts` (~line 1000, `runLearningsSubcommand`)
- Modify: `commands/learn.md` (collapse the `log` + `recent` calls into one)
- Test: `src/tests/learnings.test.mts` (extend existing)

- [ ] **Step 1: Failing test**

```ts
test("learnings log --digest returns the logged entry plus recent digest", async () => {
  const result = await logLearningWithDigest(repo, { text: "lesson A" }, 3);
  assert.ok(result.logged);
  assert.ok(Array.isArray(result.recent));
});
```
(Mirror the existing learnings test setup in that file for repo fixture creation; the new export wraps `logLearning` + `recentLearnings` in one call.)

- [ ] **Step 2: Run → FAIL.** `bun test src/tests/learnings.test.mts`

- [ ] **Step 3: Implement** — in learnings.mts:

```ts
export async function logLearningWithDigest(
  repoPath: string,
  entry: Parameters<typeof logLearning>[1],
  digestLimit: number
) {
  const logged = await logLearning(repoPath, entry);
  const recent = await recentLearnings(repoPath, digestLimit);
  return { logged, recent };
}
```
In `runLearningsSubcommand`: when `flags.digest` present on `log`, call the combined function with `Number(flags.digest)`.

- [ ] **Step 4: Run → PASS;** lint/typecheck clean.

- [ ] **Step 5: Update `commands/learn.md`** — replace the two sequential CLI invocations with one `learnings log ... --digest 3` call; the digest section of the command prose reads from the combined JSON.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/learnings.mts src/scripts/loop.mts src/tests/learnings.test.mts commands/learn.md
git commit -m "feat(cli): learnings log --digest collapses two ceremony spawns into one"
```

### Task 14: `backlog enrich --with-skills <variant>` (TDD)

**Files:**
- Modify: the enrich module (locate: `Select-String -Path src\scripts\lib\*.mts -Pattern "backlog enrich|function.*enrich" -List`) and the skills resolver behind `resolve-skills` (locate: `Select-String -Path src\scripts\*.mts,src\scripts\lib\*.mts -Pattern "resolve-skills" -List`)
- Modify: `commands/backlog-enrich.md` (4 CLI references → 1 resolve+enrich call per dispatch)
- Test: extend the enrich test file (same discovery pattern)

- [ ] **Step 1: Failing test** — enrich result carries a `skillsBlock` field when the flag is passed:

```ts
test("backlog enrich --with-skills embeds resolver output", async () => {
  const result = await runEnrich(repo, { withSkills: "single" });
  assert.ok(typeof result.skillsBlock === "string");
  assert.ok(result.skillsBlock.length > 0);
});
```
(Adapt the call shape to the actual enrich entry function found in discovery; the assertion is the contract: one call returns both enrichment and the resolver's skill block.)

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — enrich entry accepts `withSkills?: string`; when set, it calls the same function `resolve-skills` uses (import it — do NOT spawn a child CLI) and attaches its output as `skillsBlock` in the returned/printed JSON.

- [ ] **Step 4: Run → PASS;** lint/typecheck clean.

- [ ] **Step 5: Update `commands/backlog-enrich.md`** — the per-FEAT dispatch loop calls `backlog enrich --with-skills <variant>` once instead of `resolve-skills` + `backlog enrich`.

- [ ] **Step 6: Commit**

```bash
git add -A src commands/backlog-enrich.md
git commit -m "feat(cli): backlog enrich --with-skills removes the second ceremony spawn"
```

### Task 15: Evidence wrap-up

**Files:**
- Modify: `docs/superpowers/plans/bun-migration-baseline.txt`, `CHANGELOG.md` placeholders from Task 12

- [ ] **Step 1: Post-migration measurements**

```powershell
$t = Measure-Command { bun src/scripts/loop.mts status --repo . *> $null }; "status: $([math]::Round($t.TotalMilliseconds))ms"
bun test src/tests/ 2>&1 | Select-Object -Last 4
npm run bench 2>&1 | Select-Object -Last 20
```

- [ ] **Step 2: Fill the CHANGELOG `<before> → <after>` placeholders** with real numbers; append the after-block to the baseline file.

- [ ] **Step 3: Success-criteria check** (from the spec): suite < 50% of baseline wall; `loop status` p50 < 80ms; plugin runs with Bun only. Record PASS/FAIL per criterion in the baseline file.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/bun-migration-baseline.txt CHANGELOG.md
git commit -m "chore(bench): post-migration evidence — success criteria recorded"
```
