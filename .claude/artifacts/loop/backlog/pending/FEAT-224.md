---
id: FEAT-224
status: pending
priority: P2
category: bug
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [backend, memory, bug, observability]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Surfaced by #324 investigation (PR #328). memory-doctor.mts probes astramem health with `doctor --format json` but the real CLI checks `--json`; and mapDoctorOutput() reads fields the real `doctor --json` output does not emit, so probeMemory() reports health:'ok' unconditionally. Mechanical, well-scoped, self-contained -> autonomous_safe."
---
# FEAT-224: fix memory-doctor — health probe reports `ok` unconditionally

## Origin

#324 investigation (PR #328 findings doc, table row). Two bugs in
`memory-doctor.mts`:

1. **Flag mismatch** — it invokes `doctor --format json`, but the real astramem
   `doctor.ts` (0.6.0) activates JSON mode on `args.includes('--json')`, not
   `--format json`. So the CLI returns the human-readable text report, which
   `mapDoctorOutput()` cannot parse.
2. **Output-shape drift** — even with the flag fixed, real `doctor --json` emits
   `env_vars | local_url | local_url_source | pending | deprecation_hits`, none of
   the fields `mapDoctorOutput()` reads (`health | provider | version | url |
   last_ingest_at`). Its health ternary falls through to `"ok"` when
   `obj["health"]` is absent → `probeMemory()` silently reports `health:"ok"`
   regardless of real state.

## Scope

1. Change the invocation to `--json` (match the real CLI flag).
2. Rewrite `mapDoctorOutput()` against the real `doctor --json` shape; derive a
   truthful health/provider signal from the actual fields (or report `unknown`
   when indeterminate — never a default `ok`).
3. Replace the `memory-doctor.test.mts` fixture that fabricates a matching JSON
   blob with one reflecting the real output shape + flag.

## Acceptance criteria

- AC-1: GIVEN a real `doctor --json` output shape, WHEN `mapDoctorOutput()` runs,
  THEN it maps the actual fields and never defaults `health` to `ok` on absent
  data (returns `unknown`/degraded instead).
- AC-2: GIVEN astramem reports an unhealthy/pending state, WHEN `probeMemory()`
  runs, THEN it does NOT report `ok`.
- AC-3: GIVEN the CLI is absent, WHEN `probeMemory()` runs, THEN it fails silently
  per the existing contract (no throw).
- AC-4: Test fixtures assert against the real flag (`--json`) + output shape.
- AC-5: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Refs

- `src/scripts/lib/memory-doctor.mts` (`spawnDoctor`, `mapDoctorOutput`, `probeMemory`).
- `docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md` (field enumeration).
