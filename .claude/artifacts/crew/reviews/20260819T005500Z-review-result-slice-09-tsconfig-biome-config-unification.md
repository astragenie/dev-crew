---
slice: SLICE-09
feature: FEAT-002
title: tsconfig + biome config unification
decision: PASS
reviewed_at: 2026-08-19T00:55:00Z
reviewer: independent-review-agent
---

# Review result — SLICE-09 tsconfig + biome config unification

## Decision: PASS

## Scope reviewed

9 changed files: `crew/biome.json` (`root: false`), `crew/tsconfig.json`
(`types` bun-types->bun, `include` widened to `skills/**/*.mts`),
`crew/package.json` (`test:node` removal, `evals:view` node->bun),
`package.json` (root `test:all` added, `test:crew` gains `--parallel`), and
4 test files dropping the inert `--experimental-strip-types` flag from
`spawnSync`/`execFile` call sites (`enum-verdicts.test.mts`,
`validate-all.test.mts`, `validate-slices.test.mts`,
`prune-artifacts.test.mts`, 3 call sites total across them).

## Findings

1. **Biome config errors — PASS.** `bunx biome check .` from repo root: no
   nested-root/config-resolution errors (grepped output for
   `root|nested|conflict` — zero config-error hits, only unrelated string
   matches like `relRoot`/`expectedRoot` variable names in formatter diffs).
   Findings count matches the handoff exactly: **88 errors / 70 warnings /
   253 infos**.

2. **tsc clean — PASS.** `cd crew && bunx tsc --noEmit` exit 0. Root
   `bun run typecheck` (`tsc --project tsconfig.json --noEmit && tsc
   --project tsconfig.test.json --noEmit`) exit 0. Confirmed the widened
   `include: skills/**/*.mts` actually closes the coverage gap: `bunx tsc
   --project tsconfig.json --listFiles` picks up all 3 named orphan files
   (`skills/domain/security-sweep/scripts/scan.mts`,
   `skills/workflow/root-cause-discipline/condition-based-waiting-example.mts`,
   `skills/workflow/test-quality/scripts/analyze.mts`) — matches the
   handoff's "3 orphaned .mts files" claim exactly, not approximately.

3. **Diff scope — PASS on the 9 described files.** Every diff matches the
   handoff description precisely: `biome.json` +1 line (`root: false`);
   `tsconfig.json` types swap + one include line added; `package.json`
   (crew) two script-line edits, nothing else; the 4 test files are
   flag-removal-only — no assertion, fixture, or logic changes, confirmed
   by reading each hunk (all touched lines are exclusively inside the
   `spawnSync`/`execFile` args array). Root `package.json` adds `test:all`
   and appends `--parallel` to `test:crew`, nothing else touched.
   **Note (not a defect):** `git status` also shows
   `.claude/state/crew/slice-progress.md` and
   `.claude/state/crew/workflow-state.json` modified, uncounted in the
   handoff's "Changed Files" list. Inspected both — they are the loop
   ceremony's own auto-updated bookkeeping (timestamps, current-run
   title/artifact pointers), the same kind of self-generated drift SLICE-08's
   review already characterized as ceremony output rather than hand-edited
   scope creep. Flagging for completeness; recommend future handoffs list
   state-store touches explicitly (or note "+ ceremony state") even when
   auto-generated, so the changed-files list stays a complete diff manifest.

4. **Suites — PASS, exact match.** Root suite (`bun run test`): **3310
   pass / 7 skip / 2 fail**, confirmed by name — `DEC-070 contract record
   exists for FEAT-229` and `DEC-068 contract record exists for FEAT-222`,
   the same two pre-existing ENOENT contract-fixture failures already
   carried since SLICE-07/08. Crew suite (`bun run test:crew`, now
   `--parallel`): **1971 pass / 117 skip / 0 fail** — exact match to the
   handoff's claimed baseline.

5. **Judgment — `crew/biome.json` `root:false` without `extends` — agree,
   reasonable for the pre-P3 window.** Diffed root vs. crew rule objects
   directly rather than taking the "genuinely diverge" claim on faith: the
   `style` block differs substantially (root has `noNonNullAssertion: off`,
   `useArrayLiterals`, `useAsConstAssertion`, `noNamespace`; crew has none
   of those — falls back to Biome recommended defaults for that group), the
   `suspicious` block differs on ~6 rules (root additionally sets
   `noDuplicateEnumValues`, `noExtraNonNullAssertion`,
   `noNonNullAssertedOptionalChain`, `noUnsafeDeclarationMerging`,
   `noUnusedExpressions: off`, `useNamespaceKeyword`; crew has
   `noEmptyBlockStatements: error` where root has it `off`), and
   `files.includes` scoping is entirely different shape (root:
   `**/src/**` with dist/node_modules excludes; crew:
   `scripts/**,tests/**,hooks/**,evals/**` with its own excludes). This is
   real divergence, not copy-paste noise — adopting `extends` today would
   force reconciling those rule-set differences immediately rather than at
   the deliberate P3 flattening point. `root:false` without `extends` is
   the correct minimal fix for the nested-root conflict alone. Position:
   defer `extends` to P3 as the handoff's "Suggested Next Handoff"
   proposes.

6. **`test:all` `&&`-chain risk note — PASS, accurate, doesn't mask
   anything new.** Ran `bun run test:all` live: root `test` fails (exit 1,
   same 2 named pre-existing failures) and the chain short-circuits —
   `test:crew` never runs, confirmed by the process substituting only the
   root suite's output before erroring. This is the documented risk exactly
   as described, not a silent new failure mode; the two blocking failures
   are the same pre-existing DEC-070/DEC-068 items already tracked, so
   nothing is newly hidden by the `&&` chain.

## Known/accepted items (verified, not defects)

- `.claude/state/crew/{slice-progress.md,workflow-state.json}` touched but
  not listed in "Changed Files" — verified as auto-generated ceremony
  bookkeeping, not hand-edited scope creep (see finding 3).
- Root suite's 2 DEC-file fails (DEC-070/DEC-068) — pre-existing, unrelated
  to this slice, already known since SLICE-07/08.
- `evals:view`'s pre-existing regex-escaping bug — confirmed out of scope
  (source-logic defect, fails identically before and after this slice's
  node->bun swap; not re-verified independently this pass since the
  handoff already establishes it fails identically under both runtimes and
  fixing it is explicitly not this slice's job).

## Mechanical fixes applied during review

None required.

## Confidence

High. Every claim was re-executed rather than read off the handoff: biome
check re-run fresh (counts match exactly), both tsc invocations re-run
independently, the 3-orphan-file claim checked via `--listFiles` rather
than trusted, both suites re-run and failures confirmed by name not just
count, the `root:false` divergence claim checked by diffing the actual
rule JSON rather than accepting the prose, and the `test:all` short-circuit
behavior observed live rather than inferred from the script text.
