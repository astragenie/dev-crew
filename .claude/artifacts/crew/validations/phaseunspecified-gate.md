# Phase Gate Report — phase unspecified — 2026-08-19T16:16:18.057Z

## Summary
- Status: PASS
- Preset: typescript-plugin-dev
- Started: 2026-08-19T16:14:11.227Z
- Ended: 2026-08-19T16:16:18.057Z

## build
### PASS `bun run lint` (cwd: ., exit 0, 601ms)

```text
The number of diagnostics exceeds the limit allowed. Use --max-diagnostics to increase it.
Diagnostics not shown: 294.
Checked 614 files in 408ms. No fixes applied.
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
  

src\scripts\lib\auto-merge.mts:164:7 lint/complexity/useOptionalChain  FIXABLE  ━━━━━━━━━━━━━━━━━━━━

  ! Change to an optional chain.
  
    162 │ ): string {
    163 │   const { sliceTitle, sliceId, featureId, gradeAvg, decisionIds } = opts;
  > 164 │   if (!sliceTitle || !sliceTitle.trim()) {
        │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    165 │     throw new MergeError({
    166 │       code: "MERGE_FAILED",
  
  i Unsafe fix: Change to an optional chain.
  
    162 162 │   ): string {
    163 163 │     const { sliceTitle, sliceId, featureId, gradeAvg, decisionIds } = opts;
    164     │ - ··if·(!sliceTitle·||·!sliceTitle.trim())·{
        164 │ + ··if·(!sliceTitle?.trim())·{
    165 165 │       throw new MergeError({
    166 166 │         code: "MERGE_FAILED",
  

src\scripts\lib\auto-merge.mts:173:7 lint/complexity/useOptionalChain  FIXABLE  ━━━━━━━━━━━━━━━━━━━━

  ! Change to an optional chain.
  
    171 │     });
    172 │   }
  > 173 │   if (!sliceId || !sliceId.trim()) {
        │       ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    174 │     throw new MergeError({
    175 │       code: "MERGE_FAILED",
  
  i Unsafe fix: Change to an optional chain.
  
    171 171 │       });
    172 172 │     }
    173     │ - ··if·(!sliceId·||·!sliceId.trim())·{
        173 │ + ··if·(!sliceId?.trim())·{
    174 174 │       throw new MergeError({
    175 175 │         code: "MERGE_FAILED",
  

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
### PASS `bun test src/tests/ --parallel --timeout 60000` (cwd: ., exit 0, 126051ms)

```text
bun test v1.3.14 (0d9b296a) 20x PARALLEL
```

**stderr:**
```text
... (truncated, showing last 65536 bytes)
 https://github.com/org/testrepo/issues/21

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-g1GHtN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-g1GHtN — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-zedBHY (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-zedBHY — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-zedBHY (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-zedBHY — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-xyPt39 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-xyPt39 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-xyPt39 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-xyPt39 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-z0Qxfq (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-z0Qxfq — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\close-refusal.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cr-tier-b-g6Hv2j (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cr-tier-b-g6Hv2j — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-QZ0vz5 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-QZ0vz5 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\dispatch-merge.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/SLICE-CONF'
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
Already on 'slice/SLICE-SKIP'

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-e0VMPf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-e0VMPf — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-flat-JIGBhJ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-flat-JIGBhJ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\dispatch-metrics.test.mts:
[dispatch-metrics] write failed: ENOTDIR: not a directory, mkdir 'C:\Users\serge\AppData\Local\Temp\dm-test-ofht0Y\.claude\artifacts\loop\dispatch\run-block'

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-DEy0iL (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-DEy0iL — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-yH4vpg (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-yH4vpg — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-7SP9uV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-7SP9uV — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-7SP9uV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-7SP9uV — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-UkFeYP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-UkFeYP — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\github-sync.test.mts:
[github-sync] FEAT-001 ← GitHub issue #42: Add health endpoint
[github-sync] bootstrap: 1 created, 0 skipped
[github-sync] bootstrap: 0 created, 1 skipped
[github-sync] bootstrap: 0 created, 0 skipped
[github-sync] Published: 0 milestones, 1 issues, 0 sub-issues

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-MjbEYq (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-MjbEYq — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-MjbEYq (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-MjbEYq — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\github-sync.test.mts:
[github-sync] Published: 0 milestones, 0 issues, 0 sub-issues
[github-sync] Published: 0 milestones, 0 issues, 0 sub-issues

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\github-sync.test.mts:
[github-sync] publishFeat: FEAT-001 → #99

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-link-ts-keep-cyK5Y4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-link-ts-keep-cyK5Y4 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-aIsXSe (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-aIsXSe — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\github-sync.test.mts:
[github-sync] publishFeat: FEAT-001 → #10
[github-sync] publishSlice: SLICE-01 → #11 (sub of #10)

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-yGaS3D (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-yGaS3D — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\dispatch-recover.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'A.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'B.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'C.txt', LF will be replaced by CRLF the next time Git touches it

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\task-store-github-provider.test.mts:
[GithubProvider] gh CLI not found — skipping publishFeature
[GithubProvider] gh CLI not found — skipping postSliceComment
[GithubProvider] gh CLI not found — skipping syncPull
[GithubProvider] gh CLI not found — skipping bootstrap
[GithubProvider] gh CLI not found — skipping publishSlice
[GithubProvider] gh CLI not found — skipping closeSlice
[GithubProvider] gh CLI not found — skipping updateStatus
[GithubProvider] gh CLI not found — skipping publishSlice
[GithubProvider] gh CLI not found — skipping closeSlice
[GithubProvider] gh CLI not found — skipping postSliceComment
[GithubProvider] gh CLI not found — skipping updateStatus

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-eiLfMA (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-eiLfMA — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\close-refusal.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cr-warmup-ktfWl7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cr-warmup-ktfWl7 — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): review-gate: review artifact decision: rejected (20260704T120000Z-review-result-slice-01-test.md) — a rejected review cannot close; dispatch /devcrew:fix and re-review, record an explicit review_skipped, or use --force-close (audited) — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-2C29UE (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-2C29UE — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-DNRmhC (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-DNRmhC — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-DNRmhC (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-DNRmhC — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-link-JUiObp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-link-JUiObp — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-aHbpCK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-aHbpCK — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-JHmCeU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-dispatch-JHmCeU — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-lheLRk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-lheLRk — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-lheLRk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-lheLRk — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-infer-linkage-PpjRaK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-infer-linkage-PpjRaK — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\close-refusal.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cr-flag-off-X0HcpC (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cr-flag-off-X0HcpC — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: disabled
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-z05Or5 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-orchestrate-z05Or5 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-P4zJ7D (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-P4zJ7D — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-P4zJ7D (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-P4zJ7D — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\loop-iteration.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-8SAoKM (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-8SAoKM — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-integration-21FZP5 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-integration-21FZP5 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-refusal.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cr-force-lJnEOP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cr-force-lJnEOP — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-8v73sG (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-fullstack-8v73sG — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\dispatch-worktree.test.mts:
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.gitignore', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/artifacts/crew/handoffs/SLICE-X-handoff.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'extra.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'more.txt', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/artifacts/loop/backlog/triaged/SLICE-500.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.claude/artifacts/loop/backlog/pending/SLICE-501.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1AeSMx (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1AeSMx — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1AeSMx (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1AeSMx — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-ekb1th (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-ekb1th — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-kidokW (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-progress-signals-kidokW — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-Y3uxAD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-digest-Y3uxAD — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-8FTPuz — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-FHvGdv (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-learnings-noop-FHvGdv — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-E6sBOO — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-Gavufx (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-start-nodispatch-Gavufx — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-EfWUKf — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-qzyRj3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-qzyRj3 — falling back to local-only slice-id scan (remote max treated as 0).

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

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-quuIRN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-quuIRN — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\synergy.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-syn-whNEw6 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-syn-whNEw6 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-happy-hRaO3q (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-happy-hRaO3q — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-OcvN2G (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-OcvN2G — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-prRGQl (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-prRGQl — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-5CdlWV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-5CdlWV — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-ZGzHMr (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-ZGzHMr — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-l4EsgU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-l4EsgU — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-mahkMv (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-mahkMv — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-QicR0B (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-QicR0B — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-eLBYim (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-eLBYim — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-c7JFyI (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-c7JFyI — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-SWQc9l (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-SWQc9l — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-PzLyLo (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-PzLyLo — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-MKoEZY (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-MKoEZY — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-pQmB4E (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-pQmB4E — falling back to local-only slice-id scan (remote max treated as 0).

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

src\tests\synergy.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-syn-feat-phase-pfsllq (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-syn-feat-phase-pfsllq — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-none-xkbpRB (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-none-xkbpRB — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-blocked-M2vlvU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-blocked-M2vlvU — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-7KCfsU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-7KCfsU — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\synergy.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-syn-bare-sRZ4mf (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-syn-bare-sRZ4mf — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-skip-IZzeZj (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-skip-IZzeZj — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-dataflow-sCRihM (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-dataflow-sCRihM — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-idem-Vvw7pF (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-idem-Vvw7pF — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\synergy.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-syn-grade-K8yJTe (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-syn-grade-K8yJTe — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-nextaction-jmlagL (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-nextaction-jmlagL — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-zTnCRR (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-zTnCRR — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\synergy.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-G4HCAX (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-G4HCAX — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-G4HCAX (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-G4HCAX — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-G4HCAX (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v110-lessons-G4HCAX — falling back to local-only slice-id scan (remote max treated as 0).
[features] learnings-capture: enabled

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-waiver-KTJdB4 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-waiver-KTJdB4 — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-idmatch-IKJEC7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-idmatch-IKJEC7 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-OSHKbp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-OSHKbp — falling back to local-only slice-id scan (remote max treated as 0).
[tracker-close-sync] feature FEAT-001 tracker close failed (non-fatal): connection refused

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-Xsvwxg (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-Xsvwxg — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-sbTKZv (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-sbTKZv — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-GgDlR2 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-GgDlR2 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-kek7Mc (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-kek7Mc — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-DHTOVD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-DHTOVD — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-cFf99L (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-cFf99L — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-lK9ieO (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-lK9ieO — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-R1jsQs (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-R1jsQs — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-TSIa1k (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-TSIa1k — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-aBNMEo (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-aBNMEo — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-XePz7r (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-XePz7r — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-WtlnvZ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-WtlnvZ — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-tfst8t (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-tfst8t — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-RjBcla (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-RjBcla — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-kezK7O (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-kezK7O — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-FUaAYu (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-FUaAYu — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-TThKiD (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-TThKiD — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-11Jlv3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-11Jlv3 — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-11Jlv3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-11Jlv3 — falling back to local-only slice-id scan (remote max treated as 0).
[stale-blocked-badge] gates.blocked updatedAt=2026-08-17T16:16:17.547Z is 2.0d old (threshold 1d) — downgrading to a warning, feature roll proceeds. note: "2 days old" — clear it in C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-11Jlv3\.claude\state\crew\workflow-state.json or re-block.
[crew-bridge] cost-slice failed (slice=SLICE-02): cost-slice requires --started-at or an active/last run with startedAt

 3348 pass
 7 skip
 0 fail
 1568 expect() calls
Ran 3355 tests across 329 files. [126.03s]
```

### PASS `bun ./src/scripts/validate-manifests.mts` (cwd: ., exit 0, 87ms)

```text
Manifests OK:
  plugin.json      devcrew@1.0.0-rc.1
  package.json     devcrew@1.0.0-rc.1
  marketplace.json (absent — registry at astragenie/astra-marketplace)
```

### PASS `bun ./src/scripts/validate-content-length.mts` (cwd: ., exit 0, 89ms)

```text
Content length OK:
  agents (28 enforced, 14 exempt, cap=300 lines)
  skills (79 files, cap=200 lines)
```

## frontendBuild
_skipped (not configured for this preset/repo)_

## infraPlan
_skipped (not configured for this preset/repo)_

## aspireBoot
_skipped (not configured for this preset/repo)_
