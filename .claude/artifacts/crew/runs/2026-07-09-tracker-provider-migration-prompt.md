# Operation: Tracker-Provider Migration + Autonomous Issue Flow (v5, 2026-07-09)

Execution prompt. Feed to a fresh session or `/runner:intake --spec`.
Research basis: 2026-07-09 three-agent investigation (call sites, prompt scan,
linear/github-sync state) — findings inlined below as verified context.
v4: Phase 0.5 re-baseline EXECUTED same day — see "## Re-baseline 2026-07-09"
at the bottom; the In-flight dependency section below is updated accordingly.
v5: architecture review APPROVED-WITH-CONDITIONS
(`.claude/artifacts/crew/reviews/2026-07-09-tracker-provider-plan-review.md`);
conditions COND-A..E folded in below, marked [COND-x].
NOTE (review F8): line-number anchors in this doc drift — re-grep the emit
block / getProvider / publish sites immediately before Phase 1 code, do not
trust cited numbers verbatim.

## Mission

Runner-plugin goal #1 is autonomous, high-quality agent work. This program:
(1) routes ALL backlog/issue lifecycle mutations through a provider abstraction
(file / GitHub / Linear / composite), (2) implements the Linear provider for real,
(3) connects the loop to DORA practices and cross-repo issue open/close by agents —
by INTEGRATING with the already-approved 2026-07-07 DORA + Watcher plans, not
re-designing them.

## In-flight dependency (read this first — updated at re-baseline 2026-07-09)

DORA/Watcher landing state as of 2026-07-09 evening (see Re-baseline section for
evidence):

- **Landed**: runner-plugin PR #406 (`pr.merged` + `spec.created` loop events —
  emitter-module + schema + index.json + fanoutEnvelope pattern); astrarunner
  PR #582 (agent-ops-snapshot ingest pipeline + endpoint).
- **NOT landed**: DORA A2 producer wiring — now filed as **FEAT-247 (P1,
  triaged)**: moveFeature still emits only {featId, fromState, toState}; the
  emitter interface already accepts priority/category/relates_to/createdAt.
  Also FEAT-248 (backfill emitter, P2) and astrarunner A1 honesty fix pending.
- **Watcher track filed**: FEAT-242 (B1 tick/registry/scheduler) IN-PROGRESS with
  SLICE-143–146; FEAT-243 (B1.5 pilot), FEAT-244 (B3 permissions), FEAT-245
  (C1 IssueBroker), FEAT-246 (C3 queue) triaged.

Hard rules derived from this:

1. **Phase 1 depends on FEAT-247 landing first.** It is small (pm_effort 0.3, P1)
   and rewrites the exact emit block Phase 1 refactors. Let the loop close
   FEAT-247, then start Phase 1 preserving its moveFeature integration test
   green and untouched. Do not absorb or parallel it.
2. **FEAT-245 (C1 IssueBroker) explicitly defers the LinearProvider slot to C2**
   ("LinearProvider slot documented as pending C2, deferred"). This program's
   Phase 3 IS C2. When Phase 3 lands, notify/unblock the IssueBroker composition
   point so Linear targets become fileable.
3. **FEAT-242 (B1) is in-progress (4 slices).** Avoid concurrent edits to
   webhook-fanout / envelope surfaces until B1 closes; Phase 5c work queues
   behind it if slices are still open.
4. Phase 5c event emission MUST copy the PR #406 pattern: dedicated
   `<kind>-emitter.mts` module, payload schema under `schemas/loop-events/` +
   `index.json` registry entry, shared `fanoutEnvelope` sink, no-op without
   webhook config, idempotency handled server-side. Proposed kinds:
   `issue.published`, `issue.closed`.

## Context (verified 2026-07-09 — re-verify at Phase 0.5, DORA landing will drift line numbers)

Repo: C:\work\mega\runner-plugin (Bun, ESM .mts). Sibling: C:\work\mega\dev-team.

Provider layer (FEAT-024): `src/scripts/lib/task-store/` — TaskStoreProvider
(publishFeature, publishSlice, closeSlice, postSliceComment, updateStatus, syncPull,
bootstrap); GithubProvider real (wraps scripts/lib/github-sync/*.mjs); LinearProvider
stub (all throw); NoopProvider. Mirror contract — local files are source of truth.
getProvider() called ONLY at loop.mts:1923 (github sync|bootstrap). Bypasses:
loop.mts:1002/1343/1459 auto-publish + setup|publish|feat-publish|status subcommands
import github-sync.mjs directly.

Backlog files: `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Direct fs writers: backlog-writer.mts (canonical, 8 callers),
slice-linker/{complete-slice,feature-lifecycle,close-slice}.mts,
wave/failure-pivot.mts, doctor.mts.

Linear: LINEAR_API_KEY is set as a user-level env var on this machine (never commit
it; never write it to loop.json; user advised to rotate post-setup). Workspace
Astragenie, team key AST, teamId 81cea472-33a9-4fbe-a797-147e17c6ca05.
scripts/linear-sync/ is a FEAT-102 webhook prototype (mention parser + router),
unit-tested, wired to nothing; FEAT-102 sits in done/ with unsatisfied AC.

Approved sibling plans (READ THESE FIRST):
- `.claude/artifacts/crew/runs/2026-07-07-dora-implementation-plan.md` (+ -dora-acs-eta.md)
- `.claude/artifacts/crew/runs/2026-07-07-watcher-implementation-plan.md` (+ -watcher-acs-eta.md)

Key rulings already made there (do NOT relitigate):
- IssueBroker (C1) is a SEPARATE port in the watcher subsystem, NOT a
  TaskStoreProvider method (ISP: task-store is repo-bound lifecycle sync; issue
  targets may have no loop config). It COMPOSES Github/Linear provider impls.
- C2 = LinearProvider real implementation — same work item as this program's
  Phase 3; implement ONCE, serving both task-store lifecycle and IssueBroker.
- DORA A2 = moveFeature envelope field-forwarding (see in-flight dependency above).

dev-team prompt offender (only one across both repos):
commands/architect-feature.md Step 3 (lines ~128-148) hand-writes FEAT frontmatter
tags. Everything in runner-plugin is already CLI-routed (DEC-058 pm-apply pattern).

## Ground rules

- Ceremony: /runner:intake --spec to file FEATs, /runner:start, /runner:close.
  Review gate always. Architect → DEC before Phase 1 code.
- CI green every phase: bun test, biome, tsc --noEmit, validate-imports,
  validate-manifests. Complexity cap 15. No process.exit in libs.
- Back-compat: github.enabled:true repos keep working; unconfigured repos stay noop.
- Don't overburden: DORA/Watcher tracks stay independently sequenced; this program
  only (a) shares the two overlapping work items, (b) adds small "finesse" hooks
  that improve agent autonomy without new scope.

## Phases

### Phase 0 — hygiene
- Reconcile FEAT-102 (done-but-unsatisfied): supersede with new FEAT citing unmet AC.
- Decide fate of scripts/linear-sync/ prototype (fold mention-parser/types into
  Phase 3 work or delete; architect decides, record DEC).

### Phase 0.5 — DORA re-baseline checkpoint (gate for Phase 1)
**Executed 2026-07-09 — see Re-baseline section at bottom.** Residual gate before
Phase 1 code: confirm FEAT-247 reached done/ (A2 moveFeature wiring). If more time
passed since 2026-07-09, re-run the anchor checks (moveFeature emit block,
loop.mts publish sites, FEAT-242/245 status) before trusting this document.

### Phase 1 — storage seam (BacklogStore)
- Architect designs BacklogStore interface (createFeature, updateFeatureFrontmatter,
  moveFeature, createSlice, updateSliceFrontmatter, moveSlice, listByState, getById).
- **Feature side** (mechanical): backlog-writer.mts functions become thin delegates.
  Caller count is 11 files (review F7), not 8 — re-grep before sizing.
- **[COND-A] Slice side is NEW CONSTRUCTION, budget separately**: no canonical
  slice-writer exists. Consolidate scattered raw fs writes —
  slice-linker/complete-slice.mts (moveAndStampSlice), feature-lifecycle.mts
  (materializeSingleSlice/materializeProposedSlices) — into
  createSlice/updateSliceFrontmatter/moveSlice. wave/failure-pivot.mts mutates
  frontmatter via hand-rolled regex (not shared frontmatter.mjs): explicitly decide
  port-to-mergeFrontmatter (with behavior verification) vs documented exception;
  record the decision in the Phase 1 DEC.
- Preserve DORA A2 envelope behavior + integration tests (see Phase 0.5).
- **[COND-D] CI guard = explicit allowlist** (mirror validate-imports.mts
  BOUNDARIES style), not a bare "no fs on backlog paths" rule. Decide doctor.mts
  classification UP FRONT: moves onto the store, or named allowlist exception
  (its reconciliation does content-level surgery, not lifecycle ops). Tests/fixture
  writers under backlog dirs also allowlisted. Register gate in CLAUDE.md CI list.

### Phase 2 — unify tracker path through getProvider
- Route loop.mts auto-publish sites and github setup|publish|feat-publish|status
  through getProvider(). Behavior identical for github-enabled repos (test).
- After this, taskStore.provider is the single switch for ALL mirror traffic.

### Phase 3 — real LinearProvider (== Watcher plan C2; one implementation)
- **[COND-B, do FIRST] Stamping + composite contract DEC before any Phase 3 code**:
  publishFeature returns ONE id, but composite publish must stamp BOTH
  `github_issue:` and `linear_issue:`. Locate today's stamping call site
  (github-sync createFeatureIssue vs caller-side) and decide: (a) widen interface
  to return per-provider id map, or (b) CompositeProvider owns frontmatter
  stamping for every child. Phase 3 and Phase 4 implement whichever the DEC picks —
  deciding after Phase 3 means reworking it.
- Write methods against Linear GraphQL (https://api.linear.app/graphql):
  issueCreate (feature), issueCreate+parentId (slice), workflow-state transition
  (closeSlice/updateStatus), commentCreate.
- **[COND-C] syncPull/bootstrap are NOT a thin wrap** (GithubProvider delegates to
  an existing engine with pagination; Linear has no such engine). Default: descope
  syncPull + bootstrap to documented warning-stubs in v1 and file a follow-up FEAT
  for full sync (cursor pagination, team/project filtering, rate-limit handling —
  Linear allows ~1500 req/h per key). Architect may instead keep them in scope with
  the estimate raised accordingly; either way the DEC states it.
- Auth: LINEAR_API_KEY env var first, token-store.mts fallback entry second.
- Config: taskStore.linear { teamKey: "AST", projectId?, stateMap? } with defaults
  pending→Backlog, triaged→Todo, in-progress→In Progress, done→Done.
- Soft-fail contract per provider-interface.mts (warn + null, never throw).
  External id stamped as `linear_issue:` frontmatter (mirrors github_issue:).
- Tests: injectable fetch/mock transport; no live API in CI. One documented manual
  smoke against the Astragenie workspace in the validation artifact.
- Design for reuse by IssueBroker (C1): expose the low-level Linear ops so the
  broker composes them without importing task-store lifecycle logic.

### Phase 4 — CompositeProvider
- CompositeProvider(providers[]): fan out mirror calls in order; per-child error
  isolation; id recording per the COND-B DEC made in Phase 3 (map-return or
  composite-owns-stamping — both external ids must end up in frontmatter).
- **[COND-B] Partial-failure visibility**: warn-level log that distinguishes
  "provider not configured" from "provider configured but call failed" per child.
  Rationale: github-ok/linear-fail returns a valid id with no signal, and Phase 5a
  close-time Linear calls then silently no-op — operator must at least see the warn
  trail. Retry/alerting explicitly deferred (follow-up FEAT if pilot shows need).
- Config: taskStore.providers: ["github","linear"] (array beats singular).
  Resolution order unit-tested incl. github.enabled back-compat.
- Docs page: BacklogStore (storage, always file today) vs TaskStoreProvider
  (mirror) split.

### Phase 5 — autonomous issue flow (finesse pass; heavy lifting stays in Watcher track)
- Small hooks that improve agent autonomy now, without waiting for the watcher:
  a. `/runner:close` posts the close-comment + closes the mirrored issue via
     provider (today only manual `github sync` reconciles) — evidence-rich close
     comments (grade summary, PR link) = DORA-grade traceability per slice.
  b. `/runner:intake --from-issue` accepts Linear issue URLs, not just GitHub
     (parse → provider fetch → FEAT), so a Linear ticket can seed the loop.
     Note: FEAT-242's watcher reactions call `intake --from-issue` — once this
     lands, Linear issues become watchable findings with zero watcher changes.
  c. Emit `issue.published` / `issue.closed` loop events following the landed
     PR #406 pattern exactly: dedicated emitter module, schema under
     schemas/loop-events/ + index.json entry, fanoutEnvelope sink, no-op without
     webhook, canonical `ts` field. Gives astrarunner issue open→close
     timestamps for lead-time/MTTR.
- Sequencing: queue Phase 5 work until FEAT-242 (B1) slices close — shared
  envelope/fanout surface.
- Do NOT build the watcher tick, IssueBroker, or cross-repo queue here — those are
  FEAT-242/245/246 with their own gates (FEAT-243 pilot soak, FEAT-244 tokens).
  This program's contract with them: LinearProvider ops reusable by IssueBroker
  (Phase 3 = C2, the slot FEAT-245 defers) and provider layer switchable per-repo
  (Phase 2/4).

### Phase 6 — prompt hygiene + docs + release
- CLI subcommand `backlog tag-merge --id FEAT-NNN --tags a,b` (through BacklogStore);
  rewrite dev-team commands/architect-feature.md Step 0+3 to call it (mirror its own
  Step 4 pattern). Re-run prompt scan across both repos → zero direct-write hits.
- Update CLAUDE.md task-store section, docs/halt-badges.md if new badges,
  CHANGELOG via runner:document-writer. Regenerate loop-snapshot. /crew:ship.

## Acceptance (whole program)

- Flipping taskStore.provider/providers between noop|github|linear|composite changes
  all publish+sync behavior, zero code edits.
- Slice close in a linear-configured repo closes the Linear issue with an evidence
  comment automatically.
- A Linear issue URL can seed a FEAT via intake.
- Issue open/close events flow to loop-events ingest in the DORA-shipped envelope
  schema (lead-time-ready signal).
- [COND-E] In-repo, CI-enforced: allowlist guard blocks new direct backlog fs
  writes (runner-plugin CI).
- [COND-E] Cross-repo, manual Phase 6 step (NOT a CI AC): dev-team prompt scan
  re-run confirms zero direct tracking-file write instructions; result recorded
  in the Phase 6 validation artifact.
- Composite partial failure emits the distinguishing warn (test-asserted).
- DORA A2 field-forwarding behavior preserved through the Phase 1 refactor
  (its integration tests green, untouched).

## Re-baseline 2026-07-09 (Phase 0.5 executed)

Evidence gathered same day the prompt was written:

- **Landed**: runner-plugin PR #406 "feat(dora): emit pr.merged + spec.created
  loop events" — new `pr-merged-emitter.mts`, `spec-created-emitter.mts`,
  `schemas/loop-events/{pr-merged,spec-created}.schema.json` + index.json,
  `cli-args.mts` extraction, pr-watch `--slice-id/--feat-id` flags. astrarunner
  PR #582 = ingest pipeline + endpoint (#494/#502).
- **NOT landed**: A2 — verified `origin/main:src/scripts/lib/backlog-writer.mts`
  moveFeature emit block still passes only `{featId, fromState, toState}`;
  `backlog-state-emitter.mts` interface already accepts the four DORA fields.
  grade-writer.mts still emits `recordedAt` (no `ts` dual-emit). astrarunner
  DoraController has no `implemented` flag yet (A1 pending).
- **Backlog mapping** (plan letters → filed FEATs): B1=FEAT-242 (in-progress,
  SLICE-143–146), B1.5=FEAT-243, B3=FEAT-244, C1=FEAT-245 (LinearProvider slot
  deferred to C2 = this program's Phase 3), C3=FEAT-246, A2=FEAT-247 (P1
  triaged, gates Phase 1), A3-backfill=FEAT-248.
- **Conclusions applied to this prompt**: Phase 1 gated on FEAT-247 done;
  Phase 5 queued behind FEAT-242 closure; Phase 5c copies PR #406 emitter
  pattern; Phase 3 committed as C2 for FEAT-245's composition slot.
