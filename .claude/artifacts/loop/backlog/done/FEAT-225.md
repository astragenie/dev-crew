---
id: FEAT-225
status: done
priority: P3
category: bug
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [backend, memory, bug]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Surfaced by #324 investigation (PR #328). memory-sink.mts passes `--project` to astramem `remember`, but remember.ts does not parse it (folds only agent into metadata) -> project scope silently dropped, weakening project-scoped decision/lesson recall. Low priority (degrades, does not break). Likely settled together with FEAT-223's `remember` wire-contract work. Mechanical -> autonomous_safe."
---
# FEAT-225: memory-sink drops `--project` on astramem `remember`

## Resolution (2026-07-06): RESOLVED UPSTREAM — no repo change

Verified against the live astramem **0.6.0** binary
(`~/.claude/plugins/cache/astra/astramem/0.6.0/src/cli/remember.ts`): `remember`
now **parses `--project`** (line 50-51) and folds it into `metadata.project`
under **FEAT-423** (lines 63-67: `if (project !== undefined && metadata['project']
=== undefined) metadata['project'] = project`). The daemon reads
`metadata.project` and persists it on the atom. `memory-sink.mts`'s existing
`--project` argument is therefore no longer dropped — the scope leak this FEAT
targeted is fixed upstream. The #324 findings-doc claim ("not parsed in either
cached version") was already stale when written.

No repo-side change required. Closed as done. If a future astramem downgrade
reintroduces the drop, reopen with the scope below.

---

## Origin

#324 investigation (PR #328 findings). `memory-sink.mts::recordMemory` passes
`--project` to `astramem remember`, but the real `remember.ts` (0.5.4 + 0.6.0)
parses only `--content --type --metadata --agent` — it folds `agent` into
`metadata.agent` and **silently drops `--project`** (falls to `default:`). So
project-scoped memories are stored without their project tag, weakening
project-scoped recall. Not fatal (fail-open, silent), but a real scope leak.

## Verify first — may already be resolved upstream

The DEC-067 architect-review (2026-07-06) found the installed astramem **0.6.0**
`remember.ts` (dated 2026-07-05, under "FEAT-423") **already folds `--project`
and `--agent` into `metadata`** — the exact fix this FEAT proposes. The #324
findings-doc claim that `--project` is dropped "in both cached versions" is
stale for the live 0.6.0 binary. **Before building: re-verify against the live
binary.** If `remember` now parses `--project`, this FEAT closes as
"resolved upstream — verify round-trip and drop," not a repo-side change. Only
proceed with the scope below if the live binary still drops it.

## Scope

Route project scope through a channel the real CLI accepts — most likely
`--metadata` (as `metadata.project`), matching how `agent` is folded. Confirm the
recall side (`memory-recall.mts` / astramem `recall --project`) reads it back from
the same location so round-trip scoping actually works.

Coordinate with FEAT-223: both touch the `remember` wire contract. If 223 chooses
the `remember`-reshape path, fold this in there rather than double-editing.

## Acceptance criteria

- AC-1: GIVEN a project-scoped `recordMemory` call, WHEN it invokes `remember`,
  THEN the project is carried on a field the real CLI parses (not the dropped
  `--project` flag), verified against the real CLI arg surface.
- AC-2: GIVEN a stored project-scoped memory, WHEN recalled with a project filter,
  THEN it round-trips (scoping is not silently lost).
- AC-3: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Refs

- `src/scripts/lib/memory-sink.mts` (`recordMemory`).
- `src/scripts/lib/memory-recall.mts` (recall-side project handling).
- FEAT-223 (shared `remember` wire contract).
- `docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md`.
