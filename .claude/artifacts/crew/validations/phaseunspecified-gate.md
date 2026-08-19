# Phase Gate Report — phase unspecified — 2026-08-19T03:07:29.932Z

## Summary
- Status: FAIL
- Preset: typescript-plugin-dev
- Started: 2026-08-19T03:05:56.430Z
- Ended: 2026-08-19T03:07:29.932Z
- Note: P2 seam elimination complete

## build
### PASS `bun run lint` (cwd: ., exit 0, 530ms)

```text
The number of diagnostics exceeds the limit allowed. Use --max-diagnostics to increase it.
Diagnostics not shown: 294.
Checked 607 files in 371ms. No fixes applied.
Found 61 warnings.
Found 253 infos.
```

**stderr:**
```text
$ biome lint src/
src\scripts\bump-version.mts:54:34 lint/style/useTemplate  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i Template literals are preferred over string concatenation.
  
    52 │   pkg.version = newVersion;
    53 │ 
  > 54 │   await fs.writeFile(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
       │                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    55 │   await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    56 │ 
  
  i Unsafe fix: Use a template literal.
  
    52 52 │     pkg.version = newVersion;
    53 53 │   
    54    │ - ··await·fs.writeFile(pluginPath,·JSON.stringify(plugin,·null,·2)·+·"\n",·"utf8");
       54 │ + ··await·fs.writeFile(pluginPath,·`${JSON.stringify(plugin,·null,·2)}\n`,·"utf8");
    55 55 │     await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    56 56 │   
  

src\scripts\bump-version.mts:55:35 lint/style/useTemplate  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i Template literals are preferred over string concatenation.
  
    54 │   await fs.writeFile(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
  > 55 │   await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
       │                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    56 │ 
    57 │   console.log(`plugin.json      ${oldPluginVersion} -> ${newVersion}`);
  
  i Unsafe fix: Use a template literal.
  
    53 53 │   
    54 54 │     await fs.writeFile(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
    55    │ - ··await·fs.writeFile(packagePath,·JSON.stringify(pkg,·null,·2)·+·"\n",·"utf8");
       55 │ + ··await·fs.writeFile(packagePath,·`${JSON.stringify(pkg,·null,·2)}\n`,·"utf8");
    56 56 │   
    57 57 │     console.log(`plugin.json      ${oldPluginVersion} -> ${newVersion}`);
  

src\scripts\bump-version.mts:70:41 lint/style/useTemplate  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i Template literals are preferred over string concatenation.
  
    68 │     const oldMarketplaceVersion = ownEntry.version;
    69 │     ownEntry.version = newVersion;
  > 70 │     await fs.writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf8");
       │                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    71 │     console.log(`marketplace.json ${oldMarketplaceVersion} -> ${newVersion}`);
    72 │   } else {
  
  i Unsafe fix: Use a template literal.
  
    68 68 │       const oldMarketplaceVersion = ownEntry.version;
    69 69 │       ownEntry.version = newVersion;
    70    │ - ····await·fs.writeFile(marketplacePath,·JSON.stringify(marketplace,·null,·2)·+·"\n",·"utf8");
       70 │ + ····await·fs.writeFile(marketplacePath,·`${JSON.stringify(marketplace,·null,·2)}\n`,·"utf8");
    71 71 │       console.log(`marketplace.json ${oldMarketplaceVersion} -> ${newVersion}`);
    72 72 │     } else {
  

src\scripts\dispatch.mts:253:22 lint/complexity/useLiteralKeys  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━━━━

  i The computed expression can be simplified without the use of a string literal.
  
    251 │     costAggregate.model !== "unknown"
    252 │       ? costAggregate.model
  > 253 │       : (process.env["CLAUDE_MODEL"] ?? "unknown");
        │                      ^^^^^^^^^^^^^^
    254 │   writeDispatchMetrics(repo, runId, {
    255 │     runId,
  
  i Unsafe fix: Use a literal key instead.
  
    251 251 │       costAggregate.model !== "unknown"
    252 252 │         ? costAggregate.model
    253     │ - ······:·(process.env["CLAUDE_MODEL"]·??·"unknown");
        253 │ + ······:·(process.env.CLAUDE_MODEL·??·"unknown");
    254 254 │     writeDispatchMetrics(repo, runId, {
    255 255 │       runId,
  

src\scripts\dispatch.mts:448:7 lint/complexity/noUselessSwitchCase  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━

  i Useless case clause.
  
    446 │         process.exitCode = await cmdPrune(parsedArgs);
    447 │         break;
  > 448 │       case "help":
        │       ^^^^^^^^^^^^
    449 │       default:
    450 │         printHelp();
  
  i because the default clause is present:
  
    447 │         break;
    448 │       case "help":
  > 449 │       default:
        │       ^^^^^^^^
  > 450 │         printHelp();
  > 451 │         process.exitCode = 0;
        │         ^^^^^^^^^^^^^^^^^^^^^
    452 │     }
    453 │   } catch (err) {
  
  i Unsafe fix: Remove the useless case.
  
    446 446 │           process.exitCode = await cmdPrune(parsedArgs);
    447 447 │           break;
    448     │ - ······case·"help":
    449 448 │         default:
    450 449 │           printHelp();
  

src\scripts\lib\astramem-cli-resolver.mts:60:34 lint/complexity/useLiteralKeys  FIXABLE  ━━━━━━━━━━━

  i The computed expression can be simplified without the use of a string literal.
  
    59 │   // 1. Plugin-root env override (memory-plugin installs here).
  > 60 │   const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
       │                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    61 │   if (pluginRoot) {
    62 │     const found = await resolveEnvOverride(pluginRoot);
  
  i Unsafe fix: Use a literal key instead.
  
     58  58 │   
     59  59 │     // 1. Plugin-root env override (memory-plugin installs here).
     60     │ - ··const·pluginRoot·=·process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
         60 │ + ··const·pluginRoot·=·process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
     61  61 │     if (pluginRoot) {
     62  62 │       const found = await resolveEnvOverride(pluginRoot);
  

src\scripts\lib\astramem-cli-resolver.mts:78:19 lint/complexity/useLiteralKeys  FIXABLE  ━━━━━━━━━━━

  i The computed expression can be simplified without the use of a string literal.
  
    76 │   // unaffected. This same flag also gates astramem-client's own
    77 │   // probeCliPath() (resolve.js) — one shared test-isolation contract.
  > 78 │   if (process.env["ASTRAMEM_DISABLE_PATH_PROBE"]) {
       │                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    79 │     _cliCache = false;
    80 │     return null;
  
  i Unsafe fix: Use a literal key instead.
  
     76  76 │     // unaffected. This same flag also gates astramem-client's own
     77  77 │     // probeCliPath() (resolve.js) — one shared test-isolation contract.
     78     │ - ··if·(process.env["ASTRAMEM_DISABLE_PATH_PROBE"])·{
         78 │ + ··if·(process.env.ASTRAMEM_DISABLE_PATH_PROBE)·{
     79  79 │       _cliCache = false;
     80  80 │       return null;
  

src\tests\worktree-manager.test.mts:452:19 lint/style/useTemplate  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━━

  i Template literals are preferred over string concatenation.
  
    451 │   // Use a relative path — resolved against repoPath
  > 452 │   const relRoot = "../wm-rel-wts-" + randomUUID();
        │                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    453 │   const expectedRoot = path.resolve(repo, relRoot);
    454 │ 
  
  i Unsafe fix: Use a template literal.
  
     450  450 │   
     451  451 │     // Use a relative path — resolved against repoPath
     452      │ - ··const·relRoot·=·"../wm-rel-wts-"·+·randomUUID();
          452 │ + ··const·relRoot·=·`../wm-rel-wts-${randomUUID()}`;
     453  453 │     const expectedRoot = path.resolve(repo, relRoot);
     454  454 │   
  

src\scripts\dispatch.mts:77:10 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━━━━━━━

  ! Excessive complexity of 28 detected (max: 15).
  
    75 │ };
    76 │ 
  > 77 │ function parseArgs(argv: string[]): ParsedArgs {
       │          ^^^^^^^^^
    78 │   const [subcommand, ...rest] = argv;
    79 │   const args: ParsedArgs = {
  
  i Please refactor this function to reduce its complexity score from 28 to the max allowed complexity 15.
  

src\scripts\dispatch.mts:367:16 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━━━━━━

  ! Excessive complexity of 17 detected (max: 15).
  
    365 │ }
    366 │ 
  > 367 │ async function cmdPrune(args: ParsedArgs): Promise<number> {
        │                ^^^^^^^^
    368 │   const repo = args.repo ?? process.cwd();
    369 │   const dryRun = args.dryRun ?? false;
  
  i Please refactor this function to reduce its complexity score from 17 to the max allowed complexity 15.
  

src\scripts\lib\acceptance-criteria.mts:32:17 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━

  ! Excessive complexity of 16 detected (max: 15).
  
    30 │  * Returns { count, hasMin } where hasMin is count >= 3.
    31 │  */
  > 32 │ export function detectAcceptanceCriteria(body: string): { count: number; hasMin: boolean } {
       │                 ^^^^^^^^^^^^^^^^^^^^^^^^
    33 │   const lines = body.split("\n");
    34 │   let inSection = false;
  
  i Please refactor this function to reduce its complexity score from 16 to the max allowed complexity 15.
  

src\scripts\lib\arch-gate.mts:302:23 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━

  ! Excessive complexity of 16 detected (max: 15).
  
    300 │  * documented as a known limitation rather than silently assumed exact.
    301 │  */
  > 302 │ export async function readFeatureCostSpendUsd(
        │                       ^^^^^^^^^^^^^^^^^^^^^^^
    303 │   repoPath: string,
    304 │   featureId: string
  
  i Please refactor this function to reduce its complexity score from 16 to the max allowed complexity 15.
  

src\scripts\lib\arch-gate.mts:375:23 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━

  ! Excessive complexity of 18 detected (max: 15).
  
    373 │  * (halt-and-escalate, never a silent defer).
    374 │  */
  > 375 │ export async function applyArchGateVerdict(
        │                       ^^^^^^^^^^^^^^^^^^^^
    376 │   repoPath: string,
    377 │   featureId: string,
  
  i Please refactor this function to reduce its complexity score from 18 to the max allowed complexity 15.
  

src\scripts\lib\auto-merge.mts:163:7 lint/complexity/useOptionalChain  FIXABLE  ━━━━━━━━━━━━━━━━━━━━

  ! Change to an optional chain.
  
    161 │ ): string {
    162 │   const { sliceTitle, sliceId, featureId, gradeAvg, decisionIds } = opts;
  > 163 │   if (!sliceTitle || !sliceTitle.trim()) {
        │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    164 │     throw new MergeError({
    165 │       code: "MERGE_FAILED",
  
  i Unsafe fix: Change to an optional chain.
  
    161 161 │   ): string {
    162 162 │     const { sliceTitle, sliceId, featureId, gradeAvg, decisionIds } = opts;
    163     │ - ··if·(!sliceTitle·||·!sliceTitle.trim())·{
        163 │ + ··if·(!sliceTitle?.trim())·{
    164 164 │       throw new MergeError({
    165 165 │         code: "MERGE_FAILED",
  

src\scripts\lib\auto-merge.mts:172:7 lint/complexity/useOptionalChain  FIXABLE  ━━━━━━━━━━━━━━━━━━━━

  ! Change to an optional chain.
  
    170 │     });
    171 │   }
  > 172 │   if (!sliceId || !sliceId.trim()) {
        │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    173 │     throw new MergeError({
    174 │       code: "MERGE_FAILED",
  
  i Unsafe fix: Change to an optional chain.
  
    170 170 │       });
    171 171 │     }
    172     │ - ··if·(!sliceId·||·!sliceId.trim())·{
        172 │ + ··if·(!sliceId?.trim())·{
    173 173 │       throw new MergeError({
    174 174 │         code: "MERGE_FAILED",
  

src\scripts\lib\backlog-auditor.mts:39:10 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━

  ! Excessive complexity of 19 detected (max: 15).
  
    38 │ /** Extract FEAT id and title from raw file content. */
  > 39 │ function extractIdAndTitle(content: string, filename: string): { id: string; title: string } {
       │          ^^^^^^^^^^^^^^^^^
    40 │   // Try frontmatter id field first
    41 │   const parts = content.split(FRONTMATTER_SPLIT_RE);
  
  i Please refactor this function to reduce its complexity score from 19 to the max allowed complexity 15.
  

src\scripts\lib\backlog-auditor.mts:80:10 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━

  ! Excessive complexity of 19 detected (max: 15).
  
    79 │ /** Extract AC section bullets from FEAT body and derive top keywords. */
  > 80 │ function extractKeywords(content: string): string[] {
       │          ^^^^^^^^^^^^^^^
    81 │   const lines = content.split(CRLF_SPLIT_RE);
    82 │   const acStart = lines.findIndex((l) => AC_SECTION_RE.test(l));
  
  i Please refactor this function to reduce its complexity score from 19 to the max allowed complexity 15.
  

src\scripts\lib\backlog-parser.mts:112:54 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━

  ! Excessive complexity of 24 detected (max: 15).
  
    111 │ export function filterBacklog(entries: Record<string, any>[], filters: Record<string, any> = {}) {
  > 112 │   return entries.filter((entry: Record<string, any>) => {
        │                                                      ^^^
    113 │     if (filters.status && entry.state !== filters.status) return false;
    114 │     if (filters.priority && entry.frontmatter.priority !== filters.priority) return false;
  
  i Please refactor this function to reduce its complexity score from 24 to the max allowed complexity 15.
  

src\scripts\lib\ceremonies.mts:67:17 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━

  ! Excessive complexity of 22 detected (max: 15).
  
    65 │  * @returns {string}
    66 │  */
  > 67 │ export function renderTree(
       │                 ^^^^^^^^^^
    68 │   phases: Array<{
    69 │     id: string;
  
  i Please refactor this function to reduce its complexity score from 22 to the max allowed complexity 15.
  

src\scripts\lib\cli-args.mts:122:17 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━━

  ! Excessive complexity of 16 detected (max: 15).
  
    120 │ };
    121 │ 
  > 122 │ export function parseArgs(argv: string[]) {
        │                 ^^^^^^^^^
    123 │   const [command, ...rest] = argv;
    124 │   const flags: Record<string, any> = {
  
  i Please refactor this function to reduce its complexity score from 16 to the max allowed complexity 15.
```

## test
### FAIL `bun test --parallel` (cwd: ., exit 1, 92970ms)

```text
bun test v1.3.14 (0d9b296a) 20x PARALLEL
```

**stderr:**
```text
... (truncated, showing last 65536 bytes)
I not found — skipping checkDrift
[github-sync] drift check: 0 linked, 1 tracker-only, 0 local-only, 0 status mismatches, 0 body diffs (read-only — no files written)
[task-store] provider: GithubProvider
[github-sync] drift check: 0 linked, 0 tracker-only, 1 local-only, 0 status mismatches, 0 body diffs (read-only — no files written)
[task-store] drift: 0 linked, 0 tracker-only, 1 local-only, 0 status mismatches, 0 body diffs. Read-only — no local or tracker writes made.
[task-store] provider: LinearProvider
[task-store] drift check not supported for provider "LinearProvider" — no sync engine for this provider yet. No changes made.
[task-store] provider: NoopProvider
[task-store] drift check not supported for provider "NoopProvider" — no sync engine for this provider yet. No changes made.
[task-store] provider: NoopProvider
[task-store] drift check not supported for provider "NoopProvider" — no sync engine for this provider yet. No changes made.
[task-store] provider: NoopProvider
[task-store] drift check not supported for provider "NoopProvider" — no sync engine for this provider yet. No changes made.

src\tests\synergy.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-syn-grade-Fui6UJ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-syn-grade-Fui6UJ — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled
(fail) completeSlice synthesis embeds grade summary when grade exists [5003.66ms]
  ^ this test timed out after 5000ms.

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-F9XZCz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-F9XZCz — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-dYBfdq (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-dYBfdq — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-single-UmmdHC (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-single-UmmdHC — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-renumber.test.mts:
[slice-renumber] SLICE-37 -> SLICE-48 failed partway through. Completed before the failure:
  - rename: .claude/artifacts/loop/ai-loop/slices/pending/SLICE_37_TEST_SLICE.md -> .claude/artifacts/loop/ai-loop/slices/pending/SLICE_48_TEST_SLICE.md
  - rename: .claude/artifacts/loop/grades/20260610T120000Z-grade-slice37.md -> .claude/artifacts/loop/grades/20260610T120000Z-grade-slice48.md

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-J87T9S (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-J87T9S — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-J87T9S (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-J87T9S — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-3: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-J87T9S (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-J87T9S — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-explicit-bGLRcv (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-explicit-bGLRcv — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-s5VXp4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-s5VXp4 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-none-hy3oew (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-none-hy3oew — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice makes zero gh calls when the FEAT has no github_issue [5007.74ms]
  ^ this test timed out after 5000ms.

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-ppsJtH (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-ppsJtH — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-ppsJtH (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-ppsJtH — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-ppsJtH (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-ppsJtH — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-peTcuF (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-peTcuF — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-peTcuF (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-peTcuF — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-tags-dYml0z (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-tags-dYml0z — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\synergy.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-WCin3m (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-WCin3m — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-WCin3m (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-WCin3m — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-WCin3m (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-WCin3m — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-JkMsWk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-JkMsWk — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-YZ9dRh (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-YZ9dRh — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\task-store-index.test.mts:
[task-store] Unknown provider "jira" — falling back to NoopProvider. Check taskStore.provider in loop.json. Valid values: github, noop, linear.
[linear-config] taskStore.linear config missing or incomplete — Set taskStore.linear.teamKey (e.g. "AST") and taskStore.linear.teamId (e.g. "81cea472-33a9-4fbe-a797-147e17c6ca05") in .claude/loop.json.
[LinearProvider] publishFeature: not configured — taskStore.linear not configured; skipping.
[LinearProvider] publishSlice: not configured — taskStore.linear not configured; skipping.
[LinearProvider] updateStatus: not configured — taskStore.linear not configured; skipping.
[LinearProvider] postSliceComment: not configured — taskStore.linear not configured; skipping.
[LinearProvider] updateStatus: not configured — taskStore.linear not configured; skipping.
[LinearProvider] syncPull: out of scope for v1 (COND-C descope) — no Linear sync engine yet; returning an empty result. See the FEAT-252 follow-up for cursor-paginated sync.
[LinearProvider] bootstrap: out of scope for v1 (COND-C descope) — no Linear sync engine yet; returning an empty result. See the FEAT-252 follow-up for cursor-paginated sync.

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\dispatch-trace.test.mts:
[dispatch] marker parse failed for FE: JSON Parse error: Expected '}'

src\tests\task-store-provider-routing.test.mts:
loop CLI

Usage:
  bun src/scripts/loop.mts install --repo <path> [--preset <name>] [--light]
  bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]
  bun src/scripts/loop.mts status --repo <path>
  bun src/scripts/loop.mts list-presets
  bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]
  bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)
  bun src/scripts/loop.mts learn --repo <path>   (runs the continuous-learning cycle once)

Hard dependency: the `crew` plugin must be installed. Phase-gate writes its
artifact through `crew write-validation-result`.
[github-sync] publishFeat: FEAT-001 → #99
[github-sync] publishFeat: FEAT-001 → #10
[github-sync] publishSlice: SLICE-01 → #11 (sub of #10)

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-TJ4QD6 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-TJ4QD6 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\task-store-github-provider.test.mts:
[GithubProvider] gh CLI not found — skipping publishFeature
[GithubProvider] gh CLI not found — skipping publishSlice
[GithubProvider] gh CLI not found — skipping closeSlice
[GithubProvider] gh CLI not found — skipping syncPull
[GithubProvider] gh CLI not found — skipping updateStatus
[GithubProvider] gh CLI not found — skipping bootstrap
[GithubProvider] gh CLI not found — skipping postSliceComment

src\tests\task-store-provider-routing.test.mts:
[github-sync] publishFeat: FEAT-001 → #42
Published: #42 https://github.com/org/testrepo/issues/42

src\tests\task-store-github-provider.test.mts:
[GithubProvider] gh CLI not found — skipping publishSlice
[GithubProvider] gh CLI not found — skipping closeSlice
[GithubProvider] gh CLI not found — skipping postSliceComment
[GithubProvider] gh CLI not found — skipping updateStatus

src\tests\task-store-provider-routing.test.mts:
[github-sync] GitHub sync disabled — skipped.
[github-sync] GitHub sync disabled — skipped.
[github-sync] GitHub sync disabled — skipped.
[task-store] provider: NoopProvider
[task-store] provider: NoopProvider

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-WQ78be (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-WQ78be — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\task-store-provider-routing.test.mts:
[github-sync] publishFeat: FEAT-001 → #7
[github-sync] publishFeat: FEAT-001 → #7

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\task-store-provider-routing.test.mts:
[github-sync] publishFeat: FEAT-001 → #21
Published: #21 https://github.com/org/testrepo/issues/21
[github-sync] publishFeat: FEAT-001 → #21
Published: #21 https://github.com/org/testrepo/issues/21

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\learning-cycle.test.mts:
[features] learnings-capture: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-JVakWs (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-JVakWs — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-jte2Xx (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-jte2Xx — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-jte2Xx (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-jte2Xx — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\learning-cycle.test.mts:
[features] learnings-capture: enabled

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\hierarchical-dispatch.integration.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'ok.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/MIX'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/CONF'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/DC'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it

src\tests\learning-cycle.test.mts:
[features] learnings-capture: enabled
[features] learnings-capture: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-92gcrg (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-92gcrg — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\learning-cycle.test.mts:
[features] learnings-capture: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-n3XTML (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-n3XTML — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-UgQtOy (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-UgQtOy — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-kAs2nN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-kAs2nN — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-8njJWm (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-8njJWm — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-8njJWm (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-8njJWm — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-h43uXi (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-h43uXi — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-xIcxjS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-xIcxjS — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-5lfTr0 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-5lfTr0 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-m5SGtE (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-m5SGtE — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\hierarchical-dispatch.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-D90B0P (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-D90B0P — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-D90B0P (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-D90B0P — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\learning-cycle.test.mts:
318 | // AC-6: the cadence decision is recorded
319 | // ---------------------------------------------------------------------------
320 | 
321 | test("DEC-070 contract record exists for FEAT-229", async () => {
322 |   const decPath = path.resolve("./.claude/artifacts/loop/decisions/DEC-070.md");
323 |   const raw = await fs.readFile(decPath, "utf8");
                             ^
ENOENT: no such file or directory, open 'C:\mega\dev-crew\.claude\artifacts\loop\decisions\DEC-070.md'
    path: "C:\\mega\\dev-crew\\.claude\\artifacts\\loop\\decisions\\DEC-070.md",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at async <anonymous> (C:\mega\dev-crew\src\tests\learning-cycle.test.mts:323:24)
(fail) DEC-070 contract record exists for FEAT-229 [0.83ms]

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-XhTdmB (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-XhTdmB — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-y0IFFW (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-y0IFFW — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-3P1lZh (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-3P1lZh — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-hMOYE1 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-hMOYE1 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-hMOYE1 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-hMOYE1 — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-laP4ns (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-laP4ns — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-itJsr1 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-itJsr1 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-BFsJxG (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-BFsJxG — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-BQGToO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-BQGToO — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-BQGToO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-BQGToO — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\hierarchical-dispatch.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.touch', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/SLICE-E2E'

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-aFIdKi (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-aFIdKi — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-pmYejK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-pmYejK — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-z6VRTm (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-z6VRTm — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-y8N6sb (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-y8N6sb — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice writes a crew handoff artifact [5000.94ms]
  ^ this test timed out after 5000ms.

src\tests\auto-merge.test.mts:
loop CLI

Usage:
  bun src/scripts/loop.mts install --repo <path> [--preset <name>] [--light]
  bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]
  bun src/scripts/loop.mts status --repo <path>
  bun src/scripts/loop.mts list-presets
  bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]
  bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)
  bun src/scripts/loop.mts learn --repo <path>   (runs the continuous-learning cycle once)

Hard dependency: the `crew` plugin must be installed. Phase-gate writes its
artifact through `crew write-validation-result`.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-wScHk8 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-wScHk8 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uaWLke — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-idem-SfUTR1 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-idem-SfUTR1 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice does not re-close the FEAT issue on an idempotent re-run (already done) [5000.10ms]
  ^ this test timed out after 5000ms.

src\tests\dispatch-recover.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'B.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/REC2'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'B.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/REC3'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/RECW'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/RECN'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'B.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'B.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/REC4'

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-I7r067 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-I7r067 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-jWzh9x — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-VAhVCK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-VAhVCK — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice moves slice to completed/ and feature to done/ [5000.61ms]
  ^ this test timed out after 5000ms.

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-1HPRQ3 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-VubOeT (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-VubOeT — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice close ceremony still succeeds when the tracker provider throws (soft-fail) [5000.03ms]
  ^ this test timed out after 5000ms.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-DbhLQU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-DbhLQU — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice also refreshes slice-progress [5000.78ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-HjO2mw (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-HjO2mw — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-EvI0FR (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-EvI0FR — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-wp7fQD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-wp7fQD — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-R6eBjQ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-R6eBjQ — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice auto-rolls parent spec to satisfied when all features done [5000.95ms]
  ^ this test timed out after 5000ms.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-9sM738 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-9sM738 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-E7BsKC (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-E7BsKC — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-iNtgwB (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-iNtgwB — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-scaQwa (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-scaQwa — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-43D5Ec (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-43D5Ec — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-bUpEvR (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-bUpEvR — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-0AB3Pb (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-0AB3Pb — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice is idempotent — re-running on a completed slice doesn't error [5000.03ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-knODqP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-knODqP — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice blocked when featureEnd ceremony has simplifyRan: false [5000.17ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-lZbFPd (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-lZbFPd — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice allowed when featureEnd ceremony has simplifyRan: true [5000.01ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-NyWn2c (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-NyWn2c — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice allowed when no featureEnd ceremony exists [5000.92ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-mrr5Kl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-mrr5Kl — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice keeps feature in-progress when feature_complete: false in frontmatter [5001.97ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-nM3UCk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-nM3UCk — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice keeps feature in-progress when keepFeatureOpen runtime flag passed [5000.02ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-BF7km9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-BF7km9 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice still moves feature to done when feature_complete: true explicitly set [5001.92ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-ujvoCg (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-ujvoCg — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-MaO6Fi (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-MaO6Fi — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-634mXS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-634mXS — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-ujXP9A (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-ujXP9A — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-YDLpfp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-YDLpfp — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-T2Hv58 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-T2Hv58 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-2YPhfH (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-2YPhfH — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice --skip-validation-check with reason bypasses gate [5000.86ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-Jcxizz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-Jcxizz — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice returns updated_confidence red when builderEvidence has test-fail [5000.03ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-cZxDW6 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-cZxDW6 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice returns updated_confidence null when no builderEvidence [5000.95ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-KhsPNL (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-KhsPNL — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-FfYw7I (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-FfYw7I — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Z0OHcl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Z0OHcl — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Z0OHcl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Z0OHcl — falling back to local-only slice-id scan (remote max treated as 0).
[stale-blocked-badge] gates.blocked updatedAt=2026-08-17T03:07:29.562Z is 2.0d old (threshold 1d) — downgrading to a warning, feature roll proceeds. note: "2 days old" — clear it in C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Z0OHcl\.claude\state\crew\workflow-state.json or re-block.
[crew-bridge] cost-slice failed (slice=SLICE-02): cost-slice requires --started-at or an active/last run with startedAt
The system cannot find the path specified.

 5291 pass
 124 skip
 49 fail
 6764 expect() calls
Ran 5464 tests across 539 files. [92.95s]
```

## frontendBuild
_skipped (not configured for this preset/repo)_

## infraPlan
_skipped (not configured for this preset/repo)_

## aspireBoot
_skipped (not configured for this preset/repo)_
