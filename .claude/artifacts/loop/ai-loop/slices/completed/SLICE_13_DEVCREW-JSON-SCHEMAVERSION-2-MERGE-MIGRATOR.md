---
id: SLICE-13
title: devcrew.json schemaVersion 2 merge + migrator
status: completed
feature: FEAT-003
phase: null
priority: P2
target_release: null
requires_validation: false
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-3
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-13: devcrew.json schemaVersion 2 merge + migrator

Implements FEAT-003. See [feature file](../../../backlog/in-progress/FEAT-003.md) for product context.
Contract: `docs/planning/p2-seam-contract.md` §3 (schema v2 field table), §6
(deletion list), §7 (this slice's boundary). Sibling slices SLICE-11
(fail-soft crew-bridge calls) and SLICE-12 (fail-hard write-validation-result
+ phase-gate) are already closed — this is the final P2 slice.

## Objective

Finish the P2 seam-elimination for the crew-CLI-discovery machinery
(`findCrewCli`/`crewCliRuntime`/`MIN_CREW_VERSION`/`CREW_MARKETPLACE_NAME`)
that treated crew as an externally-installed, version-gated plugin — it is a
same-repo subtree now, always present, so that machinery is dead weight —
and ship the `devcrew.json` schemaVersion 2 config merge + in-place
migrator that unifies `.claude/loop.json` + `.claude/crew.json` into one
document, with the legacy files kept as a rollback path.

## In scope

- Delete `findCrewCli`, `crewCliRuntime`, `MIN_CREW_VERSION`, `getCrewVersion`,
  `CREW_CLI_FILENAMES`, the `CREW_MARKETPLACE_NAME` env lookup from
  `src/scripts/lib/plugin-identity.mts` (keep `compareSemver` and the
  Bun-version floor — unrelated to crew).
- Delete `isCrewAvailable` and the `checkCrewAvailable` injectable dep from
  `src/scripts/lib/arch-gate.mts`; collapse `shouldRunArchGate`'s
  crew-presence precondition (crew is always available now).
- Strip the crew CLI discovery / version-floor hard-dependency block from
  `src/scripts/lib/loop-installer.mts` (`installLoop`), and drop the
  display-only `crewCli` field from both `installLoop`'s return value and
  `reportStatus`.
- Add `src/scripts/lib/devcrew-config.mts`: `migrateToDevcrewConfig` (in-place,
  idempotent, `.bak`-preserving merge of `loop.json` + `crew.json` into
  `devcrew.json` schemaVersion 2) and `readDevcrewConfigIfPresent`.
- Wire `config-resolver.mts`'s runtime (non-preset) `resolveConfig` path to
  read `devcrew.json` first when present, falling back to `.claude/loop.json`
  otherwise ("new file wins when present" — contract §5).
- Add the `bun loop.mts config migrate-devcrew [--repo PATH]` CLI subcommand
  and run it against this repo as the live proof.
- Update the deleted seam's tests honestly (`plugin-identity.test.mts`,
  `arch-gate.test.mts`, `loop-installer.test.mts`,
  `start-slice-arch-gate.test.mts`, `phase-gate.test.mts`'s crew-init helper)
  plus new `devcrew-config.test.mts` coverage.

## Out of scope

- Rewriting `crew.json` resolution inside the `crew/` subtree itself
  (`crew/scripts/lib/features-service.mts`'s `readCrewConfig`) — out of this
  slice's `touches_files`, deferred alongside the rest of the `crew/`-side
  cutover.
- Making `installLoop`'s config *write* path emit `devcrew.json` for fresh
  installs — P2 is read-side/additive only; adopter repos migrate in P5.
- Any change to `crew-bridge.mts` or `phase-gate.mts`'s five direct-import
  seam calls — already landed in SLICE-11/SLICE-12.

## Acceptance criteria

- [x] AC-2: Given findCrewCli/crewCliRuntime/MIN_CREW_VERSION/CREW_MARKETPLACE_NAME
      are deleted, When `grep -rw "MIN_CREW_VERSION\|findCrewCli\|crewCliRuntime\|CREW_MARKETPLACE_NAME" src/ crew/scripts/` runs,
      Then the match count is 0 (comments referencing the names by way of
      explanation are fine; no live import/reference remains).
- [x] AC-5: Given `.claude/loop.json` + crew config are merged, When the
      installer's in-place migrator (`bun loop.mts config migrate-devcrew`)
      runs against a pre-merge adopter config, Then the output file has
      `schemaVersion: 2` and a `.bak` of the original is present on disk, and
      a second run against an already-migrated repo is a no-op.

### Close evidence

- AC-2: reviewer grep zero live seam symbols; consumers (arch-gate, loop-installer, phase-gate tests) collapsed/rewritten with coverage verified not-lost. <!-- EVIDENCE-CLOSE -->
- AC-5: reviewer ran migrator on synthetic fixture + this repo live — schemaVersion:2, byte-identical .baks, idempotent second run. Review artifact 20260819T031500Z.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-003 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
