# Phase Gate Report — phase unspecified — 2026-08-19T07:11:04.502Z

## Summary
- Status: FAIL
- Preset: typescript-plugin-dev
- Started: 2026-08-19T07:09:22.524Z
- Ended: 2026-08-19T07:11:04.502Z
- Note: P3 surface merge complete

## build
### PASS `bun run lint` (cwd: ., exit 0, 594ms)

```text
The number of diagnostics exceeds the limit allowed. Use --max-diagnostics to increase it.
Diagnostics not shown: 294.
Checked 607 files in 400ms. No fixes applied.
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
### FAIL `bun test --parallel` (cwd: ., exit 1, 101381ms)

```text
bun test v1.3.14 (0d9b296a) 20x PARALLEL
```

**stderr:**
```text
... (truncated, showing last 65536 bytes)
FYy (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-scaffold-OhrFYy — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] snapshot-autoregen: enabled

src\tests\cost-regression-mode-flip.test.mts:
{"event":"cost-regression-check","timestamp":"2026-08-19T07:09:56.594Z","mode":"median","actual_usd":35,"expected_usd":null,"median_usd_per_point":null,"effort_points":null,"threshold_usd":30,"triggered":true,"multiplier":3,"window":5,"sample_count":3}

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-oDVKRY (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-oDVKRY — falling back to local-only slice-id scan (remote max treated as 0).

crew\tests\dispatch-size-gate.test.mts:
[features] dispatch-size-gate: disabled

src\tests\cost-regression-sizing.test.mts:
[loop] WARN: loop.costRegressionMode is deprecated; rename to loop.cost.regression.mode in .claude/loop.json (run /devcrew:cost-setup to auto-migrate).
[loop] WARN: loop.costMedianUsdPerPoint is deprecated; rename to loop.cost.regression.medianUsdPerPoint in .claude/loop.json (run /devcrew:cost-setup to auto-migrate).
{"event":"cost-regression-check","timestamp":"2026-08-19T07:09:56.811Z","mode":"expected_usd","actual_usd":100,"expected_usd":10,"median_usd_per_point":10,"effort_points":1,"threshold_usd":30,"triggered":true,"multiplier":3,"window":5,"sample_count":3}

crew\tests\dispatch-size-gate.test.mts:
[features] dispatch-size-gate: disabled
[features] dispatch-size-gate: enabled

src\tests\cost-regression-sizing.test.mts:
{"event":"cost-regression-check","timestamp":"2026-08-19T07:09:56.860Z","mode":"expected_usd","actual_usd":150,"expected_usd":130,"median_usd_per_point":10,"effort_points":13,"threshold_usd":390,"triggered":false,"multiplier":3,"window":5,"sample_count":3}

crew\tests\dispatch-size-gate.test.mts:
[features] dispatch-size-gate: disabled

src\tests\cost-regression-sizing.test.mts:
{"event":"cost-regression-check","timestamp":"2026-08-19T07:09:56.893Z","mode":"expected_usd","actual_usd":30,"expected_usd":10,"median_usd_per_point":10,"effort_points":1,"threshold_usd":30,"triggered":false,"multiplier":3,"window":5,"sample_count":3}

crew\tests\dispatch-size-gate.test.mts:
[features] dispatch-size-gate: disabled

src\tests\eval-generator.test.mts:
310 | // AC-6: the contract decision is recorded
311 | // ---------------------------------------------------------------------------
312 | 
313 | test("DEC-068 contract record exists for FEAT-222", async () => {
314 |   const decPath = path.resolve("./.claude/artifacts/loop/decisions/DEC-068.md");
315 |   const raw = await fs.readFile(decPath, "utf8");
                             ^
ENOENT: no such file or directory, open 'C:\work\mega\devcrew\.claude\artifacts\loop\decisions\DEC-068.md'
    path: "C:\\work\\mega\\devcrew\\.claude\\artifacts\\loop\\decisions\\DEC-068.md",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at async <anonymous> (C:\work\mega\devcrew\src\tests\eval-generator.test.mts:315:24)
(fail) DEC-068 contract record exists for FEAT-222 [1.83ms]

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-1qTfFA (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-1qTfFA — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice writes a crew handoff artifact [5002.81ms]
  ^ this test timed out after 5000ms.

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-EpASXi (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-EpASXi — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-regen-Be2EuO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-regen-Be2EuO — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] snapshot-autoregen: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-Skr2Fl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-Skr2Fl — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\learning-cycle.test.mts:
[features] learnings-capture: enabled

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-none-42WJ2I (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-none-42WJ2I — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice makes zero gh calls when the FEAT has no github_issue [5000.91ms]
  ^ this test timed out after 5000ms.

src\tests\learning-cycle.test.mts:
[features] learnings-capture: enabled
[features] learnings-capture: enabled
[features] learnings-capture: enabled
[features] learnings-capture: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-disabled-7zSds3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-disabled-7zSds3 — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] snapshot-autoregen: disabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-single-PDeAR1 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-single-PDeAR1 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-ZzTLby (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-ZzTLby — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-explicit-rMtU3h (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-explicit-rMtU3h — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-IHionO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-IHionO — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-IHionO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-IHionO — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-3: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-IHionO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-atomic-IHionO — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-happy-V1c2lU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-happy-V1c2lU — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\learning-cycle.test.mts:
318 | // AC-6: the cadence decision is recorded
319 | // ---------------------------------------------------------------------------
320 | 
321 | test("DEC-070 contract record exists for FEAT-229", async () => {
322 |   const decPath = path.resolve("./.claude/artifacts/loop/decisions/DEC-070.md");
323 |   const raw = await fs.readFile(decPath, "utf8");
                             ^
ENOENT: no such file or directory, open 'C:\work\mega\devcrew\.claude\artifacts\loop\decisions\DEC-070.md'
    path: "C:\\work\\mega\\devcrew\\.claude\\artifacts\\loop\\decisions\\DEC-070.md",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at async <anonymous> (C:\work\mega\devcrew\src\tests\learning-cycle.test.mts:323:24)
(fail) DEC-070 contract record exists for FEAT-229 [3.75ms]

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-Nl0UI4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-Nl0UI4 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-Nl0UI4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-Nl0UI4 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-Nl0UI4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-sequence-Nl0UI4 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\dispatch-trace.test.mts:
[dispatch] marker parse failed for FE: JSON Parse error: Expected '}'

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-renumber.test.mts:
[slice-renumber] SLICE-37 -> SLICE-48 failed partway through. Completed before the failure:
  - rename: .claude/artifacts/loop/ai-loop/slices/pending/SLICE_37_TEST_SLICE.md -> .claude/artifacts/loop/ai-loop/slices/pending/SLICE_48_TEST_SLICE.md
  - rename: .claude/artifacts/loop/grades/20260610T120000Z-grade-slice37.md -> .claude/artifacts/loop/grades/20260610T120000Z-grade-slice48.md

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-xDtuOF (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-xDtuOF — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-xDtuOF (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-xDtuOF — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-tags-a4fnVK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-tags-a4fnVK — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-ZM6BGf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-ZM6BGf — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-ietgx3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-ietgx3 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-jb6ZlS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-jb6ZlS — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-gWVz9a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-gWVz9a — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-UbwBdc (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-UbwBdc — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-J0XokN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-J0XokN — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-tBItN8 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-tBItN8 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-DrOYcp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-DrOYcp — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-DrOYcp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-DrOYcp — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-Rf0taJ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-Rf0taJ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\hierarchical-dispatch.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-VXiUrZ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-VXiUrZ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-p5xSoQ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-p5xSoQ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-WQPDOD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-WQPDOD — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-Z5IZ9u (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-Z5IZ9u — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-Z5IZ9u (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-Z5IZ9u — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-CiXrue (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-CiXrue — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-wvdZJs (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-wvdZJs — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-eh1kzx (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-eh1kzx — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-xQiDhk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-xQiDhk — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-YBPNH9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-YBPNH9 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-YBPNH9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-YBPNH9 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-UCzLvp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-UCzLvp — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-ZtecAU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-ZtecAU — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-Uas4tp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-Uas4tp — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-idem-PEhXn6 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-idem-PEhXn6 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice does not re-close the FEAT issue on an idempotent re-run (already done) [5000.95ms]
  ^ this test timed out after 5000ms.

src\tests\hierarchical-dispatch.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.touch', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/SLICE-E2E'

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-KUnu6H (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-KUnu6H — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-KUnu6H (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-KUnu6H — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-H2nCbO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-H2nCbO — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-jXeOkf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-jXeOkf — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-Q3pOpo (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-Q3pOpo — falling back to local-only slice-id scan (remote max treated as 0).

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

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-hbyBXF (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-hbyBXF — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-hbyBXF (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-hbyBXF — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-lOmA4Q (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-lOmA4Q — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-PxUFvB (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-PxUFvB — falling back to local-only slice-id scan (remote max treated as 0).

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

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-JsWScM (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-JsWScM — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-nvfz4c (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-nvfz4c — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-YL8n6J (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-YL8n6J — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice moves slice to completed/ and feature to done/ [5001.17ms]
  ^ this test timed out after 5000ms.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-4koF11 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-4koF11 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-qQxX3t — falling back to local-only slice-id scan (remote max treated as 0).

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

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-G7nD0i — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-3HNred — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-kHpa3O (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-kHpa3O — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice close ceremony still succeeds when the tracker provider throws (soft-fail) [5002.02ms]
  ^ this test timed out after 5000ms.

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-mfqvFv (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-mfqvFv — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice auto-rolls parent spec to satisfied when all features done [5000.01ms]
  ^ this test timed out after 5000ms.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-rgprOA (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-rgprOA — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice also refreshes slice-progress [5000.39ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-cPQVvj (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-cPQVvj — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-rB0U91 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-rB0U91 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-eIm4GK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-eIm4GK — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-eOmX9m (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-eOmX9m — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-4zXM6G (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-4zXM6G — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-rxVTo4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-rxVTo4 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-q0ZJDD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-q0ZJDD — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-XxOwtH (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-XxOwtH — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-R3AhB5 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-R3AhB5 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-4TWTl2 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-4TWTl2 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice is idempotent — re-running on a completed slice doesn't error [5000.93ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-cUvHK0 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-cUvHK0 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice blocked when featureEnd ceremony has simplifyRan: false [5000.80ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-EdNtiA (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-EdNtiA — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice allowed when featureEnd ceremony has simplifyRan: true [5000.08ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-gX2rS2 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-gX2rS2 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice allowed when no featureEnd ceremony exists [5000.88ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-9DdJLE (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-9DdJLE — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice keeps feature in-progress when feature_complete: false in frontmatter [5004.02ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-ITN27Y (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-ITN27Y — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice keeps feature in-progress when keepFeatureOpen runtime flag passed [5001.08ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-3Lv4O7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-3Lv4O7 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice still moves feature to done when feature_complete: true explicitly set [5002.76ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-iaXsKU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-iaXsKU — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-boNl7e (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-boNl7e — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-nkDFfX (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-nkDFfX — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-TmWlnt (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-TmWlnt — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-y67UAg (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-y67UAg — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-Xjq8vd (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-Xjq8vd — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-OEwSTA (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-OEwSTA — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice --skip-validation-check with reason bypasses gate [5000.13ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-9yxa3j (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-9yxa3j — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice returns updated_confidence red when builderEvidence has test-fail [5000.86ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-ra1Dz3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-ra1Dz3 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice returns updated_confidence null when no builderEvidence [5000.04ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-WdBHyt (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-WdBHyt — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-ysdepZ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-ysdepZ — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-rEJAic (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-rEJAic — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-rEJAic (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-rEJAic — falling back to local-only slice-id scan (remote max treated as 0).
[stale-blocked-badge] gates.blocked updatedAt=2026-08-17T07:11:04.089Z is 2.0d old (threshold 1d) — downgrading to a warning, feature roll proceeds. note: "2 days old" — clear it in C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-rEJAic\.claude\state\crew\workflow-state.json or re-block.
[crew-bridge] cost-slice failed (slice=SLICE-02): cost-slice requires --started-at or an active/last run with startedAt
The system cannot find the path specified.

 5302 pass
 124 skip
 47 fail
 6694 expect() calls
Ran 5473 tests across 539 files. [101.35s]
```

## frontendBuild
_skipped (not configured for this preset/repo)_

## infraPlan
_skipped (not configured for this preset/repo)_

## aspireBoot
_skipped (not configured for this preset/repo)_
