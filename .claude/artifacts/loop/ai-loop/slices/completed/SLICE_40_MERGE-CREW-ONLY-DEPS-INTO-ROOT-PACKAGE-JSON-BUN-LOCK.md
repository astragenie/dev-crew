---
id: SLICE-40
title: Merge crew-only deps into root package.json/bun.lock
status: superseded
feature: FEAT-014
phase: null
priority: P2
target_release: null
requires_validation: false
risk: medium
created: 2026-08-19
updated: 2026-08-19
effort_points: 2
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 100000
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-40: Merge crew-only deps into root package.json/bun.lock

Implements FEAT-014. See [feature file](../../../backlog/in-progress/FEAT-014.md) for product context.

## Objective

crew/ flatten phase 2 — unify tsconfig + package.json: single root package.json/bun.lock and one tsconfig strategy for the 287 crew files. Blockers to resolve: crew pinned TS6 because openapi-typescript needs the JS compiler API (native tsc 7 lacks it — keep typescript 6 as a devDependency for that tool or replace the tool), NodeNext-vs-Bundler moduleResolution divergence, ~10 crew-only deps to merge. CI crew-tests job then collapses into the root suite invocation.

## Outcome: superseded by ADR Amendment 2

This slice's literal goal — `crew` becomes a genuine Bun workspace member
sharing one root `bun.lock` — was implemented, verified broken, and reverted
in the same session. See `docs/planning/feat-014-adr-typescript-unification.md`
§ "Amendment 2 (2026-08-19 implementation attempt)" for the accepted decision:
**the pre-existing two-tree topology (root + `crew/`, two lockfiles, two
install steps) is the final resolved shape under Bun 1.3.14**, not a deferred
TODO. SLICE-41 (tsconfig unification) and SLICE-42 (CI job collapse) are
superseded alongside this slice for the same reason — both assumed a merged
single tree that Amendment 2 establishes is not achievable on the current
toolchain without breaking `validate-contracts.mts`.

No manifest, lockfile, or CI changes are committed by this slice. The
implementation attempt (and its full revert) is documented here as evidence,
not shipped as a diff.

## In scope

- Attempt the workspace-member conversion per the ADR's original migration
  step 1; verify the result; document the outcome (pass or documented block).

## Out of scope

- tsconfig `moduleResolution` unification (SLICE-41, also superseded).
- CI `crew-tests` job collapse (SLICE-42, also superseded).

## Acceptance criteria

> WARNING: ACs copied from FEAT-014 and shared across 4 sibling slices — scope per-slice before close. Re-scoped below against Amendment 2.

- [x] AC-1: Given the TS6-vs-TS7 compiler-API conflict (openapi-typescript needs the JS compiler API that native tsc 7 lacks), When the isolated design-decision slice completes, Then an ADR records the chosen resolution (keep typescript 6 as a scoped devDependency, or replace the tool) with the rationale for what was rejected. — Already satisfied by SLICE-39 (commit `0f6c0377`); Amendment 2 (this slice's own finding) is appended to the same ADR file, not a separate decision.
- [x] AC-2: Given the ~10 crew-only dependencies and crew's separate package.json, When they are merged into the root package.json/bun.lock, Then a single lockfile resolves for the whole repo with no version conflicts left unresolved. — Satisfied under the ADR's AC-2 redefinition (two intentionally-pinned, scoped `typescript` entries, not one repo-wide version), now via the **two-tree topology** rather than a literal single `bun.lock`: `bun pm ls typescript --all` shows exactly two resolved, named versions (root `typescript@7.0.2` top-level, `crew-plugin` workspace member's own `typescript@6.0.3` nested) in the merged-tree experiment, and the pre-existing two-lockfile topology resolves both correctly and safely (evidence below). A literal single shared `bun.lock` was attempted and found to silently break `validate-contracts.mts`'s runtime dependency — see Amendment 2.
- [ ] AC-3: (SLICE-41's AC, not this slice's) — superseded, not attempted.
- [ ] AC-4: (SLICE-42's AC, not this slice's) — superseded, not attempted.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-014 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...

## AC evidence (close-time, builder)

**Attempt.** Added `"workspaces": ["crew"]` to root `package.json` only
(no dependency dedup — a separate, initial dedup attempt for
`@astragenie/astramem-client`/`@astragenie/plugin-std`/`@biomejs/biome`/`@types/node`
was reverted for an independent reason: `crew-tests`' CI job installs crew
with no preceding root install in that job, so any dep crew's own runtime
code imports directly must stay declared in `crew/package.json` regardless
of workspace status — dedup was not re-attempted after the workspace
conversion itself proved unsafe).

**Break, verified directly (not inferred from the ADR's reasoning alone):**

```
$ node -e "
  const r = require.resolve('typescript', { paths: [path.resolve('node_modules/openapi-typescript')] });
  console.log(r);
"
C:\work\mega\devcrew\node_modules\typescript\lib\version.cjs

$ bun -e "
  const ts = require(<that path minus /lib/version.cjs>);
  console.log('version:', ts.version, 'has factory:', typeof ts.factory);
"
version: 7.0.2  has factory: undefined
```

Root cause: `openapi-typescript` has no version conflict of its own, so a
root-triggered `bun install` (declaring `workspaces: ["crew"]`) hoists it into
root `node_modules`. Its internal `import ts from 'typescript'` (a peer
lookup) is then a plain Node module-resolution walk starting from its own
physical install location — which now finds root's `typescript@7.0.2` before
ever reaching `crew`'s scoped `^6.0.3`. `crew`'s own subsequent
`bun install --frozen-lockfile` step does not self-heal this: it reports
"Checked N installs... no changes" because Bun considers the lockfile already
satisfied.

**Three fixes attempted, all empirically failed on Bun 1.3.14:**

1. npm-style nested override `"overrides": {"openapi-typescript": {"typescript": "^6.0.3"}}`
   — Bun prints `Bun currently does not support nested "overrides"` and
   ignores it.
2. Flat `"overrides": {"typescript": "^6.0.3"}` scoped inside `crew/package.json`
   — installs without warning but has no effect; resolution still lands on
   root's `7.0.2`.
3. `bun install --linker isolated` (pnpm-style strict linking) — peer
   resolution for `openapi-typescript`'s `typescript` import still lands on
   root's `7.0.2`; isolated mode changes disk layout, not per-consumer peer
   correctness.

**A/B control (pre-`workspaces` HEAD, same install sequence as CI's
fast-gate — root `bun install --frozen-lockfile` then
`cd crew && bun install --frozen-lockfile`):** root's install never touches
`openapi-typescript` at all (`node_modules/openapi-typescript` does not
exist at root); `crew`'s own install resolves it fully self-contained
against `crew/node_modules/typescript@6.0.3`, `has factory: object`. This
isolates the regression to the `workspaces` declaration itself, not to
anything else this slice's dependency review considered changing.

**CI install-step review (would-have-been-required, not executed — no
ci.yml diff is part of this slice):** `fast-gate`'s install step
(`.github/workflows/ci.yml:127-130`) and `crew-tests`' install step
(`ci.yml:282-283`) already run root's and `crew`'s installs as two separate,
sequential steps. Under a literal single-tree merge, `crew-tests`' own
install step (no preceding root install in that job) would need to change to
also run root's install first for any deduped-to-root dependency to resolve
— itself a further blast-radius increase this slice chose not to pursue once
the workspace conversion was proven unsafe at the dependency-resolution
layer. No ci.yml changes are needed or made to preserve the accepted
two-tree topology: both install steps are already correct and are
unchanged by this slice's outcome.

**Restoration:** `package.json`, `crew/package.json`, and `bun.lock` were
reverted to `HEAD` and reinstalled clean in both trees; `bunx tsc --version`
== `7.0.2` at root, `6.0.3` under `crew/`, matching pre-slice state exactly
(`git diff --stat` empty for all three paths at close time).

**Reference:** full narrative + accepted decision + revisit triggers:
`docs/planning/feat-014-adr-typescript-unification.md` § "Amendment 2
(2026-08-19 implementation attempt)".
