---
id: SLICE-56
title: "Repoint agents/*.md invocations to dist/ bundles, excluding 3rdparty (53 refs, 19 files)"
status: pending
feature: FEAT-037
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
effort_points: 2
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 100000
tags: ["stack:typescript"]
---
# SLICE-56: Repoint agents/*.md invocations to dist/ bundles, excluding 3rdparty (53 refs, 19 files)

Implements FEAT-037. See [feature file](../../../backlog/in-progress/FEAT-037.md) for product context.

## Objective

W2.5 path rewrite: point every shipped slash-command and agent prompt at the dist/ bundles so the plugin runs from a marketplace install without node_modules. FEAT-026 shipped self-contained dist bundles (dist/crew.js, dist/loop.js, dist/hooks/*.js) and migrated hooks/hooks.json, but commands/*.md (91 refs) and agents/*.md (42 refs) still invoke crew/scripts/crew.mts and src/scripts/loop.mts, which resolve @astragenie/*, zod and yaml from node_modules and crash in a consumer repo. The consumer-install smoke test (src/tests/install/consumer-smoke.test.mts) carries these 42 CLI entries in EXPECTED_FAIL as a designed-red ratchet (DEC-044); CI gate 42 stays red until they are drained. Deliverable: rewrite every literal invocation of crew/scripts/crew.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js", src/scripts/loop.mts to bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js", crew/scripts/report-to-pr.mts, crew/scripts/prune-artifacts.mts and src/scripts/watch-tick.mts to their dist/ counterparts, across commands/, agents/ (excluding agents/3rdparty/), skills/, templates/ and CLAUDE.md marker blocks where they are product surface; keep this repo's own dogfood docs (docs/, AGENTS.md) on source paths where they describe development. Drain EXPECTED_FAIL in consumer-smoke to an empty array and make the ratchet assertion a hard green gate; update docs/ci-gates.md and docs/memory.md (DEC-044 note) to record that gate 42 is now blocking. Add a validator rule (crew/scripts/validate-agents.mts no-source-script-path, and a sibling check for commands/*.md) so a source-path invocation cannot creep back into product surface. Acceptance: consumer-smoke passes with EXPECTED_FAIL empty from a node_modules-free staged copy; grep for crew/scripts/crew.mts, src/scripts/loop.mts, report-to-pr.mts, prune-artifacts.mts, watch-tick.mts across commands/ agents/ skills/ templates/ returns zero hits outside an explicit allowlist (build-dist entry list, validator sources, tests); validate-agents, validate-agent-refs, validate-content-length, validate-repo-boundary, build-dist --check, generate-metrics-band --check all green; both test suites green apart from pre-existing flakes. Depends on FEAT-026 (done). Blocks FEAT-029 and FEAT-031. Serial on the shared branch, not a wave lane.

## In scope

- Every `agents/*.md` file except `agents/3rdparty/**`: rewrite literal
  `crew/scripts/crew.mts` invocations to `"${CLAUDE_PLUGIN_ROOT}/dist/crew.js"`
  and `src/scripts/loop.mts` invocations to `"${CLAUDE_PLUGIN_ROOT}/dist/loop.js"`
  (quoted and bare/relative forms alike), preserving every argument, flag and
  quote exactly — 53 refs across 19 files.
- `src/tests/install/consumer-smoke.test.mts`: drain the 6 agents-origin
  `crew/scripts/crew.mts` labels from `EXPECTED_FAIL` (mark-badge,
  write-deployment-check, write-final-synthesis, write-handoff,
  write-review-result, write-validation-result) and keep the ratchet honest
  about what else the rewrite newly surfaces.
- Downstream test assertions in the same file that hardcode counts/membership
  derived from the agents/*.md source-path set (`listShippedEntrypoints`
  distinct-bun-file count, the `crew/scripts/crew.mts` membership check) —
  updated to the post-rewrite state, not restructured.

## Out of scope

- `commands/*.md` (SLICE-55, already landed), `skills/**` (SLICE-57),
  the `no-source-script-path` validator rule (SLICE-58), `docs/ci-gates.md`
  + `docs/memory.md` DEC-044 wording (SLICE-60), `templates/`, `CLAUDE.md`
  marker blocks, `agents/3rdparty/`, `AGENTS.md`, `docs/`.
- Fixing `loop.mts`'s `dispatch` subcommand dist-packaging gap (see
  Evidence under AC-1) — found during this slice but requires changes to
  `src/scripts/build-dist.mts` and `src/scripts/loop.mts` runtime
  resolution, outside this slice's agents/*.md + EXPECTED_FAIL scope;
  reported to the team lead rather than silently expanded into.

## Acceptance criteria

> WARNING: ACs copied from FEAT-037 and shared across 6 sibling slices — scope per-slice before close

- [x] AC-1 (agents-origin portion only — commands-origin is SLICE-55's): Given a staged, node_modules-free consumer copy produced by `stageConsumerCopy`, When `bun test src/tests/install/consumer-smoke.test.mts` runs, Then the 6 agents-origin `crew/scripts/crew.mts` labels are drained from `EXPECTED_FAIL`, `newlyBroken` and `nowPassing` are both `[]`. **Evidence**: classification audit logged `1 crash, 38 arg-error`; the 1 crash (`dist/loop.js dispatch prepare`) was newly surfaced by this slice's rewrite (it used the bare, unquoted `bun src/scripts/loop.mts` form in `agents/swarm.md`, invisible to `CLI_LINE_RE` before this slice) and is a genuine, documented, out-of-scope dist-packaging bug (see Out of scope) — kept in `EXPECTED_FAIL` with a full root-cause comment per the team lead's explicit fallback instruction. `newlyBroken=[]` and `nowPassing=[]` both held; the suite's separate "(c) stay red while EXPECTED_FAIL non-empty" assertion fails by design because 1 entry remains — gate 42 stays red for this one documented reason, not a regression. Not a full AC-1 PASS (EXPECTED_FAIL is not the empty set); the remaining gap belongs to a follow-up slice.
- [x] AC-2 (re-confirmed): Given the same staged consumer copy, When `listShippedEntrypoints` runs, Then CLI entries >= 42 and dist/hooks/*.js entries >= 11 both hold (test asserts these floors explicitly and both passed).
- [x] AC-3 (agents-only; commands/skills/templates are other slices' scope): Given `agents/` excluding `agents/3rdparty/`, When grepped for `crew/scripts/crew\.mts|src/scripts/loop\.mts|crew/scripts/report-to-pr\.mts|crew/scripts/prune-artifacts\.mts|src/scripts/watch-tick\.mts`, Then zero occurrences remain. **Evidence**: `grep -rnE "..." agents/ --exclude-dir=3rdparty` returns no matches (rc=1); 53 of 53 pre-slice hits across 19 files rewritten to the dist/ form.
- [ ] AC-4: not in scope for this slice (SLICE-58 owns the validator rule).
- [x] AC-5 (re-confirmed for dist/crew.js and dist/loop.js): Given both dist bundles run from a directory outside the plugin tree with `CLAUDE_PLUGIN_ROOT` set, Then each exits 0 with no module-resolution error. **Evidence**: ran `bun "${CLAUDE_PLUGIN_ROOT}/dist/crew.js" audit --repo "$PWD"` (exit 0, valid JSON) and `bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" --help` (exit 0) from `/tmp/ac5-check`, a directory with no node_modules on its resolution path. Caveat: `dist/loop.js dispatch <sub>` specifically still hits a module-resolution error (see AC-1 evidence) — AC-5 holds for the two bundles' top-level invocation but not for the `dispatch` child-process subcommand; that gap is the same documented out-of-scope bug.
- [ ] AC-6: not in scope for this slice (SLICE-60 owns docs/ci-gates.md + docs/memory.md).
- [x] AC-7 (subset relevant to this slice's changed files): `bun ./crew/scripts/validate-agents.mts`, `bun ./src/scripts/validate-agent-refs.mts`, `bun ./src/scripts/validate-content-length.mts`, `bun ./src/scripts/validate-repo-boundary.mts`, `bun ./src/scripts/validate-dispatch-markers.mts`, `bun src/scripts/build-dist.mts --check` all exit 0 (evidence in builder handoff). `bun test src/tests/ --parallel` (with the 6 pre-agreed path-ignores): 3418 pass / 7 skip / 1 fail — the one fail is the same documented consumer-smoke "(c) stay red" assertion, not a new regression. `bunx tsc --noEmit -p tsconfig.json` and `bunx biome format src/` both clean.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-037 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
