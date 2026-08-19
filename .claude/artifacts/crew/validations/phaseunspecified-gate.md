# Phase Gate Report — phase unspecified — 2026-08-19T09:05:42.425Z

## Summary
- Status: FAIL
- Preset: typescript-plugin-dev
- Started: 2026-08-19T09:04:04.620Z
- Ended: 2026-08-19T09:05:42.425Z
- Note: P4 content+CI complete

## build
### PASS `bun run lint` (cwd: ., exit 0, 620ms)

```text
The number of diagnostics exceeds the limit allowed. Use --max-diagnostics to increase it.
Diagnostics not shown: 294.
Checked 609 files in 419ms. No fixes applied.
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
### FAIL `bun test --parallel` (cwd: ., exit 1, 97183ms)

```text
bun test v1.3.14 (0d9b296a) 20x PARALLEL
```

**stderr:**
```text
... (truncated, showing last 65536 bytes)
ote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-0uiDE2 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-touches-0uiDE2 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\grade-notes-memory.test.mts:
[features] learnings-capture: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-9qZR1l (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-touches-9qZR1l — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\grade-notes-memory.test.mts:
[features] learnings-capture: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-I63s0n (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-I63s0n — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\start-slice-recall-v1.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-off-mZLTzr (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-off-mZLTzr — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-4e0zRZ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-4e0zRZ — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-4e0zRZ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-idem-4e0zRZ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-link-ts-keep-GEiJqK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-link-ts-keep-GEiJqK — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-rFt2La (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-own-ac-no-warn-rFt2La — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice-learnings.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-learnings-eHmqKU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-learnings-eHmqKU — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-9Sn8vX (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-9Sn8vX — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-Cx0c38 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-fallback-warn-Cx0c38 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\git-anchored-completion.test.mts:
[git-anchored-completion] FEAT-001: 2 proposed slice(s) skipped as already-shipped (start index advances past them):
  - ordinal 1 (-SLICE-1 "Bridge") — matched commit a909ec2 "feat: FEAT-001 SLICE-1 — bridge shipped"
  - ordinal 2 (-SLICE-2 "ACL") — matched commit 9c5b3cf "feat: FEAT-001 SLICE-2 — ACL shipped"
[slice-linker] FEAT-001 -SLICE-3: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 3 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\gac-e2e-lmnVOk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\gac-e2e-lmnVOk — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-YCqXy8 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-create-no-ac-YCqXy8 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\start-slice-recall-v1.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-baseline-EGuOH3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-baseline-EGuOH3 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-on-MPCBLN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-on-MPCBLN — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-link-r9WUpw (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-link-r9WUpw — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-link-Se5azh (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-link-Se5azh — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-cGpbdG (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-update-fm-cGpbdG — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice-learnings.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-learnings-notes-ACWswS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-learnings-notes-ACWswS — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-2HQZgL (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-2HQZgL — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-2HQZgL (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-propagate-2HQZgL — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-renumber.test.mts:
[slice-renumber] SLICE-37 -> SLICE-48 failed partway through. Completed before the failure:
  - rename: .claude/artifacts/loop/ai-loop/slices/pending/SLICE_37_TEST_SLICE.md -> .claude/artifacts/loop/ai-loop/slices/pending/SLICE_48_TEST_SLICE.md
  - rename: .claude/artifacts/loop/grades/20260610T120000Z-grade-slice37.md -> .claude/artifacts/loop/grades/20260610T120000Z-grade-slice48.md

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-lkaUEV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-lkaUEV — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-blocked-q15HxK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-blocked-q15HxK — falling back to local-only slice-id scan (remote max treated as 0).
(fail) integration: startSlice → completeSlice blocked by validation gate keeps feature open [5000.39ms]
  ^ this test timed out after 5000ms.

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-sEHW8H (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-move-samedir-sEHW8H — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-uEr2HZ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-uEr2HZ — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-uEr2HZ (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-mono-uEr2HZ — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\start-slice-recall-v1.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-nohang-Ch7exL (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-recall-v1-nohang-Ch7exL — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\backlog-store-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-DYORin (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\bss-list-getbyid-DYORin — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-flat-o1ngxc (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-flat-o1ngxc — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\github-sync.test.mts:
[github-sync] FEAT-001 ← GitHub issue #42: Add health endpoint
[github-sync] bootstrap: 1 created, 0 skipped

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-YbMMbG (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-YbMMbG — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-YbMMbG (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-own-ac-YbMMbG — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-infer-linkage-SWs6IB (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-infer-linkage-SWs6IB — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-walker.test.mts:
[features] redundant-read-stop: enabled

src\tests\github-sync.test.mts:
[github-sync] bootstrap: 0 created, 1 skipped
[github-sync] bootstrap: 0 created, 0 skipped
[github-sync] Published: 0 milestones, 1 issues, 0 sub-issues

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-pureyaml-0GZ2A7 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-pureyaml-0GZ2A7 — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\github-sync.test.mts:
[github-sync] Published: 0 milestones, 0 issues, 0 sub-issues
[github-sync] Published: 0 milestones, 0 issues, 0 sub-issues

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled

src\tests\github-sync.test.mts:
[github-sync] publishFeat: FEAT-001 → #99

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\github-sync.test.mts:
[github-sync] publishFeat: FEAT-001 → #10
[github-sync] publishSlice: SLICE-01 → #11 (sub of #10)

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-Efm9J3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-Efm9J3 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-Efm9J3 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-idem-Efm9J3 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\auto-mode.test.mts:
[features] redundant-read-stop: enabled
[features] redundant-read-stop: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-IiaO9a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-IiaO9a — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-IiaO9a (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-comma-ac-IiaO9a — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-scaffold-gokHBd (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-scaffold-gokHBd — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] snapshot-autoregen: enabled

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-bu3ELn (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-small-bu3ELn — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-WGpa0h (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-flow-WGpa0h — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-regen-ea42Yo (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-regen-ea42Yo — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] snapshot-autoregen: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-NatJXu (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-NatJXu — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-NatJXu (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-shared-warn-NatJXu — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete-tracker-close.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-kbItjo (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-tracker-close-softfail-kbItjo — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice close ceremony still succeeds when the tracker provider throws (soft-fail) [5000.02ms]
  ^ this test timed out after 5000ms.

src\tests\slice-linker.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-qXsS8S (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-fu6-block-qXsS8S — falling back to local-only slice-id scan (remote max treated as 0).
[features] parallel-fe-be-variant: enabled

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-disabled-slZnhM (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-snapshot-disabled-slZnhM — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] snapshot-autoregen: disabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-DoyboY (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-single-proposed-DoyboY — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-du4A8X (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-progress-on-complete-du4A8X — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice also refreshes slice-progress [5001.87ms]
  ^ this test timed out after 5000ms.

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-happy-LshKEh (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-happy-LshKEh — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled

src\tests\slice-from-feature-proposed-slices.test.mts:
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1Z0N0f (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1Z0N0f — falling back to local-only slice-id scan (remote max treated as 0).
[slice-linker] FEAT-001 -SLICE-2: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 2 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1Z0N0f (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-1Z0N0f — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-Nuyl6w (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-touches-single-Nuyl6w — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-W60cv8 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-gate-W60cv8 — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-L7Rkuo (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-pause-telemetry-L7Rkuo — falling back to local-only slice-id scan (remote max treated as 0).
[features] close-refusal: enabled
[closeSlice] GATE_FAILED_AT_CLOSE (warn-mode 1/3): validation-gate: no validation artifact under .claude/artifacts/crew/validations/, no validation_passed/skipped badge in workflow-state, no explicit requires_validation: false waiver on slice — enforcing after warm-up.
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[features] learnings-capture: enabled
[features] snapshot-autoregen: enabled
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-weLyiN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-gate-weLyiN — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-MQKv49 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ac-pass-MQKv49 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-s58ewz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-ladder-gate-s58ewz — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-fill-M2u98A — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-OZSHch (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-OZSHch — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-j7AKFI (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-collision-force-j7AKFI — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\close-slice.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-VCcoQC (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\cs-cli-refuse-VCcoQC — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-43X7Vt (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-marathon-43X7Vt — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-skip-WtR70J (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-skip-WtR70J — falling back to local-only slice-id scan (remote max treated as 0).
(fail) integration: startSlice → completeSlice with --skip-validation-check bypasses gate [5002.23ms]
  ^ this test timed out after 5000ms.

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-relabel-h15WLS — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-NKQuzp (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-NKQuzp — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\worktree-manager.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-KjbjVG (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\wm-no-collision-KjbjVG — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-dataflow-A9BnZv (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-dataflow-A9BnZv — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-b9vpEb (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-b9vpEb — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice moves slice to completed/ and feature to done/ [5000.75ms]
  ^ this test timed out after 5000ms.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-vrvvfk (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-orch-model-null-vrvvfk — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-from-feature-proposed-slices.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP — falling back to local-only slice-id scan (remote max treated as 0).
[git-anchored-completion] FEAT-001: no resolvable main ref (fail-open) — proceeding unchecked.
[slice-linker] FEAT-001 -SLICE-1: no acceptance_criteria on this proposed_slices entry — copying FEAT-level ACs across 5 sibling slices. Scope this slice's AC section before close.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\sfp-gap-publish-safe-bCLTxP — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-rrmVkd (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-rrmVkd — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\integrations.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-NwXApz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-v19-handoff-NwXApz — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice writes a crew handoff artifact [5004.07ms]
  ^ this test timed out after 5000ms.

src\tests\slice-start.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-IxQ0e2 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-touches-files-frontmatter-IxQ0e2 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-pzPw4N (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-start-feat-dispatch-pzPw4N — falling back to local-only slice-id scan (remote max treated as 0).

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
warning: in the working copy of '.claude/artifacts/loop/backlog/pending/SLICE-501.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-nextaction-p45z4O (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-nextaction-p45z4O — falling back to local-only slice-id scan (remote max treated as 0).
(fail) integration: completeSlice nextAction always mentions slice grade command [5001.03ms]
  ^ this test timed out after 5000ms.

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-zDAb1W (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-spec-zDAb1W — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice auto-rolls parent spec to satisfied when all features done [5001.02ms]
  ^ this test timed out after 5000ms.

src\tests\integration.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-waiver-I3eqir (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-waiver-I3eqir — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\it-idmatch-pwiKpj (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\it-idmatch-pwiKpj — falling back to local-only slice-id scan (remote max treated as 0).

src\tests\slice-complete.test.mts:
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-qUANRq (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-complete-idem-qUANRq — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice is idempotent — re-running on a completed slice doesn't error [5000.89ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-3aZzbE (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-blocked-3aZzbE — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice blocked when featureEnd ceremony has simplifyRan: false [5001.92ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-fudx85 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-allowed-fudx85 — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice allowed when featureEnd ceremony has simplifyRan: true [5000.01ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-e4YUYz (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-slice-simplify-no-ceremony-e4YUYz — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice allowed when no featureEnd ceremony exists [5001.09ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-SvBBDw (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-fm-SvBBDw — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice keeps feature in-progress when feature_complete: false in frontmatter [5000.88ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-OdzjDd (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-keep-flag-OdzjDd — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice keeps feature in-progress when keepFeatureOpen runtime flag passed [5001.97ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-oejceU (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-explicit-true-oejceU — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice still moves feature to done when feature_complete: true explicitly set [5002.98ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-Yjy2gA (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-block-Yjy2gA — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-URkOAx (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-artifact-URkOAx — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-LNrw7C (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-passed-LNrw7C — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-d6rHME (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-pre-skipped-d6rHME — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-J8FctV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-waiver-J8FctV — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-VYQTx9 (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-empty-VYQTx9 — falling back to local-only slice-id scan (remote max treated as 0).
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-bJtTbK (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-vgate-skip-ok-bJtTbK — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice --skip-validation-check with reason bypasses gate [5000.47ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-6LMiAV (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-red-6LMiAV — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice returns updated_confidence red when builderEvidence has test-fail [5000.05ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-bAmOnj (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-builder-evidence-null-bAmOnj — falling back to local-only slice-id scan (remote max treated as 0).
(fail) completeSlice returns updated_confidence null when no builderEvidence [5000.92ms]
  ^ this test timed out after 5000ms.
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-rmTAak (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-fresh-rmTAak — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-R7axVo (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-stale-R7axVo — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-yCh5dN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-yCh5dN — falling back to local-only slice-id scan (remote max treated as 0).
[crew-bridge] cost-slice failed (slice=SLICE-01): cost-slice requires --started-at or an active/last run with startedAt
[slice-id-allocator] git fetch origin main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-yCh5dN (offline / no remote / no network?) — remote slice-id scan may use a stale or missing origin/main ref.
[slice-id-allocator] git ls-tree origin/main failed for C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-yCh5dN — falling back to local-only slice-id scan (remote max treated as 0).
[stale-blocked-badge] gates.blocked updatedAt=2026-08-17T09:05:42.041Z is 2.0d old (threshold 1d) — downgrading to a warning, feature roll proceeds. note: "2 days old" — clear it in C:\Users\serge\AppData\Local\Temp\al-blocked-threshold-yCh5dN\.claude\state\crew\workflow-state.json or re-block.
[crew-bridge] cost-slice failed (slice=SLICE-02): cost-slice requires --started-at or an active/last run with startedAt
The system cannot find the path specified.

 5030 pass
 124 skip
 47 fail
 5729 expect() calls
Ran 5201 tests across 505 files. [97.16s]
```

## frontendBuild
_skipped (not configured for this preset/repo)_

## infraPlan
_skipped (not configured for this preset/repo)_

## aspireBoot
_skipped (not configured for this preset/repo)_
