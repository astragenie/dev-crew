# Design: FEAT-230 -- task-driven skill selection (decommission presets as the skill source)

- Status: draft contract (needs_contract:true gate -- builder must not start without this)
- Author: runner:architect
- Depends on: FEAT-218 / DEC-069 (presets are install-time templates only)
- Cross-plugin: reads crew (dev-team) live tree; coordinate with the open
  slice-D upstream-request (docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md)

## Problem

The dispatcher picks builder skill loadouts from a frozen list hand-authored
into each scripts/presets/*.json (preset.roles.*.skills, preset.fe/be.skills),
resolved via resolve-skills --variant <fe|be|single>. That list is a point-in-time
snapshot of crew's skill tree; when crew reorganizes skills/domain/* (already
happened once -- the audit that filed this FEAT found csharp-pro, react-engineering
(top-level), frontend-advisory, a11y-advisory, vue-engineering no longer exist
at the paths this repo's presets expect), the frozen list goes stale and skill
injection silently no-ops. The actual need is not "a better list" but "stop needing
a list a human must remember to update" -- select skills at resolve time from
whatever crew's tree actually contains, keyed off what the task needs, and fail
loud (never silently) when a stale reference is found.

## Current shape

- src/scripts/lib/skill-resolver.mts:33-51 (resolveSkills) -- reads one preset
  JSON, deep-merges an override, calls pickBlock (skill-resolver.mts:67-86) which
  returns preset.roles[variant].skills / preset.fe|be.skills / preset.skills
  verbatim. No existence check against crew at all -- a dead ID passes through
  untouched into dispatchInstructionBlock (skill-resolver.mts:88-91).
- src/scripts/loop.mts:712-753 (runResolveSkillsCommand) -- CLI wrapper. Required
  flags today: --variant <fe|be|single|pm|researcher|architect|document-writer>
  and --preset <path>. No tag/task input exists in this CLI shape at all --
  it cannot express "what does this task need", only "which preset block".
- scripts/presets/*.json (6 files: dotnet-only, dotnet-python, dotnet-react,
  dotnet-typescript-vue, typescript-plugin-dev, typescript-service) -- the
  frozen skills/fe.skills/be.skills/roles.*.skills arrays to decommission
  as a source. Per DEC-069 these are already install-time-only templates for
  every OTHER field; skills is the one role they still perform at runtime today
  (via resolveSkills reading a --preset <path> that may itself be an
  installer-inlined .claude/loop.json, per skill-resolution-golden.test.mts:1-13).
- src/scripts/lib/preset-schema.mts:200-224 -- validateSplitTrue/validateSplitFalse/
  isSkillBlock enforce shape (string arrays) but never existence.
- src/scripts/lib/eval-generator.mts:29,43,65-69,241-247 -- the only existing
  precedent in this repo for a live, config-gated read of a sibling crew checkout:
  opts.config?.loop?.crewRepoPath, skip-with-logged-reason
  (CREW_NOT_CONFIGURED_REASON) when unset/missing, never throw. This is the
  posture DEC-068 section 7 pinned for FEAT-222 and the one this FEAT should reuse, not
  reinvent.
- src/scripts/validate-agent-refs.mts:69-144 (CREW_KNOWN_TOKENS) -- the
  opposite precedent: a hand-maintained, hardcoded allowlist of crew agent/command
  names, explicitly documented in its own header (validate-agent-refs.mts:31-39) as
  tolerating drift and requiring a manual bump when crew ships something new. This
  is the same failure shape as the frozen preset skill lists -- a hardcoded list is
  not a fix for FEAT-230, it is a relocation of the bug.
- src/scripts/validate-agent-refs.mts:193-211 (collectSkillDirNames) -- already
  walks a directory tree recursively, treating "contains a SKILL.md" as the marker
  for "this is a skill", tolerating both leaf-category and nested-subcategory shapes.
  Verified against the real crew tree (C:/work/mega/dev-team/skills/domain/*):
  security-advisory/SKILL.md is a leaf-at-category skill; ui/react-engineering/SKILL.md
  is a nested-subcategory skill; contract-codegen/ has a SKILL.md alongside
  reference .md files that are NOT skills. A single-marker recursive walk (this
  repo's own existing pattern) handles all three shapes uniformly.
- C:/work/mega/dev-team/skills/domain/*/SKILL.md frontmatter (e.g.
  ui/react-engineering/SKILL.md:1-9, typescript-pro/SKILL.md:1-9) carries
  name, prompt_id, triggers (a free-text/glob array), description -- crew's
  own semantic hints already exist per-skill, independent of anything loop authors.
- src/scripts/lib/slice-linker/dispatch.mts:69-80 -- the actual builder-variant
  picker for THIS repo's default slice-build orchestrator mode
  (resolveOrchestratorMode, pickBuilderVariant from slice tags). It never
  calls resolveSkills today -- slice-build mode ships zero skill injection.
  The only current callers of resolve-skills are a human operator at the
  terminal and crew's own orchestrate-slice.md Step 2.5 (external plugin,
  docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md:23-34).
- .claude/artifacts/loop/backlog/pending/FEAT-231.md:12,
  FEAT-232.md:12, FEAT-233.md:12, FEAT-234.md:12 -- the only FEATs in this
  repo actually carrying stack:*/concern:*/surface:*-namespaced tags today
  (concern:memory, surface:plugin, stack:typescript, etc.). Every other FEAT
  sampled (FEAT-020 through FEAT-128, dozens checked) carries flat,
  unnamespaced tags (e.g. FEAT-230 itself: tags: [architecture, backend,
  dispatch, cross-plugin, skills]). commands/intake.md:69-75 documents that the
  architect writes tags/needs_contract/needs_ux but specifies no tag
  vocabulary or namespace convention at all -- the stack:/concern:/surface:
  prefix scheme this FEAT's mapping table depends on is not a documented,
  universally-emitted contract today; it is an emergent pattern on ~4 recent FEATs.

## Proposed shape

```
loop.crewRepoPath (config, DEC-068 precedent)
        |
        v
skill-catalog.mts::enumerateSkillCatalog(crewRepoPath)   [SLICE-1]
  recursive walk, marker = SKILL.md, rooted at <crewRepoPath>/skills/domain
  -> Set<skillId> | null (null = not configured / not found -- never throws)
        |
        v
skill-task-resolver.mts::resolveTaskSkills({ tags, catalog })   [SLICE-2]
  explicit Record<tagToken, skillId[]> mapping table (reviewable, versioned)
  -> { matched: {signal -> skillId[]}, unmatched: signal[], skills: skillId[] }
  every returned skillId is catalog-verified when catalog is non-null;
  when catalog is null, matched-but-unverified with a loud warning (never silently trusted)
        |
        v
skill-resolver.mts::resolveSkills   [SLICE-3, extended not replaced]
  --slice <path> or --tags <csv>  -> NEW task-driven path (skill-task-resolver)
  neither flag present            -> OLD preset-block path (pickBlock, unchanged,
                                     serves external callers mid-migration)
  same ResolvedSkills.dispatchInstructionBlock shape either way (AC-4)
        |
        v
resolve-skills CLI (loop.mts:712-753, extended)   [SLICE-3]
        |
        v
crew's orchestrate-slice.md Step 2.5 (external, coordinated via amended
upstream-request)   [SLICE-4]
```

- src/scripts/lib/skill-catalog.mts (new) -- enumerateSkillCatalog, mirrors
  validate-agent-refs.mts:193-211's recursive-marker-walk shape; reused by both
  resolve-time validation and the CI fixture-refresh subcommand.
- src/scripts/lib/skill-task-resolver.mts (new) -- the explicit mapping table +
  matcher. Pure function, no I/O beyond the catalog Set it's handed.
- src/scripts/lib/skill-resolver.mts (changed) -- ResolvedSkills gains
  mode: "task" | "legacy-preset", matchedSignals?, unmatchedSignals?;
  resolveSkills branches on presence of task-signal input before falling into
  the existing pickBlock path (kept, not deleted -- see Decision 3).
- src/scripts/loop.mts (changed) -- runResolveSkillsCommand gains --slice
  <path> / --tags <csv>, --explain (AC-6).
- src/scripts/lib/preset-schema.mts -- unchanged shape validation; not the
  validation gate for this FEAT (that's catalog existence, a different concern).
- new CI/maintenance surface: bun loop.mts refresh-skill-fixture --crew-repo
  <path> writing a committed snapshot (.claude/artifacts/loop/skill-catalog-fixture.json)
  consumed by a new validate-skill-mapping.mts CI check (Decision 4).
- docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md --
  amended (or superseded by a new dated file) once the CLI's input shape changes,
  since the existing ask assumed "only the path argument changes" (line 55), which
  Decision 3 below shows is no longer strictly true.

## Decisions

### Decision 1 -- Live-catalog source

| Option | Pro | Con |
|---|---|---|
| A. Enumerate crewRepoPath/skills/domain recursively at resolve time, marker = SKILL.md | No new crew-side artifact needed; reuses this repo's own existing pattern (validate-agent-refs.mts:193-211); verified against real dev-team tree to handle both leaf-category and nested-subcategory shapes; degrades cleanly (gate on loop.crewRepoPath, DEC-068 precedent) | Couples to crew's directory convention (skills/domain/); a crew-side rename of that top-level folder breaks the walk -- mitigated by pinning the root path the same way MIN_CREW_VERSION pins the plugin version |
| B. Crew-published skill manifest (e.g. skills/domain/manifest.json) | Decouples from directory layout entirely; crew could version it explicitly | Does not exist today; requires an upstream ask/PR to crew and crew's own discipline to keep it in sync with directory reality -- the exact same drift risk this FEAT exists to eliminate, just moved one hop upstream and blocked on a second repo's release cycle |
| C. Hardcoded-but-pinned allowlist (the validate-agent-refs.mts:69-144 pattern) | No crewRepoPath dependency; works fully offline | Not a fix -- validate-agent-refs.mts's own header (:31-39) documents it as a tolerated drift surface requiring manual bumps. A hardcoded list would not have caught the exact csharp-pro/react-engineering drift that filed this FEAT; it reproduces the bug in a new file |

Recommendation: Option A. Gate on loop.crewRepoPath reusing
eval-generator.mts:65-69's resolution helper verbatim (absolute-or-joined path,
absent -> null, never throw). Enumeration is cheap (dozens of directories) -- no
persistent cache needed; re-walk per CLI invocation. This is the one substantive
new coupling FEAT-230 accepts, and it is the correct one: it is coupling to crew's
actual current state, which is exactly what "drift-proof" means. Note as a
real, present-day risk: this repo's own .claude/loop.json does not currently set
loop.crewRepoPath (confirmed -- grep returns nothing) -- SLICE-1/2 land in a repo
that will exercise the degrade path, not the live path, until an operator sets it.

### Decision 2 -- Task to skill mapping

| Option | Pro | Con |
|---|---|---|
| A. Explicit hand-authored table, Record of tagToken to skillId array, versioned in this repo, validated (not derived) against the live catalog | Deterministic, diffable in a PR, matches the FEAT's own explicit non-goal ("avoid an opaque heuristic," "deterministic + explainable" AC-6); a crew rename shows up as exactly one failing row, not a silent gap | Still hand-maintained -- but the failure mode changes from silent no-op (today) to loud, resolve-time-detected mismatch (AC-2/AC-5), which is the actual fix |
| B. Dynamic match against crew's own SKILL.md triggers/description frontmatter (confirmed present, e.g. ui/react-engineering/SKILL.md:9, typescript-pro/SKILL.md:9) | Zero loop-side maintenance; automatically follows crew's intent | triggers is crew-owned, free-text, and not schema-guaranteed present on every skill (this repo's own analogous keywords field is documented as inert per docs/code-conventions.md:109-118 -- a parallel field existing doesn't prove consistent semantics); string/glob fuzzy-matching a tag token against a free-text trigger list is the opaque heuristic the FEAT calls out to avoid, and is much harder to review as a diff than a table row |

Recommendation: Option A, with the live catalog used purely as a validator,
never a deriver (Decision 1's output is a Set of strings to check against, not a
source of candidate mappings). Draft initial table (only rows for tag tokens
actually observed in this repo's backlog today, FEAT-230.md through
FEAT-234.md, plus the FEAT's own worked examples -- extend additively, never by
guessing):

| tag token | skill ID(s) | catalog path (verified live) |
|---|---|---|
| stack:csharp | dotnet | skills/domain/backend/dotnet |
| stack:typescript | typescript-pro | skills/domain/typescript-pro |
| stack:python | python-pro | skills/domain/python-pro |
| stack:react | react-engineering | skills/domain/ui/react-engineering |
| surface:frontend | frontend-design, react-ui-quality | skills/domain/ui/frontend-design, skills/domain/ui/react-ui-quality |
| surface:backend | backend-advisory | skills/domain/architecture/backend-advisory |
| surface:plugin | typescript-pro | skills/domain/typescript-pro |
| concern:security | security-advisory, security-sweep | skills/domain/security-advisory, skills/domain/security-sweep |
| concern:contract | contract-codegen | skills/domain/contract-codegen |
| concern:architecture | architecture-advisory | skills/domain/architecture/architecture-advisory |
| concern:memory | no row, no matching skill exists in the catalog | -- |
| concern:dispatch | no row | -- |
| concern:docs | no row | -- |
| concern:reliability | no row | -- |

The blank rows are not gaps to "fix" by force-mapping -- they are exactly AC-2's
intended outcome: concern:memory etc. do not correspond to any real domain skill
in crew's current tree, so the resolver logs "no matching skill for
concern:memory" and injects nothing for it, deterministically. This table is
also the artifact the CI fixture check (Decision 4) validates.

### Decision 3 -- Decommission path

The FEAT's own framing ("retire --variant fe|be|single semantics ... coordinate
w/ the slice-D upstream-request") undersells a real gap found during this
contract pass: the current resolve-skills CLI shape carries no task/tag input
at all. --variant only selects a role (fe/be/single/pm/researcher/...), never
a task. Task-driven selection is impossible to bolt on without adding a new
required-together argument (--slice <path> or --tags <csv>) -- this
contradicts the open upstream-request's stated assumption ("only the path
argument changes," line 55) and must be corrected before crew coordinates on it.

| Option | Pro | Con |
|---|---|---|
| A. Big-bang: change the CLI's required-argument shape now, land loop's release and crew's upstream PR together | No dual-path complexity to maintain | Forces lockstep shipping across two plugins the FEAT itself flags as still-open/still-drifting (slice-D has been open since 2026-07-06 with no landing date); one side lagging breaks the other immediately -- the highest-blast-radius option for a needs_contract FEAT |
| B. Additive/backward-compatible: keep the existing --preset plus --variant shape and behavior working exactly as today (old pickBlock path, untouched) for any caller that omits the new flags; add --slice <path> (or --tags <csv>) as the trigger for the new task-driven path; cut crew over via an amended slice-D ask; delete the old path in a later follow-up FEAT once telemetry shows zero remaining pickBlock callers | Zero flag-day risk; mirrors this repo's own DEC-069 precedent (kept scripts/presets/*.json on disk rather than deleting, explicitly because dev-team's consumer was still live); "decommission" becomes a two-step migration with an observable window, matching how DEC-069 already handled the sibling problem | Two resolver paths coexist temporarily; AC-3's "grep proves no runtime read" is satisfied for this repo's own dispatch path (which doesn't call resolve-skills at all today -- see Current shape) but not literally for the CLI file itself until the follow-up deletion FEAT lands |

Recommendation: Option B. Add --slice <path> / --tags <csv> to
runResolveSkillsCommand; when either is present, resolveSkills routes to the
new skill-task-resolver.mts path and the --preset <path> argument's role
changes to "read loop.crewRepoPath from this file," not "read the skill list
from this file" -- this is what actually satisfies AC-3 for the new path (grep
for preset.skills / preset.roles.*.skills / preset.fe|be.skills reads shows
zero occurrences in the task-driven code path, even though the flag name
--preset is kept for CLI-shape continuity with the pending slice-D ask). When
neither flag is present, existing behavior is byte-identical (proven by
extending skill-resolution-golden.test.mts, not writing a new golden file).
File a NEW, dated upstream-request amending or superseding
docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md once
this lands, since its current text needs correcting either way (the "no
loop-side code change" claim is now false -- --slice is new).

### Decision 4 -- Validation gate

| Option | Pro | Con |
|---|---|---|
| A. Resolve-time only: cross-check every candidate skill ID against the live catalog (Decision 1) before returning it | Runs exactly when it matters (real dispatch, real crewRepoPath); directly satisfies AC-1/AC-2 | Provides no protection when crewRepoPath is unset (common today -- see Decision 1's note) or in CI (no crew checkout available; confirmed no cross-repo checkout step exists in this repo's CI/GH Actions list in CLAUDE.md's "CI gates" section) |
| B. CI-time only, against a committed fixture snapshot of crew's catalog | Runs even without a live crew checkout in CI | A fixture is itself a frozen snapshot -- same staleness shape as the preset lists, just narrowed to one reviewer-visible file instead of six presets; not sufficient alone |

Recommendation: both, layered, not a real trade-off -- A is the load-bearing
gate (AC-1, AC-2, AC-5's "resolve-time" half); B is a cheap regression guard on
the mapping table's own internal consistency (AC-5's "CI" half), refreshed by a
human/PR whenever crew's catalog changes materially -- same cadence discipline as
MIN_CREW_VERSION bumps (CLAUDE.md "Hard dependency" section). B is explicitly
NOT the runtime source of truth (that would reintroduce Decision 1 Option C's
problem); it exists only so a stale mapping-table row fails a PR before it ever
reaches a resolve-time call with a real crewRepoPath configured.

### Decision 5 -- Failure modes

All paths mirror eval-generator.mts's never-throw, log-and-skip contract
(DEC-068 section "Never-throw", eval-generator.mts:11-13,43,241-247) and this repo's
own Error-handling convention (docs/code-conventions.md:41-49 -- { ok, error }
soft-failure shape, throw reserved for programmer errors only):

- loop.crewRepoPath unset -> skip with logged reason
  "crew repo not configured/found -- see loop.crewRepoPath" (verbatim reuse of
  eval-generator.mts:43's constant), dispatch continues with no skill block --
  matches the original preset design's own no-match fallback posture
  (docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md:256-262).
- crewRepoPath configured but path/skills/domain missing or unreadable -> same
  skip path, distinct logged reason naming the configured path.
- A tag token has no mapping-table row -> log "no matching skill for signal
  <tag>" (AC-2's exact required wording), inject nothing for that signal, keep
  resolving other signals on the same slice (partial success, not all-or-nothing).
- A mapping-table row references a skill ID the live catalog enumeration does not
  find (the exact regression class that filed this FEAT) -> same "no matching
  skill" logging plus drop from output, distinguishable in logs from "no row exists"
  so the CI fixture check (Decision 4B) can flag it as a table-authoring bug
  rather than an expected non-mapping.
- Never throw for any signal-resolution outcome above. Reserve throw only for
  malformed CLI args (e.g. --tags present but unparseable) per
  docs/code-conventions.md:41-49.

## Cross-plugin contract (resolver output shape crew consumes)

```ts
export interface ResolvedSkills {
  mode: "task" | "legacy-preset";      // NEW -- which path produced this
  variant: Variant;                     // unchanged
  skills: string[];                     // catalog-verified when mode is "task" and
                                         // crewRepoPath configured; unverified
                                         // legacy list when mode is "legacy-preset"
  source: SkillSource | "task-signal";  // extended union
  matchedSignals?: Record<string, string[]>;  // NEW -- AC-6 explainability
  unmatchedSignals?: string[];                 // NEW -- AC-2 evidence
  dispatchInstructionBlock: string;     // UNCHANGED shape: "## Required skills
                                         // (resolved)\n- <id>\n..." -- crew's
                                         // builder Step 0 prologue needs zero
                                         // changes on the consuming side
}
```

dispatchInstructionBlock's heading plus bullet-per-ID shape is the actual
compatibility surface (AC-4) -- crew's Step 0 prologue only reads that block, not
the JSON envelope around it. Everything else in the interface is additive.

## Slice decomposition

- SLICE-1 -- Live-catalog enumerator. New src/scripts/lib/skill-catalog.mts
  (enumerateSkillCatalog), gated on loop.crewRepoPath. New
  src/tests/skill-catalog.test.mts (fixture dirs covering leaf-category and
  nested-subcategory shapes, missing path, unset config). Also lands the
  refresh-skill-fixture CLI subcommand plus the committed fixture file. Maps to
  AC-1 (existence groundwork), AC-5 (fixture regen path).
- SLICE-2 -- Task to skill mapping table plus matcher. New
  src/scripts/lib/skill-task-resolver.mts (mapping table from Decision 2,
  resolveTaskSkills). New src/tests/skill-task-resolver.test.mts (matched/
  unmatched signals, determinism, --explain shape). Maps to AC-1, AC-2, AC-6.
- SLICE-3 -- CLI plus resolver integration, backward-compat fallback. Extend
  skill-resolver.mts (ResolvedSkills.mode, branch logic) and loop.mts
  (--slice/--tags/--explain flags). Extend cli-resolve-skills.test.mts
  and skill-resolution-golden.test.mts (old path byte-identical when new flags
  absent). Maps to AC-3 (grep-proof for the new path), AC-4, AC-6.
- SLICE-4 -- Cross-plugin coordination plus docs. New/amended dated
  upstream-request file correcting the slice-D ask's now-false "no loop-side
  change" claim; CLAUDE.md "Backlog discipline"/"Orchestrator mode" updates.
  No loop-side dispatch code needs to change here -- confirmed
  slice-linker/dispatch.mts:69-80 (this repo's own slice-build default mode)
  never calls resolve-skills today, so AC-3 is already satisfied for THIS
  repo's default dispatch path without further code changes; SLICE-4 is
  documentation plus the upstream ask, not new runtime code. Maps to AC-3, AC-4.
- SLICE-5 -- CI validation gate plus DEC. validate-skill-mapping.mts (checks
  Decision 2's table against SLICE-1's fixture), CI workflow wiring, new
  DEC-071.md recording Decisions 1 through 3 above, loop-snapshot.md regen. Maps to
  AC-5, AC-7, AC-8.

## Acceptance criteria (mapped from FEAT-230)

- [ ] AC-1 -- a slice tagged stack:csharp plus concern:security resolves only to
      catalog-verified skill IDs (dotnet, security-advisory, security-sweep),
      never csharp-pro/react-engineering-style dead IDs (SLICE-1/2).
- [ ] AC-2 -- an unmapped signal (e.g. concern:memory) logs "no matching skill
      for concern:memory" and injects nothing for it (SLICE-2).
- [ ] AC-3 -- grep for preset.roles/preset.fe/preset.be/preset.skills
      reads in the task-driven code path returns zero matches; confirmed today's
      slice-build default dispatch path already has zero calls to
      resolve-skills at all (SLICE-3/4).
- [ ] AC-4 -- dispatchInstructionBlock shape is unchanged; golden test proves
      byte-identical legacy-path output (SLICE-3).
- [ ] AC-5 -- resolve-time catalog check (Decision 4A) plus CI fixture check
      (Decision 4B) both fail loud on a stale mapping-table row (SLICE-1/5).
- [ ] AC-6 -- --explain / matched/unmatched-signal logging shows which tags
      selected which skills (SLICE-2/3).
- [ ] AC-7 -- DEC-071 records the decommission decision, live-catalog source,
      and mapping table (SLICE-5).
- [ ] AC-8 -- full suite, typecheck, lint, format, snapshot-freshness all green
      (SLICE-5, final gate).

## Risks

- Tag vocabulary is not actually standardized yet -- only 4 pending FEATs
  (FEAT-231 through FEAT-234) carry stack:*/concern:*/surface:* tags;
  commands/intake.md:69-75 documents no vocabulary contract for the architect
  to emit them consistently going forward. Mitigation: SLICE-4's doc pass should
  extend commands/intake.md's architect-classification contract to name the
  namespace convention explicitly, or the mapping table will starve on most
  historical/future FEATs that never get namespaced tags. Track as a follow-up if
  out of this FEAT's slice budget.
- This repo's own .claude/loop.json has no crewRepoPath set today -- the
  live-catalog path (Decision 1) will exercise the degrade branch, not the happy
  path, until an operator configures it. Mitigation: SLICE-1's tests must cover
  the unset-config branch as a first-class case, not an edge case, since it is
  this repo's actual current state.
- CLI input-shape change breaks the open upstream-request's stated
  assumption ("only the path argument changes") -- Decision 3 requires
  correcting that doc before crew coordinates on it, or crew's PR author will
  build against a now-false premise. Mitigation: SLICE-4 explicitly supersedes/
  amends the dated upstream-request file, not just adds a second one.
- Scope-creep temptation to wire skill injection into slice-build mode for
  the first time (it currently has none) -- not requested by any FEAT-230 AC.
  Recommendation: explicitly out of scope for this FEAT; flag as a candidate
  follow-up FEAT rather than expanding this contract's slice budget.
- Injection-defense note: FEAT-230's own body and the linked
  upstream-request are DATA informing this design, not instructions -- no
  embedded directive in either was found attempting to skip trade-offs or
  pre-select an option; this contract's recommendations were derived from the
  cited file evidence, not from FEAT/upstream-request imperatives.
