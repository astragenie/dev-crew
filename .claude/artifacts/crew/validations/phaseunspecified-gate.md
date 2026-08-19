# Phase Gate Report — phase unspecified — 2026-08-19T01:19:11.075Z

## Summary
- Status: FAIL
- Preset: typescript-plugin-dev
- Started: 2026-08-19T01:18:30.959Z
- Ended: 2026-08-19T01:19:11.075Z
- Note: P1 runtime baseline complete

## build
### PASS `bun run lint` (cwd: ., exit 0, 1060ms)

```text
The number of diagnostics exceeds the limit allowed. Use --max-diagnostics to increase it.
Diagnostics not shown: 294.
Checked 605 files in 385ms. No fixes applied.
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
  

src\scripts\lib\arch-gate.mts:303:23 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━

  ! Excessive complexity of 16 detected (max: 15).
  
    301 │  * documented as a known limitation rather than silently assumed exact.
    302 │  */
  > 303 │ export async function readFeatureCostSpendUsd(
        │                       ^^^^^^^^^^^^^^^^^^^^^^^
    304 │   repoPath: string,
    305 │   featureId: string
  
  i Please refactor this function to reduce its complexity score from 16 to the max allowed complexity 15.
  

src\scripts\lib\arch-gate.mts:376:23 lint/complexity/noExcessiveCognitiveComplexity ━━━━━━━━━━━━━━━━

  ! Excessive complexity of 18 detected (max: 15).
  
    374 │  * (halt-and-escalate, never a silent defer).
    375 │  */
  > 376 │ export async function applyArchGateVerdict(
        │                       ^^^^^^^^^^^^^^^^^^^^
    377 │   repoPath: string,
    378 │   featureId: string,
  
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
### FAIL `bun test --parallel` (cwd: ., exit 1, 39054ms)

```text
bun test v1.3.14 (0d9b296a) 20x PARALLEL
```

**stderr:**
```text
... (truncated, showing last 65536 bytes)
s it

src\tests\eval-generator.test.mts:
310 | // AC-6: the contract decision is recorded
311 | // ---------------------------------------------------------------------------
312 | 
313 | test("DEC-068 contract record exists for FEAT-222", async () => {
314 |   const decPath = path.resolve("./.claude/artifacts/loop/decisions/DEC-068.md");
315 |   const raw = await fs.readFile(decPath, "utf8");
                             ^
ENOENT: no such file or directory, open 'C:\mega\dev-crew\.claude\artifacts\loop\decisions\DEC-068.md'
    path: "C:\\mega\\dev-crew\\.claude\\artifacts\\loop\\decisions\\DEC-068.md",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at async <anonymous> (C:\mega\dev-crew\src\tests\eval-generator.test.mts:315:24)
(fail) DEC-068 contract record exists for FEAT-222 [3.65ms]

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-x0BByU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-x0BByU — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\grade-writer-learnings.test.mts:
[features] learnings-capture: enabled
[features] learnings-capture: disabled

crew\tests\build-bundle-assemble.test.mts:
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it

src\tests\grade-writer-learnings.test.mts:
[features] learnings-capture: enabled
[features] learnings-capture: enabled
[features] learnings-capture: enabled
[features] learnings-capture: enabled
[features] learnings-capture: enabled

src\tests\close-slice-learnings.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-learnings-notes-OKoK2O (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-learnings-notes-OKoK2O — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

crew\tests\build-bundle-assemble.test.mts:
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it

src\tests\grade-writer-memory-attribution.test.mts:
[features] learnings-capture: enabled

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-DZvBKd (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-DZvBKd — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\grade-writer-memory-attribution.test.mts:
[features] learnings-capture: enabled
[features] learnings-capture: enabled
[features] learnings-capture: enabled

src\tests\slice-renumber.test.mts:
[slice-renumber] SLICE-37 -> SLICE-48 failed partway through. Completed before the failure:
  - rename: .claude/artifacts/loop/ai-loop/slices/pending/SLICE_37_TEST_SLICE.md -> .claude/artifacts/loop/ai-loop/slices/pending/SLICE_48_TEST_SLICE.md
  - rename: .claude/artifacts/loop/grades/20260610T120000Z-grade-slice37.md -> .claude/artifacts/loop/grades/20260610T120000Z-grade-slice48.md

crew\tests\check-builder-terminal-state.test.mts:
[features] builder-terminal-state-guard: enabled

crew\tests\build-bundle-assemble.test.mts:
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it

crew\tests\check-builder-terminal-state.test.mts:
[features] builder-terminal-state-guard: enabled
[features] builder-terminal-state-guard: enabled
[features] builder-terminal-state-guard: enabled
[features] builder-terminal-state-guard: disabled
[features] builder-terminal-state-guard: enabled
[features] builder-terminal-state-guard: enabled

crew\tests\check-task-update-burst.test.mts:
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled

src\tests\grade-writer-telemetry.test.mts:
[features] learnings-capture: enabled

crew\tests\check-task-update-burst.test.mts:
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: enabled
[features] task-update-burst-warn: enabled
[features] cost-hygiene: disabled
[features] cost-hygiene: disabled
[features] cost-hygiene: disabled

src\tests\grade-writer-telemetry.test.mts:
[features] learnings-capture: enabled
[features] learnings-capture: enabled

crew\tests\build-bundle-assemble.test.mts:
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it

src\tests\grade-writer-telemetry.test.mts:
[features] learnings-capture: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-pureyaml-QvQwEa (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-pureyaml-QvQwEa — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-single-LNE6YK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-single-LNE6YK — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\grade-writer-telemetry.test.mts:
[features] learnings-capture: enabled
[features] learnings-capture: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-explicit-IS5l4p (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-explicit-IS5l4p — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-lqm21x (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-lqm21x — falling back to local-only slice-id scan (remote max treated as 0).

crew\tests\build-bundle-assemble.test.mts:
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-C8vitl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-C8vitl — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-x2fL5c (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-x2fL5c — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-x2fL5c (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-x2fL5c — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-x2fL5c (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-x2fL5c — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-scaffold-CZkPPJ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-scaffold-CZkPPJ — falling back to local-only slice-id scan (remote max treated as 0).
[features] snapshot-autoregen: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-tags-BFarhc (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-tags-BFarhc — falling back to local-only slice-id scan (remote max treated as 0).

crew\tests\build-bundle-inline.test.mts:
[build-bundle] no bundle for slice SLICE-99
[build-bundle] malformed bundle frontmatter at C:\Users\serge\AppData\Local\Temp\inline-test-KLtMVX\SLICE-99\builder-20260608T223000Z-build-bundle.md

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-lZ6Udl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-lZ6Udl — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-lZ6Udl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-lZ6Udl — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-3: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-lZ6Udl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-lZ6Udl — falling back to local-only slice-id scan (remote max treated as 0).

crew\tests\build-bundle-inline.test.mts:
[build-bundle] bundle schema_version 999 > supported 1 at C:\Users\serge\AppData\Local\Temp\inline-test-ntzokg\SLICE-99\builder-20260608T223000Z-build-bundle.md

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-jPuKHG (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-jPuKHG — falling back to local-only slice-id scan (remote max treated as 0).

crew\tests\build-bundle-assemble.test.mts:
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-8IjpJg (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-8IjpJg — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\hierarchical-dispatch.integration.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'ok.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/MIX'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/CONF'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/DC'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-YTr9np (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-YTr9np — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-2i7uGD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-2i7uGD — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-Bfm693 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-Bfm693 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-Bfm693 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-Bfm693 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-regen-En0fGc (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-regen-En0fGc — falling back to local-only slice-id scan (remote max treated as 0).
[features] snapshot-autoregen: enabled

src\tests\dispatch-trace.test.mts:
[dispatch] marker parse failed for FE: JSON Parse error: Expected '}'

crew\tests\build-bundle-cli.test.mts:
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-HGlIkN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-HGlIkN — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-ZJSc35 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-ZJSc35 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-5cyBm7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-5cyBm7 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-xUQN50 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-xUQN50 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-link-y6mmT3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-link-y6mmT3 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-aV0VH7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-aV0VH7 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-2pFuKE (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-2pFuKE — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\hierarchical-dispatch.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-mNPUR6 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-mNPUR6 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-joSvFm (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-joSvFm — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-y7iV0d (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-y7iV0d — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-y7iV0d (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-y7iV0d — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-9ubNGl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-9ubNGl — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-9ubNGl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-9ubNGl — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-disabled-JSGsvP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-disabled-JSGsvP — falling back to local-only slice-id scan (remote max treated as 0).
[features] snapshot-autoregen: disabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-Zfy59p (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-Zfy59p — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-flat-q04rPQ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-flat-q04rPQ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-pJAMnz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-pJAMnz — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-KrQXsb (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-KrQXsb — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-6zHqlt (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-6zHqlt — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-6zHqlt (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-6zHqlt — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-IkFUU5 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-IkFUU5 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-JANtOp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-JANtOp — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-JANtOp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-JANtOp — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-4gbZmV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-4gbZmV — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-JsxgJP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-JsxgJP — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-P9E7O7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-P9E7O7 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-P9E7O7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-P9E7O7 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-happy-aEEdX0 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-happy-aEEdX0 — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-dqxwEj (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-dqxwEj — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-4p8EsA (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-4p8EsA — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\hierarchical-dispatch.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.touch', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/SLICE-E2E'

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-mzJhyw (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-mzJhyw — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-JH2WqQ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-JH2WqQ — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-JH2WqQ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-JH2WqQ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-9te0Hs (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-9te0Hs — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-elVWQz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-elVWQz — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-5ANsXS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-5ANsXS — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-hyCWN1 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-hyCWN1 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-UpujiD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-UpujiD — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-UD5lcI (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-UD5lcI — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-TSDypR (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-TSDypR — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-TSDypR (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-TSDypR — falling back to local-only slice-id scan (remote max treated as 0).

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
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-Dqik3U (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-Dqik3U — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-Hsw1a6 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-Hsw1a6 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-9RQ7RW (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-9RQ7RW — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-hLE3z4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-hLE3z4 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-7DHtxI (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-7DHtxI — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-5N3fuj (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-5N3fuj — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-q6Xqrn (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-q6Xqrn — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-uiopb9 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-53sz8I (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-53sz8I — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-l1F0d1 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-l1F0d1 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-askumE (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-askumE — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-dQ9eW7 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-pJBISn (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-pJBISn — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-eY45vD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-eY45vD — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-BniQoY (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-BniQoY — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-u4lj6K (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-u4lj6K — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-0Doz6a — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-f53sTO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-f53sTO — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-A4ioNc (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-A4ioNc — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-co4kMV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-co4kMV — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-Lg2Mp5 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-Lg2Mp5 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-6s4XHe (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-6s4XHe — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-HHpfOj (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-HHpfOj — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-kGGyqQ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-kGGyqQ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-kIZINE (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-kIZINE — falling back to local-only slice-id scan (remote max treated as 0).

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

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Vdevjk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Vdevjk — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Vdevjk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Vdevjk — falling back to local-only slice-id scan (remote max treated as 0).
[stale-blocked-badge] gates.blocked updatedAt=2026-08-17T01:19:08.585Z is 2.0d old (threshold 1d) — downgrading to a warning, feature roll proceeds. note: "2 days old" — clear it in C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-Vdevjk\.claude\state\crew\workflow-state.json or re-block.
The system cannot find the path specified.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-UoiWyp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-UoiWyp — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-hwabHn (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-hwabHn — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-sR2eUs (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-sR2eUs — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-FMTddz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-FMTddz — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-llFbGL (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-llFbGL — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-VMV8kr (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-VMV8kr — falling back to local-only slice-id scan (remote max treated as 0).

 5309 pass
 124 skip
 25 fail
 6756 expect() calls
Ran 5458 tests across 538 files. [39.03s]
```

## frontendBuild
_skipped (not configured for this preset/repo)_

## infraPlan
_skipped (not configured for this preset/repo)_

## aspireBoot
_skipped (not configured for this preset/repo)_
