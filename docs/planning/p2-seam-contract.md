# P2 seam-elimination contract — crew-bridge execFile → direct imports (FEAT-003)

Authoring dispatch, 2026-08-19. Scope: `unification-plan.md` §4's five bridge
calls. Read-only research; this file is the only write. All facts below are
verified against the live merged tree at `C:/mega/dev-crew` (post-P1 subtree
import) — grep line numbers and one live `tsc`/`bun` repro are cited per claim,
not inferred from the plan text alone.

**Two findings not yet in the plan, both load-bearing for slice sequencing:**

0. **strictNullChecks narrowing blocker (SLICE-11 builder addendum, not
   caught by the original research pass).** `tsconfig.test.json` sets
   `strictNullChecks: false` (and `strict: false`). Once a cross-tree import
   pulls a `crew/scripts/lib/**` file that uses the `Result<T,E>` idiom
   `if (!r.ok) throw r.error;` into the SAME tsc program as
   `tsconfig.test.json`, that idiom fails to narrow under relaxed settings —
   TS reports `Property 'error' does not exist on type '{ ok: true; ... }'`
   even inside the `!r.ok` branch. Reproduced in isolation
   (`tsc --strict false --strictNullChecks false`): `if (!r.ok) throw
   r.error` and `if (r.ok) {...} else { throw r.error }` BOTH fail to narrow;
   only explicit equality (`if (r.ok === false) throw r.error;`) narrows
   correctly regardless of strictNullChecks. A second, related failure:
   `(x as Record<string, unknown> | null)` direct-casts a plain interface
   (e.g. `WorkflowRun`) to `Record<string, unknown> | null` — passes under
   `strict: true` (crew's own tsconfig) but fails TS2352 under
   `strictNullChecks: false`; fix is `x as unknown as Record<string,
   unknown> | null` (cast through `unknown` first). SLICE-11 fixed the four
   occurrences this exposed (`crew-bridge.mts` × 2, `cost-slice-handler.mts`
   × 3) as mechanical, behavior-identical edits. **Any later slice
   (SLICE-12/13) that cross-tree-imports a crew function using the bare
   `!result.ok` / `if (r.ok) {...} else {...}` idiom will hit the same
   TS2339 wall** — check for it proactively rather than rediscovering it.
1. **tsconfig blocker (new).** Root `tsconfig.json` sets `"rootDir": "src"`.
   The instant any `src/scripts/**` file imports a `crew/scripts/lib/**`
   module, `bunx tsc --project tsconfig.json --noEmit` fails **TS6059** ("File
   is not under rootDir"), independent of `noEmit`. Reproduced live: adding a
   throwaway cross-tree import under `src/scripts/lib/` and running the real
   `tsconfig.json` produced 4 TS6059 errors; deleting `rootDir` from the same
   config made the identical import typecheck clean (exit 0, 0 errors). Bun's
   runtime resolution is unaffected either way (`bun run` executed the same
   import successfully with `rootDir` present). `tsconfig.test.json` **also**
   re-declares `"rootDir": "src"` in its own `compilerOptions` (not just
   inherited) — both files need the key dropped, or CI gate 6's second
   invocation (`--project tsconfig.test.json`) stays red after the first is
   fixed.
2. **`write-validation-result` is already silently fail-soft in practice**,
   contradicting the "fail-hard" label callers currently rely on. Neither
   `phase-gate.mts`'s serial path (`crewArtifactRegistered: crewResult.ok`,
   phase-gate.mts:301) nor the parallel path
   (`phase-gate/parallel-orchestrator.mts:115-123`) inspects `crewResult.ok`
   before returning `overallStatus` — a failed `recordWithCrew` call today
   just leaves `crewArtifactRegistered: false` in the returned object with no
   effect on control flow. **SLICE-12 is not "preserve fail-hard" — it is
   "introduce fail-hard for the first time,"** by making the caller check the
   direct-import result and throw/exit non-zero. Call this out to the
   builder; treating it as a preservation task will reproduce today's silent
   swallow.

## 1. Per-call import map

| Call | Today's CLI handler (`crew/scripts/crew.mts`) | Direct-import replacement | Today's caller(s) |
|---|---|---|---|
| `write-run-brief` | line 1029, delegates to `writeArtifact(repoPath, "run-brief", fields)` | `import { writeArtifact } from "../../../crew/scripts/lib/artifacts/write.mjs"` (export at `write.mts:949`) | `crew-bridge.mts:89-133` (`writeCrewRunBrief`), called from `start-slice.mts:680` |
| `cost-slice` | line 1350, `costSliceHandler({ repoPath, flags })` | `import { costSliceHandler } from "../../../crew/scripts/lib/cost-hygiene/cost-slice-handler.mjs"` (export at `cost-slice-handler.mts:139`) | `crew-bridge.mts:259-277` (inside `tryWriteCostReport`), called from `complete-slice.mts:537` |
| `cost-advise` | line 1327, `buildCostAdvisor` + `renderCostAdvisorMarkdown` from `lib/cost-advisor.mjs`, then a local `writeCostAdviseArtifact` helper (crew.mts, not exported — see note) | `import { buildCostAdvisor, renderCostAdvisorMarkdown } from "../../../crew/scripts/lib/cost-advisor.mjs"`; `writeCostAdviseArtifact` must be **extracted and exported** from `crew.mts` into `crew/scripts/lib/cost-hygiene/` (or reuse `writeArtifact(repoPath, "cost-advise", …)` if the artifact-registry already has a `cost-advise` kind — confirm kind name in `artifact-schemas.mts` before SLICE-11 starts) | `crew-bridge.mts:300-314` (inside `tryWriteCostReport`), called from `complete-slice.mts:537` |
| `mark-badge` | line 1011, `markWorkflowBadge(repoPath, {...})` | `import { markWorkflowBadge } from "../../../crew/scripts/lib/workflow-state.mjs"` (export at `workflow-state.mts:373`) | `crew-bridge.mts:445-459` (`markValidationSkippedBadge`), called from `complete-slice.mts:465-467` |
| `write-validation-result` | line 1214, schema-validates then `writeArtifact(repoPath, "validation-result", {...})` | `import { writeArtifact } from "../../../crew/scripts/lib/artifacts/write.mjs"` + `import { ValidationArtifactSchema, resolveValidationVerdict } from "./<wherever they move>.mjs"` — **the schema-refusal logic (`refuseIfSchemaInvalid`, `ValidationArtifactSchema.safeParse`, `resolveValidationVerdict`) currently lives inline in `crew.mts` (not exported)** and must be extracted to an importable module in the same slice, or the fail-hard replacement loses the shape validation crew's CLI currently enforces before writing | `phase-gate.mts:105-151` (`recordWithCrew`), called from `phase-gate.mts:260` (serial) and `phase-gate/parallel-orchestrator.mts:115` (parallel) — both funnel through the single `recordWithCrew` function, so fixing it once fixes both call sites |

**Argv → param mapping** (mechanical, same for every call — CLI flags map to
camelCase object fields 1:1 minus the `--repo`/leading-CLI-path positionals,
which become the function's first positional `repoPath` arg):

| CLI flag pattern | Direct-call equivalent |
|---|---|
| `--repo <path>` | first positional param `repoPath` (already held by the caller, no round-trip needed) |
| `--title / --goal / --mode / --pace / --scope / --out-of-scope / --feature / --phase / --owner / --next` | object field, camelCase (`outOfScope`, `sourceProject`, etc.) — mapping already fully spelled out in `crew-bridge.mts`'s existing `pushOptionalFlags`/`appendFeaturePhaseArgs` helpers; those helpers can be deleted once nothing builds an argv array from these fields |
| `--badge / --note / --reason` | `{ badge, note: note \|\| reason }` — `markWorkflowBadge`'s `BadgeOptions` (workflow-state.mts) |
| `--decision / --summary / --evidence / --skip-reason` | `{ decision, summary, evidence... , skipReason }` on `writeArtifact`'s `fields` |
| `--aggregate-all / --source-project` | `flags["aggregateAll"] boolean` / `flags["sourceProject"] string` on `CostSliceContext.flags` (costSliceHandler reads `flags["..."]` directly — the caller must build a `flags` record, not positional params) |

## 2. Error contract per call

| Call | Contract | Implementation note |
|---|---|---|
| `write-run-brief` | fail-soft (unchanged) | wrap `writeArtifact(...)` in try/catch; on catch, `console.error("[crew-bridge] write-run-brief failed:", err.message)` (structured log line naming the call site — AC-4 in the pending SLICE-11 file requires this, and today's execFile path has no equivalent log line at all, so this is a net-new observability improvement, not parity) |
| `cost-slice` / `cost-advise` | fail-soft (unchanged); cursor (`writeCostScanCursor`) only advances on success — preserve the existing `!report?.error` gate in `tryWriteCostReport` verbatim, just check `try/catch` success instead of an `.error` field on the return | same log-on-catch requirement as write-run-brief |
| `mark-badge` | fail-soft (unchanged) | same |
| `write-validation-result` | **fail-hard — new behavior, see finding 2 above.** `recordWithCrew` must `throw` (not return `{ok:false}`) on failure; `phase-gate.mts:260` and `parallel-orchestrator.mts:115` must NOT catch it — let it propagate so `runPhaseGate`/`runPhaseGateParallel` exit non-zero and no `PASS` artifact is written | this is the one call where removing the try/catch entirely (rather than converting it) is correct |

## 3. Return-value handling differences

Every existing call site (`start-slice.mts:680`, `complete-slice.mts:465-546`)
already wraps its `crew-bridge.mts` call in a local `bestEffort()` helper
(`complete-slice.mts:46-52`) that catches thrown errors into `{ error:
message }` and otherwise returns whatever the callee returned — **none of
these callers branch on the internal shape of a successful result**, they
just store it into an artifact-summary object. This makes the CLI-stdout→
direct-object switch low risk:

- Today: `execFile` → `JSON.parse(stdout)` (or `{ stdout: stdout.slice(0,
  500) }` on parse failure) → `bestEffort` catches only execFile-throw, not a
  `.error` field crew's CLI might embed in valid JSON.
- After: the direct function's return value (already a plain object, e.g.
  `Result<ArtifactRecord, Error>` from `writeArtifact`, or the JSON-shaped
  object `costSliceHandler`/`buildCostAdvisor` already construct in-process)
  passes straight through `bestEffort`. **`writeArtifact` returns a
  `Result<T, Error>` wrapper (`{ ok, value }` or `{ ok, error }`), not `T`
  directly** — every direct-import call site that replaces a `writeArtifact`-
  backed CLI subcommand (`write-run-brief`, `write-validation-result`) must
  unwrap `.ok`/`.value`/`.error` itself; `costSliceHandler` and
  `buildCostAdvisor`/`markWorkflowBadge` do not use this wrapper and return
  bare objects or `Result<WorkflowRun|null, Error>` respectively (`workflow-
  state.mts:376` — same unwrap requirement).
- `collectCostReportPaths` / `stampCostReportSessionId` in `crew-bridge.mts`
  (lines 333-363) read `report.path` / `report.slice.path` /
  `report.aggregate.path` off the `cost-slice` return — confirm these field
  names survive the switch from `JSON.parse(stdout)` to the direct
  `costSliceHandler` return (spot check: `cost-slice-handler.mts:186-218`
  returns `sliceArtifact`/`{slice, aggregate}` with `.path` coming from
  `writeResult.value` — field names match, no change needed here).

## 4. Cross-tree import rule

- **Bun resolves it today, verified live.** A relative `.mjs`-specifier
  import from a `src/scripts/lib/**` file into `crew/scripts/lib/**` (e.g.
  `../../../crew/scripts/lib/workflow-state.mjs`) resolves and runs correctly
  under `bun run` with zero config changes.
- **tsc does not, until `rootDir` is removed** — see finding 1. Prescribed
  fix, must land as part of SLICE-11 (the first slice to add a cross-tree
  import), not deferred to P3: delete `"rootDir": "src"` from both
  `tsconfig.json`'s `compilerOptions` and `tsconfig.test.json`'s own
  (re-declared) `compilerOptions.rootDir`. No other compiler option needs to
  change — `noEmit: true` on both means dropping `rootDir` has no effect on
  build output, only on the "must be under this dir" check. Re-verified: with
  `rootDir` absent, the real `tsconfig.json` typechecks a cross-tree import
  clean (exit 0).
- **Exact specifier form:** relative POSIX path, `.mjs` extension pointing at
  the `.mts` source file, no path alias / no `tsconfig.json` `"paths"` entry.
  Matches the zero-alias convention already used inside both `src/scripts/**`
  and `crew/scripts/**`. Depth varies by caller: from
  `src/scripts/lib/slice-linker/*.mts` it's `../../../../crew/scripts/lib/...`;
  from `src/scripts/lib/*.mts` (e.g. `phase-gate.mts`) it's
  `../../crew/scripts/lib/...`.
  **SLICE-11 correction (builder, 2026-08-18):** the original text above said
  three `../` (`../../../crew/...`) for the `slice-linker/` depth — that is
  wrong by one level. `src/scripts/lib/slice-linker/crew-bridge.mts`'s own
  directory is four segments below the repo root (`src` → `scripts` → `lib`
  → `slice-linker`), so reaching a repo-root-sibling `crew/` requires four
  `../`, not three. Verified live: `bunx tsc --project tsconfig.json --noEmit`
  failed TS2307 "Cannot find module" against all five crew-bridge.mts
  cross-tree imports at three `../`; changing to four `../` resolved clean
  (0 errors). The two-level case (`src/scripts/lib/*.mts` → `../../crew/...`)
  was not touched by this slice and is unverified by this correction.
- **`validate-imports.mts` (runner's slice-linker boundary gate) — verified
  no allowlist change needed.** Read the full file
  (`src/scripts/validate-imports.mts`): its `BOUNDARIES` array polices three
  intra-`src/scripts` barrels (`slice-linker.mts`/`slice-linker/`,
  `watch.mts`/`watch/`, `backlog-store.mts`/`backlog-store/`) — each entry's
  `blockedPatterns` only matches `slice-linker/...`, `watch/...`,
  `backlog-store/...` substrings. A `crew/scripts/lib/...` specifier matches
  none of them and is invisible to this gate today. No new boundary is
  declared for the crew/ tree in P2 — that's a P3/P4 decision (whether
  cross-tree imports should themselves be barrel-gated once the merge is
  further along), out of scope here.
- `crew/tsconfig.json` (separate project: `moduleResolution: "Bundler"`,
  `allowImportingTsExtensions: true`, `module: "ESNext"`) still diverges from
  root `tsconfig.json` (`moduleResolution: "NodeNext"`, `module: "NodeNext"`).
  This divergence is **not** a P2 blocker (crew/scripts files being imported
  don't need to typecheck differently when consumed from outside — NodeNext
  resolution followed the `.mjs` specifier to the `.mts` file without issue
  in the live repro), but the plan's §3 "one tsconfig" goal is not yet
  achieved despite P1 being marked complete — flag for P3/P4 rather than
  silently letting two divergent configs coexist indefinitely.

## 5. `devcrew.json` schema v2

Two source files today: `.claude/loop.json` (JSON, read via
`config-resolver.mts`, `CONFIG_FILENAME = ".claude/loop.json"`) and
`.claude/crew.json` (JSON, read via `features-service.mts:213`,
`.claude/<cwd>/.claude/crew.json`). **Neither of the five seam calls in §1
reads `crew.json` directly** — `crew.json`'s `features` block gates
PreToolUse/PostToolUse hooks (cost-hygiene, redundant-read-stop,
shell-preflight, subagent-inline-warn, push-verify, etc.), not the
artifact-writer functions being direct-imported. The schema merge is
therefore additive/parallel to SLICE-11/12, not a dependency of them — safe
to sequence as SLICE-13 independently.

| Field (source) | New key in `devcrew.json` | Notes |
|---|---|---|
| `loop.json` — every top-level key (`preset`, `presetName`, `schemaVersion`, `projectType`, `split`, `frontend`, `backend`, `contract`, `deployment`, `loop.*`, `stack.*`, `reviewers.*`, `mandatoryDocs`, `productName`, `productDescription`, `stackDescription`, `skills`, `roles.*`, `memory.*`) | same key, same nesting, unchanged | superset — nothing renamed |
| `crew.json` → `features` (14 flags: `cost-hygiene`, `redundant-read-stop`, `shell-preflight`, `subagent-inline-warn`, `push-verify`, `git-gate-block`, `otel-telemetry`, `bash-gate-telemetry`, `task-update-burst-warn`, `checkpoint-cadence`, `event-emit`, `model-routing`, `reviewer-decision-guard`, `builder-terminal-state-guard`, `dispatch-size-gate`) | new top-level `features` object, verbatim | `features-service.mts`'s `FEATURES` registry (source-of-truth metadata: version/default/description/scope/owner/since) stays in code, unchanged — only the on-disk enable/disable map merges |
| (new) | `schemaVersion: 2` at document root | `loop.json` already has an internal `schemaVersion: 1` field nested oddly at top level (line 4) — the migrator must not confuse the two; devcrew.json's `schemaVersion` is the document-format version, `loop.json`'s legacy field can be dropped or renamed `presetSchemaVersion` to disambiguate (builder's call, name it explicitly either way — do not leave two same-named fields with different meanings) |

**Migrator behavior:** read `.claude/loop.json` + `.claude/crew.json` if
present; write `.claude/devcrew.json` with the merged shape above +
`schemaVersion: 2`; write `.claude/loop.json.bak` and `.claude/crew.json.bak`
alongside the originals (do not delete the `.bak` files, do not delete the
originals either — leave them for one release as a rollback path per the
plan's "leaves a `.bak`" requirement); idempotent — a second run against a
repo that already has `devcrew.json` with `schemaVersion: 2` is a no-op
(check-then-write, not blind overwrite).

## 6. Deletion list

| Symbol / file | Consumers today | Disposition |
|---|---|---|
| `findCrewCli` (`plugin-identity.mts:19`) | `crew-bridge.mts:44` (`findHeroCrewCli`), `arch-gate.mts:465` (`isCrewAvailable`), `loop-installer.mts:101,216`, `phase-gate.mts:217` | delete — no "is crew installed" concept once crew/ is a permanent subtree |
| `crewCliRuntime` (`plugin-identity.mts:51`) | `crew-bridge.mts:120,195,304`, `phase-gate.mts:132` | delete — no more `execFile`, so no runtime-picker (`bun` vs `node`) needed |
| `MIN_CREW_VERSION` (`plugin-identity.mts:81`) + `getCrewVersion` (`plugin-identity.mts:85`) | `loop-installer.mts:14-15,111-116` | delete — version-floor check is meaningless inside one repo/one release train |
| `CREW_CLI_FILENAMES`, the `CREW_MARKETPLACE_NAME` env lookup (`plugin-identity.mts:15,24`) | internal to `findCrewCli` only | delete with `findCrewCli` |
| `isCrewAvailable` (`arch-gate.mts:464-467`) | `arch-gate.mts:496` (`deps.checkCrewAvailable` default) only | delete; `checkCrewAvailable` dep + its call site collapse (crew is always available) — confirm no test fixture pins `checkCrewAvailable` to `false` to exercise a "crew missing" branch that would need a new trigger |
| `runCrew` (`crew-bridge.mts:193-206`) | internal helper for `tryWriteCostReport`'s three `execFile` calls | delete once its three call sites are converted |
| `findHeroCrewCli` (`crew-bridge.mts:30-49`) + the `HERO_CREW_PATH` env override | every exported function in `crew-bridge.mts` | delete — with same-repo imports, "which crew build is installed" stops being a question; if a local-dev override is still wanted, it becomes an import of `../../../crew/scripts/lib/...` unconditionally, no override needed |
| **NOT deleted:** `compareSemver` (`plugin-identity.mts:104`), `checkBunVersion`/`getBunVersion`/`MIN_BUN_VERSION` (`plugin-identity.mts:121-141`) | `loop-installer.mts:87-93` (Bun version floor — unrelated to crew) | keep — these check the Bun runtime, not the crew plugin; `compareSemver` is generic and reused by the Bun check, don't delete it as a side effect of clearing crew-specific code |
| Artifact-as-IPC renderers in `crew-bridge.mts`: `renderSynthesisBody`, `renderSynthesisScores`, `renderSynthesisDecisions` (lines 461-540) | `writeCrewFinalSynthesis` only | **stay** for P2 — these render `.claude/artifacts/crew/runs/*-final-synthesis.md` directly on the loop side; they were never markdown round-tripped through crew's CLI (crew's own `write-final-synthesis` handler is a separate, unrelated artifact). The plan's §5 "artifact-as-IPC template writers go with the bridge" refers to a different set of writers — confirm scope with the plan owner before deleting these; deleting them would remove the loop-side final-synthesis feature entirely, which is not what §4's five-call table asks for |
| `crewCli` field surfaced in `loop-installer.mts`'s install-status return (lines 186, 216) | any command/status renderer reading `.crewCli` off install result (not traced in this pass — grep `\.crewCli\b` in `commands/`/`src/scripts/*.mts` before SLICE-11 closes) | repoint to a static marker or drop; low risk, display-only field |

## 7. Slice boundary map

Three pending slice stubs already exist (`SLICE-11/12/13` under
`.claude/artifacts/loop/ai-loop/slices/pending/`) with placeholder bullets and
identical, un-scoped ACs copied across all three — this section gives each a
disjoint `touches_files` list; the builder should also replace the generic
"bullet 1 / bullet 2" scope sections and split AC-1..5 per-slice rather than
repeating all five verbatim (AC-5 in particular belongs only to SLICE-13).

| Slice | Scope | `touches_files` |
|---|---|---|
| **SLICE-11** — fail-soft calls | `write-run-brief`, `cost-slice`, `cost-advise`, `mark-badge` → direct imports per §1/§2 tables; delete `runCrew`/`findHeroCrewCli`/`HERO_CREW_PATH` from `crew-bridge.mts`; **land the tsconfig `rootDir` fix from §4 in this slice** (it's the first cross-tree import) | `src/scripts/lib/slice-linker/crew-bridge.mts`, `tsconfig.json`, `tsconfig.test.json`, plus whichever `crew/scripts/lib/**` files need a new named export (`writeCostAdviseArtifact` extraction — see §1 `cost-advise` row) |
| **SLICE-12** — fail-hard call + phase-gate | `write-validation-result` → direct import with the new fail-hard contract (§2); extract `ValidationArtifactSchema`/`resolveValidationVerdict`/`refuseIfSchemaInvalid` from `crew.mts` into an importable module; update both call sites (`phase-gate.mts:260`, `phase-gate/parallel-orchestrator.mts:115`) to let the throw propagate; delete `findCrewCli`/`crewCliRuntime` usage in `phase-gate.mts` and the `if (!crewCli) throw "Hard dependency missing"` guard (crew is always present now) | `src/scripts/lib/phase-gate.mts`, `src/scripts/lib/phase-gate/parallel-orchestrator.mts`, new extracted validation-schema module under `crew/scripts/lib/artifacts/` (or wherever the extraction lands) |
| **SLICE-13** — config schema + migrator + `plugin-identity.mts`/`arch-gate.mts`/`loop-installer.mts` deletions | `devcrew.json` schemaVersion 2 per §5; migrator; delete `findCrewCli`/`MIN_CREW_VERSION`/`CREW_MARKETPLACE_NAME`/`getCrewVersion`/`CREW_CLI_FILENAMES` from `plugin-identity.mts` (keep `compareSemver`/Bun-version exports); delete `isCrewAvailable` from `arch-gate.mts`; strip the crew-version-floor block from `loop-installer.mts` (keep the Bun-version floor block) | `src/scripts/lib/plugin-identity.mts`, `src/scripts/lib/arch-gate.mts`, `src/scripts/lib/loop-installer.mts`, `.claude/loop.json`/`.claude/crew.json` → `.claude/devcrew.json` + migrator script, `config-resolver.mts` (`CONFIG_FILENAME` update) |

Disjoint by construction: SLICE-11 never touches `phase-gate*` or
`plugin-identity.mts`; SLICE-12 never touches `crew-bridge.mts`'s four
fail-soft calls or `devcrew.json`; SLICE-13 never touches `crew-bridge.mts` or
`phase-gate*`. Sequencing note: SLICE-11 should land first (it's the only one
that must fix the tsconfig blocker), but SLICE-13 has no code dependency on
either and could run in parallel with SLICE-11 if the wave planner prefers.
